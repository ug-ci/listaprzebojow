<?php
class Test_Repos extends Mors_TestCase {
    public function setUp(): void { parent::setUp(); \Mors\Activator::activate(); }

    public function test_current_edition_returned() {
        $ed = ( new \Mors\Db\Editions_Repo() )->current();
        $this->assertNotNull( $ed );
        $this->assertSame( 'ACTIVE', $ed['status'] );
        $this->assertSame( 1, (int) $ed['is_current'] );
    }
    public function test_track_crud_roundtrip() {
        $repo = new \Mors\Db\Tracks_Repo();
        $t = $repo->create( [ 'title' => 'A', 'artist' => 'B', 'status' => 'WAITING_ROOM' ] );
        $this->assertNotEmpty( $t['id'] );
        $repo->update( $t['id'], [ 'title' => 'C' ] );
        $this->assertSame( 'C', $repo->find( $t['id'] )['title'] );
        $repo->delete( $t['id'] );
        $this->assertNull( $repo->find( $t['id'] ) );
    }
    public function test_tx_rolls_back_on_exception() {
        $repo = new \Mors\Db\Tracks_Repo();
        $before = count( $repo->all() );
        try {
            $repo->tx( function () use ( $repo ) {
                $repo->create( [ 'title' => 'X', 'artist' => 'Y' ] );
                throw new \RuntimeException( 'boom' );
            } );
        } catch ( \RuntimeException $e ) {}
        $this->assertSame( $before, count( $repo->all() ) );
    }
}
