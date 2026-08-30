<?php
namespace Mors;
class Plugin {
    private static $instance;
    public static function instance() {
        if ( ! self::$instance ) { self::$instance = new self(); }
        return self::$instance;
    }
    public function boot() {
        add_action( 'rest_api_init', [ $this, 'register_rest_routes' ] );
        \Mors\Frontend\Shortcode::register();
        if ( is_admin() ) {
            \Mors\Admin\Admin_Page::register();
        }
    }

    public function register_rest_routes() {
        ( new \Mors\Rest\Chart() )->register();
        ( new \Mors\Rest\Votes() )->register();
        ( new \Mors\Rest\Admin() )->register();
    }
}
