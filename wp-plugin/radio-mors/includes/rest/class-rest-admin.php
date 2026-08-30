<?php
namespace Mors\Rest;

use Mors\Db\Editions_Repo;
use Mors\Db\Entries_Repo;
use Mors\Db\Tracks_Repo;
use Mors\Db\Votes_Repo;

/**
 * Admin REST: lista/upload/edycja/usuwanie utworów panelu redakcji.
 * Kształt odpowiedzi jest portem app/src/routes/admin.js (linie ~60-209),
 * NIE prostszej wersji z brief.md — patrz task-8-brief.md „CRITICAL OVERRIDE”.
 *
 * Każda trasa wymaga nagłówka X-WP-Nonce (akcja 'wp_rest') ORAZ capability
 * mors_edit_music (require_cap jako wspólny permission_callback).
 */
class Admin {

    public function register() {
        $cap = [ $this, 'require_cap' ];

        register_rest_route( 'mors/v1', '/admin/tracks', [
            'methods'             => 'GET',
            'permission_callback' => $cap,
            'callback'            => [ $this, 'list_tracks' ],
        ] );

        register_rest_route( 'mors/v1', '/admin/tracks/upload', [
            'methods'             => 'POST',
            'permission_callback' => $cap,
            'callback'            => [ $this, 'upload_track' ],
        ] );

        register_rest_route( 'mors/v1', '/admin/tracks/(?P<id>[a-f0-9-]+)', [
            [ 'methods' => 'PUT',    'permission_callback' => $cap, 'callback' => [ $this, 'update_track' ] ],
            [ 'methods' => 'DELETE', 'permission_callback' => $cap, 'callback' => [ $this, 'delete_track' ] ],
        ] );
    }

    /** Wspólny permission_callback: nonce transportu + capability redakcyjna. */
    public function require_cap( $req ) {
        $nonce = $req->get_header( 'x_wp_nonce' );
        if ( ! $nonce || ! wp_verify_nonce( $nonce, 'wp_rest' ) ) {
            return new \WP_Error( 'mors_bad_nonce', 'Nieprawidłowy token żądania.', [ 'status' => 403 ] );
        }
        if ( ! current_user_can( \Mors_Enum::CAP_EDIT_MUSIC ) ) {
            return new \WP_Error( 'mors_forbidden', 'Brak uprawnień.', [ 'status' => 403 ] );
        }
        return true;
    }

    /**
     * GET /admin/tracks — utwory ze statusem CHART lub WAITING_ROOM, najnowsze
     * pierwsze. `section`/`votes` liczone względem wpisu w BIEŻĄCEJ edycji
     * (jeśli istnieje); bez wpisu — wnioskowane ze statusu utworu.
     */
    public function list_tracks( $req ) {
        $rows = ( new Tracks_Repo() )->all();
        $rows = array_values( array_filter( $rows, static function ( $row ) {
            return in_array( $row['status'], [ 'CHART', 'WAITING_ROOM' ], true );
        } ) );

        $entryByTrack = [];
        $edition = ( new Editions_Repo() )->current();
        if ( $edition ) {
            $entriesRepo = new Entries_Repo();
            $all = array_merge(
                $entriesRepo->for_edition( $edition['id'], false ),
                $entriesRepo->for_edition( $edition['id'], true )
            );
            foreach ( $all as $entry ) {
                $entryByTrack[ $entry['track_id'] ] = $entry;
            }
        }

        $tracks = array_map( static function ( $t ) use ( $entryByTrack ) {
            $entry = isset( $entryByTrack[ $t['id'] ] ) ? $entryByTrack[ $t['id'] ] : null;
            if ( $entry ) {
                $section = ( (int) $entry['is_waiting'] === 1 ) ? 'Poczekalnia' : 'Notowanie';
            } else {
                $section = ( $t['status'] === 'CHART' ) ? 'Notowanie' : 'Poczekalnia';
            }
            return [
                'id'            => $t['id'],
                'title'         => $t['title'],
                'artist'        => $t['artist'],
                'album'         => $t['album'],
                'genre'         => $t['genre'],
                'coverImageUrl' => $t['cover_image_url'],
                'status'        => $t['status'],
                'section'       => $section,
                'votes'         => $entry ? (int) $entry['votes_count'] : 0,
            ];
        }, $rows );

        return new \WP_REST_Response( [ 'success' => true, 'tracks' => $tracks ], 200 );
    }

    /**
     * POST /admin/tracks/upload (multipart) — title, artist, target ('chart'|'waiting'),
     * duration ("m:ss"), opcjonalne pliki cover/audio. Tworzy Track + wpis w
     * bieżącej edycji w jednej transakcji.
     */
    public function upload_track( $req ) {
        $params = $req->get_params();
        $title   = isset( $params['title'] ) ? sanitize_text_field( $params['title'] ) : '';
        $artist  = isset( $params['artist'] ) ? sanitize_text_field( $params['artist'] ) : '';
        $target  = isset( $params['target'] ) ? sanitize_text_field( $params['target'] ) : '';
        $duration = isset( $params['duration'] ) ? sanitize_text_field( $params['duration'] ) : '';

        if ( ! $title || ! $artist ) {
            return new \WP_REST_Response(
                [ 'success' => false, 'message' => 'Wprowadź tytuł utworu i wykonawcę.' ], 400 );
        }

        $edition = ( new Editions_Repo() )->current();
        if ( ! $edition ) {
            return new \WP_REST_Response(
                [ 'success' => false, 'message' => 'Brak aktywnego notowania.' ], 409 );
        }

        $isChart = ( $target === 'chart' );
        $data = [
            'title'            => $title,
            'artist'           => $artist,
            'status'           => $isChart ? 'CHART' : 'WAITING_ROOM',
            'duration_seconds' => mors_parse_duration( $duration, 210 ),
        ];

        if ( ! empty( $_FILES['cover'] ) || ! empty( $_FILES['audio'] ) ) {
            require_once ABSPATH . 'wp-admin/includes/file.php';
            require_once ABSPATH . 'wp-admin/includes/media.php';
            require_once ABSPATH . 'wp-admin/includes/image.php';
        }
        if ( ! empty( $_FILES['cover'] ) ) {
            $cover_id = media_handle_upload( 'cover', 0 );
            if ( ! is_wp_error( $cover_id ) ) {
                $data['cover_image_url'] = wp_get_attachment_url( $cover_id );
            }
        }
        if ( ! empty( $_FILES['audio'] ) ) {
            $audio_id = media_handle_upload( 'audio', 0 );
            if ( ! is_wp_error( $audio_id ) ) {
                $data['audio_url'] = wp_get_attachment_url( $audio_id );
            }
        }

        $tracksRepo  = new Tracks_Repo();
        $entriesRepo = new Entries_Repo();

        $track = $tracksRepo->tx( function () use ( $tracksRepo, $entriesRepo, $data, $edition, $isChart ) {
            $track = $tracksRepo->create( $data );
            if ( $isChart ) {
                $position = $entriesRepo->max_chart_position( $edition['id'] ) + 1;
                $entriesRepo->create( [
                    'edition_id'     => $edition['id'],
                    'track_id'       => $track['id'],
                    'position'       => $position,
                    'is_waiting'     => 0,
                    'trend'          => 'NEW',
                    'weeks_on_chart' => 1,
                ] );
            } else {
                $entriesRepo->create( [
                    'edition_id'     => $edition['id'],
                    'track_id'       => $track['id'],
                    'position'       => null,
                    'is_waiting'     => 1,
                    'trend'          => 'NEW',
                    'weeks_on_chart' => 1,
                    'tag'            => 'Dodany przez redakcję',
                ] );
            }
            return $track;
        } );

        ( new Votes_Repo() )->log( get_current_user_id(), 'TRACK_UPLOAD', [
            'trackId' => $track['id'], 'title' => $title, 'target' => $target,
        ] );

        return new \WP_REST_Response( [ 'success' => true, 'track' => $track ], 200 );
    }

    /** PUT /admin/tracks/{id} — częściowa aktualizacja (tylko obecne klucze). */
    public function update_track( $req ) {
        $id   = $req['id'];
        $repo = new Tracks_Repo();
        if ( ! $repo->find( $id ) ) {
            return new \WP_REST_Response( [ 'success' => false, 'message' => 'Utwór nie istnieje.' ], 404 );
        }

        $params = $req->get_params();
        $data = [];
        foreach ( [ 'title', 'artist', 'album', 'genre' ] as $f ) {
            if ( array_key_exists( $f, $params ) ) {
                $data[ $f ] = sanitize_text_field( $params[ $f ] );
            }
        }
        if ( array_key_exists( 'bpm', $params ) ) {
            $data['bpm'] = ( $params['bpm'] === null || $params['bpm'] === '' ) ? null : (int) $params['bpm'];
        }
        if ( array_key_exists( 'durationSeconds', $params ) ) {
            $data['duration_seconds'] = ( $params['durationSeconds'] === null || $params['durationSeconds'] === '' )
                ? null : (int) $params['durationSeconds'];
        }

        $repo->update( $id, $data );
        ( new Votes_Repo() )->log( get_current_user_id(), 'TRACK_UPDATE', [ 'trackId' => $id ] );

        return new \WP_REST_Response( [ 'success' => true, 'track' => $repo->find( $id ) ], 200 );
    }

    /** DELETE /admin/tracks/{id} — kaskadowe usunięcie (wpisy + głosy + utwór). */
    public function delete_track( $req ) {
        $id   = $req['id'];
        $repo = new Tracks_Repo();
        if ( ! $repo->find( $id ) ) {
            return new \WP_REST_Response( [ 'success' => false, 'message' => 'Utwór nie istnieje.' ], 404 );
        }
        $repo->delete( $id );
        ( new Votes_Repo() )->log( get_current_user_id(), 'TRACK_DELETE', [ 'trackId' => $id ] );

        return new \WP_REST_Response( [ 'success' => true ], 200 );
    }
}
