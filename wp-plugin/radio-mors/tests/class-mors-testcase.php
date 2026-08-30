<?php
/**
 * Baza dla testów dotykających bazy danych.
 *
 * Repo::tx() wydaje surowe "START TRANSACTION", które w MySQL niejawnie
 * zatwierdza (implicit COMMIT) transakcję zewnętrzną, którą WP_UnitTestCase
 * otwiera do izolacji testów przez rollback. Dlatego każdy test wywołujący
 * serwis korzystający z tx() (np. Vote_Service) zostawiał wiersze fixture
 * NA TRWAŁE w bazie testowej zamiast cofnąć je po teście.
 *
 * Rozwiązanie: czyścimy (TRUNCATE) wszystkie tabele mors_ na starcie KAŻDEGO
 * testu — to czyni każdy test hermetycznym niezależnie od zachowania tx().
 * Testy potrzebujące danych startowych nadal wywołują \Mors\Activator::activate()
 * we własnym setUp() PO parent::setUp() — activate() zasieje dane od nowa,
 * bo tabela jest już pusta.
 */
class Mors_TestCase extends WP_UnitTestCase {
    public function setUp(): void {
        parent::setUp();
        global $wpdb;
        foreach ( \Mors\Db\Schema::table_names() as $t ) {
            // Pierwszy test w całym przebiegu może uruchomić się zanim jakikolwiek
            // test zdążył wywołać Activator::activate() — tabele mors_ jeszcze
            // nie istnieją. TRUNCATE nieistniejącej tabeli tylko zaśmieca log
            // błędem wpdb (a przy WP_DEBUG_DISPLAY mogłoby stać się fatalne),
            // więc czyścimy wyłącznie te, które faktycznie już istnieją.
            if ( $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $t ) ) === $t ) {
                $wpdb->query( "TRUNCATE TABLE {$t}" );
            }
        }
    }
}
