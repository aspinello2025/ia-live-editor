<?php
/**
 * Plugin Name: IA Live Editor
 * Plugin URI: https://agenciaintegrar.com/loja/
 * Description: Edite widgets HTML do Elementor diretamente no frontend com suporte a edição rica, fontes responsivas, imagens de fundo e mais.
 * Version: 1.5.6
 * Author: Alexandre Spinello
 * Author URI: https://agenciaintegrar.com/loja/
 * Text Domain: ia-live-editor
 * Requires at least: 5.6
 * Requires PHP: 7.4
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}

// Define plugin constants
define( 'LHE_VERSION', '1.5.6' );
define( 'LHE_PATH', plugin_dir_path( __FILE__ ) );
define( 'LHE_URL', plugin_dir_url( __FILE__ ) );
define( 'LHE_BASENAME', plugin_basename( __FILE__ ) );

// Include required files
require_once LHE_PATH . 'includes/licensing.php';
require_once LHE_PATH . 'includes/ajax-handlers.php';
require_once LHE_PATH . 'admin/license-page.php';
require_once LHE_PATH . 'includes/updater.php';

// Check if Elementor is active
add_action( 'plugins_loaded', 'lhe_check_dependencies' );
function lhe_check_dependencies() {
    if ( ! did_action( 'elementor/loaded' ) ) {
        add_action( 'admin_notices', 'lhe_elementor_missing_notice' );
    }
}

function lhe_elementor_missing_notice() {
    $class = 'notice notice-error';
    $message = __( 'O <strong>IA Live Editor</strong> requer que o plugin Elementor esteja instalado e ativo.', 'ia-live-editor' );
    printf( '<div class="%1$s"><p>%2$s</p></div>', esc_attr( $class ), $message );
}

// Allow SVG uploads for admins
add_filter( 'upload_mimes', 'lhe_allow_svg_uploads' );
function lhe_allow_svg_uploads( $mimes ) {
    if ( current_user_can( 'manage_options' ) ) {
        $mimes['svg'] = 'image/svg+xml';
        $mimes['svgz'] = 'image/svg+xml';
    }
    return $mimes;
}

add_filter( 'wp_check_filetype_and_ext', 'lhe_fix_svg_filetype', 10, 4 );
function lhe_fix_svg_filetype( $data, $file, $filename, $mimes ) {
    $ext = isset( $data['ext'] ) ? $data['ext'] : '';
    if ( empty( $ext ) && ( strpos( $filename, '.svg' ) !== false ) ) {
        $data['ext'] = 'svg';
        $data['type'] = 'image/svg+xml';
    }
    return $data;
}

// Register Admin Bar Menu button
add_action( 'admin_bar_menu', 'lhe_admin_bar_button', 100 );
function lhe_admin_bar_button( $wp_admin_bar ) {
    if ( ! current_user_can( 'edit_posts' ) ) {
        return;
    }
    
    // Check if license is active
    if ( get_option( 'live_html_editor_license_status' ) !== 'active' ) {
        return;
    }

    // Only show on frontend pages
    if ( is_admin() ) {
        return;
    }

    $wp_admin_bar->add_node( array(
        'id'    => 'live-html-editor-toggle',
        'title' => '<span class="ab-icon dashicons dashicons-edit" style="top: 2px;"></span> <span class="lhe-ab-text">Editar conteúdo</span>',
        'href'  => '#',
        'meta'  => array(
            'class'   => 'live-html-editor-btn-wrapper',
            'onclick' => 'if(window.lheToggleEditorMode){ window.lheToggleEditorMode(); } return false;'
        ),
    ) );
}

// Enqueue styles and scripts in the frontend
add_action( 'wp_enqueue_scripts', 'lhe_enqueue_frontend_assets' );
function lhe_enqueue_frontend_assets() {
    if ( ! current_user_can( 'edit_posts' ) ) {
        return;
    }
    
    // Check if license is active
    if ( get_option( 'live_html_editor_license_status' ) !== 'active' ) {
        return;
    }

    // Only load on single pages/posts
    if ( ! is_singular() ) {
        return;
    }

    // Enqueue WP Media Library (essential for image and SVG picking)
    wp_enqueue_media();

    // Enqueue Google Fonts list used inside editor
    wp_enqueue_style( 'google-fonts-inter', 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap', array(), LHE_VERSION );

    // Enqueue FontAwesome for icons inside live editor panel
    wp_enqueue_style( 'lhe-font-awesome', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css', array(), '6.4.0' );

    // Plugin Editor Stylesheet
    wp_enqueue_style( 'lhe-editor-styles', LHE_URL . 'assets/css/editor.css', array(), LHE_VERSION );

    // Plugin Editor Script
    wp_enqueue_script( 'lhe-editor-script', LHE_URL . 'assets/js/editor.js', array( 'jquery' ), LHE_VERSION, true );

    // Localize scripting with PHP values (e.g. ajax URL, security nonces, post details)
    wp_localize_script( 'lhe-editor-script', 'lheData', array(
        'ajaxUrl'   => admin_url( 'admin-ajax.php' ),
        'nonce'     => wp_create_nonce( 'lhe_editor_nonce' ),
        'postId'    => get_the_ID(),
        'pluginUrl' => LHE_URL
    ) );
}

// Styles specifically for the admin bar button
add_action( 'wp_head', 'lhe_admin_bar_styles' );
add_action( 'admin_head', 'lhe_admin_bar_styles' );
function lhe_admin_bar_styles() {
    if ( ! current_user_can( 'edit_posts' ) || get_option( 'live_html_editor_license_status' ) !== 'active' ) {
        return;
    }
    ?>
    <style>
        #wp-admin-bar-live-html-editor-toggle .lhe-ab-text {
            font-weight: 700 !important;
            color: #00f0ff !important;
            text-shadow: 0 0 10px rgba(0, 240, 255, 0.5);
        }
        #wp-admin-bar-live-html-editor-toggle:hover .lhe-ab-text {
            color: #ffd000 !important;
            text-shadow: 0 0 10px rgba(255, 208, 0, 0.5);
        }
        #wp-admin-bar-live-html-editor-toggle .ab-icon:before {
            color: #00f0ff !important;
            text-shadow: 0 0 10px rgba(0, 240, 255, 0.5);
        }
        #wp-admin-bar-live-html-editor-toggle:hover .ab-icon:before {
            color: #ffd000 !important;
        }
        .live-editor-active #wp-admin-bar-live-html-editor-toggle .lhe-ab-text {
            color: #25d366 !important;
            text-shadow: 0 0 10px rgba(37, 211, 102, 0.5);
        }
        .live-editor-active #wp-admin-bar-live-html-editor-toggle .ab-icon:before {
            color: #25d366 !important;
        }
    </style>
    <?php
}
