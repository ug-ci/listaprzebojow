<?php
class Test_Chart_Engine extends Mors_TestCase {
    private $ed;

    public function setUp(): void {
        parent::setUp();
        \Mors\Activator::activate();
        $this->ed = ( new \Mors\Db\Editions_Repo() )->current();
    }

    private function add_chart_entry( $pos, $votes, $waiting = false, $weeks = 1 ) {
        $tr = ( new \Mors\Db\Tracks_Repo() )->create( [
            'title' => 'T' . $pos . ( $waiting ? 'w' : '' ), 'artist' => 'A',
            'status' => $waiting ? 'WAITING_ROOM' : 'CHART',
        ] );
        return ( new \Mors\Db\Entries_Repo() )->create( [
            'edition_id' => $this->ed['id'], 'track_id' => $tr['id'],
            'position' => $waiting ? null : $pos, 'votes_count' => $votes,
            'is_waiting' => $waiting ? 1 : 0, 'weeks_on_chart' => $weeks,
        ] );
    }

    public function test_freeze_sets_status() {
        $out = ( new \Mors\Domain\Chart_Engine() )->freeze( 1 );
        $this->assertTrue( $out['success'] );
        $this->assertSame( 'FROZEN', ( new \Mors\Db\Editions_Repo() )->current()['status'] );
    }

    public function test_reorder_chart_updates_positions() {
        $e1 = $this->add_chart_entry( 1, 30 );
        $e2 = $this->add_chart_entry( 2, 20 );
        $e3 = $this->add_chart_entry( 3, 10 );
        $order = [ $e3['track_id'], $e1['track_id'], $e2['track_id'] ];

        $out = ( new \Mors\Domain\Chart_Engine() )->reorder_chart( 1, $order );
        $this->assertTrue( $out['success'] );

        $entries = ( new \Mors\Db\Entries_Repo() )->chart_by_position( $this->ed['id'] );
        $ids = array_map( static function ( $e ) { return $e['track_id']; }, $entries );
        $this->assertSame( $order, $ids );
    }

    public function test_freeze_without_current_edition_throws() {
        global $wpdb;
        $t = \Mors\Db\Schema::table_names();
        $wpdb->update( $t['editions'], [ 'is_current' => 0 ], [ 'is_current' => 1 ] );
        $this->expectException( \RuntimeException::class );
        ( new \Mors\Domain\Chart_Engine() )->freeze( 1 );
    }

    public function test_reset_without_current_edition_throws() {
        global $wpdb;
        $t = \Mors\Db\Schema::table_names();
        $wpdb->update( $t['editions'], [ 'is_current' => 0 ], [ 'is_current' => 1 ] );
        $this->expectException( \RuntimeException::class );
        ( new \Mors\Domain\Chart_Engine() )->reset_and_publish( 1 );
    }

    public function test_reset_creates_new_edition_and_carries_top_and_promotes() {
        // 20 wpisów listy + 5 poczekalni (jak w briefie).
        for ( $i = 1; $i <= 20; $i++ ) { $this->add_chart_entry( $i, 100 - $i ); }
        for ( $i = 1; $i <= 5; $i++ ) { $this->add_chart_entry( $i, 50 - $i, true ); }

        $engine = new \Mors\Domain\Chart_Engine();
        $out = $engine->reset_and_publish( 1 );

        $this->assertTrue( $out['success'] );
        $newEd = ( new \Mors\Db\Editions_Repo() )->current();
        $this->assertSame( (int) $this->ed['edition_number'] + 1, (int) $newEd['edition_number'] );
        $this->assertSame( 'ACTIVE', $newEd['status'] );
        $this->assertSame( $newEd['id'], $out['edition']['id'] );
        $this->assertSame( (int) $newEd['edition_number'], (int) $out['edition']['editionNumber'] );

        // Stara edycja: zarchiwizowana, niebieżąca.
        global $wpdb;
        $t = \Mors\Db\Schema::table_names();
        $oldRow = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$t['editions']} WHERE id = %s", $this->ed['id'] ), ARRAY_A );
        $this->assertSame( 'ARCHIVED', $oldRow['status'] );
        $this->assertSame( '0', (string) $oldRow['is_current'] );

        $chart = ( new \Mors\Db\Entries_Repo() )->for_edition( $newEd['id'], false );
        // Top 18 przeniesione + 2 promocje = 20 na liście.
        $this->assertSame( 20, count( $chart ) );

        $waiting = ( new \Mors\Db\Entries_Repo() )->for_edition( $newEd['id'], true );
        // Poczekalnia dopełniona do 25 (3 pozostałe + 22 placeholdery).
        $this->assertSame( 25, count( $waiting ) );

        // Wszystkie nowe głosy wyzerowane.
        foreach ( $chart as $c ) { $this->assertSame( 0, (int) $c['votes_count'] ); }
        foreach ( $waiting as $w ) { $this->assertSame( 0, (int) $w['votes_count'] ); }

        // Pozycje 1..20 obecne dokładnie raz.
        $positions = array_map( function ( $c ) { return (int) $c['position']; }, $chart );
        sort( $positions );
        $this->assertSame( range( 1, 20 ), $positions );

        // Dokładnie 2 promowane wpisy (trend=NEW, previous_position=null) na pozycjach 19/20.
        $newTrendEntries = array_values( array_filter( $chart, function ( $c ) { return $c['trend'] === 'NEW'; } ) );
        $this->assertCount( 2, $newTrendEntries );
        foreach ( $newTrendEntries as $c ) {
            $this->assertNull( $c['previous_position'] );
            $this->assertContains( (int) $c['position'], [ 19, 20 ] );
            $this->assertSame( 1, (int) $c['weeks_on_chart'] );
        }

        // 18 przeniesionych z listy: previous_position ustawione, weeks_on_chart += 1.
        $carried = array_values( array_filter( $chart, function ( $c ) { return $c['trend'] !== 'NEW'; } ) );
        $this->assertCount( 18, $carried );
        foreach ( $carried as $c ) {
            $this->assertNotNull( $c['previous_position'] );
            $this->assertSame( 2, (int) $c['weeks_on_chart'] ); // były weeks_on_chart=1 -> +1
        }
    }

    public function test_reset_trend_up_down_same() {
        // Kontrolowany fixture: nowa kolejność wg głosów != stara kolejność wg 'position'.
        $trB = $this->add_chart_entry( 2, 200 ); // stary #2, najwięcej głosów -> nowy #1 (UP)
        $trC = $this->add_chart_entry( 3, 100 ); // stary #3 -> nowy #2 (UP)
        $trA = $this->add_chart_entry( 1, 50 );  // stary #1, najmniej głosów -> nowy #3 (DOWN)
        $trD = $this->add_chart_entry( 4, 10 );  // stary #4 -> nowy #4 (SAME)

        $engine = new \Mors\Domain\Chart_Engine();
        $engine->reset_and_publish( 1 );

        $newEd = ( new \Mors\Db\Editions_Repo() )->current();
        $chart = ( new \Mors\Db\Entries_Repo() )->for_edition( $newEd['id'], false );
        $byPos = [];
        foreach ( $chart as $c ) { $byPos[ (int) $c['position'] ] = $c; }

        $this->assertSame( 'UP', $byPos[1]['trend'] );
        $this->assertSame( 2, (int) $byPos[1]['previous_position'] );
        $this->assertSame( 'UP', $byPos[2]['trend'] );
        $this->assertSame( 3, (int) $byPos[2]['previous_position'] );
        $this->assertSame( 'DOWN', $byPos[3]['trend'] );
        $this->assertSame( 1, (int) $byPos[3]['previous_position'] );
        $this->assertSame( 'SAME', $byPos[4]['trend'] );
        $this->assertSame( 4, (int) $byPos[4]['previous_position'] );
    }

    public function test_reset_updates_track_peak_and_total_weeks() {
        $tr = ( new \Mors\Db\Tracks_Repo() )->create( [
            'title' => 'Peak Test', 'artist' => 'A', 'status' => 'CHART', 'peak_position' => 5,
        ] );
        ( new \Mors\Db\Entries_Repo() )->create( [
            'edition_id' => $this->ed['id'], 'track_id' => $tr['id'],
            'position' => 1, 'votes_count' => 999, 'is_waiting' => 0, 'weeks_on_chart' => 3,
        ] );

        ( new \Mors\Domain\Chart_Engine() )->reset_and_publish( 1 );

        $updated = ( new \Mors\Db\Tracks_Repo() )->find( $tr['id'] );
        // Nowa pozycja to 1 (jedyny wpis) -> min(5,1) = 1.
        $this->assertSame( 1, (int) $updated['peak_position'] );
        $this->assertSame( 4, (int) $updated['total_weeks_on_chart'] ); // 3 + 1
        $this->assertSame( 'CHART', $updated['status'] );
    }
}
