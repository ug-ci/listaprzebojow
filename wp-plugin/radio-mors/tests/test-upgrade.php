<?php
class Test_Upgrade extends Mors_TestCase {
    /**
     * Symuluje realny scenariusz gapu opisanego w Task 12: wtyczka jest
     * aktualizowana bez deaktywacji/reaktywacji, a nowa wersja dodaje kolumnę
     * (np. audio_url) do istniejącej tabeli. Usuwamy kolumnę `bpm` z `tracks`,
     * cofamy zapisaną wersję DB, i sprawdzamy, że maybe_upgrade() (dbDelta,
     * idempotentnie) dokłada brakującą kolumnę i aktualizuje mors_db_version.
     *
     * Uwaga: w środowisku testowym WP_UnitTestCase przepisuje surowe
     * "CREATE/DROP TABLE" na wersje TEMPORARY (patrz start_transaction()),
     * więc test operuje na ALTER TABLE (nieobjęte tym przepisywaniem) zamiast
     * usuwać/odtwarzać całą tabelę.
     */
    public function test_maybe_upgrade_adds_missing_column_and_bumps_version() {
        \Mors\Activator::activate();

        global $wpdb;
        $t = \Mors\Db\Schema::table_names();

        $wpdb->query( "ALTER TABLE {$t['tracks']} DROP COLUMN bpm" );
        update_option( 'mors_db_version', '0.9.0' );

        $columns_before = $wpdb->get_col( "DESCRIBE {$t['tracks']}" );
        $this->assertNotContains( 'bpm', $columns_before, 'Kolumna bpm powinna nie istnieć przed upgrade.' );

        \Mors\Upgrader::maybe_upgrade();

        $columns_after = $wpdb->get_col( "DESCRIBE {$t['tracks']}" );
        $this->assertContains( 'bpm', $columns_after, 'maybe_upgrade() powinno dodać brakującą kolumnę przez dbDelta.' );
        $this->assertSame( MORS_VERSION, get_option( 'mors_db_version' ) );
    }

    public function test_maybe_upgrade_is_noop_when_version_already_current() {
        update_option( 'mors_db_version', MORS_VERSION );
        \Mors\Upgrader::maybe_upgrade();
        $this->assertSame( MORS_VERSION, get_option( 'mors_db_version' ) );
    }

    public function test_activator_sets_db_version() {
        delete_option( 'mors_db_version' );
        \Mors\Activator::activate();
        $this->assertSame( MORS_VERSION, get_option( 'mors_db_version' ) );
    }
}
