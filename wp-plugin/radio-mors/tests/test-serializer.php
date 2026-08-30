<?php
class Test_Serializer extends WP_UnitTestCase {

    private function chart_row( array $overrides = [] ) {
        return array_merge( [
            'id' => 'e1', 'track_id' => 't1', 'position' => 3, 'previous_position' => 5,
            'trend' => 'UP', 'votes_count' => 12, 'weeks_on_chart' => 4, 'is_waiting' => 0,
            'tag' => null,
            'title' => 'Song', 'artist' => 'Band', 'album' => null, 'genre' => 'Rock',
            'cover_image_url' => null, 'audio_key' => 'funk_bass', 'bpm' => 120,
            'duration_seconds' => 200, 'peak_position' => 2, 'total_weeks_on_chart' => 9,
        ], $overrides );
    }

    public function test_chart_entry_shape() {
        $row = $this->chart_row();
        $out = \Mors\Domain\Serializer::chart_entry( $row );

        $this->assertSame( 'e1', $out['id'] );
        $this->assertSame( 't1', $out['trackId'] );
        $this->assertSame( 3, $out['position'] );
        $this->assertSame( 5, $out['prevPosition'] );
        $this->assertSame( 'UP', $out['trend'] );
        $this->assertSame( 4, $out['weeks'] );
        $this->assertSame( 2, $out['peak'] );
        $this->assertSame( 'Song', $out['title'] );
        $this->assertSame( 'Band', $out['artist'] );
        $this->assertNull( $out['album'] );
        $this->assertSame( '3:20', $out['duration'] );
        $this->assertSame( 12, $out['votes'] );
        $this->assertContains( $out['coverBg'], [ '#0041d2', '#032c73', '#00214d' ] );
        $this->assertNull( $out['coverImage'] );
        $this->assertNull( $out['audioUrl'] );
        $this->assertSame( 120, $out['bpm'] );
        $this->assertSame( 'Rock', $out['genre'] );
        $this->assertSame( 'funk_bass', $out['audioKey'] );
        $this->assertTrue( $out['isChart'] );
    }

    public function test_chart_entry_default_audio_key_and_is_waiting_false() {
        $row = $this->chart_row( [ 'audio_key' => null, 'is_waiting' => 1 ] );
        $out = \Mors\Domain\Serializer::chart_entry( $row );

        $this->assertSame( 'synth_chill', $out['audioKey'] );
        $this->assertFalse( $out['isChart'] );
    }

    public function test_chart_entry_cover_image_and_audio_url_passthrough() {
        $row = $this->chart_row( [
            'cover_image_url' => 'https://example.com/cover.jpg',
            'audio_url' => 'https://example.com/audio.mp3',
        ] );
        $out = \Mors\Domain\Serializer::chart_entry( $row );

        $this->assertSame( 'https://example.com/cover.jpg', $out['coverImage'] );
        $this->assertSame( 'https://example.com/audio.mp3', $out['audioUrl'] );
    }

    public function test_cover_bg_is_deterministic_for_same_track_id() {
        $row1 = $this->chart_row( [ 'id' => 'e1', 'track_id' => 'same-track' ] );
        $row2 = $this->chart_row( [ 'id' => 'e2', 'track_id' => 'same-track' ] );
        $out1 = \Mors\Domain\Serializer::chart_entry( $row1 );
        $out2 = \Mors\Domain\Serializer::chart_entry( $row2 );

        $this->assertSame( $out1['coverBg'], $out2['coverBg'] );
    }

    private function waiting_row( array $overrides = [] ) {
        return array_merge( [
            'id' => 'e2', 'track_id' => 't2', 'position' => null, 'previous_position' => null,
            'trend' => 'NEW', 'votes_count' => 7, 'weeks_on_chart' => 2, 'is_waiting' => 1,
            'tag' => 'HOT',
            'title' => 'Waiting Song', 'artist' => 'Waiting Band', 'album' => null, 'genre' => 'Pop',
            'cover_image_url' => null, 'audio_key' => null, 'bpm' => 100,
            'duration_seconds' => 185, 'peak_position' => null, 'total_weeks_on_chart' => 2,
        ], $overrides );
    }

    public function test_waiting_entry_shape() {
        $row = $this->waiting_row();
        $out = \Mors\Domain\Serializer::waiting_entry( $row );

        $this->assertSame( 'e2', $out['id'] );
        $this->assertSame( 't2', $out['trackId'] );
        $this->assertSame( 'Waiting Song', $out['title'] );
        $this->assertSame( 'Waiting Band', $out['artist'] );
        $this->assertSame( '3:05', $out['duration'] );
        $this->assertSame( 7, $out['votes'] );
        $this->assertSame( 2, $out['weeksInWaiting'] );
        $this->assertContains( $out['coverBg'], [ '#0041d2', '#032c73', '#00214d' ] );
        $this->assertNull( $out['coverImage'] );
        $this->assertNull( $out['audioUrl'] );
        $this->assertSame( 'HOT', $out['tag'] );
        $this->assertFalse( $out['isChart'] );
        $this->assertArrayNotHasKey( 'position', $out );
    }

    public function test_edition_envelope() {
        $edition = [
            'id' => 'ed1', 'edition_number' => 42, 'title' => 'Edycja 42',
            'status' => 'ACTIVE', 'voting_ends_at' => '2026-09-01 12:00:00',
        ];
        $out = \Mors\Domain\Serializer::edition( $edition, [ $this->chart_row() ], [ $this->waiting_row() ] );

        $this->assertSame( 'ed1', $out['edition']['id'] );
        $this->assertSame( 42, $out['edition']['editionNumber'] );
        $this->assertCount( 1, $out['chart'] );
        $this->assertCount( 1, $out['waitingRoom'] );
        $this->assertSame( 'e1', $out['chart'][0]['id'] );
        $this->assertSame( 'e2', $out['waitingRoom'][0]['id'] );
        $this->assertTrue( $out['chart'][0]['isChart'] );
        $this->assertFalse( $out['waitingRoom'][0]['isChart'] );
    }
}
