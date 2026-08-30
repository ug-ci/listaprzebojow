<?php
// Statusy i trendy (VARCHAR w DB, stałe w kodzie).
final class Mors_Enum {
    const TRACK_STATUSES   = [ 'WAITING_ROOM', 'CHART', 'ARCHIVED', 'REJECTED' ];
    const EDITION_STATUSES = [ 'DRAFT', 'ACTIVE', 'FROZEN', 'BROADCASTING', 'ARCHIVED' ];
    const TRENDS           = [ 'NEW', 'UP', 'DOWN', 'SAME', 'REENTRY' ];
    const CAP_EDIT_MUSIC   = 'mors_edit_music';
    const CAP_PRESENT      = 'mors_present';
    const CAP_MANAGE       = 'mors_manage_editors';
}

if ( ! function_exists( 'mors_parse_duration' ) ) {
    /**
     * Parsuje czas trwania w formacie "m:ss" na sekundy. Port parseDuration()
     * z app/src/routes/admin.js — przy braku wartości lub złym formacie zwraca
     * $fallback zamiast rzucać wyjątek (upload nie powinien się wywalać na
     * niepoprawnym polu czasu trwania).
     */
    function mors_parse_duration( $str, $fallback = 210 ) {
        if ( ! $str ) { return $fallback; }
        $parts = explode( ':', (string) $str );
        if ( count( $parts ) !== 2 ) { return $fallback; }
        list( $m, $s ) = $parts;
        if ( ! is_numeric( $m ) || ! is_numeric( $s ) ) { return $fallback; }
        return ( (int) $m ) * 60 + (int) $s;
    }
}
