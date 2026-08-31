<?php
namespace Mors\Admin;

if ( ! defined( 'ABSPATH' ) ) { exit; }

/**
 * Menu wp-admin „Lista przebojów" — hostuje tę samą SPA (templates/public-app.php,
 * assets/js/app.js) w trybie panelu redakcji. Dwie podstrony:
 *   • „Wszystkie utwory”  (slug radio-mors)          → morsData.adminSection = 'tracks'
 *   • „Ustawienia listy”  (slug radio-mors-settings) → morsData.adminSection = 'settings'
 * Tryb i sekcję SPA rozpoznaje po morsData (patrz assets/js/app.js:
 * applyAdminModeUI(), applyAdminSection(), refreshAdminSession()).
 */
class Admin_Page {

    const MENU_SLUG     = 'radio-mors';
    const SETTINGS_SLUG = 'radio-mors-settings';

    /** Hook suffixy stron (ustawiane w menu(), sprawdzane w assets()). */
    private static $hook_tracks   = '';
    private static $hook_settings = '';

    public static function register() {
        add_action( 'admin_menu', [ self::class, 'menu' ] );
        add_action( 'admin_enqueue_scripts', [ self::class, 'assets' ] );
    }

    public static function menu() {
        self::$hook_tracks = add_menu_page(
            'Lista przebojów',
            'Lista przebojów',
            \Mors_Enum::CAP_EDIT_MUSIC,
            self::MENU_SLUG,
            [ self::class, 'render' ],
            'dashicons-list-view',
            30
        );

        // Pierwsze podmenu = ta sama slug, przemianowuje auto-utworzoną pozycję na „Wszystkie utwory”.
        add_submenu_page(
            self::MENU_SLUG,
            'Wszystkie utwory',
            'Wszystkie utwory',
            \Mors_Enum::CAP_EDIT_MUSIC,
            self::MENU_SLUG,
            [ self::class, 'render' ]
        );

        self::$hook_settings = add_submenu_page(
            self::MENU_SLUG,
            'Ustawienia listy',
            'Ustawienia listy',
            \Mors_Enum::CAP_EDIT_MUSIC,
            self::SETTINGS_SLUG,
            [ self::class, 'render' ]
        );
    }

    /**
     * Kolejkujemy te same assety co Mors\Frontend\Shortcode, ale tylko na stronach
     * panelu, żeby nie ładować SPA w całym wp-admin. adminSection zależy od podstrony.
     */
    public static function assets( $hook ) {
        if ( $hook !== self::$hook_tracks && $hook !== self::$hook_settings ) { return; }

        $section = ( $hook === self::$hook_settings ) ? 'settings' : 'tracks';

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
