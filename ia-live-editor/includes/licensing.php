<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}

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

    // Validation rule: Key must start with LHE- and have at least 12 characters
    if ( strpos( $license_key, 'LHE-' ) === 0 && strlen( $license_key ) >= 12 ) {
        update_option( 'live_html_editor_license_key', $license_key );
        update_option( 'live_html_editor_license_status', 'active' );
        wp_send_json_success( array( 'message' => 'Sua licença foi ativada com sucesso! O IA Live Editor agora está ativo.' ) );
    } else {
        wp_send_json_error( array( 'message' => 'Chave de licença inválida. Por favor, verifique o código inserido.' ) );
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

    delete_option( 'live_html_editor_license_key' );
    update_option( 'live_html_editor_license_status', 'inactive' );
    wp_send_json_success( array( 'message' => 'Licença desativada com sucesso.' ) );
}
