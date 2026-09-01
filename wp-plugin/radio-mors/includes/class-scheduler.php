<?php
namespace Mors;

if ( ! defined( 'ABSPATH' ) ) { exit; }

use Mors\Domain\Chart_Engine;

/**
 * Harmonogram automatycznego resetu notowania (WP-Cron).
 * Ustawienia (dzień tygodnia + godzina) trzymane w opcjach; event tygodniowy
 * odpala Chart_Engine::reset_and_publish(). Konfiguracja z „Ustawienia listy".
 */
class Scheduler {

    const HOOK            = 'mors_do_scheduled_reset';
    const OPT_WEEKDAY     = 'mors_reset_weekday';   // 0=niedziela .. 6=sobota
    const OPT_TIME        = 'mors_reset_time';       // 'HH:MM' (czas lokalny WP)
    const DEFAULT_WEEKDAY = 5;                       // piątek
    const DEFAULT_TIME    = '18:00';

    public static function register() {
        // Upewnij się, że harmonogram „weekly" istnieje (WP ma go od 5.4, ale bezpiecznie).
        add_filter( 'cron_schedules', [ self::class, 'add_weekly_schedule' ] );
        add_action( self::HOOK, [ self::class, 'run_reset' ] );
        // Samonaprawa: jeśli event nie jest zaplanowany, zaplanuj wg opcji.
        add_action( 'init', [ self::class, 'ensure_scheduled' ] );
    }

    public static function add_weekly_schedule( $schedules ) {
        if ( ! isset( $schedules['weekly'] ) ) {
            $schedules['weekly'] = [ 'interval' => WEEK_IN_SECONDS, 'display' => 'Co tydzień' ];
        }
        return $schedules;
    }

    public static function get_weekday() {
        $w = (int) get_option( self::OPT_WEEKDAY, self::DEFAULT_WEEKDAY );
        return ( $w >= 0 && $w <= 6 ) ? $w : self::DEFAULT_WEEKDAY;
    }

    public static function get_time() {
        $t = (string) get_option( self::OPT_TIME, self::DEFAULT_TIME );
        return preg_match( '/^\d{2}:\d{2}$/', $t ) ? $t : self::DEFAULT_TIME;
    }

    public static function ensure_scheduled() {
        if ( ! wp_next_scheduled( self::HOOK ) ) {
            wp_schedule_event( self::next_timestamp(), 'weekly', self::HOOK );
        }
    }

    public static function reschedule() {
        wp_clear_scheduled_hook( self::HOOK );
        wp_schedule_event( self::next_timestamp(), 'weekly', self::HOOK );
    }

    public static function clear() {
        wp_clear_scheduled_hook( self::HOOK );
    }

    public static function next_scheduled() {
        return wp_next_scheduled( self::HOOK );
    }

    /** Najbliższy timestamp (UTC epoch) dla wybranego dnia tygodnia + godziny w strefie WP. */
    public static function next_timestamp() {
        $tz     = wp_timezone();
        $now    = new \DateTime( 'now', $tz );
        $target = clone $now;
        list( $h, $m ) = array_map( 'intval', explode( ':', self::get_time() ) );
        $target->setTime( $h, $m, 0 );

        $weekday = self::get_weekday();
        $dow     = (int) $target->format( 'w' );
        $diff    = ( $weekday - $dow + 7 ) % 7;
        if ( 0 === $diff && $target <= $now ) { $diff = 7; }
        if ( $diff > 0 ) { $target->modify( "+{$diff} days" ); }

        return $target->getTimestamp();
    }

    public static function run_reset() {
        try {
            ( new Chart_Engine() )->reset_and_publish( 0 );
        } catch ( \Throwable $e ) {
            // Brak aktywnej edycji itp. — pomijamy (cykl spróbuje ponownie za tydzień).
        }
    }

    /** Zapis ustawień + przeplanowanie. Zwraca znormalizowane wartości. */
    public static function save( $weekday, $time ) {
        $weekday = (int) $weekday;
        if ( $weekday < 0 || $weekday > 6 ) { $weekday = self::DEFAULT_WEEKDAY; }
        if ( ! preg_match( '/^\d{2}:\d{2}$/', (string) $time ) ) { $time = self::DEFAULT_TIME; }

        update_option( self::OPT_WEEKDAY, $weekday );
        update_option( self::OPT_TIME, $time );
        self::reschedule();

        return [ 'weekday' => $weekday, 'time' => $time ];
    }
}
