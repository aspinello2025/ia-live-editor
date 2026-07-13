<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}

// Hook to check for plugin updates from GitHub raw content
add_filter( 'pre_set_site_transient_update_plugins', 'lhe_check_github_plugin_update' );
function lhe_check_github_plugin_update( $transient ) {
    if ( ! is_object( $transient ) || ! isset( $transient->response ) ) {
        return $transient;
    }

    // GitHub Configurations (You can change these to match your repo details)
    $github_user = 'aspinello2025';
    $github_repo = 'ia-live-editor';
    $github_branch = 'main';

    // Raw URL pointing to the info.json on your GitHub repository with cache buster
    $remote_url = sprintf( 'https://raw.githubusercontent.com/%s/%s/%s/info.json?t=%d', $github_user, $github_repo, $github_branch, time() );

    $response = wp_remote_get( $remote_url, array(
        'timeout' => 10,
        'sslverify' => false,
        'headers' => array(
            'Accept' => 'application/json'
        )
    ));

    if ( is_wp_error( $response ) ) {
        return $transient;
    }

    $info = json_decode( wp_remote_retrieve_body( $response ) );
    
    // Compare versions
    if ( $info && isset( $info->version ) && version_compare( LHE_VERSION, $info->version, '<' ) ) {
        $plugin_slug = 'ia-live-editor';
        $plugin_file = $plugin_slug . '/ia-live-editor.php';
        
        $obj = new stdClass();
        $obj->slug = $plugin_slug;
        $obj->new_version = $info->version;
        $obj->url = 'https://agenciaintegrar.com/loja/';
        
        // Direct download URL: uses info.json download_url or falls back to GitHub releases latest download
        $obj->package = ! empty( $info->download_url ) ? $info->download_url : sprintf( 'https://github.com/%s/%s/releases/latest/download/%s.zip', $github_user, $github_repo, $plugin_slug );
        
        // Add custom icon for updates page
        $obj->icons = array(
            '1x'      => LHE_URL . 'assets/images/icon.png',
            'default' => LHE_URL . 'assets/images/icon.png'
        );
        
        $transient->response[ $plugin_file ] = $obj;
    }

    return $transient;
}

// Hook to display plugin details modal window in the plugin dashboard
add_filter( 'plugins_api', 'lhe_github_plugin_popup_details', 20, 3 );
function lhe_github_plugin_popup_details( $res, $action, $args ) {
    if ( 'plugin_information' !== $action ) {
        return $res;
    }

    // Target only our plugin slug
    if ( 'ia-live-editor' !== $args->slug ) {
        return $res;
    }

    $github_user = 'aspinello2025';
    $github_repo = 'ia-live-editor';
    $github_branch = 'main';
    $remote_url = sprintf( 'https://raw.githubusercontent.com/%s/%s/%s/info.json?t=%d', $github_user, $github_repo, $github_branch, time() );

    $response = wp_remote_get( $remote_url, array(
        'timeout'   => 10,
        'sslverify' => false
    ));
    if ( is_wp_error( $response ) ) {
        return $res;
    }

    $info = json_decode( wp_remote_retrieve_body( $response ) );
    if ( ! $info ) {
        return $res;
    }

    $res = new stdClass();
    $res->name = $info->name;
    $res->slug = $info->slug;
    $res->version = $info->version;
    $res->author = '<a href="https://agenciaintegrar.com/loja/">Alexandre Spinello</a>';
    $res->homepage = 'https://agenciaintegrar.com/loja/';
    $res->download_link = ! empty( $info->download_url ) ? $info->download_url : sprintf( 'https://github.com/%s/%s/releases/latest/download/%s.zip', $github_user, $github_repo, $info->slug );
    
    // Add custom icon for details popup modal
    $res->icons = array(
        '1x'      => LHE_URL . 'assets/images/icon.png',
        'default' => LHE_URL . 'assets/images/icon.png'
    );
    
    // Tab sections inside Details popup modal
    $res->sections = array(
        'description' => isset( $info->sections->description ) ? $info->sections->description : 'IA Live Editor para Elementor.',
        'changelog'   => isset( $info->sections->changelog ) ? $info->sections->changelog : 'Novas melhorias e atualizações do editor visual.'
    );

    return $res;
}

// Add check for updates link in plugins list
add_filter( 'plugin_row_meta', 'lhe_plugin_row_meta_links', 10, 2 );
function lhe_plugin_row_meta_links( $links, $file ) {
    if ( $file === 'ia-live-editor/ia-live-editor.php' ) {
        $check_url = wp_nonce_url( admin_url( 'plugins.php?lhe_check_updates=1' ), 'lhe_check_updates_nonce' );
        $links[] = '<a href="' . esc_url( $check_url ) . '" style="font-weight: bold; color: #ffd000;"><span class="dashicons dashicons-update" style="font-size: 16px; width: 16px; height: 16px; vertical-align: middle; margin-right: 3px;"></span>Verificar Atualizações</a>';
    }
    return $links;
}

// Handle clicking check updates
add_action( 'admin_init', 'lhe_handle_check_updates_action' );
function lhe_handle_check_updates_action() {
    if ( ! is_admin() || ! current_user_can( 'update_plugins' ) ) {
        return;
    }

    if ( isset( $_GET['lhe_check_updates'] ) && $_GET['lhe_check_updates'] === '1' ) {
        // Verify nonce
        if ( ! isset( $_GET['_wpnonce'] ) || ! wp_verify_nonce( $_GET['_wpnonce'], 'lhe_check_updates_nonce' ) ) {
            wp_die( 'Acesso negado.' );
        }

        // Force check updates by deleting transients
        delete_site_transient( 'update_plugins' );
        delete_transient( 'update_plugins' ); // Just in case
        wp_clean_plugins_cache();

        // Redirect back to plugins page with a success query arg
        wp_safe_redirect( admin_url( 'plugins.php?lhe_updates_checked=1' ) );
        exit;
    }
}

// Display notice
add_action( 'admin_notices', 'lhe_display_updates_checked_notice' );
function lhe_display_updates_checked_notice() {
    global $pagenow;
    if ( $pagenow === 'plugins.php' && isset( $_GET['lhe_updates_checked'] ) && $_GET['lhe_updates_checked'] === '1' ) {
        echo '<div class="notice notice-success is-dismissible"><p><strong>IA Live Editor:</strong> Verificação de atualizações concluída! Se houver uma nova versão disponível, ela aparecerá na lista de plugins abaixo.</p></div>';
    }
}

