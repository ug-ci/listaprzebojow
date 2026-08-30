<?php
class Test_Rest_Public extends WP_UnitTestCase {
    public function setUp(): void {
        parent::setUp();
        \Mors\Activator::activate();
        do_action( 'rest_api_init' );
    }

    public function test_chart_current_returns_success_shape() {
        $req = new WP_REST_Request( 'GET', '/mors/v1/chart/current' );
        $res = rest_do_request( $req );
        $this->assertSame( 200, $res->get_status() );
        $data = $res->get_data();
        $this->assertTrue( $data['success'] );
        $this->assertArrayHasKey( 'chartTracks', $data );
        $this->assertIsArray( $data['chartTracks'] );
        $this->assertArrayHasKey( 'edition', $data );
        $this->assertArrayHasKey( 'number', $data['edition'] );
        $this->assertIsInt( $data['edition']['number'] );
        $this->assertArrayHasKey( 'endsAt', $data['edition'] );
        $this->assertArrayHasKey( 'status', $data['edition'] );
        $this->assertArrayHasKey( 'totalVotesCount', $data['edition'] );
        $this->assertArrayHasKey( 'onlineListeners', $data['edition'] );
    }

    public function test_chart_current_orders_by_position_asc_and_totals_all_votes() {
        global $wpdb;
        $ed = ( new \Mors\Db\Editions_Repo() )->current();
        $tracks = new \Mors\Db\Tracks_Repo();
        $entries = new \Mors\Db\Entries_Repo();

        $t1 = $tracks->create( [ 'title' => 'T1', 'artist' => 'A1' ] );
        $t2 = $tracks->create( [ 'title' => 'T2', 'artist' => 'A2' ] );
        $t3 = $tracks->create( [ 'title' => 'T3 waiting', 'artist' => 'A3' ] );

        $entries->create( [ 'edition_id' => $ed['id'], 'track_id' => $t1['id'], 'position' => 2, 'votes_count' => 5, 'is_waiting' => 0 ] );
        $entries->create( [ 'edition_id' => $ed['id'], 'track_id' => $t2['id'], 'position' => 1, 'votes_count' => 9, 'is_waiting' => 0 ] );
        $entries->create( [ 'edition_id' => $ed['id'], 'track_id' => $t3['id'], 'votes_count' => 3, 'is_waiting' => 1 ] );

        $req = new WP_REST_Request( 'GET', '/mors/v1/chart/current' );
        $res = rest_do_request( $req );
        $data = $res->get_data();

        $this->assertSame( 2, count( $data['chartTracks'] ) );
        $this->assertSame( $t2['id'], $data['chartTracks'][0]['trackId'] );
        $this->assertSame( $t1['id'], $data['chartTracks'][1]['trackId'] );
        $this->assertSame( 17, $data['edition']['totalVotesCount'] );
    }

    public function test_chart_current_404_when_no_active_edition() {
        global $wpdb;
        $t = \Mors\Db\Schema::table_names();
        $wpdb->update( $t['editions'], [ 'is_current' => 0 ], [ 'is_current' => 1 ] );

        $req = new WP_REST_Request( 'GET', '/mors/v1/chart/current' );
        $res = rest_do_request( $req );
        $this->assertSame( 404, $res->get_status() );
        $data = $res->get_data();
        $this->assertFalse( $data['success'] );
        $this->assertSame( 'Brak aktywnego notowania.', $data['message'] );
    }

    public function test_waiting_room_returns_success_shape_ordered_by_votes_desc() {
        $ed = ( new \Mors\Db\Editions_Repo() )->current();
        $tracks = new \Mors\Db\Tracks_Repo();
        $entries = new \Mors\Db\Entries_Repo();

        $t1 = $tracks->create( [ 'title' => 'W1', 'artist' => 'A1' ] );
        $t2 = $tracks->create( [ 'title' => 'W2', 'artist' => 'A2' ] );

        $entries->create( [ 'edition_id' => $ed['id'], 'track_id' => $t1['id'], 'votes_count' => 4, 'is_waiting' => 1 ] );
        $entries->create( [ 'edition_id' => $ed['id'], 'track_id' => $t2['id'], 'votes_count' => 10, 'is_waiting' => 1 ] );

        $req = new WP_REST_Request( 'GET', '/mors/v1/chart/waiting-room' );
        $res = rest_do_request( $req );
        $this->assertSame( 200, $res->get_status() );
        $data = $res->get_data();
        $this->assertTrue( $data['success'] );
        $this->assertArrayHasKey( 'waitingRoomTracks', $data );
        $this->assertSame( 2, count( $data['waitingRoomTracks'] ) );
        $this->assertSame( $t2['id'], $data['waitingRoomTracks'][0]['trackId'] );
        $this->assertSame( $t1['id'], $data['waitingRoomTracks'][1]['trackId'] );
    }

    public function test_waiting_room_404_when_no_active_edition() {
        global $wpdb;
        $t = \Mors\Db\Schema::table_names();
        $wpdb->update( $t['editions'], [ 'is_current' => 0 ], [ 'is_current' => 1 ] );

        $req = new WP_REST_Request( 'GET', '/mors/v1/chart/waiting-room' );
        $res = rest_do_request( $req );
        $this->assertSame( 404, $res->get_status() );
        $this->assertFalse( $res->get_data()['success'] );
    }

    public function test_voter_status_no_cooldown_by_default() {
        $req = new WP_REST_Request( 'GET', '/mors/v1/voter/status' );
        $res = rest_do_request( $req );
        $this->assertSame( 200, $res->get_status() );
        $data = $res->get_data();
        $this->assertTrue( $data['success'] );
        $this->assertArrayHasKey( 'inCooldown', $data );
        $this->assertIsBool( $data['inCooldown'] );
        $this->assertFalse( $data['inCooldown'] );
        $this->assertNull( $data['nextEligibleVoteAt'] );
    }

    public function test_voter_status_in_cooldown_when_future_next_eligible() {
        $_SERVER['REMOTE_ADDR'] = '203.0.113.9';
        $hash = \Mors\Auth\Request_Identity::voter_hash();
        $future = gmdate( 'Y-m-d H:i:s', time() + 3600 );
        ( new \Mors\Db\Votes_Repo() )->upsert_voter( $hash, gmdate( 'Y-m-d H:i:s' ), $future );

        $req = new WP_REST_Request( 'GET', '/mors/v1/voter/status' );
        $res = rest_do_request( $req );
        $data = $res->get_data();
        $this->assertTrue( $data['inCooldown'] );
        $this->assertSame( $future, $data['nextEligibleVoteAt'] );
    }

    public function test_votes_status_alias_route_registered() {
        $req = new WP_REST_Request( 'GET', '/mors/v1/votes/status' );
        $res = rest_do_request( $req );
        $this->assertSame( 200, $res->get_status() );
        $this->assertArrayHasKey( 'inCooldown', $res->get_data() );
    }

    public function test_cast_then_cooldown_returns_429() {
        // Przygotuj wpis w bieżącej edycji.
        $ed = ( new \Mors\Db\Editions_Repo() )->current();
        $tr = ( new \Mors\Db\Tracks_Repo() )->create( [ 'title' => 'T', 'artist' => 'A' ] );
        $e  = ( new \Mors\Db\Entries_Repo() )->create( [ 'edition_id' => $ed['id'], 'track_id' => $tr['id'], 'position' => 1 ] );
        $nonce = wp_create_nonce( 'wp_rest' );
        $mk = function () use ( $e, $nonce ) {
            $r = new WP_REST_Request( 'POST', '/mors/v1/votes/cast' );
            $r->set_header( 'X-WP-Nonce', $nonce );
            $r->set_header( 'Content-Type', 'application/json' );
            $r->set_body( wp_json_encode( [ 'trackIds' => [ $e['id'] ] ] ) );
            return rest_do_request( $r );
        };
        $this->assertSame( 200, $mk()->get_status() );
        $this->assertSame( 429, $mk()->get_status() );
    }
}
