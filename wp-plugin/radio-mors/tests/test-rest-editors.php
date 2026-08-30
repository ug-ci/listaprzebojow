<?php
/**
 * /admin/editors — "redaktorzy" to zwykli użytkownicy WP z capability
 * mors_edit_music / mors_present (brak osobnej tabeli AdminUser).
 */
class Test_Rest_Editors extends Mors_TestCase {

    const TEST_EMAIL = 'jan.kowalski.mors-test@example.com';

    public function setUp(): void {
        parent::setUp();
        \Mors\Activator::activate();
        do_action( 'rest_api_init' );

        // Idempotencja: tabele wp_users nie są truncate'owane między przebiegami
        // (Mors_TestCase czyści tylko tabele mors_), więc usuwamy ręcznie
        // ewentualnego użytkownika testowego z poprzedniego uruchomienia.
        if ( ! function_exists( 'wp_delete_user' ) ) {
            require_once ABSPATH . 'wp-admin/includes/user.php';
        }
        $existing = get_user_by( 'email', self::TEST_EMAIL );
        if ( $existing ) {
            wp_delete_user( $existing->ID );
        }
    }

    private function req( $method, $route, $body = null ) {
        $r = new WP_REST_Request( $method, $route );
        $r->set_header( 'X-WP-Nonce', wp_create_nonce( 'wp_rest' ) );
        if ( $body !== null ) {
            $r->set_body_params( $body );
        }
        return rest_do_request( $r );
    }

    public function test_anonymous_cannot_list_or_create_editors() {
        wp_set_current_user( 0 );
        $this->assertSame( 403, $this->req( 'GET', '/mors/v1/admin/editors' )->get_status() );
        $this->assertSame( 403, $this->req( 'POST', '/mors/v1/admin/editors', [
            'fullName' => 'Ktoś',
            'email'    => 'ktos@example.com',
            'role'     => 'MUSIC_EDITOR',
        ] )->get_status() );
    }

    public function test_administrator_can_create_list_and_remove_editor() {
        $admin = self::factory()->user->create( [ 'role' => 'administrator' ] );
        wp_set_current_user( $admin );

        $create = $this->req( 'POST', '/mors/v1/admin/editors', [
            'fullName' => 'Jan Kowalski',
            'email'    => self::TEST_EMAIL,
            'role'     => 'MUSIC_EDITOR',
        ] );
        $this->assertSame( 200, $create->get_status() );
        $data = $create->get_data();
        $this->assertTrue( $data['success'] );
        $this->assertArrayHasKey( 'tempPassword', $data );
        $this->assertNotEmpty( $data['tempPassword'] );

        $editor = $data['editor'];
        $this->assertSame( self::TEST_EMAIL, $editor['email'] );
        $this->assertSame( 'Jan Kowalski', $editor['fullName'] );
        $this->assertSame( 'MUSIC_EDITOR', $editor['role'] );
        $this->assertTrue( $editor['isActive'] );

        $userId = $editor['id'];
        $this->assertTrue( user_can( $userId, \Mors_Enum::CAP_EDIT_MUSIC ) );

        // Duplicate email -> 409.
        $dup = $this->req( 'POST', '/mors/v1/admin/editors', [
            'fullName' => 'Inny',
            'email'    => self::TEST_EMAIL,
            'role'     => 'MUSIC_EDITOR',
        ] );
        $this->assertSame( 409, $dup->get_status() );
        $this->assertFalse( $dup->get_data()['success'] );

        // Missing fields -> 400.
        $bad = $this->req( 'POST', '/mors/v1/admin/editors', [ 'email' => 'brak-imienia@example.com' ] );
        $this->assertSame( 400, $bad->get_status() );
        $this->assertFalse( $bad->get_data()['success'] );

        // GET includes the newly created editor.
        $list = $this->req( 'GET', '/mors/v1/admin/editors' );
        $this->assertSame( 200, $list->get_status() );
        $found = null;
        foreach ( $list->get_data()['editors'] as $e ) {
            if ( (int) $e['id'] === (int) $userId ) {
                $found = $e;
            }
        }
        $this->assertNotNull( $found );
        $this->assertSame( 'MUSIC_EDITOR', $found['role'] );

        // DELETE removes the editorial capabilities but keeps the WP account.
        $del = $this->req( 'DELETE', '/mors/v1/admin/editors/' . $userId );
        $this->assertSame( 200, $del->get_status() );
        $this->assertTrue( $del->get_data()['success'] );
        $this->assertFalse( user_can( $userId, \Mors_Enum::CAP_EDIT_MUSIC ) );
        $this->assertFalse( user_can( $userId, \Mors_Enum::CAP_PRESENT ) );
        $this->assertNotNull( get_user_by( 'id', $userId ) );
    }

    public function test_remove_missing_user_returns_404() {
        $admin = self::factory()->user->create( [ 'role' => 'administrator' ] );
        wp_set_current_user( $admin );

        $del = $this->req( 'DELETE', '/mors/v1/admin/editors/999999' );
        $this->assertSame( 404, $del->get_status() );
        $this->assertFalse( $del->get_data()['success'] );
    }
}
