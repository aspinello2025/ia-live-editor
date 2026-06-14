<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}

// Add the admin menu item
add_action( 'admin_menu', 'lhe_add_admin_menu' );
function lhe_add_admin_menu() {
    add_menu_page(
        __( 'IA Live Editor', 'ia-live-editor' ),
        __( 'IA Live Editor', 'ia-live-editor' ),
        'manage_options',
        'ia-live-editor',
        'lhe_render_license_page',
        'dashicons-edit',
        81
    );
}

// Enqueue admin assets
add_action( 'admin_enqueue_scripts', 'lhe_enqueue_admin_assets' );
function lhe_enqueue_admin_assets( $hook ) {
    if ( 'toplevel_page_ia-live-editor' !== $hook ) {
        return;
    }

    // Google Fonts
    wp_enqueue_style( 'lhe-admin-fonts', 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Montserrat:wght@700;800;900&display=swap', array(), LHE_VERSION );
    
    // Custom admin CSS
    wp_enqueue_style( 'lhe-admin-styles', LHE_URL . 'assets/css/admin.css', array(), LHE_VERSION );
}

// Render the administration panel
function lhe_render_license_page() {
    $license_key = get_option( 'live_html_editor_license_key', '' );
    $license_status = get_option( 'live_html_editor_license_status', 'inactive' );
    $is_active = ( 'active' === $license_status );
    ?>
    <div class="wrap lhe-admin-wrap">
        <div class="lhe-bg-glow-1"></div>
        <div class="lhe-bg-glow-2"></div>
        
        <div class="lhe-card">
            <!-- Header -->
            <div class="lhe-header">
                <div class="lhe-logo-container">
                    <span class="lhe-logo-badge"><?php esc_html_e( 'Elementor Addon', 'ia-live-editor' ); ?></span>
                    <span class="lhe-logo-badge gold"><?php esc_html_e( 'Edição em Tempo Real', 'ia-live-editor' ); ?></span>
                </div>
                <h1>IA Live Editor <span class="lhe-version">v<?php echo esc_html( LHE_VERSION ); ?></span></h1>
                <p><?php esc_html_e( 'Ative sua chave de licença para liberar o editor em tempo real na barra de administração do seu site.', 'ia-live-editor' ); ?></p>
            </div>

            <!-- License Card -->
            <div class="lhe-license-section">
                <div class="lhe-status-box <?php echo $is_active ? 'active' : 'inactive'; ?>" id="lhe-status-box">
                    <div class="lhe-status-icon">
                        <span class="dashicons <?php echo $is_active ? 'dashicons-saved' : 'dashicons-warning'; ?>"></span>
                    </div>
                    <div class="lhe-status-details">
                        <label><?php esc_html_e( 'Status do Plugin', 'ia-live-editor' ); ?></label>
                        <h3 id="lhe-status-text">
                            <?php echo $is_active ? esc_html__( 'Licença Ativa', 'ia-live-editor' ) : esc_html__( 'Licença Não Ativada', 'ia-live-editor' ); ?>
                        </h3>
                    </div>
                </div>

                <form id="lhe-license-form" method="post" action="">
                    <?php wp_nonce_field( 'lhe_admin_nonce', 'lhe_nonce_field' ); ?>
                    
                    <div class="lhe-form-group">
                        <label class="lhe-form-label" for="lhe-license-key"><?php esc_html_e( 'Chave de Licença', 'ia-live-editor' ); ?></label>
                        <div class="lhe-input-wrapper">
                            <span class="dashicons dashicons-admin-network lhe-input-icon"></span>
                            <input type="password" id="lhe-license-key" name="license_key" class="lhe-input-text" 
                                   placeholder="Ex: LHE-XXXX-XXXX-XXXX" value="<?php echo esc_attr( $license_key ); ?>" 
                                   <?php echo $is_active ? 'disabled' : ''; ?> autocomplete="off">
                        </div>
                        <p class="lhe-help-text">
                            <?php esc_html_e( 'Insira sua chave de ativação. Para demonstrações locais, digite ', 'ia-live-editor' ); ?>
                            <strong><code>LHE-ACTIVE-2026</code></strong>.
                        </p>
                    </div>

                    <div class="lhe-btn-container">
                        <button type="submit" id="lhe-btn-submit" class="lhe-btn lhe-btn-primary <?php echo $is_active ? 'deactivate-mode' : ''; ?>">
                            <span class="lhe-btn-text">
                                <?php echo $is_active ? esc_html__( 'Desativar Licença', 'ia-live-editor' ) : esc_html__( 'Ativar Chave de Licença', 'ia-live-editor' ); ?>
                            </span>
                            <span class="lhe-spinner"></span>
                        </button>
                    </div>
                </form>

                <div class="lhe-feedback" id="lhe-feedback-message"></div>
            </div>

            <!-- Features Info Grid -->
            <div class="lhe-features-info">
                <h3><?php esc_html_e( 'Recursos Disponíveis após a Ativação:', 'ia-live-editor' ); ?></h3>
                <div class="lhe-features-grid">
                    <div class="lhe-feature-item">
                        <span class="dashicons dashicons-admin-customizer"></span>
                        <div>
                            <h4>Edição Direta na Página</h4>
                            <p>Clique em textos, botões e imagens e altere-os na hora, vendo os resultados imediatamente.</p>
                        </div>
                    </div>
                    <div class="lhe-feature-item">
                        <span class="dashicons dashicons-smartphone"></span>
                        <div>
                            <h4>Layout Responsivo Completo</h4>
                            <p>Configure tipografia e imagens de fundo separadas para desktop, tablet e celular.</p>
                        </div>
                    </div>
                    <div class="lhe-feature-item">
                        <span class="dashicons dashicons-admin-media"></span>
                        <div>
                            <h4>Imagens & Ícones SVG</h4>
                            <p>Integração com a biblioteca do WP para imagens e SVGs (com liberação de uploads).</p>
                        </div>
                    </div>
                    <div class="lhe-feature-item">
                        <span class="dashicons dashicons-admin-generic"></span>
                        <div>
                            <h4>Efeitos & Duplicação</h4>
                            <p>Adicione brilho e pulsação em botões e clone elementos sem recomeçar do zero.</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="lhe-footer">
                <span>© 2026 Alexandre Spinello. <?php esc_html_e( 'Todos os direitos reservados.', 'ia-live-editor' ); ?></span>
            </div>
        </div>
    </div>

    <!-- Admin Page JavaScript AJAX Triggering -->
    <script>
    jQuery(document).ready(function($) {
        $('#lhe-license-form').on('submit', function(e) {
            e.preventDefault();
            
            var $form = $(this);
            var $btn = $('#lhe-btn-submit');
            var $spinner = $btn.find('.lhe-spinner');
            var $btnText = $btn.find('.lhe-btn-text');
            var $feedback = $('#lhe-feedback-message');
            
            var isDeactivate = $btn.hasClass('deactivate-mode');
            var action = isDeactivate ? 'lhe_deactivate_license' : 'lhe_activate_license';
            var licenseKey = $('#lhe-license-key').val();
            var nonce = $('#lhe_nonce_field').val();
            
            // Clean feedback
            $feedback.removeClass('success error show').text('');
            
            // Loading state
            $btn.prop('disabled', true);
            $spinner.addClass('show');
            $btnText.text(isDeactivate ? 'Desativando...' : 'Ativando...');
            
            $.ajax({
                url: ajaxurl,
                type: 'POST',
                data: {
                    action: action,
                    license_key: licenseKey,
                    nonce: nonce
                },
                success: function(response) {
                    $spinner.removeClass('show');
                    $btn.prop('disabled', false);
                    
                    if (response.success) {
                        $feedback.addClass('success show').text(response.data.message);
                        
                        if (isDeactivate) {
                            // Switched to Deactivated
                            $btn.removeClass('deactivate-mode');
                            $btnText.text('Ativar Chave de Licença');
                            $('#lhe-license-key').val('').prop('disabled', false);
                            $('#lhe-status-box').removeClass('active').addClass('inactive');
                            $('#lhe-status-text').text('Licença Não Ativada');
                            $('#lhe-status-box').find('.dashicons').removeClass('dashicons-saved').addClass('dashicons-warning');
                        } else {
                            // Switched to Activated
                            $btn.addClass('deactivate-mode');
                            $btnText.text('Desativar Licença');
                            $('#lhe-license-key').prop('disabled', true);
                            $('#lhe-status-box').removeClass('inactive').addClass('active');
                            $('#lhe-status-text').text('Licença Ativa');
                            $('#lhe-status-box').find('.dashicons').removeClass('dashicons-warning').addClass('dashicons-saved');
                        }
                    } else {
                        $feedback.addClass('error show').text(response.data.message);
                        $btnText.text(isDeactivate ? 'Desativar Licença' : 'Ativar Chave de Licença');
                    }
                },
                error: function() {
                    $spinner.removeClass('show');
                    $btn.prop('disabled', false);
                    $btnText.text(isDeactivate ? 'Desativar Licença' : 'Ativar Chave de Licença');
                    $feedback.addClass('error show').text('Erro de servidor. Tente novamente mais tarde.');
                }
            });
        });
    });
    </script>
    <?php
}
