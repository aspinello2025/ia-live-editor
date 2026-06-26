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

    // Raw URL pointing to the info.json on your GitHub repository
    $remote_url = sprintf( 'https://raw.githubusercontent.com/%s/%s/%s/info.json', $github_user, $github_repo, $github_branch );

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
        $obj->url = sprintf( 'https://github.com/%s/%s', $github_user, $github_repo );
        
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
    $remote_url = sprintf( 'https://raw.githubusercontent.com/%s/%s/%s/info.json', $github_user, $github_repo, $github_branch );

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
    $res->author = '<a href="https://github.com/' . esc_attr( $github_user ) . '">Alexandre Spinello</a>';
    $res->homepage = sprintf( 'https://github.com/%s/%s', $github_user, $github_repo );
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
