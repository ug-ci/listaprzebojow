<?php
namespace Mors\Admin;

if ( ! defined( 'ABSPATH' ) ) { exit; }

/**
 * Menu wp-admin „Lista przebojów" — hostuje tę samą SPA (templates/public-app.php,
 * assets/js/app.js) w trybie panelu redakcji. Cztery podstrony (każda ustawia
 * morsData.adminSection, po którym SPA pokazuje właściwą sekcję — patrz
 * assets/js/app.js: applyAdminSection()):
 *   • „Panel redaktora”  (slug radio-mors)          → 'dashboard' (upload + skrót)
 *   • „Notowanie”        (slug radio-mors-chart)    → 'chart'
 *   • „Poczekalnia”      (slug radio-mors-waiting)  → 'waiting'
 *   • „Ustawienia listy” (slug radio-mors-settings) → 'settings'
 */
class Admin_Page {

    const MENU_SLUG     = 'radio-mors';
    const CHART_SLUG    = 'radio-mors-chart';
    const WAITING_SLUG  = 'radio-mors-waiting';
    const SETTINGS_SLUG = 'radio-mors-settings';

    /** Mapa: hook suffix strony => nazwa sekcji SPA (ustawiane w menu(), czytane w assets()). */
    private static $section_by_hook = [];

    public static function register() {
        add_action( 'admin_menu', [ self::class, 'menu' ] );
        add_action( 'admin_enqueue_scripts', [ self::class, 'assets' ] );
    }

    public static function menu() {
        $cap = \Mors_Enum::CAP_EDIT_MUSIC;

        $top = add_menu_page(
            'Lista przebojów',
            'Lista przebojów',
            $cap,
            self::MENU_SLUG,
            [ self::class, 'render' ],
            'dashicons-list-view',
            30
        );

        // Pierwsze podmenu = ta sama slug, przemianowuje auto-utworzoną pozycję na „Panel redaktora”.
        $dash = add_submenu_page( self::MENU_SLUG, 'Panel redaktora', 'Panel redaktora', $cap, self::MENU_SLUG, [ self::class, 'render' ] );
        $chart = add_submenu_page( self::MENU_SLUG, 'Notowanie', 'Notowanie', $cap, self::CHART_SLUG, [ self::class, 'render' ] );
        $waiting = add_submenu_page( self::MENU_SLUG, 'Poczekalnia', 'Poczekalnia', $cap, self::WAITING_SLUG, [ self::class, 'render' ] );
        $settings = add_submenu_page( self::MENU_SLUG, 'Ustawienia listy', 'Ustawienia listy', $cap, self::SETTINGS_SLUG, [ self::class, 'render' ] );

        self::$section_by_hook = [];
        foreach ( [ $top => 'dashboard', $dash => 'dashboard', $chart => 'chart', $waiting => 'waiting', $settings => 'settings' ] as $hook => $section ) {
            if ( $hook ) { self::$section_by_hook[ $hook ] = $section; }
        }
    }

    /**
     * Kolejkujemy te same assety co Mors\Frontend\Shortcode, ale tylko na stronach
     * panelu, żeby nie ładować SPA w całym wp-admin. adminSection zależy od podstrony.
     */
    public static function assets( $hook ) {
        if ( ! isset( self::$section_by_hook[ $hook ] ) ) { return; }
        $section = self::$section_by_hook[ $hook ];

        wp_enqueue_style(
            \Mors\Frontend\Shortcode::HANDLE,
            MORS_PLUGIN_URL . 'assets/css/styles.css',
            [],
            MORS_VERSION
        );

        wp_enqueue_script(
            'mors-lucide',
            MORS_PLUGIN_URL . 'assets/js/lucide.min.js',
            [],
            MORS_VERSION,
            true
        );

        wp_enqueue_script(
            \Mors\Frontend\Shortcode::HANDLE,
            MORS_PLUGIN_URL . 'assets/js/app.js',
            [ 'mors-lucide' ],
            MORS_VERSION,
            true
        );

        $current_user = wp_get_current_user();

        $can_manage = current_user_can( \Mors_Enum::CAP_MANAGE );
        $can_edit   = current_user_can( \Mors_Enum::CAP_EDIT_MUSIC );

        $role = 'PRESENTER';
        if ( $can_manage ) {
            $role = 'SUPER_ADMIN';
        } elseif ( $can_edit ) {
            $role = 'MUSIC_EDITOR';
        }

        wp_localize_script( \Mors\Frontend\Shortcode::HANDLE, 'morsData', [
            'restUrl'         => esc_url_raw( rest_url( 'mors/v1' ) ),
            'nonce'           => wp_create_nonce( 'wp_rest' ),
            'isAdminPanel'    => true,
            'isEditor'        => $can_edit,
            'currentUserId'   => get_current_user_id(),
            'currentUserName' => $current_user->display_name,
            'role'            => $role,
            'adminSection'    => $section,
        ] );
    }

    public static function render() {
        echo '<div class="wrap">';
        include MORS_PLUGIN_DIR . 'templates/public-app.php';
        echo '</div>';
    }
}
