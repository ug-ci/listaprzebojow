<?php
namespace Mors;

if ( ! defined( 'ABSPATH' ) ) { exit; }

/**
 * Cloudflare Turnstile — weryfikacja antybotowa przy oddawaniu głosu.
 * Klucze (Site Key publiczny + Secret Key tajny) konfigurowane w „Ustawienia listy".
 * Weryfikacja wpięta w hook `mors_votes_can_cast` (fail-closed, gdy skonfigurowane).
 */
class Turnstile {

    const OPT_SITE   = 'mors_turnstile_site_key';
    const OPT_SECRET = 'mors_turnstile_secret_key';
    const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

    public static function register() {
        add_filter( 'mors_votes_can_cast', [ self::class, 'verify_request' ], 10, 2 );
    }

    public static function site_key() {
        return (string) get_option( self::OPT_SITE, '' );
    }

    public static function secret_key() {
        return (string) get_option( self::OPT_SECRET, '' );
    }

    /** Turnstile aktywny tylko gdy oba klucze ustawione. */
    public static function enabled() {
        return '' !== self::site_key() && '' !== self::secret_key();
    }

    /** Zapis kluczy. Secret aktualizowany tylko gdy podano niepusty (puste = zostaw obecny). */
    public static function save( $site, $secret ) {
        update_option( self::OPT_SITE, sanitize_text_field( (string) $site ) );
        if ( '' !== trim( (string) $secret ) ) {
            update_option( self::OPT_SECRET, sanitize_text_field( (string) $secret ) );
        }
    }

    /** Filtr `mors_votes_can_cast`: przepuszcza tylko z ważnym tokenem Turnstile. */
    public static function verify_request( $allowed, $req ) {
        if ( is_wp_error( $allowed ) ) { return $allowed; }
        if ( ! self::enabled() ) { return $allowed; } // brak konfiguracji -> nie blokujemy

        $token = (string) $req->get_header( 'x_turnstile_token' );
        if ( '' === $token ) {
            $body  = $req->get_json_params();
            $token = ( is_array( $body ) && isset( $body['turnstileToken'] ) ) ? (string) $body['turnstileToken'] : '';
        }
        $token = sanitize_text_field( $token );

        if ( '' === $token || ! self::verify_token( $token, \Mors\Auth\Request_Identity::client_ip() ) ) {
            return new \WP_Error(
                'mors_turnstile',
                'Weryfikacja antybotowa (Turnstile) nie powiodła się. Odśwież stronę i spróbuj ponownie.',
                [ 'status' => 403 ]
            );
        }
        return $allowed;
    }

    /** Wywołanie siteverify po stronie serwera. */
    public static function verify_token( $token, $ip ) {
        $resp = wp_remote_post( self::VERIFY_URL, [
            'timeout' => 8,
            'body'    => [
                'secret'   => self::secret_key(),
                'response' => $token,
                'remoteip' => $ip,
            ],
        ] );
        if ( is_wp_error( $resp ) ) { return false; }
        $data = json_decode( wp_remote_retrieve_body( $resp ), true );
        return ! empty( $data['success'] );
    }
}
