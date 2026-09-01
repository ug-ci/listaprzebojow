<?php
class Test_Scheduler extends Mors_TestCase {

    public function tearDown(): void {
        \Mors\Scheduler::clear();
        delete_option( \Mors\Scheduler::OPT_WEEKDAY );
        delete_option( \Mors\Scheduler::OPT_TIME );
        parent::tearDown();
    }

    public function test_save_sets_options_and_schedules_event() {
        \Mors\Scheduler::save( 5, '18:00' );
        $this->assertSame( 5, \Mors\Scheduler::get_weekday() );
        $this->assertSame( '18:00', \Mors\Scheduler::get_time() );
        $this->assertNotFalse( \Mors\Scheduler::next_scheduled() );
    }

    public function test_invalid_values_fall_back_to_defaults() {
        \Mors\Scheduler::save( 99, 'nonsense' );
        $this->assertSame( \Mors\Scheduler::DEFAULT_WEEKDAY, \Mors\Scheduler::get_weekday() );
        $this->assertSame( \Mors\Scheduler::DEFAULT_TIME, \Mors\Scheduler::get_time() );
    }

    public function test_next_timestamp_lands_on_selected_weekday_and_time() {
        \Mors\Scheduler::save( 5, '18:00' ); // piątek 18:00
        $ts = \Mors\Scheduler::next_timestamp();
        $dt = new \DateTime( '@' . $ts );
        $dt->setTimezone( wp_timezone() );
        $this->assertSame( '5', $dt->format( 'w' ) ); // 5 = piątek
        $this->assertSame( '18:00', $dt->format( 'H:i' ) );
        $this->assertGreaterThan( time(), $ts );
    }
}
