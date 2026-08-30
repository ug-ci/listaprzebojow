<?php
class Test_Plugin extends WP_UnitTestCase {
    public function test_constants_defined() {
        $this->assertTrue( defined( 'MORS_VERSION' ) );
        $this->assertNotEmpty( MORS_PLUGIN_DIR );
    }
    public function test_plugin_class_loads_via_autoload() {
        $this->assertTrue( class_exists( '\\Mors\\Plugin' ) );
        $this->assertInstanceOf( '\\Mors\\Plugin', \Mors\Plugin::instance() );
    }
}
