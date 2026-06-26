<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}

// Software License Manager Configurations
define( 'LHE_SLM_SECRET_KEY', 'LHE_SLM_6a3e94dca1d0c5.76166265' ); // Chave secreta para verificação de licença atualizada
define( 'LHE_SLM_SERVER_URL', 'https://seusite.com.br' );   // URL do servidor WooCommerce / SLM (alterável pelo usuário)
define( 'LHE_SLM_ITEM_REFERENCE', 'IA Live Editor' );       // Referência exata do produto no SLM

// AJAX handler to activate license
add_action( 'wp_ajax_lhe_activate_license', 'lhe_activate_license_handler' );
function lhe_activate_license_handler() {
    // Check security nonce
    if ( ! isset( $_POST['nonce'] ) || ! wp_verify_nonce( $_POST['nonce'], 'lhe_admin_nonce' ) ) {
        wp_send_json_error( array( 'message' => 'Falha na verificação de segurança (nonce inválido).' ) );
    }

    if ( ! current_user_can( 'manage_options' ) ) {
        wp_send_json_error( array( 'message' => 'Permissão insuficiente.' ) );
    }

    $license_key = isset( $_POST['license_key'] ) ? sanitize_text_field( trim( $_POST['license_key'] ) ) : '';

    if ( empty( $license_key ) ) {
        wp_send_json_error( array( 'message' => 'A chave de licença não pode estar vazia.' ) );
    }

    // Determine domain for SLM activation
    if ( is_multisite() ) {
        $domain = site_url();
    } else {
        $domain = isset( $_SERVER['SERVER_NAME'] ) ? sanitize_text_field( $_SERVER['SERVER_NAME'] ) : '';
    }

    // API query parameters
    $api_params = array(
        'slm_action'        => 'slm_activate',
        'secret_key'        => LHE_SLM_SECRET_KEY,
        'license_key'       => $license_key,
        'registered_domain' => $domain,
        'item_reference'    => urlencode( LHE_SLM_ITEM_REFERENCE ),
    );

    // Send query to the license manager server
    $url = add_query_arg( $api_params, LHE_SLM_SERVER_URL );
    $response = wp_remote_get( $url, array( 'timeout' => 20, 'sslverify' => false ) );

    // Check for connection error
    if ( is_wp_error( $response ) ) {
        wp_send_json_error( array( 'message' => 'Falha de conexão com o servidor de licenças: ' . $response->get_error_message() ) );
    }

    // Decode response
    $license_data = json_decode( wp_remote_retrieve_body( $response ) );

    if ( ! $license_data ) {
        wp_send_json_error( array( 'message' => 'Resposta inválida do servidor de licenças.' ) );
    }

    // Check response outcome
    if ( isset( $license_data->result ) && 'success' === $license_data->result ) {
        update_option( 'live_html_editor_license_key', $license_key );
        update_option( 'live_html_editor_license_status', 'active' );
        delete_transient( 'lhe_license_check_lock' ); // Clear cache lock to refresh status immediately
        
        $message = ! empty( $license_data->message ) ? $license_data->message : 'Sua licença foi ativada com sucesso! O IA Live Editor agora está ativo.';
        wp_send_json_success( array( 'message' => $message ) );
    } else {
        $message = ! empty( $license_data->message ) ? $license_data->message : 'Chave de licença inválida. Por favor, verifique o código inserido.';
        wp_send_json_error( array( 'message' => $message ) );
    }
}

// AJAX handler to deactivate license
add_action( 'wp_ajax_lhe_deactivate_license', 'lhe_deactivate_license_handler' );
function lhe_deactivate_license_handler() {
    // Check security nonce
    if ( ! isset( $_POST['nonce'] ) || ! wp_verify_nonce( $_POST['nonce'], 'lhe_admin_nonce' ) ) {
        wp_send_json_error( array( 'message' => 'Falha na verificação de segurança (nonce inválido).' ) );
    }

    if ( ! current_user_can( 'manage_options' ) ) {
        wp_send_json_error( array( 'message' => 'Permissão insuficiente.' ) );
    }

    $license_key = get_option( 'live_html_editor_license_key', '' );

    if ( ! empty( $license_key ) ) {
        // Determine domain
        if ( is_multisite() ) {
            $domain = site_url();
        } else {
            $domain = isset( $_SERVER['SERVER_NAME'] ) ? sanitize_text_field( $_SERVER['SERVER_NAME'] ) : '';
        }

        // API parameters to deactivate
        $api_params = array(
            'slm_action'        => 'slm_deactivate',
            'secret_key'        => LHE_SLM_SECRET_KEY,
            'license_key'       => $license_key,
            'registered_domain' => $domain,
            'item_reference'    => urlencode( LHE_SLM_ITEM_REFERENCE ),
        );

        $url = add_query_arg( $api_params, LHE_SLM_SERVER_URL );
        wp_remote_get( $url, array( 'timeout' => 20, 'sslverify' => false ) ); // Best effort deactivation
    }

    // Always clear locally
    delete_option( 'live_html_editor_license_key' );
    update_option( 'live_html_editor_license_status', 'inactive' );
    delete_transient( 'lhe_license_check_lock' );
    
    wp_send_json_success( array( 'message' => 'Licença desativada com sucesso.' ) );
}

/**
 * Periodically verifies the license key status with the license server.
 * Uses a transient lock to limit API hits to once every 24 hours.
 *
 * @param bool $force Bypass the transient check lock to perform real-time verification.
 */
function lhe_check_license_status( $force = false ) {
    $license_key = get_option( 'live_html_editor_license_key', '' );

    if ( empty( $license_key ) ) {
        update_option( 'live_html_editor_license_status', 'inactive' );
        return;
    }

    // Verify transient lock to prevent server overhead (unless forced)
    if ( ! $force && get_transient( 'lhe_license_check_lock' ) ) {
        return;
    }

    // Determine domain
    if ( is_multisite() ) {
        $domain = site_url();
    } else {
        $domain = isset( $_SERVER['SERVER_NAME'] ) ? sanitize_text_field( $_SERVER['SERVER_NAME'] ) : '';
    }

    // Check parameters
    $api_params = array(
        'slm_action'        => 'slm_check',
        'secret_key'        => LHE_SLM_SECRET_KEY,
        'license_key'       => $license_key,
        'registered_domain' => $domain,
        'item_reference'    => urlencode( LHE_SLM_ITEM_REFERENCE ),
    );

    $url = add_query_arg( $api_params, LHE_SLM_SERVER_URL );
    $response = wp_remote_get( $url, array( 'timeout' => 15, 'sslverify' => false ) );

    // If query was successful, parse the response
    if ( ! is_wp_error( $response ) ) {
        $license_data = json_decode( wp_remote_retrieve_body( $response ) );
        if ( $license_data ) {
            if ( isset( $license_data->result ) && 'success' === $license_data->result ) {
                $status = isset( $license_data->status ) ? $license_data->status : '';
                if ( 'active' === $status ) {
                    update_option( 'live_html_editor_license_status', 'active' );
                } elseif ( 'expired' === $status ) {
                    update_option( 'live_html_editor_license_status', 'expired' );
                } else {
                    update_option( 'live_html_editor_license_status', 'inactive' );
                }
            } else {
                // If license key was deleted or is blocked
                update_option( 'live_html_editor_license_status', 'inactive' );
            }
        }
    }

    // Set lock transient for 24 hours
    set_transient( 'lhe_license_check_lock', true, DAY_IN_SECONDS );
}

// Hook check on admin_init for periodic verification
add_action( 'admin_init', 'lhe_check_license_on_admin' );
function lhe_check_license_on_admin() {
    if ( current_user_can( 'manage_options' ) ) {
        lhe_check_license_status();
    }
}
