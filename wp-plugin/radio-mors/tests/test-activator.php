<?php
class Test_Activator extends Mors_TestCase {
    public function test_tables_created_and_edition_seeded() {
        global $wpdb;
        \Mors\Activator::activate();
        $tables = \Mors\Db\Schema::table_names();
        foreach ( $tables as $t ) {
            $found = $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $t ) );
            $this->assertSame( $t, $found, "Brak tabeli $t" );
        }
        $count = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$tables['editions']}" );
        $this->assertGreaterThanOrEqual( 1, $count );
    }
    public function test_admin_role_gets_capabilities() {
        \Mors\Activator::activate();
        $admin = get_role( 'administrator' );
        $this->assertTrue( $admin->has_cap( Mors_Enum::CAP_EDIT_MUSIC ) );
        $this->assertTrue( $admin->has_cap( Mors_Enum::CAP_MANAGE ) );
    }
}
