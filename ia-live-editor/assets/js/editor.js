/**
 * Live HTML Editor Engine
 * Handles frontend visual interaction, sidebar panels, media loading, and AJAX saving.
 */
(function($) {
    'use strict';

    // Guard: ensure we only instantiate once
    if (window.lheToggleEditorMode) {
        return;
    }

    // Editor State
    let isEditMode = false;
    let selectedElement = null;
    let selectedWidgetId = null;
    let currentDevice = 'desktop'; // desktop, tablet, mobile
    let editedWidgets = new Set(); // Set of widget IDs that were modified

    // Configuration / Assets
    const GOOGLE_FONTS = [
        'Inter', 'Roboto', 'Open Sans', 'Montserrat', 'Lato', 
        'Poppins', 'Oswald', 'Roboto Condensed', 'Roboto Slab', 
        'Raleway', 'PT Sans', 'Merriweather', 'Noto Sans', 
        'Playfair Display', 'Nunito', 'Lora', 'Mulish', 
        'Work Sans', 'Rubik', 'Kanit', 'Outfit'
    ];

    // UI Elements
    let $topBar = null;
    let $sidebar = null;
    let $hoverLabel = null;
    let $toastContainer = null;

    // Initialize UI Elements when script loads
    $(document).ready(function() {
        createToastContainer();
    });

    /**
     * Toggles the editor mode
     */
    window.lheToggleEditorMode = function() {
        if (!isEditMode) {
            enableEditMode();
        } else {
            disableEditMode(true); // default to cancel if clicked again
        }
    };

    /**
     * Enable Visual Editor
     */
    function enableEditMode() {
        isEditMode = true;
        $('body').addClass('live-editor-active');
        
        // Build UI if not exists
        buildToolbar();
        buildSidebar();
        buildHoverLabel();
        
        $topBar.fadeIn(200);
        
        // Bind hover and click events to elements inside Elementor HTML widgets
        bindEditorEvents();
        
        showToast('Modo de Edição Ativo. Clique em qualquer elemento para começar!', 'info');
    }

    /**
     * Disable Visual Editor
     */
    function disableEditMode(shouldCancel = true) {
        if (shouldCancel && editedWidgets.size > 0) {
            if (!confirm('Você possui alterações não salvas. Deseja realmente sair e descartar as alterações?')) {
                return;
            }
        }

        isEditMode = false;
        $('body').removeClass('live-editor-active live-preview-tablet live-preview-mobile lhe-sidebar-open');
        
        // Remove selection and hover outlines
        $('.lhe-hovered').removeClass('lhe-hovered');
        $('.lhe-selected').removeClass('lhe-selected');
        
        if ($topBar) $topBar.fadeOut(200);
        if ($sidebar) $sidebar.removeClass('open');
        if ($hoverLabel) $hoverLabel.hide();
        
        // Unbind events
        unbindEditorEvents();

        if (shouldCancel && editedWidgets.size > 0) {
            // Reload page to discard changes
            window.location.reload();
        }
    }

    /**
     * Build the Editor Toolbar (Top Bar)
     */
    function buildToolbar() {
        if ($topBar) return;

        $topBar = $(`
            <div class="lhe-top-bar" id="lhe-top-bar-panel" style="display:none;">
                <div class="lhe-top-bar-title">
                    <i class="fa-solid fa-wand-magic-sparkles"></i> <span>IA Live Editor</span>
                </div>
                <div class="lhe-device-selectors">
                    <button class="lhe-device-btn active" data-device="desktop" title="Visualização Desktop">
                        <i class="fa-solid fa-desktop"></i>
                    </button>
                    <button class="lhe-device-btn" data-device="tablet" title="Visualização Tablet">
                        <i class="fa-solid fa-tablet-screen-button"></i>
                    </button>
                    <button class="lhe-device-btn" data-device="mobile" title="Visualização Mobile">
                        <i class="fa-solid fa-mobile-screen-button"></i>
                    </button>
                </div>
                <div class="lhe-top-actions">
                    <button class="lhe-top-btn lhe-top-btn-cancel" id="lhe-action-cancel">
                        <i class="fa-solid fa-xmark"></i> Sair
                    </button>
                    <button class="lhe-top-btn lhe-top-btn-save" id="lhe-action-save">
                        <i class="fa-solid fa-cloud-arrow-up"></i> Salvar
                    </button>
                </div>
            </div>
        `).appendTo('body');

        // Toolbar Events
        $topBar.find('.lhe-device-btn').on('click', function() {
            const device = $(this).data('device');
            setPreviewDevice(device);
        });

        $topBar.find('#lhe-action-cancel').on('click', function() {
            disableEditMode(true);
        });

        $topBar.find('#lhe-action-save').on('click', function() {
            saveChanges();
        });
    }

    /**
     * Set the Device Preview Viewport
     */
    function setPreviewDevice(device) {
        currentDevice = device;
        $topBar.find('.lhe-device-btn').removeClass('active');
        $topBar.find(`.lhe-device-btn[data-device="${device}"]`).addClass('active');

        // Apply classes to body to trigger CSS resize
        $('body').removeClass('live-preview-tablet live-preview-mobile');
        if (device === 'tablet') {
            $('body').addClass('live-preview-tablet');
        } else if (device === 'mobile') {
            $('body').addClass('live-preview-mobile');
        }

        // Sync device tabs inside sidebar if open
        $sidebar.find('.lhe-field-device-btn').removeClass('active');
        $sidebar.find(`.lhe-field-device-btn[data-device="${device}"]`).addClass('active');
        $sidebar.find('.lhe-device-field-container').removeClass('active');
        $sidebar.find(`.lhe-device-field-container[data-device="${device}"]`).addClass('active');

        showToast(`Visualização ajustada para: ${device.toUpperCase()}`, 'info');
    }

    /**
     * Build Floating Sidebar Panel
     */
    function buildSidebar() {
        if ($sidebar) return;

        $sidebar = $(`
            <div class="lhe-sidebar" id="lhe-sidebar-panel">
                <div class="lhe-sidebar-header">
                    <h3><i class="fa-solid fa-sliders"></i> Painel de Edição</h3>
                    <button class="lhe-sidebar-close" id="lhe-sidebar-close-btn">
                        <i class="fa-solid fa-arrow-left-to-bracket"></i>
                    </button>
                </div>
                <div class="lhe-sidebar-body">
                    <!-- Element breadcrumbs -->
                    <div class="lhe-breadcrumbs">
                        <div class="lhe-breadcrumbs-label">Elemento Selecionado</div>
                        <div class="lhe-breadcrumbs-list" id="lhe-el-breadcrumbs">
                            <!-- Populated on selection -->
                        </div>
                    </div>

                    <!-- TEXT SETTINGS -->
                    <div class="lhe-panel-section" id="lhe-sec-text" style="display:none;">
                        <button class="lhe-panel-trigger">
                            <span><i class="fa-solid fa-font"></i> Tipografia e Conteúdo</span>
                            <i class="fa-solid fa-chevron-down chevron"></i>
                        </button>
                        <div class="lhe-panel-content">
                            <div class="lhe-editor-group">
                                <label class="lhe-editor-label">Texto do Elemento</label>
                                <textarea id="lhe-input-text-content" class="lhe-sidebar-textarea"></textarea>
                            </div>
                            
                            <div class="lhe-editor-group">
                                <label class="lhe-editor-label">Família da Fonte</label>
                                <select id="lhe-input-font-family" class="lhe-sidebar-input">
                                    <option value="">Padrão do Site</option>
                                </select>
                            </div>

                            <div class="lhe-editor-group">
                                <label class="lhe-editor-label">Cor do Texto</label>
                                <div class="lhe-color-picker-row">
                                    <input type="color" id="lhe-input-text-color" class="lhe-color-picker-input">
                                    <input type="text" id="lhe-input-text-color-hex" class="lhe-sidebar-input" style="letter-spacing:0; font-family:monospace;" placeholder="#000000">
                                </div>
                            </div>

                            <!-- Responsive Font Size Tab Controls -->
                            <div class="lhe-editor-group">
                                <label class="lhe-editor-label">Tamanho da Fonte</label>
                                <div class="lhe-field-device-tabs">
                                    <button class="lhe-field-device-btn active" data-device="desktop"><i class="fa-solid fa-desktop"></i> D</button>
                                    <button class="lhe-field-device-btn" data-device="tablet"><i class="fa-solid fa-tablet-screen-button"></i> T</button>
                                    <button class="lhe-field-device-btn" data-device="mobile"><i class="fa-solid fa-mobile-screen-button"></i> M</button>
                                </div>
                                
                                <!-- Desktop Font Slider -->
                                <div class="lhe-device-field-container active" data-device="desktop">
                                    <label class="lhe-editor-label">Desktop <span class="value" id="val-fs-desktop">Padrão</span></label>
                                    <input type="range" id="lhe-slider-fs-desktop" class="lhe-range-slider" min="10" max="120" step="1">
                                </div>
                                <!-- Tablet Font Slider -->
                                <div class="lhe-device-field-container" data-device="tablet">
                                    <label class="lhe-editor-label">Tablet <span class="value" id="val-fs-tablet">Padrão</span></label>
                                    <input type="range" id="lhe-slider-fs-tablet" class="lhe-range-slider" min="10" max="120" step="1">
                                </div>
                                <!-- Mobile Font Slider -->
                                <div class="lhe-device-field-container" data-device="mobile">
                                    <label class="lhe-editor-label">Mobile <span class="value" id="val-fs-mobile">Padrão</span></label>
                                    <input type="range" id="lhe-slider-fs-mobile" class="lhe-range-slider" min="10" max="120" step="1">
                                </div>
                            </div>

                            <div style="display:flex; gap:10px;">
                                <button class="lhe-sidebar-btn" id="lhe-btn-bold" style="flex:1;"><i class="fa-solid fa-bold"></i> Negrito</button>
                                <button class="lhe-sidebar-btn" id="lhe-btn-italic" style="flex:1;"><i class="fa-solid fa-italic"></i> Itálico</button>
                            </div>
                        </div>
                    </div>

                    <!-- IMAGE SETTINGS -->
                    <div class="lhe-panel-section" id="lhe-sec-image" style="display:none;">
                        <button class="lhe-panel-trigger">
                            <span><i class="fa-solid fa-image"></i> Configurações da Imagem</span>
                            <i class="fa-solid fa-chevron-down chevron"></i>
                        </button>
                        <div class="lhe-panel-content">
                            <div class="lhe-image-preview-container">
                                <img src="" id="lhe-img-preview" class="lhe-image-preview" style="display:none;">
                                <span class="lhe-no-image-preview" id="lhe-img-no-preview">Nenhuma imagem selecionada</span>
                                <button class="lhe-sidebar-btn lhe-sidebar-btn-primary" id="lhe-btn-choose-img" style="width:100%;">
                                    <i class="fa-solid fa-images"></i> Alterar Imagem
                                </button>
                            </div>

                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                                <div class="lhe-editor-group">
                                    <label class="lhe-editor-label">Largura</label>
                                    <input type="text" id="lhe-img-width" class="lhe-sidebar-input" placeholder="Ex: 100% ou 200px">
                                </div>
                                <div class="lhe-editor-group">
                                    <label class="lhe-editor-label">Altura</label>
                                    <input type="text" id="lhe-img-height" class="lhe-sidebar-input" placeholder="Ex: auto ou 150px">
                                </div>
                            </div>

                            <div class="lhe-editor-group">
                                <label class="lhe-editor-label">Ajuste da Imagem (Object Fit)</label>
                                <select id="lhe-img-fit" class="lhe-sidebar-input">
                                    <option value="">Padrão</option>
                                    <option value="cover">Preencher Espaço (Cover)</option>
                                    <option value="contain">Enquadrar (Contain)</option>
                                    <option value="fill">Esticar (Fill)</option>
                                </select>
                            </div>

                            <div class="lhe-editor-group">
                                <label class="lhe-editor-label">Texto Alternativo (Alt)</label>
                                <input type="text" id="lhe-img-alt" class="lhe-sidebar-input" placeholder="Descrição da imagem">
                            </div>
                        </div>
                    </div>

                    <!-- SVG SETTINGS -->
                    <div class="lhe-panel-section" id="lhe-sec-svg" style="display:none;">
                        <button class="lhe-panel-trigger">
                            <span><i class="fa-solid fa-shapes"></i> Ícone SVG</span>
                            <i class="fa-solid fa-chevron-down chevron"></i>
                        </button>
                        <div class="lhe-panel-content">
                            <div class="lhe-image-preview-container">
                                <div id="lhe-svg-preview" style="max-height:80px; max-width:100%; display:flex; align-items:center;"></div>
                                <button class="lhe-sidebar-btn lhe-sidebar-btn-primary" id="lhe-btn-choose-svg" style="width:100%;">
                                    <i class="fa-solid fa-upload"></i> Substituir Ícone SVG
                                </button>
                            </div>
                            <div class="lhe-editor-group">
                                <label class="lhe-editor-label">Cor do Ícone (Fill/Stroke)</label>
                                <div class="lhe-color-picker-row">
                                    <input type="color" id="lhe-input-svg-color" class="lhe-color-picker-input">
                                    <input type="text" id="lhe-input-svg-color-hex" class="lhe-sidebar-input" style="letter-spacing:0; font-family:monospace;" placeholder="#00f0ff">
                                </div>
                            </div>
                            <div class="lhe-editor-group">
                                <label class="lhe-editor-label">Tamanho do Ícone <span class="value" id="val-svg-size">Padrão</span></label>
                                <input type="range" id="lhe-slider-svg-size" class="lhe-range-slider" min="12" max="200" step="1">
                            </div>
                        </div>
                    </div>

                    <!-- SECTION / CONTAINER BACKGROUND SETTINGS -->
                    <div class="lhe-panel-section" id="lhe-sec-bg">
                        <button class="lhe-panel-trigger">
                            <span><i class="fa-solid fa-paint-roller"></i> Fundo da Seção/Card</span>
                            <i class="fa-solid fa-chevron-down chevron"></i>
                        </button>
                        <div class="lhe-panel-content">
                            <div class="lhe-editor-group">
                                <label class="lhe-editor-label">Cor de Fundo</label>
                                <div class="lhe-color-picker-row">
                                    <input type="color" id="lhe-input-bg-color" class="lhe-color-picker-input">
                                    <input type="text" id="lhe-input-bg-color-hex" class="lhe-sidebar-input" style="letter-spacing:0; font-family:monospace;" placeholder="transparente">
                                </div>
                            </div>

                            <!-- Responsive Background Image Tab Controls -->
                            <div class="lhe-editor-group">
                                <label class="lhe-editor-label">Imagem de Fundo Responsiva</label>
                                <div class="lhe-field-device-tabs">
                                    <button class="lhe-field-device-btn active" data-device="desktop"><i class="fa-solid fa-desktop"></i> Desktop</button>
                                    <button class="lhe-field-device-btn" data-device="tablet"><i class="fa-solid fa-tablet-screen-button"></i> Tablet</button>
                                    <button class="lhe-field-device-btn" data-device="mobile"><i class="fa-solid fa-mobile-screen-button"></i> Mobile</button>
                                </div>
                                
                                <!-- Desktop Background picker -->
                                <div class="lhe-device-field-container active" data-device="desktop">
                                    <div class="lhe-image-preview-container">
                                        <img src="" id="lhe-bg-desktop-preview" class="lhe-image-preview" style="display:none;">
                                        <span class="lhe-no-image-preview" id="lhe-bg-desktop-no-preview">Sem fundo de desktop</span>
                                        <div style="display:flex; gap:5px; width:100%;">
                                            <button class="lhe-sidebar-btn" id="lhe-btn-bg-desktop-choose" style="flex:1; padding:6px;"><i class="fa-solid fa-image"></i> Escolher</button>
                                            <button class="lhe-sidebar-btn lhe-btn-danger" id="lhe-btn-bg-desktop-clear" style="padding:6px;"><i class="fa-solid fa-trash"></i></button>
                                        </div>
                                    </div>
                                </div>
                                <!-- Tablet Background picker -->
                                <div class="lhe-device-field-container" data-device="tablet">
                                    <div class="lhe-image-preview-container">
                                        <img src="" id="lhe-bg-tablet-preview" class="lhe-image-preview" style="display:none;">
                                        <span class="lhe-no-image-preview" id="lhe-bg-tablet-no-preview">Usa mesma imagem de desktop</span>
                                        <div style="display:flex; gap:5px; width:100%;">
                                            <button class="lhe-sidebar-btn" id="lhe-btn-bg-tablet-choose" style="flex:1; padding:6px;"><i class="fa-solid fa-image"></i> Escolher</button>
                                            <button class="lhe-sidebar-btn lhe-btn-danger" id="lhe-btn-bg-tablet-clear" style="padding:6px;"><i class="fa-solid fa-trash"></i></button>
                                        </div>
                                    </div>
                                </div>
                                <!-- Mobile Background picker -->
                                <div class="lhe-device-field-container" data-device="mobile">
                                    <div class="lhe-image-preview-container">
                                        <img src="" id="lhe-bg-mobile-preview" class="lhe-image-preview" style="display:none;">
                                        <span class="lhe-no-image-preview" id="lhe-bg-mobile-no-preview">Usa mesma imagem de desktop/tablet</span>
                                        <div style="display:flex; gap:5px; width:100%;">
                                            <button class="lhe-sidebar-btn" id="lhe-btn-bg-mobile-choose" style="flex:1; padding:6px;"><i class="fa-solid fa-image"></i> Escolher</button>
                                            <button class="lhe-sidebar-btn lhe-btn-danger" id="lhe-btn-bg-mobile-clear" style="padding:6px;"><i class="fa-solid fa-trash"></i></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- SPACING & DIMENSIONS SETTINGS -->
                    <div class="lhe-panel-section" id="lhe-sec-spacing">
                        <button class="lhe-panel-trigger">
                            <span><i class="fa-solid fa-arrows-up-down-left-right"></i> Espaçamento e Dimensões</span>
                            <i class="fa-solid fa-chevron-down chevron"></i>
                        </button>
                        <div class="lhe-panel-content">
                            <div class="lhe-field-device-tabs">
                                <button class="lhe-field-device-btn active" data-device="desktop"><i class="fa-solid fa-desktop"></i> Desktop</button>
                                <button class="lhe-field-device-btn" data-device="tablet"><i class="fa-solid fa-tablet-screen-button"></i> Tablet</button>
                                <button class="lhe-field-device-btn" data-device="mobile"><i class="fa-solid fa-mobile-screen-button"></i> Mobile</button>
                            </div>

                            <div class="lhe-device-field-container active" data-device="desktop">
                                <div class="lhe-editor-group">
                                    <label class="lhe-editor-label">Padding (Espaçamento Interno)</label>
                                    <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap: 5px;">
                                        <div>
                                            <input type="text" id="lhe-pad-top-desktop" class="lhe-sidebar-input" style="padding: 5px !important; text-align: center; font-size:11px !important;" placeholder="Top">
                                        </div>
                                        <div>
                                            <input type="text" id="lhe-pad-right-desktop" class="lhe-sidebar-input" style="padding: 5px !important; text-align: center; font-size:11px !important;" placeholder="Right">
                                        </div>
                                        <div>
                                            <input type="text" id="lhe-pad-bottom-desktop" class="lhe-sidebar-input" style="padding: 5px !important; text-align: center; font-size:11px !important;" placeholder="Bottom">
                                        </div>
                                        <div>
                                            <input type="text" id="lhe-pad-left-desktop" class="lhe-sidebar-input" style="padding: 5px !important; text-align: center; font-size:11px !important;" placeholder="Left">
                                        </div>
                                    </div>
                                </div>
                                <div class="lhe-editor-group">
                                    <label class="lhe-editor-label">Margin (Margem Externa)</label>
                                    <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap: 5px;">
                                        <div>
                                            <input type="text" id="lhe-mar-top-desktop" class="lhe-sidebar-input" style="padding: 5px !important; text-align: center; font-size:11px !important;" placeholder="Top">
                                        </div>
                                        <div>
                                            <input type="text" id="lhe-mar-right-desktop" class="lhe-sidebar-input" style="padding: 5px !important; text-align: center; font-size:11px !important;" placeholder="Right">
                                        </div>
                                        <div>
                                            <input type="text" id="lhe-mar-bottom-desktop" class="lhe-sidebar-input" style="padding: 5px !important; text-align: center; font-size:11px !important;" placeholder="Bottom">
                                        </div>
                                        <div>
                                            <input type="text" id="lhe-mar-left-desktop" class="lhe-sidebar-input" style="padding: 5px !important; text-align: center; font-size:11px !important;" placeholder="Left">
                                        </div>
                                    </div>
                                </div>
                                <div class="lhe-editor-group">
                                    <label class="lhe-editor-label">Largura (Width)</label>
                                    <div style="display:flex; gap:5px;">
                                        <input type="text" id="lhe-width-desktop" class="lhe-sidebar-input" style="flex:1;" placeholder="Ex: 100%, 1200px, auto">
                                        <button class="lhe-sidebar-btn" id="lhe-btn-width-full-desktop" style="padding:6px; font-size:11px;" title="Largura Total 100%">100%</button>
                                        <button class="lhe-sidebar-btn" id="lhe-btn-width-auto-desktop" style="padding:6px; font-size:11px;" title="Largura Automática">Auto</button>
                                    </div>
                                </div>
                                <div class="lhe-editor-group">
                                    <label class="lhe-editor-label">Largura Máxima (Max Width)</label>
                                    <div style="display:flex; gap:5px;">
                                        <input type="text" id="lhe-max-width-desktop" class="lhe-sidebar-input" style="flex:1;" placeholder="Ex: 1200px, none">
                                        <button class="lhe-sidebar-btn" id="lhe-btn-max-width-none-desktop" style="padding:6px; font-size:11px;" title="Remover Largura Máxima">Nenhum</button>
                                    </div>
                                </div>
                                <div class="lhe-editor-group">
                                    <label class="lhe-editor-label">Altura (Height)</label>
                                    <input type="text" id="lhe-height-desktop" class="lhe-sidebar-input" placeholder="Ex: auto, 500px">
                                </div>
                            </div>

                            <div class="lhe-device-field-container" data-device="tablet">
                                <div class="lhe-editor-group">
                                    <label class="lhe-editor-label">Padding (Espaçamento Interno)</label>
                                    <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap: 5px;">
                                        <div>
                                            <input type="text" id="lhe-pad-top-tablet" class="lhe-sidebar-input" style="padding: 5px !important; text-align: center; font-size:11px !important;" placeholder="Top">
                                        </div>
                                        <div>
                                            <input type="text" id="lhe-pad-right-tablet" class="lhe-sidebar-input" style="padding: 5px !important; text-align: center; font-size:11px !important;" placeholder="Right">
                                        </div>
                                        <div>
                                            <input type="text" id="lhe-pad-bottom-tablet" class="lhe-sidebar-input" style="padding: 5px !important; text-align: center; font-size:11px !important;" placeholder="Bottom">
                                        </div>
                                        <div>
                                            <input type="text" id="lhe-pad-left-tablet" class="lhe-sidebar-input" style="padding: 5px !important; text-align: center; font-size:11px !important;" placeholder="Left">
                                        </div>
                                    </div>
                                </div>
                                <div class="lhe-editor-group">
                                    <label class="lhe-editor-label">Margin (Margem Externa)</label>
                                    <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap: 5px;">
                                        <div>
                                            <input type="text" id="lhe-mar-top-tablet" class="lhe-sidebar-input" style="padding: 5px !important; text-align: center; font-size:11px !important;" placeholder="Top">
                                        </div>
                                        <div>
                                            <input type="text" id="lhe-mar-right-tablet" class="lhe-sidebar-input" style="padding: 5px !important; text-align: center; font-size:11px !important;" placeholder="Right">
                                        </div>
                                        <div>
                                            <input type="text" id="lhe-mar-bottom-tablet" class="lhe-sidebar-input" style="padding: 5px !important; text-align: center; font-size:11px !important;" placeholder="Bottom">
                                        </div>
                                        <div>
                                            <input type="text" id="lhe-mar-left-tablet" class="lhe-sidebar-input" style="padding: 5px !important; text-align: center; font-size:11px !important;" placeholder="Left">
                                        </div>
                                    </div>
                                </div>
                                <div class="lhe-editor-group">
                                    <label class="lhe-editor-label">Largura (Width)</label>
                                    <div style="display:flex; gap:5px;">
                                        <input type="text" id="lhe-width-tablet" class="lhe-sidebar-input" style="flex:1;" placeholder="Herdado de Desktop">
                                        <button class="lhe-sidebar-btn" id="lhe-btn-width-full-tablet" style="padding:6px; font-size:11px;">100%</button>
                                    </div>
                                </div>
                            </div>

                            <div class="lhe-device-field-container" data-device="mobile">
                                <div class="lhe-editor-group">
                                    <label class="lhe-editor-label">Padding (Espaçamento Interno)</label>
                                    <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap: 5px;">
                                        <div>
                                            <input type="text" id="lhe-pad-top-mobile" class="lhe-sidebar-input" style="padding: 5px !important; text-align: center; font-size:11px !important;" placeholder="Top">
                                        </div>
                                        <div>
                                            <input type="text" id="lhe-pad-right-mobile" class="lhe-sidebar-input" style="padding: 5px !important; text-align: center; font-size:11px !important;" placeholder="Right">
                                        </div>
                                        <div>
                                            <input type="text" id="lhe-pad-bottom-mobile" class="lhe-sidebar-input" style="padding: 5px !important; text-align: center; font-size:11px !important;" placeholder="Bottom">
                                        </div>
                                        <div>
                                            <input type="text" id="lhe-pad-left-mobile" class="lhe-sidebar-input" style="padding: 5px !important; text-align: center; font-size:11px !important;" placeholder="Left">
                                        </div>
                                    </div>
                                </div>
                                <div class="lhe-editor-group">
                                    <label class="lhe-editor-label">Margin (Margem Externa)</label>
                                    <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap: 5px;">
                                        <div>
                                            <input type="text" id="lhe-mar-top-mobile" class="lhe-sidebar-input" style="padding: 5px !important; text-align: center; font-size:11px !important;" placeholder="Top">
                                        </div>
                                        <div>
                                            <input type="text" id="lhe-mar-right-mobile" class="lhe-sidebar-input" style="padding: 5px !important; text-align: center; font-size:11px !important;" placeholder="Right">
                                        </div>
                                        <div>
                                            <input type="text" id="lhe-mar-bottom-mobile" class="lhe-sidebar-input" style="padding: 5px !important; text-align: center; font-size:11px !important;" placeholder="Bottom">
                                        </div>
                                        <div>
                                            <input type="text" id="lhe-mar-left-mobile" class="lhe-sidebar-input" style="padding: 5px !important; text-align: center; font-size:11px !important;" placeholder="Left">
                                        </div>
                                    </div>
                                </div>
                                <div class="lhe-editor-group">
                                    <label class="lhe-editor-label">Largura (Width)</label>
                                    <div style="display:flex; gap:5px;">
                                        <input type="text" id="lhe-width-mobile" class="lhe-sidebar-input" style="flex:1;" placeholder="Herdado de Tablet">
                                        <button class="lhe-sidebar-btn" id="lhe-btn-width-full-mobile" style="padding:6px; font-size:11px;">100%</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- BUTTON SPECIFIC SETTINGS -->
                    <div class="lhe-panel-section" id="lhe-sec-button" style="display:none;">
                        <button class="lhe-panel-trigger">
                            <span><i class="fa-solid fa-link"></i> Personalizar Botão</span>
                            <i class="fa-solid fa-chevron-down chevron"></i>
                        </button>
                        <div class="lhe-panel-content">
                            <div class="lhe-editor-group">
                                <label class="lhe-editor-label">Link do Botão (URL)</label>
                                <input type="text" id="lhe-input-button-link" class="lhe-sidebar-input" placeholder="https://exemplo.com">
                            </div>
                            
                            <div class="lhe-editor-group">
                                <label class="lhe-editor-label">Cor de Fundo do Botão</label>
                                <div class="lhe-color-picker-row">
                                    <input type="color" id="lhe-input-btn-bg" class="lhe-color-picker-input">
                                    <input type="text" id="lhe-input-btn-bg-hex" class="lhe-sidebar-input" style="letter-spacing:0; font-family:monospace;" placeholder="#ffd000">
                                </div>
                            </div>

                            <div class="lhe-switch-row">
                                <span class="lhe-switch-label"><i class="fa-solid fa-sun" style="color:#00f0ff;"></i> Efeito de Brilho</span>
                                <label class="lhe-switch">
                                    <input type="checkbox" id="lhe-toggle-btn-glow">
                                    <span class="lhe-slider"></span>
                                </label>
                            </div>

                            <div class="lhe-switch-row">
                                <span class="lhe-switch-label"><i class="fa-solid fa-heartbeat" style="color:#ef4444;"></i> Efeito Pulsante</span>
                                <label class="lhe-switch">
                                    <input type="checkbox" id="lhe-toggle-btn-pulse">
                                    <span class="lhe-slider"></span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <!-- ADD ELEMENT -->
                    <div class="lhe-panel-section" id="lhe-sec-add-element">
                        <button class="lhe-panel-trigger">
                            <span><i class="fa-solid fa-plus"></i> Adicionar Elemento</span>
                            <i class="fa-solid fa-chevron-down chevron"></i>
                        </button>
                        <div class="lhe-panel-content">
                            <p class="lhe-help-text" style="margin-bottom:12px; color:#777; font-size:11px;">Escolha um elemento para inserir após ou dentro do selecionado:</p>
                            
                            <!-- Insertion Mode -->
                            <div class="lhe-editor-group" style="margin-bottom: 15px;">
                                <label class="lhe-editor-label">Posição de Inserção</label>
                                <div style="display:flex; gap:10px;">
                                    <label style="flex:1; display:flex; align-items:center; gap:5px; font-size:12px; color:#555; cursor:pointer;">
                                        <input type="radio" name="lhe-add-position" value="after" checked style="margin:0;"> Depois
                                    </label>
                                    <label style="flex:1; display:flex; align-items:center; gap:5px; font-size:12px; color:#555; cursor:pointer;" id="lhe-add-inside-label">
                                        <input type="radio" name="lhe-add-position" value="inside" style="margin:0;"> Dentro
                                    </label>
                                </div>
                            </div>
                            
                            <!-- Buttons Grid -->
                            <div class="lhe-actions-grid" style="grid-template-columns: 1fr 1fr; display: grid; gap: 8px;">
                                <button class="lhe-sidebar-btn" id="lhe-add-title" style="text-align:left; font-size:12px; padding:8px;">
                                    <i class="fa-solid fa-heading"></i> Título (H2)
                                </button>
                                <button class="lhe-sidebar-btn" id="lhe-add-text" style="text-align:left; font-size:12px; padding:8px;">
                                    <i class="fa-solid fa-paragraph"></i> Parágrafo
                                </button>
                                <button class="lhe-sidebar-btn" id="lhe-add-image" style="text-align:left; font-size:12px; padding:8px;">
                                    <i class="fa-solid fa-image"></i> Imagem (IMG)
                                </button>
                                <button class="lhe-sidebar-btn" id="lhe-add-icon" style="text-align:left; font-size:12px; padding:8px;">
                                    <i class="fa-solid fa-icons"></i> Ícone (SVG)
                                </button>
                                <button class="lhe-sidebar-btn" id="lhe-add-button" style="text-align:left; font-size:12px; padding:8px;">
                                    <i class="fa-solid fa-rectangle-ad"></i> Botão (Link)
                                </button>
                                <button class="lhe-sidebar-btn" id="lhe-add-container" style="text-align:left; font-size:12px; padding:8px;">
                                    <i class="fa-solid fa-box"></i> Container (Div)
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- DOM OPERATIONS -->
                    <div class="lhe-panel-section">
                        <button class="lhe-panel-trigger">
                            <span><i class="fa-solid fa-toolbox"></i> Ações do Elemento</span>
                            <i class="fa-solid fa-chevron-down chevron"></i>
                        </button>
                        <div class="lhe-panel-content">
                            <div class="lhe-actions-grid">
                                <button class="lhe-sidebar-btn" id="lhe-action-move-up">
                                    <i class="fa-solid fa-arrow-up"></i> Mover para Cima
                                </button>
                                <button class="lhe-sidebar-btn" id="lhe-action-move-down">
                                    <i class="fa-solid fa-arrow-down"></i> Mover para Baixo
                                </button>
                                <button class="lhe-sidebar-btn" id="lhe-action-duplicate">
                                    <i class="fa-solid fa-clone"></i> Duplicar Elemento
                                </button>
                                <button class="lhe-sidebar-btn lhe-btn-danger" id="lhe-action-delete">
                                    <i class="fa-solid fa-trash-can"></i> Apagar Elemento
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).appendTo('body');

        // Populate Google Fonts list in Select
        const $fontSelect = $sidebar.find('#lhe-input-font-family');
        GOOGLE_FONTS.forEach(font => {
            $fontSelect.append(`<option value="${font}">${font}</option>`);
        });

        // Sidebar Panel Actions & Events
        $sidebar.find('.lhe-panel-trigger').on('click', function() {
            $(this).parent().toggleClass('open');
        });

        $sidebar.find('#lhe-sidebar-close-btn').on('click', function() {
            $sidebar.removeClass('open');
            $('body').removeClass('lhe-sidebar-open');
            $('.lhe-selected').removeClass('lhe-selected');
            if ($hoverLabel) $hoverLabel.hide();
        });

        // Device tabs switching inside fields
        $sidebar.find('.lhe-field-device-btn').on('click', function(e) {
            e.stopPropagation();
            const dev = $(this).data('device');
            setPreviewDevice(dev); // Sincroniza barra superior e corpo
        });

        // Setup Sidebar fields update bindings
        bindSidebarFields();
    }

    /**
     * Build Hover Label Element
     */
    function buildHoverLabel() {
        if ($hoverLabel) return;
        $hoverLabel = $('<div id="lhe-hover-label">TEXTO</div>').appendTo('body');
    }

    /**
     * Create Toast Notification Container
     */
    function createToastContainer() {
        if ($toastContainer) return;
        $toastContainer = $('<div class="lhe-toast-container"></div>').appendTo('body');
    }

    /**
     * Show Toast Notification
     */
    function showToast(message, type = 'success', duration = 3500) {
        createToastContainer();
        const icon = type === 'success' ? 'fa-circle-check' : (type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info');
        const $toast = $(`
            <div class="lhe-toast ${type}">
                <i class="fa-solid ${icon}"></i>
                <span>${message}</span>
            </div>
        `).appendTo($toastContainer);

        setTimeout(() => $toast.addClass('show'), 10);
        setTimeout(() => {
            $toast.removeClass('show');
            setTimeout(() => $toast.remove(), 300);
        }, duration);
    }

    /**
     * Bind hover and click events to page elements inside Elementor HTML Widgets
     */
    function bindEditorEvents() {
        // Encontra os containers de widget de HTML do Elementor
        const $widgetContainers = $('.elementor-widget-html .elementor-widget-container');

        // Mouse hover highlighting
        $widgetContainers.on('mouseover.lhe', '*', function(e) {
            if (!isEditMode) return;
            e.stopPropagation();

            const $el = $(this);
            // Ignore widget container and style blocks
            if ($el.hasClass('elementor-widget-container') || $el.is('style') || $el.is('script')) {
                return;
            }

            $('.lhe-hovered').removeClass('lhe-hovered');
            $el.addClass('lhe-hovered');

            // Position and show hover label
            const tag = this.tagName.toLowerCase();
            const labelText = getLabelForTag($el, tag);
            
            $hoverLabel.text(labelText)
                .removeClass('selected-label')
                .show();
            
            positionOverlayLabel($el, $hoverLabel);
        });

        $widgetContainers.on('mouseout.lhe', function(e) {
            if (!isEditMode) return;
            $('.lhe-hovered').removeClass('lhe-hovered');
            if (!selectedElement) {
                $hoverLabel.hide();
            } else {
                // Return label to selected element
                $hoverLabel.text(getLabelForTag($(selectedElement), selectedElement.tagName.toLowerCase()))
                    .addClass('selected-label')
                    .show();
                positionOverlayLabel($(selectedElement), $hoverLabel);
            }
        });

        // Click element selecting
        $widgetContainers.on('click.lhe', '*', function(e) {
            if (!isEditMode) return;
            e.stopPropagation();
            e.preventDefault();

            const $el = $(this);
            if ($el.hasClass('elementor-widget-container') || $el.is('style') || $el.is('script')) {
                return;
            }

            selectElement($el[0]);
        });
    }

    /**
     * Unbind frontend events
     */
    function unbindEditorEvents() {
        const $widgetContainers = $('.elementor-widget-html .elementor-widget-container');
        $widgetContainers.off('.lhe');
    }

    /**
     * Get human label for tags
     */
    function getLabelForTag($el, tag) {
        if ($el.is('a') || $el.is('button') || $el.hasClass('btn') || $el.hasClass('button')) return 'Botão/Link';
        if ($el.is('img')) return 'Imagem';
        if ($el.is('svg') || $el.is('path') || $el.hasClass('icon')) return 'Ícone SVG';
        if ($el.is('h1, h2, h3, h4, h5, h6')) return 'Título (' + tag.toUpperCase() + ')';
        if ($el.is('p, span, li, label, strong, em, b, i')) return 'Texto';
        
        // Se tem imagem de fundo inline ou se é uma seção detectada
        if ($el.css('background-image') !== 'none' || $el.hasClass('card') || $el.hasClass('section') || $el.hasClass('container')) {
            return 'Seção/Card';
        }
        return 'Bloco (' + tag.toUpperCase() + ')';
    }

    /**
     * Position the hovering/selected tag label nicely
     */
    function positionOverlayLabel($target, $label) {
        const offset = $target.offset();
        const targetHeight = $target.outerHeight();
        
        $label.css({
            top: offset.top,
            left: offset.left
        });
    }

    /**
     * Detect layout direction based on siblings relative position
     */
    function getLayoutDirection(element) {
        const $el = $(element);
        
        // Find nearest valid siblings, skipping style and script tags
        let $prev = $el.prev();
        while ($prev.length > 0 && ($prev.is('style') || $prev.is('script'))) {
            $prev = $prev.prev();
        }
        let $next = $el.next();
        while ($next.length > 0 && ($next.is('style') || $next.is('script'))) {
            $next = $next.next();
        }

        const isSideBySide = (rect1, rect2) => {
            // Check vertical overlap
            const verticalOverlap = Math.min(rect1.bottom, rect2.bottom) - Math.max(rect1.top, rect2.top);
            const minHeight = Math.min(rect1.height, rect2.height);
            return verticalOverlap > minHeight * 0.4; // at least 40% vertical overlap means side-by-side
        };

        if ($prev.length > 0) {
            const rect1 = $prev[0].getBoundingClientRect();
            const rect2 = element.getBoundingClientRect();
            if (isSideBySide(rect1, rect2)) return 'horizontal';
        } else if ($next.length > 0) {
            const rect1 = element.getBoundingClientRect();
            const rect2 = $next[0].getBoundingClientRect();
            if (isSideBySide(rect1, rect2)) return 'horizontal';
        }

        // Fallback: check parent css flex/grid styles
        const $parent = $el.parent();
        const display = $parent.css('display');
        const flexDir = $parent.css('flex-direction');
        if (display === 'flex' && (!flexDir || flexDir.indexOf('row') !== -1)) {
            return 'horizontal';
        }
        if (display === 'grid') {
            const gridCols = $parent.css('grid-template-columns');
            if (gridCols && gridCols !== 'none' && !gridCols.startsWith('100%') && !gridCols.startsWith('auto')) {
                return 'horizontal';
            }
        }

        return 'vertical';
    }

    /**
     * Dynamically update the move up/down button labels based on layout flow direction
     */
    function updateMoveButtonsLabels(direction) {
        const $btnUp = $sidebar.find('#lhe-action-move-up');
        const $btnDown = $sidebar.find('#lhe-action-move-down');
        if (direction === 'horizontal') {
            $btnUp.html('<i class="fa-solid fa-arrow-left"></i> Mover p/ Esquerda');
            $btnDown.html('<i class="fa-solid fa-arrow-right"></i> Mover p/ Direita');
        } else {
            $btnUp.html('<i class="fa-solid fa-arrow-up"></i> Mover para Cima');
            $btnDown.html('<i class="fa-solid fa-arrow-down"></i> Mover para Baixo');
        }
    }

    /**
     * Select a DOM Element to edit
     */
    function selectElement(element) {
        selectedElement = element;
        
        // Find parent elementor widget ID
        const $widget = $(element).closest('.elementor-widget-html');
        selectedWidgetId = $widget.data('id');

        $('.lhe-selected').removeClass('lhe-selected');
        $(element).addClass('lhe-selected');

        // Show selection tag
        $hoverLabel.text(getLabelForTag($(element), element.tagName.toLowerCase()))
            .addClass('selected-label')
            .show();
        positionOverlayLabel($(element), $hoverLabel);

        // Open Sidebar
        $sidebar.addClass('open');
        $('body').addClass('lhe-sidebar-open');

        // Build breadcrumbs
        buildBreadcrumbs(element, $widget[0]);

        // Load values into sidebar
        loadElementValues(element);

        // Update move buttons labels dynamically based on layout
        updateMoveButtonsLabels(getLayoutDirection(element));
    }

    /**
     * Build Element Breadcrumbs list
     */
    function buildBreadcrumbs(element, widgetRoot) {
        const path = [];
        let cur = element;
        
        while (cur && cur !== widgetRoot) {
            if ($(cur).hasClass('elementor-widget-container')) {
                break;
            }
            path.unshift(cur);
            cur = cur.parentNode;
        }

        const $list = $sidebar.find('#lhe-el-breadcrumbs').empty();
        path.forEach((el, index) => {
            if (index > 0) {
                $list.append('<span class="lhe-breadcrumb-sep">></span>');
            }
            
            const tag = el.tagName.toLowerCase();
            const text = getLabelForTag($(el), tag);
            const $item = $(`<span class="lhe-breadcrumb-item">${text}</span>`);
            
            if (el === selectedElement) {
                $item.addClass('active');
            }

            $item.on('click', function() {
                selectElement(el);
            });

            $list.append($item);
        });
    }

    /**
     * Ensure element has a data-live-edit-id for registry styles targetting
     */
    function getOrGenerateEditId(element) {
        let editId = element.getAttribute('data-live-edit-id');
        if (!editId) {
            editId = 'le-' + Math.random().toString(36).substr(2, 9);
            element.setAttribute('data-live-edit-id', editId);
        }
        return editId;
    }

    /**
     * Load Style Registry from widget's <style> block
     */
    function getStyleRegistry(widgetId) {
        const $widget = $(`.elementor-element-${widgetId}`);
        let $style = $widget.find(`#live-editor-styles-${widgetId}`);
        
        if ($style.length === 0) {
            $style = $(`<style id="live-editor-styles-${widgetId}" data-registry="{}"></style>`).appendTo($widget.find('.elementor-widget-container'));
        }

        try {
            return JSON.parse($style.attr('data-registry') || '{}');
        } catch(e) {
            return {};
        }
    }

    /**
     * Save Style Registry and regenerate CSS inside the widget <style> block
     */
    function saveStyleRegistry(widgetId, registry) {
        const $widget = $(`.elementor-element-${widgetId}`);
        const $style = $widget.find(`#live-editor-styles-${widgetId}`);
        
        $style.attr('data-registry', JSON.stringify(registry));

        // Regenerate stylesheet string
        let css = '';
        
        // 1. Desktop Styles (Default)
        for (const [editId, devices] of Object.entries(registry)) {
            if (devices.desktop) {
                css += `[data-live-edit-id="${editId}"] {\n`;
                for (const [prop, val] of Object.entries(devices.desktop)) {
                    css += `  ${prop}: ${val} !important;\n`;
                }
                css += `}\n`;
            }
        }

        // 2. Tablet Styles
        let tabletCss = '';
        for (const [editId, devices] of Object.entries(registry)) {
            if (devices.tablet) {
                tabletCss += `[data-live-edit-id="${editId}"] {\n`;
                for (const [prop, val] of Object.entries(devices.tablet)) {
                    tabletCss += `  ${prop}: ${val} !important;\n`;
                }
                tabletCss += `}\n`;
            }
        }
        if (tabletCss) {
            css += `@media(max-width: 1024px) {\n${tabletCss}}\n`;
        }

        // 3. Mobile Styles
        let mobileCss = '';
        for (const [editId, devices] of Object.entries(registry)) {
            if (devices.mobile) {
                mobileCss += `[data-live-edit-id="${editId}"] {\n`;
                for (const [prop, val] of Object.entries(devices.mobile)) {
                    mobileCss += `  ${prop}: ${val} !important;\n`;
                }
                mobileCss += `}\n`;
            }
        }
        if (mobileCss) {
            css += `@media(max-width: 767px) {\n${mobileCss}}\n`;
        }

        $style.html(css);
        
        // Mark widget as dirty/modified
        editedWidgets.add(widgetId);
    }

    /**
     * Get a registered style value for an element
     */
    function getRegisteredStyle(widgetId, editId, device, prop) {
        const registry = getStyleRegistry(widgetId);
        if (registry[editId] && registry[editId][device] && registry[editId][device][prop]) {
            return registry[editId][device][prop];
        }
        return null;
    }

    /**
     * Set a style value inside registry
     */
    function setRegisteredStyle(widgetId, editId, device, prop, val) {
        const registry = getStyleRegistry(widgetId);
        
        if (!registry[editId]) {
            registry[editId] = {};
        }
        if (!registry[editId][device]) {
            registry[editId][device] = {};
        }

        if (val === null || val === '') {
            delete registry[editId][device][prop];
            // Cleanup empty states
            if (Object.keys(registry[editId][device]).length === 0) {
                delete registry[editId][device];
            }
            if (Object.keys(registry[editId]).length === 0) {
                delete registry[editId];
            }
        } else {
            registry[editId][device][prop] = val;
        }

        saveStyleRegistry(widgetId, registry);
    }

    /**
     * Load current values of selected element into Sidebar fields
     */
    function loadElementValues(element) {
        const $el = $(element);
        const tag = element.tagName.toLowerCase();
        const editId = getOrGenerateEditId(element);

        // Reset sidebar visibility sections
        $sidebar.find('#lhe-sec-text, #lhe-sec-image, #lhe-sec-svg, #lhe-sec-button').hide();

        // 1. Text & Typography Section Loading
        const isTextElement = $el.is('h1, h2, h3, h4, h5, h6, p, span, li, label, strong, em, b, i, a, button');
        if (isTextElement) {
            $sidebar.find('#lhe-sec-text').show().addClass('open');
            
            // Text Content (inner HTML/text)
            $sidebar.find('#lhe-input-text-content').val(element.innerText.trim());

            // Font Family
            const font = getRegisteredStyle(selectedWidgetId, editId, 'desktop', 'font-family') || '';
            $sidebar.find('#lhe-input-font-family').val(font.replace(/['"]/g, ''));

            // Text Color
            let color = getRegisteredStyle(selectedWidgetId, editId, 'desktop', 'color') || '';
            if (!color) {
                // Fallback to computed color
                color = rgbToHex($el.css('color'));
            }
            $sidebar.find('#lhe-input-text-color').val(color);
            $sidebar.find('#lhe-input-text-color-hex').val(color);

            // Responsive Font Sizes
            const fsDesktop = parseInt(getRegisteredStyle(selectedWidgetId, editId, 'desktop', 'font-size')) || '';
            const fsTablet = parseInt(getRegisteredStyle(selectedWidgetId, editId, 'tablet', 'font-size')) || '';
            const fsMobile = parseInt(getRegisteredStyle(selectedWidgetId, editId, 'mobile', 'font-size')) || '';

            updateFontSlider('desktop', fsDesktop);
            updateFontSlider('tablet', fsTablet);
            updateFontSlider('mobile', fsMobile);
        }

        // 2. Image Section Loading
        if ($el.is('img')) {
            $sidebar.find('#lhe-sec-image').show().addClass('open');
            
            $sidebar.find('#lhe-img-preview').attr('src', $el.attr('src')).show();
            $sidebar.find('#lhe-img-no-preview').hide();
            
            $sidebar.find('#lhe-img-width').val(getRegisteredStyle(selectedWidgetId, editId, 'desktop', 'width') || $el.attr('width') || '');
            $sidebar.find('#lhe-img-height').val(getRegisteredStyle(selectedWidgetId, editId, 'desktop', 'height') || $el.attr('height') || '');
            $sidebar.find('#lhe-img-fit').val(getRegisteredStyle(selectedWidgetId, editId, 'desktop', 'object-fit') || $el.css('object-fit') || '');
            $sidebar.find('#lhe-img-alt').val($el.attr('alt') || '');
        }

        // 3. SVG Section Loading
        const isSvg = $el.is('svg') || $el.find('svg').length > 0;
        if (isSvg) {
            $sidebar.find('#lhe-sec-svg').show().addClass('open');
            const $svgNode = $el.is('svg') ? $el : $el.find('svg');
            
            // Render SVG preview
            $sidebar.find('#lhe-svg-preview').html($svgNode.clone().css({width:'auto', height:'40px'}));

            // Fill color
            let svgColor = getRegisteredStyle(selectedWidgetId, editId, 'desktop', 'fill') || '';
            if (!svgColor) {
                svgColor = rgbToHex($svgNode.css('fill') || $svgNode.css('stroke') || '#00f0ff');
            }
            $sidebar.find('#lhe-input-svg-color').val(svgColor);
            $sidebar.find('#lhe-input-svg-color-hex').val(svgColor);

            // Size slider
            const svgSize = parseInt(getRegisteredStyle(selectedWidgetId, editId, 'desktop', 'width')) || parseInt($svgNode.attr('width')) || 24;
            $sidebar.find('#lhe-slider-svg-size').val(svgSize);
            $sidebar.find('#val-svg-size').text(svgSize + 'px');
        }

        // 4. Section Background Loading
        let bgColor = getRegisteredStyle(selectedWidgetId, editId, 'desktop', 'background-color') || '';
        if (!bgColor) {
            bgColor = rgbToHex($el.css('background-color'));
        }
        $sidebar.find('#lhe-input-bg-color').val(bgColor.startsWith('#') ? bgColor : '#ffffff');
        $sidebar.find('#lhe-input-bg-color-hex').val(bgColor);

        // Load Background images
        loadBgImagePreview('desktop', editId);
        loadBgImagePreview('tablet', editId);
        loadBgImagePreview('mobile', editId);

        // 5. Button Customization Loading
        const isBtn = $el.is('a') || $el.is('button') || $el.hasClass('btn') || $el.hasClass('button');
        if (isBtn) {
            $sidebar.find('#lhe-sec-button').show().addClass('open');

            // Button Link URL
            $sidebar.find('#lhe-input-button-link').val($el.attr('href') || '');

            // Button Colors
            let btnBgColor = getRegisteredStyle(selectedWidgetId, editId, 'desktop', 'background-color') || '';
            if (!btnBgColor) {
                btnBgColor = rgbToHex($el.css('background-color'));
            }
            $sidebar.find('#lhe-input-btn-bg').val(btnBgColor.startsWith('#') ? btnBgColor : '#ffffff');
            $sidebar.find('#lhe-input-btn-bg-hex').val(btnBgColor);

            // Toggles
            $sidebar.find('#lhe-toggle-btn-glow').prop('checked', $el.hasClass('lhe-glow-effect'));
            $sidebar.find('#lhe-toggle-btn-pulse').prop('checked', $el.hasClass('lhe-pulse-effect'));
        }

        // 6. Spacing & Dimensions Loading
        const devicesList = ['desktop', 'tablet', 'mobile'];
        devicesList.forEach(dev => {
            const dirs = ['top', 'right', 'bottom', 'left'];
            dirs.forEach(dir => {
                // Padding
                let padVal = getRegisteredStyle(selectedWidgetId, editId, dev, `padding-${dir}`) || '';
                if (!padVal && dev === 'desktop') {
                    padVal = element.style[`padding${dir.charAt(0).toUpperCase() + dir.slice(1)}`] || '';
                }
                $sidebar.find(`#lhe-pad-${dir}-${dev}`).val(padVal);

                // Margin
                let marVal = getRegisteredStyle(selectedWidgetId, editId, dev, `margin-${dir}`) || '';
                if (!marVal && dev === 'desktop') {
                    marVal = element.style[`margin${dir.charAt(0).toUpperCase() + dir.slice(1)}`] || '';
                }
                $sidebar.find(`#lhe-mar-${dir}-${dev}`).val(marVal);
            });

            // Width
            let widthVal = getRegisteredStyle(selectedWidgetId, editId, dev, 'width') || '';
            if (!widthVal && dev === 'desktop') {
                widthVal = element.style.width || '';
            }
            $sidebar.find(`#lhe-width-${dev}`).val(widthVal);
        });

        // Max Width (Desktop only)
        let maxWidthVal = getRegisteredStyle(selectedWidgetId, editId, 'desktop', 'max-width') || '';
        if (!maxWidthVal) {
            maxWidthVal = element.style.maxWidth || '';
        }
        $sidebar.find('#lhe-max-width-desktop').val(maxWidthVal);

        // Height (Desktop only)
        let heightVal = getRegisteredStyle(selectedWidgetId, editId, 'desktop', 'height') || '';
        if (!heightVal) {
            heightVal = element.style.height || '';
        }
        $sidebar.find('#lhe-height-desktop').val(heightVal);

        // Check if selected element is a container to show/hide "Dentro" insertion mode
        const isContainer = $el.is('div, section, article, aside, header, footer, main');
        if (isContainer) {
            $sidebar.find('#lhe-add-inside-label').show();
        } else {
            $sidebar.find('#lhe-add-inside-label').hide();
            $sidebar.find('input[name="lhe-add-position"][value="after"]').prop('checked', true);
        }
    }

    /**
     * Update Font Size Slider text and input values
     */
    function updateFontSlider(device, val) {
        const $slider = $sidebar.find(`#lhe-slider-fs-${device}`);
        const $label = $sidebar.find(`#val-fs-${device}`);

        if (val) {
            $slider.val(val);
            $label.text(val + 'px');
        } else {
            $slider.val(16);
            $label.text('Padrão');
        }
    }

    /**
     * Helper to load Background image preview in sidebar
     */
    function loadBgImagePreview(device, editId) {
        const bgVal = getRegisteredStyle(selectedWidgetId, editId, device, 'background-image');
        const $preview = $sidebar.find(`#lhe-bg-${device}-preview`);
        const $noPreview = $sidebar.find(`#lhe-bg-${device}-no-preview`);

        if (bgVal && bgVal.startsWith('url(')) {
            const url = bgVal.replace(/url\(['"]?([^'"]*)['"]?\)/i, '$1');
            $preview.attr('src', url).show();
            $noPreview.hide();
        } else {
            $preview.hide();
            $noPreview.show();
        }
    }

    /**
     * Sincroniza campos da sidebar com as mudanças no elemento real time
     */
    function bindSidebarFields() {
        const $body = $sidebar.find('.lhe-sidebar-body');

        // 1. TEXT CONTENT
        $body.on('input', '#lhe-input-text-content', function() {
            if (!selectedElement) return;
            selectedElement.innerText = $(this).val();
            editedWidgets.add(selectedWidgetId);
        });

        // 2. FONT FAMILY
        $body.on('change', '#lhe-input-font-family', function() {
            if (!selectedElement) return;
            const font = $(this).val();
            const editId = getOrGenerateEditId(selectedElement);

            if (font) {
                // Dynamically load font stylesheet from Google API
                loadGoogleFont(font);
                setRegisteredStyle(selectedWidgetId, editId, 'desktop', 'font-family', `'${font}', sans-serif`);
            } else {
                setRegisteredStyle(selectedWidgetId, editId, 'desktop', 'font-family', null);
            }
        });

        // 3. TEXT COLOR
        $body.on('input', '#lhe-input-text-color', function() {
            const hex = $(this).val();
            $('#lhe-input-text-color-hex').val(hex);
            applyStyle('color', hex);
        });

        $body.on('input', '#lhe-input-text-color-hex', function() {
            const hex = $(this).val();
            $('#lhe-input-text-color').val(hex);
            applyStyle('color', hex);
        });

        // 4. RESPONSIVE FONT SIZE SLIDERS
        $body.on('input', '#lhe-slider-fs-desktop', function() {
            const val = $(this).val();
            $('#val-fs-desktop').text(val + 'px');
            applyStyle('font-size', val + 'px', 'desktop');
        });

        $body.on('input', '#lhe-slider-fs-tablet', function() {
            const val = $(this).val();
            $('#val-fs-tablet').text(val + 'px');
            applyStyle('font-size', val + 'px', 'tablet');
        });

        $body.on('input', '#lhe-slider-fs-mobile', function() {
            const val = $(this).val();
            $('#val-fs-mobile').text(val + 'px');
            applyStyle('font-size', val + 'px', 'mobile');
        });

        // 5. TEXT DECORATIONS
        $body.on('click', '#lhe-btn-bold', function() {
            if (!selectedElement) return;
            const editId = getOrGenerateEditId(selectedElement);
            const current = getRegisteredStyle(selectedWidgetId, editId, 'desktop', 'font-weight');
            const newVal = current === 'bold' ? 'normal' : 'bold';
            setRegisteredStyle(selectedWidgetId, editId, 'desktop', 'font-weight', newVal);
        });

        $body.on('click', '#lhe-btn-italic', function() {
            if (!selectedElement) return;
            const editId = getOrGenerateEditId(selectedElement);
            const current = getRegisteredStyle(selectedWidgetId, editId, 'desktop', 'font-style');
            const newVal = current === 'italic' ? 'normal' : 'italic';
            setRegisteredStyle(selectedWidgetId, editId, 'desktop', 'font-style', newVal);
        });

        // 6. IMAGE PROPERTIES
        $body.on('click', '#lhe-btn-choose-img', function(e) {
            e.preventDefault();
            openWordPressMediaLibrary('image/*', function(attachment) {
                if (!selectedElement) return;
                
                // Set image frontend preview
                $(selectedElement).attr('src', attachment.url);
                $sidebar.find('#lhe-img-preview').attr('src', attachment.url).show();
                $sidebar.find('#lhe-img-no-preview').hide();
                
                editedWidgets.add(selectedWidgetId);
                showToast('Imagem alterada com sucesso!');
            });
        });

        $body.on('input', '#lhe-img-width', function() {
            applyStyle('width', $(this).val());
        });

        $body.on('input', '#lhe-img-height', function() {
            applyStyle('height', $(this).val());
        });

        $body.on('change', '#lhe-img-fit', function() {
            applyStyle('object-fit', $(this).val());
        });

        $body.on('input', '#lhe-img-alt', function() {
            if (!selectedElement) return;
            $(selectedElement).attr('alt', $(this).val());
            editedWidgets.add(selectedWidgetId);
        });

        // 7. SVG VECTOR GRAPHICS
        $body.on('click', '#lhe-btn-choose-svg', function(e) {
            e.preventDefault();
            openWordPressMediaLibrary('.svg, image/svg+xml', function(attachment) {
                if (!selectedElement) return;

                // SVG requires fetching XML and swapping tags
                fetch(attachment.url)
                    .then(response => {
                        if (!response.ok) throw new Error('Network error loading SVG');
                        return response.text();
                    })
                    .then(svgText => {
                        // Extract only svg tag
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(svgText, 'image/svg+xml');
                        const $newSvg = $(doc.querySelector('svg'));

                        if ($newSvg.length === 0) {
                            showToast('O arquivo selecionado não contém um vetor SVG válido.', 'error');
                            return;
                        }

                        // Preserva classes e atributos de layout do SVG anterior
                        const $oldSvg = $(selectedElement).is('svg') ? $(selectedElement) : $(selectedElement).find('svg');
                        $newSvg.attr('class', $oldSvg.attr('class') || '');
                        $newSvg.attr('style', $oldSvg.attr('style') || '');
                        $newSvg.attr('data-live-edit-id', $oldSvg.attr('data-live-edit-id') || '');

                        $oldSvg.replaceWith($newSvg);
                        
                        // Update selector anchor if it was the svg itself
                        if ($(selectedElement).is('svg')) {
                            selectedElement = $newSvg[0];
                        }

                        $sidebar.find('#lhe-svg-preview').html($newSvg.clone().css({width:'auto', height:'40px'}));
                        editedWidgets.add(selectedWidgetId);
                        showToast('Ícone SVG atualizado com sucesso!');
                    })
                    .catch(err => {
                        showToast('Falha ao baixar o arquivo SVG.', 'error');
                    });
            });
        });

        $body.on('input', '#lhe-input-svg-color', function() {
            const hex = $(this).val();
            $('#lhe-input-svg-color-hex').val(hex);
            applyStyle('fill', hex);
            applyStyle('stroke', hex);
        });

        $body.on('input', '#lhe-input-svg-color-hex', function() {
            const hex = $(this).val();
            $('#lhe-input-svg-color').val(hex);
            applyStyle('fill', hex);
            applyStyle('stroke', hex);
        });

        $body.on('input', '#lhe-slider-svg-size', function() {
            const val = $(this).val();
            $('#val-svg-size').text(val + 'px');
            applyStyle('width', val + 'px');
            applyStyle('height', val + 'px');
        });

        // 8. SECTION BACKGROUNDS
        $body.on('input', '#lhe-input-bg-color', function() {
            const hex = $(this).val();
            $('#lhe-input-bg-color-hex').val(hex);
            applyStyle('background-color', hex);
        });

        $body.on('input', '#lhe-input-bg-color-hex', function() {
            const hex = $(this).val();
            $('#lhe-input-bg-color').val(hex.startsWith('#') ? hex : '#ffffff');
            applyStyle('background-color', hex);
        });

        // Background choosing events (Desktop, Tablet, Mobile)
        $body.on('click', '#lhe-btn-bg-desktop-choose', function() { chooseBg('desktop'); });
        $body.on('click', '#lhe-btn-bg-tablet-choose', function() { chooseBg('tablet'); });
        $body.on('click', '#lhe-btn-bg-mobile-choose', function() { chooseBg('mobile'); });

        $body.on('click', '#lhe-btn-bg-desktop-clear', function() { clearBg('desktop'); });
        $body.on('click', '#lhe-btn-bg-tablet-clear', function() { clearBg('tablet'); });
        $body.on('click', '#lhe-btn-bg-mobile-clear', function() { clearBg('mobile'); });

        // Helper to choose backgrounds
        function chooseBg(device) {
            openWordPressMediaLibrary('image/*', function(attachment) {
                applyStyle('background-image', `url('${attachment.url}')`, device);
                loadBgImagePreview(device, getOrGenerateEditId(selectedElement));
                showToast(`Fundo do ${device.toUpperCase()} alterado!`);
            });
        }

        // Helper to clear backgrounds
        function clearBg(device) {
            applyStyle('background-image', null, device);
            loadBgImagePreview(device, getOrGenerateEditId(selectedElement));
        }

        // 9. BUTTON LINK & CUSTOMIZATIONS
        $body.on('input', '#lhe-input-button-link', function() {
            if (!selectedElement) return;
            $(selectedElement).attr('href', $(this).val());
            editedWidgets.add(selectedWidgetId);
        });

        $body.on('input', '#lhe-input-btn-bg', function() {
            const hex = $(this).val();
            $('#lhe-input-btn-bg-hex').val(hex);
            applyStyle('background-color', hex);
        });

        $body.on('input', '#lhe-input-btn-bg-hex', function() {
            const hex = $(this).val();
            $('#lhe-input-btn-bg').val(hex);
            applyStyle('background-color', hex);
        });

        $body.on('change', '#lhe-toggle-btn-glow', function() {
            if (!selectedElement) return;
            $(selectedElement).toggleClass('lhe-glow-effect', $(this).is(':checked'));
            editedWidgets.add(selectedWidgetId);
        });

        $body.on('change', '#lhe-toggle-btn-pulse', function() {
            if (!selectedElement) return;
            $(selectedElement).toggleClass('lhe-pulse-effect', $(this).is(':checked'));
            editedWidgets.add(selectedWidgetId);
        });

        // 9.5 ADD ELEMENT EVENTS
        $body.on('click', '#lhe-add-title', function() { insertElement('title'); });
        $body.on('click', '#lhe-add-text', function() { insertElement('text'); });
        $body.on('click', '#lhe-add-image', function() { insertElement('image'); });
        $body.on('click', '#lhe-add-icon', function() { insertElement('icon'); });
        $body.on('click', '#lhe-add-button', function() { insertElement('button'); });
        $body.on('click', '#lhe-add-container', function() { insertElement('container'); });

        // 10. DOM OPERATIONS
        $body.on('click', '#lhe-action-move-up', function() {
            if (!selectedElement) return;
            
            // Find nearest valid sibling (skipping style and script tags)
            let $prev = $(selectedElement).prev();
            while ($prev.length > 0 && ($prev.is('style') || $prev.is('script'))) {
                $prev = $prev.prev();
            }

            const direction = getLayoutDirection(selectedElement);
            if ($prev.length > 0) {
                $(selectedElement).insertBefore($prev);
                positionOverlayLabel($(selectedElement), $hoverLabel);
                editedWidgets.add(selectedWidgetId);
                
                if (direction === 'horizontal') {
                    showToast('Elemento movido para a esquerda.');
                } else {
                    showToast('Elemento movido para cima.');
                }
                
                // Refresh labels and states
                updateMoveButtonsLabels(getLayoutDirection(selectedElement));
            } else {
                if (direction === 'horizontal') {
                    showToast('Não há elementos à esquerda.', 'info');
                } else {
                    showToast('Não há elementos acima.', 'info');
                }
            }
        });

        $body.on('click', '#lhe-action-move-down', function() {
            if (!selectedElement) return;
            
            // Find nearest valid sibling (skipping style and script tags)
            let $next = $(selectedElement).next();
            while ($next.length > 0 && ($next.is('style') || $next.is('script'))) {
                $next = $next.next();
            }

            const direction = getLayoutDirection(selectedElement);
            if ($next.length > 0) {
                $(selectedElement).insertAfter($next);
                positionOverlayLabel($(selectedElement), $hoverLabel);
                editedWidgets.add(selectedWidgetId);
                
                if (direction === 'horizontal') {
                    showToast('Elemento movido para a direita.');
                } else {
                    showToast('Elemento movido para baixo.');
                }
                
                // Refresh labels and states
                updateMoveButtonsLabels(getLayoutDirection(selectedElement));
            } else {
                if (direction === 'horizontal') {
                    showToast('Não há elementos à direita.', 'info');
                } else {
                    showToast('Não há elementos abaixo.', 'info');
                }
            }
        });

        $body.on('click', '#lhe-action-duplicate', function() {
            if (!selectedElement) return;
            
            // Clone node
            const cloned = selectedElement.cloneNode(true);
            
            // Clear selections classes and generate new ID for clone
            $(cloned).removeClass('lhe-selected lhe-hovered');
            cloned.removeAttribute('data-live-edit-id');
            
            // Insert clone after original
            $(cloned).insertAfter($(selectedElement));
            
            editedWidgets.add(selectedWidgetId);
            showToast('Elemento duplicado com sucesso!');
            
            // Select the newly cloned element
            selectElement(cloned);
        });

        $body.on('click', '#lhe-action-delete', function() {
            if (!selectedElement) return;
            if (confirm('Deseja realmente apagar este elemento da página?')) {
                const $toRemove = $(selectedElement);
                $sidebar.removeClass('open');
                $hoverLabel.hide();
                selectedElement = null;
                $toRemove.remove();
                
                editedWidgets.add(selectedWidgetId);
                showToast('Elemento excluído com sucesso.', 'info');
            }
        });

        // 11. SPACING & DIMENSIONS EVENTS
        const dirList = ['top', 'right', 'bottom', 'left'];
        const devList = ['desktop', 'tablet', 'mobile'];

        devList.forEach(dev => {
            dirList.forEach(dir => {
                // Padding input
                $body.on('input', `#lhe-pad-${dir}-${dev}`, function() {
                    applyStyle(`padding-${dir}`, $(this).val(), dev);
                });

                // Margin input
                $body.on('input', `#lhe-mar-${dir}-${dev}`, function() {
                    applyStyle(`margin-${dir}`, $(this).val(), dev);
                });
            });

            // Width Input
            $body.on('input', `#lhe-width-${dev}`, function() {
                applyStyle('width', $(this).val(), dev);
            });

            // Width 100% Quick Button
            $body.on('click', `#lhe-btn-width-full-${dev}`, function(e) {
                e.preventDefault();
                $sidebar.find(`#lhe-width-${dev}`).val('100%');
                applyStyle('width', '100%', dev);
            });
        });

        // Width Auto Quick Button
        $body.on('click', '#lhe-btn-width-auto-desktop', function(e) {
            e.preventDefault();
            $sidebar.find('#lhe-width-desktop').val('auto');
            applyStyle('width', 'auto', 'desktop');
        });

        // Max Width Input
        $body.on('input', '#lhe-max-width-desktop', function() {
            applyStyle('max-width', $(this).val(), 'desktop');
        });

        // Max Width None Quick Button
        $body.on('click', '#lhe-btn-max-width-none-desktop', function(e) {
            e.preventDefault();
            $sidebar.find('#lhe-max-width-desktop').val('none');
            applyStyle('max-width', 'none', 'desktop');
        });

        // Height Input
        $body.on('input', '#lhe-height-desktop', function() {
            applyStyle('height', $(this).val(), 'desktop');
        });
    }

    /**
     * Apply style property and value to selected element using Style Registry
     */
    /**
     * Format CSS unit values (e.g. append 'px' to pure numbers)
     */
    function formatCssUnitValue(val) {
        if (val === null || val === undefined || val === '') return '';
        val = val.toString().trim();
        if (val === '') return '';
        if (/^-?\d+(\.\d+)?$/.test(val)) {
            return val + 'px';
        }
        return val;
    }

    /**
     * Apply style property and value to selected element using Style Registry
     */
    function applyStyle(prop, val, device = 'desktop') {
        if (!selectedElement) return;
        const editId = getOrGenerateEditId(selectedElement);
        
        // Auto format numbers for layout properties
        if (prop.includes('padding') || prop.includes('margin') || prop === 'width' || prop === 'max-width' || prop === 'height') {
            val = formatCssUnitValue(val);
        }
        
        setRegisteredStyle(selectedWidgetId, editId, device, prop, val);
    }

    /**
     * Opens WordPress Media Library uploader
     */
    function openWordPressMediaLibrary(mimeType, callback) {
        // Init wp.media frame
        let frame = wp.media({
            title: 'Selecionar Arquivo da Biblioteca',
            button: {
                text: 'Usar este arquivo'
            },
            multiple: false,
            library: {
                type: mimeType
            }
        });

        // When image is selected
        frame.on('select', function() {
            const attachment = frame.state().get('selection').first().toJSON();
            callback(attachment);
        });

        frame.open();
    }

    /**
     * Dynamically insert Google Fonts stylesheet link
     */
    function loadGoogleFont(fontName) {
        const linkId = 'lhe-font-' + fontName.replace(/\s+/g, '-').toLowerCase();
        if (!document.getElementById(linkId)) {
            $('<link>', {
                id: linkId,
                rel: 'stylesheet',
                href: `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}:wght@300;400;500;600;700;800;900&display=swap`
            }).appendTo('head');
        }
    }

    /**
     * Hex Color Converters
     */
    function rgbToHex(rgb) {
        if (!rgb || rgb === 'rgba(0, 0, 0, 0)' || rgb === 'transparent') return 'transparente';
        
        const match = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)$/);
        if (!match) return rgb;
        
        function hex(x) {
            return ("0" + parseInt(x).toString(16)).slice(-2);
        }
        return "#" + hex(match[1]) + hex(match[2]) + hex(match[3]);
    }

    /**
     * Helper to insert a new element in the page
     */
    function insertElement(type) {
        if (!selectedElement) {
            showToast('Por favor, selecione um elemento na página primeiro.', 'warning');
            return;
        }

        const $selected = $(selectedElement);
        let html = '';

        switch (type) {
            case 'title':
                html = '<h2 style="font-size:24px; color:#333; margin:15px 0; font-family:inherit;">Novo Título</h2>';
                break;
            case 'text':
                html = '<p style="font-size:16px; color:#666; margin:10px 0; line-height:1.6; font-family:inherit;">Insira o seu novo texto aqui. Clique para editar.</p>';
                break;
            case 'image':
                html = '<img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=800&auto=format&fit=crop" style="width:100%; height:auto; margin:15px 0; display:block;" alt="Nova Imagem">';
                break;
            case 'icon':
                html = '<svg viewBox="0 0 24 24" width="32" height="32" class="lhe-custom-svg" style="fill:#00f0ff; display:inline-block; margin:10px 0;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>';
                break;
            case 'button':
                html = '<a href="#" style="display:inline-block; padding:12px 24px; background:#0077ff; color:#ffffff; border-radius:4px; text-decoration:none; font-weight:700; text-align:center; margin:10px 0; font-family:inherit;">Clique Aqui</a>';
                break;
            case 'container':
                html = '<div style="padding:20px; margin:15px 0; border:1px dashed #cccccc; border-radius:8px; display:block;">Novo Container. Cole ou insira elementos aqui.</div>';
                break;
        }

        const position = $('input[name="lhe-add-position"]:checked').val() || 'after';
        const tag = $selected.prop('tagName').toLowerCase();
        const isContainer = ['div', 'section', 'article', 'aside', 'header', 'footer', 'main'].includes(tag);
        
        let $newEl;
        
        if (position === 'inside' && isContainer) {
            $newEl = $(html).appendTo($selected);
        } else {
            $newEl = $(html).insertAfter($selected);
        }

        // Add modified widget to the edited widgets registry
        editedWidgets.add(selectedWidgetId);

        // Select the newly added element so the user can immediately edit it!
        setTimeout(() => {
            $newEl.trigger('click');
        }, 100);

        showToast('Elemento adicionado com sucesso! Clique nele para editar.', 'success');
    }

    /**
     * Save Modified HTML Widgets back to database
     */
    function saveChanges() {
        if (editedWidgets.size === 0) {
            showToast('Nenhuma alteração foi realizada para salvar.', 'info');
            return;
        }

        const $saveBtn = $('#lhe-action-save');
        const $cancelBtn = $('#lhe-action-cancel');
        
        $saveBtn.prop('disabled', true).html('<i class="fa-solid fa-spinner fa-spin"></i> Salvando...');
        $cancelBtn.prop('disabled', true);

        // Prep widgets data payload
        const widgetsPayload = [];
        
        editedWidgets.forEach(widgetId => {
            const $widgetContainer = $(`.elementor-element-${widgetId} .elementor-widget-container`);
            
            // Clone container content to perform cleanup
            const $clone = $widgetContainer.clone();
            
            // Clean up live editor highlights, outline and tag label classes
            $clone.find('.lhe-selected').removeClass('lhe-selected');
            $clone.find('.lhe-hovered').removeClass('lhe-hovered');
            
            // Extract cleaned inner HTML
            const cleanHtml = $clone.html();

            widgetsPayload.push({
                widget_id: widgetId,
                new_html: cleanHtml
            });
        });

        // AJAX POST Request
        $.ajax({
            url: lheData.ajaxUrl,
            type: 'POST',
            data: {
                action: 'lhe_save_widget_html',
                nonce: lheData.nonce,
                post_id: lheData.postId,
                widgets: JSON.stringify(widgetsPayload)
            },
            success: function(response) {
                $saveBtn.prop('disabled', false).html('<i class="fa-solid fa-cloud-arrow-up"></i> Salvar');
                $cancelBtn.prop('disabled', false);

                if (response.success) {
                    showToast(response.data.message, 'success');
                    editedWidgets.clear();
                    // Brief delay, then reload to verify saved structure
                    setTimeout(() => {
                        disableEditMode(false); // Sair do modo de edição de forma limpa
                        window.location.reload();
                    }, 1200);
                } else {
                    showToast(response.data.message, 'error');
                }
            },
            error: function() {
                $saveBtn.prop('disabled', false).html('<i class="fa-solid fa-cloud-arrow-up"></i> Salvar');
                $cancelBtn.prop('disabled', false);
                showToast('Erro ao salvar no servidor. Verifique as permissões.', 'error');
            }
        });
    }

})(jQuery);
