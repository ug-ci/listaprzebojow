<?php
class Test_Admin_Page extends WP_UnitTestCase {
    public function test_menu_added_for_capable_user() {
        $uid = self::factory()->user->create( [ 'role' => 'administrator' ] );
        wp_set_current_user( $uid );
        set_current_screen( 'dashboard' );
        \Mors\Admin\Admin_Page::register();
        do_action( 'admin_menu' );
        global $menu;
        $slugs = wp_list_pluck( (array) $menu, 2 );
        $this->assertContains( 'radio-mors', $slugs );
    }
}
