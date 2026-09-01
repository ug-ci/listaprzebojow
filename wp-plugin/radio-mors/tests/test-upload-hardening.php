<?php
/**
 * Task 12 — hartowanie: upload w /admin/tracks/upload odrzuca pliki spoza
 * białej listy MIME oraz przekraczające limit rozmiaru, zanim trafią do
 * media_handle_upload()/Biblioteki mediów.
 */
class Test_Upload_Hardening extends Mors_TestCase {
    public function setUp(): void {
        parent::setUp();
        \Mors\Activator::activate();
        do_action( 'rest_api_init' );
    }

    public function tearDown(): void {
        unset( $_FILES['cover'], $_FILES['audio'] );
        parent::tearDown();
    }

    private function req_with_files( array $body ) {
        $r = new WP_REST_Request( 'POST', '/mors/v1/admin/tracks/upload' );
        $r->set_header( 'X-WP-Nonce', wp_create_nonce( 'wp_rest' ) );
        $r->set_body_params( $body );
        return rest_do_request( $r );
    }

    public function test_upload_rejects_disallowed_cover_mime() {
        $uid = self::factory()->user->create( [ 'role' => 'administrator' ] );
        wp_set_current_user( $uid );

        $tmp = wp_tempnam( 'mors-test' );
        file_put_contents( $tmp, 'to nie jest obrazek, tylko zwykly tekst' );

        $_FILES['cover'] = [
            'name'     => 'evil.txt',
            'type'     => 'text/plain',
            'tmp_name' => $tmp,
            'error'    => 0,
            'size'     => filesize( $tmp ),
        ];

        $res = $this->req_with_files( [
            'title' => 'Zła okładka', 'artist' => 'X', 'target' => 'chart', 'duration' => '3:00',
        ] );

        $this->assertSame( 400, $res->get_status() );
        $this->assertFalse( $res->get_data()['success'] );

        @unlink( $tmp );
    }

    public function test_upload_rejects_oversized_audio() {
        $uid = self::factory()->user->create( [ 'role' => 'administrator' ] );
        wp_set_current_user( $uid );

        $tmp = wp_tempnam( 'mors-test' );
        file_put_contents( $tmp, 'zawartosc nie ma znaczenia, liczy sie zglaszany rozmiar' );

        $_FILES['audio'] = [
            'name'     => 'big.mp3',
            'type'     => 'audio/mpeg',
            'tmp_name' => $tmp,
            'error'    => 0,
            'size'     => 16 * MB_IN_BYTES, // > limitu 15MB dla audio
        ];

        $res = $this->req_with_files( [
            'title' => 'Za duży plik', 'artist' => 'X', 'target' => 'chart', 'duration' => '3:00',
        ] );

        $this->assertSame( 400, $res->get_status() );
        $this->assertFalse( $res->get_data()['success'] );

        @unlink( $tmp );
    }

    public function test_upload_without_files_still_succeeds() {
        $uid = self::factory()->user->create( [ 'role' => 'administrator' ] );
        wp_set_current_user( $uid );

        $res = $this->req_with_files( [
            'title' => 'Bez plików', 'artist' => 'X', 'target' => 'chart', 'duration' => '3:00',
        ] );

        $this->assertSame( 200, $res->get_status() );
        $this->assertTrue( $res->get_data()['success'] );
    }
}
