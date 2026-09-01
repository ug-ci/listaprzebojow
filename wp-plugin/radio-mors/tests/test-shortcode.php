<?php
class Test_Shortcode extends WP_UnitTestCase {
    public function setUp(): void {
        parent::setUp();
        \Mors\Frontend\Shortcode::register();
    }

    public function test_shortcode_registered() {
        $this->assertTrue( shortcode_exists( 'lista_przebojow_mors' ) );
    }

    public function test_shortcode_renders_full_app_shell() {
        $html = do_shortcode( '[lista_przebojow_mors]' );
        // Kontener aplikacji SPA.
        $this->assertStringContainsString( 'id="mors-app"', $html );
        // Dowód, że renderuje się PEŁNY shell (statyczny DOM, do którego binduje app.js),
        // a nie sam pusty div — element listy notowania musi być obecny.
        $this->assertStringContainsString( 'id="chart-tracks-container"', $html );
        // Kolejne kluczowe elementy shellu wymagane przez SPA.
        $this->assertStringContainsString( 'id="view-waiting"', $html );
        $this->assertStringContainsString( 'id="voting-drawer"', $html );
        $this->assertStringContainsString( 'id="vote-verify-modal"', $html );
    }
}
