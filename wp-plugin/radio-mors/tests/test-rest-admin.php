<?php
class Test_Rest_Admin extends Mors_TestCase {
    public function setUp(): void {
        parent::setUp();
        \Mors\Activator::activate();
        do_action( 'rest_api_init' );
    }

    private function req( $method, $route, $body = null ) {
        $r = new WP_REST_Request( $method, $route );
        $r->set_header( 'X-WP-Nonce', wp_create_nonce( 'wp_rest' ) );
        if ( $body !== null ) { $r->set_body_params( $body ); }
        return rest_do_request( $r );
    }

    public function test_anonymous_cannot_list_tracks() {
        wp_set_current_user( 0 );
        $this->assertSame( 403, $this->req( 'GET', '/mors/v1/admin/tracks' )->get_status() );
    }

    public function test_administrator_can_upload_list_and_delete_track() {
        $uid = self::factory()->user->create( [ 'role' => 'administrator' ] );
        wp_set_current_user( $uid );

        // Upload bez plików, target=chart.
        $upload = $this->req( 'POST', '/mors/v1/admin/tracks/upload', [
            'title'    => 'Nowy Utwór',
            'artist'   => 'Zespół',
            'target'   => 'chart',
            'duration' => '3:15',
        ] );
        $this->assertSame( 200, $upload->get_status() );
        $uploadData = $upload->get_data();
        $this->assertTrue( $uploadData['success'] );
        $track = $uploadData['track'];
        $this->assertSame( 'CHART', $track['status'] );
        $this->assertSame( 195, (int) $track['duration_seconds'] ); // 3*60+15

        // GET pokazuje utwór z section='Notowanie' i entry na pozycji 1.
        $list = $this->req( 'GET', '/mors/v1/admin/tracks' );
        $this->assertSame( 200, $list->get_status() );
        $found = null;
        foreach ( $list->get_data()['tracks'] as $t ) {
            if ( $t['id'] === $track['id'] ) { $found = $t; }
        }
        $this->assertNotNull( $found );
        $this->assertSame( 'Notowanie', $found['section'] );

        $edition = ( new \Mors\Db\Editions_Repo() )->current();
        $entries = ( new \Mors\Db\Entries_Repo() )->for_edition( $edition['id'], false );
        $this->assertCount( 1, $entries );
        $this->assertSame( 1, (int) $entries[0]['position'] );
        $this->assertSame( 'NEW', $entries[0]['trend'] );

        // Upload target=waiting -> section='Poczekalnia', wpis w poczekalni.
        $upload2 = $this->req( 'POST', '/mors/v1/admin/tracks/upload', [
            'title'    => 'Propozycja',
            'artist'   => 'Ktoś Inny',
            'target'   => 'waiting',
            'duration' => '2:30',
        ] );
        $this->assertSame( 200, $upload2->get_status() );
        $track2 = $upload2->get_data()['track'];
        $this->assertSame( 'WAITING_ROOM', $track2['status'] );

        $list2 = $this->req( 'GET', '/mors/v1/admin/tracks' );
        $found2 = null;
        foreach ( $list2->get_data()['tracks'] as $t ) {
            if ( $t['id'] === $track2['id'] ) { $found2 = $t; }
        }
        $this->assertNotNull( $found2 );
        $this->assertSame( 'Poczekalnia', $found2['section'] );

        $waitingEntries = ( new \Mors\Db\Entries_Repo() )->for_edition( $edition['id'], true );
        $this->assertCount( 1, $waitingEntries );
        $this->assertNull( $waitingEntries[0]['position'] );
        $this->assertSame( 'Dodany przez redakcję', $waitingEntries[0]['tag'] );

        // DELETE usuwa pierwszy utwór.
        $del = $this->req( 'DELETE', '/mors/v1/admin/tracks/' . $track['id'] );
        $this->assertSame( 200, $del->get_status() );
        $this->assertTrue( $del->get_data()['success'] );

        $listAfter = $this->req( 'GET', '/mors/v1/admin/tracks' );
        $idsAfter = array_column( $listAfter->get_data()['tracks'], 'id' );
        $this->assertNotContains( $track['id'], $idsAfter );

        $del404 = $this->req( 'DELETE', '/mors/v1/admin/tracks/' . $track['id'] );
        $this->assertSame( 404, $del404->get_status() );
    }

    public function test_upload_without_title_returns_400() {
        $uid = self::factory()->user->create( [ 'role' => 'administrator' ] );
        wp_set_current_user( $uid );

        $res = $this->req( 'POST', '/mors/v1/admin/tracks/upload', [
            'artist' => 'Zespół', 'target' => 'chart',
        ] );
        $this->assertSame( 400, $res->get_status() );
        $this->assertFalse( $res->get_data()['success'] );
    }

    public function test_upload_without_active_edition_returns_409() {
        global $wpdb;
        $t = \Mors\Db\Schema::table_names();
        $wpdb->update( $t['editions'], [ 'is_current' => 0 ], [ 'is_current' => 1 ] );

        $uid = self::factory()->user->create( [ 'role' => 'administrator' ] );
        wp_set_current_user( $uid );

        $res = $this->req( 'POST', '/mors/v1/admin/tracks/upload', [
            'title' => 'X', 'artist' => 'Y', 'target' => 'chart',
        ] );
        $this->assertSame( 409, $res->get_status() );
        $this->assertFalse( $res->get_data()['success'] );
    }

    public function test_editor_role_without_capability_gets_403() {
        $uid = self::factory()->user->create( [ 'role' => 'subscriber' ] );
        wp_set_current_user( $uid );
        $this->assertSame( 403, $this->req( 'GET', '/mors/v1/admin/tracks' )->get_status() );
    }

    public function test_update_track_partial_fields() {
        $uid = self::factory()->user->create( [ 'role' => 'administrator' ] );
        wp_set_current_user( $uid );

        $tr = ( new \Mors\Db\Tracks_Repo() )->create( [ 'title' => 'Stary', 'artist' => 'A', 'bpm' => 100 ] );

        $res = $this->req( 'PUT', '/mors/v1/admin/tracks/' . $tr['id'], [
            'title' => 'Nowy Tytuł', 'bpm' => 128,
        ] );
        $this->assertSame( 200, $res->get_status() );
        $data = $res->get_data();
        $this->assertTrue( $data['success'] );
        $this->assertSame( 'Nowy Tytuł', $data['track']['title'] );
        $this->assertSame( 'A', $data['track']['artist'] ); // niezmieniony
        $this->assertSame( 128, (int) $data['track']['bpm'] );
    }

    public function test_update_missing_track_returns_404() {
        $uid = self::factory()->user->create( [ 'role' => 'administrator' ] );
        wp_set_current_user( $uid );

        $res = $this->req( 'PUT', '/mors/v1/admin/tracks/00000000-0000-0000-0000-000000000000', [
            'title' => 'X',
        ] );
        $this->assertSame( 404, $res->get_status() );
    }

    public function test_editor_can_freeze() {
        $uid = self::factory()->user->create( [ 'role' => 'administrator' ] );
        wp_set_current_user( $uid );
        $res = $this->req( 'POST', '/mors/v1/admin/chart/freeze' );
        $this->assertSame( 200, $res->get_status() );
        $this->assertTrue( $res->get_data()['success'] );
        $this->assertSame( 'FROZEN', ( new \Mors\Db\Editions_Repo() )->current()['status'] );
    }

    public function test_freeze_requires_capability() {
        $uid = self::factory()->user->create( [ 'role' => 'subscriber' ] );
        wp_set_current_user( $uid );
        $this->assertSame( 403, $this->req( 'POST', '/mors/v1/admin/chart/freeze' )->get_status() );
    }

    public function test_freeze_without_active_edition_returns_409() {
        global $wpdb;
        $t = \Mors\Db\Schema::table_names();
        $wpdb->update( $t['editions'], [ 'is_current' => 0 ], [ 'is_current' => 1 ] );

        $uid = self::factory()->user->create( [ 'role' => 'administrator' ] );
        wp_set_current_user( $uid );
        $res = $this->req( 'POST', '/mors/v1/admin/chart/freeze' );
        $this->assertSame( 409, $res->get_status() );
        $this->assertFalse( $res->get_data()['success'] );
    }

    public function test_reset_and_publish_via_rest() {
        $uid = self::factory()->user->create( [ 'role' => 'administrator' ] );
        wp_set_current_user( $uid );

        $edition = ( new \Mors\Db\Editions_Repo() )->current();
        $res = $this->req( 'POST', '/mors/v1/admin/chart/reset-and-publish' );
        $this->assertSame( 200, $res->get_status() );
        $data = $res->get_data();
        $this->assertTrue( $data['success'] );
        $this->assertSame( (int) $edition['edition_number'] + 1, (int) $data['edition']['editionNumber'] );
        $this->assertSame( 'ACTIVE', $data['edition']['status'] );

        $newEdition = ( new \Mors\Db\Editions_Repo() )->current();
        $waiting = ( new \Mors\Db\Entries_Repo() )->for_edition( $newEdition['id'], true );
        // Notowanie startuje bez wpisów listy, poczekalnia dopełniona placeholderami do 25.
        $this->assertSame( 25, count( $waiting ) );
    }
}
