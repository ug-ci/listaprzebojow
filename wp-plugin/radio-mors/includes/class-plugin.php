<?php
namespace Mors;
class Plugin {
    private static $instance;
    public static function instance() {
        if ( ! self::$instance ) { self::$instance = new self(); }
        return self::$instance;
    }
    public function boot() {
        // Kolejne taski dokładają tu rejestracje (rest_api_init, shortcode, admin_menu).
    }
}
