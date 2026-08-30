<?php
namespace Mors\Db;
class Entries_Repo extends Repo {
    public function for_edition( $editionId, $waiting ) {
        $db = $this->wpdb(); $t = $this->t();
        $sql = $db->prepare(
            "SELECT e.*, tr.title, tr.artist, tr.album, tr.genre, tr.cover_image_url,
                    tr.audio_key, tr.bpm, tr.duration_seconds, tr.peak_position,
                    tr.total_weeks_on_chart
             FROM {$t['entries']} e
             JOIN {$t['tracks']} tr ON tr.id = e.track_id
             WHERE e.edition_id = %s AND e.is_waiting = %d
             ORDER BY e.votes_count DESC",
            $editionId, $waiting ? 1 : 0 );
        return $db->get_results( $sql, ARRAY_A ) ?: [];
    }
    public function by_ids( array $ids, $editionId ) {
        if ( ! $ids ) { return []; }
        $db = $this->wpdb(); $t = $this->t();
        $ph = implode( ',', array_fill( 0, count( $ids ), '%s' ) );
        $sql = $db->prepare(
            "SELECT * FROM {$t['entries']} WHERE id IN ($ph) AND edition_id = %s",
            array_merge( $ids, [ $editionId ] ) );
        return $db->get_results( $sql, ARRAY_A ) ?: [];
    }
    public function create( array $data ) {
        $db = $this->wpdb(); $t = $this->t();
        $data = array_merge( [ 'id' => $this->new_id(), 'trend' => 'NEW',
            'votes_count' => 0, 'weeks_on_chart' => 1, 'is_waiting' => 0 ], $data );
        $db->insert( $t['entries'], $data );
        return $data;
    }
    public function increment_votes( $entryId ) {
        $db = $this->wpdb(); $t = $this->t();
        $db->query( $db->prepare(
            "UPDATE {$t['entries']} SET votes_count = votes_count + 1 WHERE id = %s", $entryId ) );
    }
}
