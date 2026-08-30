<?php
namespace Mors\Admin;

if ( ! defined( 'ABSPATH' ) ) { exit; }

/**
 * Podstrona wp-admin „Radio MORS" — hostuje tę samą SPA (templates/public-app.php,
 * assets/js/app.js) w trybie panelu redakcji. Tryb rozpoznawany przez SPA po
 * morsData.isAdminPanel/isEditor/role (patrz assets/js/app.js: refreshAdminSession(),
 * applyAdminModeUI()).
 */
class Admin_Page {

    const HOOK_SUFFIX = 'toplevel_page_radio-mors';

    public static function register() {
        add_action( 'admin_menu', [ self::class, 'menu' ] );
        add_action( 'admin_enqueue_scripts', [ self::class, 'assets' ] );
    }

    public static function menu() {
        add_menu_page(
            'Radio MORS',
            'Radio MORS',
            \Mors_Enum::CAP_EDIT_MUSIC,
            'radio-mors',
            [ self::class, 'render' ],
            'dashicons-microphone',
            30
        );
    }

    /**
     * Kolejkujemy te same assety co Mors\Frontend\Shortcode (te same handle'y/wersje),
     * ale tylko na stronie panelu, żeby nie ładować SPA w całym wp-admin.
     */
    public static function assets( $hook ) {
        if ( $hook !== self::HOOK_SUFFIX ) { return; }

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
            'restUrl'        => esc_url_raw( rest_url( 'mors/v1' ) ),
            'nonce'          => wp_create_nonce( 'wp_rest' ),
            'isAdminPanel'   => true,
            'isEditor'       => $can_edit,
            'currentUserId'  => get_current_user_id(),
            'currentUserName' => $current_user->display_name,
            'role'           => $role,
        ] );
    }

    public static function render() {
        echo '<div class="wrap">';
        include MORS_PLUGIN_DIR . 'templates/public-app.php';
        echo '</div>';
    }
}
