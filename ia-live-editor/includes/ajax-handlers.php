<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}

// AJAX handler to save widget HTML contents
add_action( 'wp_ajax_lhe_save_widget_html', 'lhe_save_widget_html_handler' );
function lhe_save_widget_html_handler() {
    // Check security nonce
    if ( ! isset( $_POST['nonce'] ) || ! wp_verify_nonce( $_POST['nonce'], 'lhe_editor_nonce' ) ) {
        wp_send_json_error( array( 'message' => 'Falha na verificação de segurança (nonce inválido).' ) );
    }

    // Check user capability
    if ( ! current_user_can( 'edit_posts' ) ) {
        wp_send_json_error( array( 'message' => 'Você não tem permissão para editar conteúdo.' ) );
    }

    // Check if license is active
    if ( get_option( 'live_html_editor_license_status' ) !== 'active' ) {
        wp_send_json_error( array( 'message' => 'Plugin inativo. Por favor, ative sua licença no painel WordPress.' ) );
    }

    $post_id = isset( $_POST['post_id'] ) ? intval( $_POST['post_id'] ) : 0;
    $widgets_data = isset( $_POST['widgets'] ) ? $_POST['widgets'] : '';

    if ( ! $post_id || empty( $widgets_data ) ) {
        wp_send_json_error( array( 'message' => 'Dados de envio inválidos ou ausentes.' ) );
    }

    // Decode widget edits (comes as a JSON-encoded string)
    $updates = json_decode( wp_unslash( $widgets_data ), true );

    if ( ! is_array( $updates ) ) {
        wp_send_json_error( array( 'message' => 'Formato de dados de widget inválido.' ) );
    }

    // Get the Elementor page layout meta
    $editor_data_raw = get_post_meta( $post_id, '_elementor_data', true );

    if ( empty( $editor_data_raw ) ) {
        wp_send_json_error( array( 'message' => 'Nenhum dado do Elementor encontrado para esta página.' ) );
    }

    // Elementor data is stored as a JSON string
    if ( is_string( $editor_data_raw ) ) {
        $data = json_decode( $editor_data_raw, true );
    } else {
        $data = $editor_data_raw;
    }

    if ( ! is_array( $data ) ) {
        wp_send_json_error( array( 'message' => 'Não foi possível decodificar os dados do Elementor.' ) );
    }

    // Apply each widget update
    $updated_count = 0;
    foreach ( $updates as $update ) {
        $widget_id = isset( $update['widget_id'] ) ? sanitize_text_field( $update['widget_id'] ) : '';
        $new_html = isset( $update['new_html'] ) ? $update['new_html'] : ''; // We preserve custom HTML formatting/scripts

        if ( ! empty( $widget_id ) ) {
            $success = lhe_update_widget_html_recursive( $data, $widget_id, $new_html );
            if ( $success ) {
                $updated_count++;
            }
        }
    }

    if ( $updated_count === 0 ) {
        wp_send_json_error( array( 'message' => 'Nenhum widget correspondente foi encontrado para atualização nos dados do Elementor.' ) );
    }

    // Save the updated Elementor data
    // Important: We must slash the JSON string before saving because update_post_meta strips slashes.
    $slashed_json = wp_slash( wp_json_encode( $data ) );
    $saved = update_post_meta( $post_id, '_elementor_data', $slashed_json );

    // Clear Elementor CSS cache so changes show up immediately in the frontend
    if ( class_exists( '\Elementor\Core\Files\CSS\Post' ) ) {
        $post_css = new \Elementor\Core\Files\CSS\Post( $post_id );
        $post_css->delete();
    }

    if ( class_exists( '\Elementor\Plugin' ) ) {
        \Elementor\Plugin::$instance->files_manager->clear_cache();
    }

    wp_send_json_success( array(
        'message' => sprintf( 'Sucesso! %d widget(s) HTML do Elementor atualizado(s).', $updated_count )
    ) );
}

/**
 * Recursively traverses Elementor element tree to find the widget with the given ID and type "html",
 * and replaces its "html" setting value.
 */
function lhe_update_widget_html_recursive( &$elements, $widget_id, $new_html ) {
    foreach ( $elements as &$element ) {
        // Check if this is the target widget
        if ( isset( $element['id'] ) && $element['id'] === $widget_id ) {
            if ( isset( $element['elType'] ) && $element['elType'] === 'widget' && $element['widgetType'] === 'html' ) {
                $element['settings']['html'] = $new_html;
                return true;
            }
        }

        // If this element has sub-elements (e.g. section, column), traverse them recursively
        if ( isset( $element['elements'] ) && is_array( $element['elements'] ) ) {
            $found = lhe_update_widget_html_recursive( $element['elements'], $widget_id, $new_html );
            if ( $found ) {
                return true;
            }
        }
    }
    return false;
}
