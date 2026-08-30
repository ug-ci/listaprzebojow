<?php
namespace Mors\Rest;

use Mors\Auth\Request_Identity;
use Mors\Db\Votes_Repo;

/**
 * Publiczny endpoint statusu głosującego (cooldown). Oryginalny serwer montował
 * router pod obydwoma prefiksami — /voter/status i /votes/status — więc
 * rejestrujemy ten sam handler pod oboma ścieżkami, żeby SPA (które woła
 * /voter/status) i ewentualni starsi klienci (/votes/status) działały tak samo.
 *
 * POST /votes/cast jest dokładany w Tasku 7 — nie ma go tutaj celowo.
 */
class Votes {

    public function register() {
        register_rest_route( 'mors/v1', '/voter/status', [
            'methods'             => 'GET',
            'permission_callback' => '__return_true',
            'callback'            => [ $this, 'status' ],
        ] );
        register_rest_route( 'mors/v1', '/votes/status', [
            'methods'             => 'GET',
            'permission_callback' => '__return_true',
            'callback'            => [ $this, 'status' ],
        ] );
    }

    public function status() {
        $hash  = Request_Identity::voter_hash();
        $voter = ( new Votes_Repo() )->find_voter( $hash );

        $inCooldown = false;
        $next       = null;
        if ( $voter && strtotime( $voter['next_eligible_vote_at'] . ' UTC' ) > time() ) {
            $inCooldown = true;
            $next       = $voter['next_eligible_vote_at'];
        }

        return new \WP_REST_Response( [
            'success'          => true,
            'inCooldown'       => $inCooldown,
            'nextEligibleVoteAt' => $next,
        ], 200 );
    }
}
