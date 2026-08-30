<?php
class Test_Vote_Service extends Mors_TestCase {
    private $editionId; private $entryIds;
    public function setUp(): void {
        parent::setUp();
        \Mors\Activator::activate();
        // Przygotuj edycję z 3 wpisami.
        $ed = ( new \Mors\Db\Editions_Repo() )->current();
        $this->editionId = $ed['id'];
        $tracks = new \Mors\Db\Tracks_Repo();
        $entries = new \Mors\Db\Entries_Repo();
        $this->entryIds = [];
        foreach ( [ 'A', 'B', 'C' ] as $name ) {
            $tr = $tracks->create( [ 'title' => $name, 'artist' => 'X', 'status' => 'CHART' ] );
            $e = $entries->create( [ 'edition_id' => $this->editionId, 'track_id' => $tr['id'], 'position' => 1 ] );
            $this->entryIds[] = $e['id'];
        }
    }
    public function test_cast_increments_votes_and_sets_cooldown() {
        $svc = new \Mors\Domain\Vote_Service();
        $out = $svc->cast( [ $this->entryIds[0], $this->entryIds[1] ], 'hashA', '1.2.3.4', 'UA' );
        $this->assertTrue( $out['success'] );
        $this->assertNotEmpty( $out['nextEligibleVoteAt'] );
        $voter = ( new \Mors\Db\Votes_Repo() )->find_voter( 'hashA' );
        $this->assertNotNull( $voter );
    }
    public function test_rejects_more_than_three() {
        $this->expectException( \Mors\Domain\Vote_Exception::class );
        ( new \Mors\Domain\Vote_Service() )->cast(
            array_merge( $this->entryIds, [ 'x' ] ), 'h', '1.1.1.1', 'UA' );
    }
    public function test_rejects_duplicates() {
        $this->expectException( \Mors\Domain\Vote_Exception::class );
        ( new \Mors\Domain\Vote_Service() )->cast(
            [ $this->entryIds[0], $this->entryIds[0] ], 'h', '1.1.1.1', 'UA' );
    }
    public function test_cooldown_blocks_second_vote() {
        $svc = new \Mors\Domain\Vote_Service();
        $svc->cast( [ $this->entryIds[0] ], 'hashB', '2.2.2.2', 'UA' );
        try {
            $svc->cast( [ $this->entryIds[1] ], 'hashB', '2.2.2.2', 'UA' );
            $this->fail( 'Powinien rzucić COOLDOWN' );
        } catch ( \Mors\Domain\Vote_Exception $e ) {
            $this->assertSame( 'COOLDOWN', $e->code );
        }
    }
}
