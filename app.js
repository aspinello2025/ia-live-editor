// --- DADOS E CONSTANTES DO FORMULÁRIO ---
const BUSINESS_TYPES = [
    { id: 'local', label: 'Negócio Local (Loja, Clínica, Restaurante)', icon: '📍' },
    { id: 'servico', label: 'Prestador de Serviço / Profissional Liberal', icon: '💼' },
    { id: 'ecommerce', label: 'E-commerce / Loja Online', icon: '🛍️' },
    { id: 'infoproduto', label: 'Infoprodutos / Lançamentos', icon: '🚀' },
    { id: 'agencia', label: 'Agência / Gestor de Tráfego', icon: '⚙️' },
    { id: 'outro', label: 'Outro Modelo de Negócio', icon: '❓' }
];

const REVENUES = [
    { id: 'ate5k', label: 'Até R$ 5.000 / mês', icon: '📉' },
    { id: '5k-20k', label: 'R$ 5.000 a R$ 20.000 / mês', icon: '📊' },
    { id: '20k-50k', label: 'R$ 20.000 a R$ 50.000 / mês', icon: '📈' },
    { id: 'mais50k', label: 'Acima de R$ 50.000 / mês', icon: '💎' }
];

const BUDGETS = [
    { id: 'menos500', label: 'Menos de R$ 500 / mês', icon: '🪙' },
    { id: '500-2k', label: 'R$ 500 a R$ 2.000 / mês', icon: '💵' },
    { id: '2k-5k', label: 'R$ 2.000 a R$ 5.000 / mês', icon: '💰' },
    { id: 'mais5k', label: 'Acima de R$ 5.000 / mês', icon: '💳' }
];

const CHALLENGES = [
    { id: 'clientes_locais', label: 'Atrair mais clientes da minha região', icon: '📍' },
    { id: 'refem_agencia', label: 'Parar de depender de agência/gestor que não dá resultado', icon: '⛓️' },
    { id: 'do_zero', label: 'Aprender a anunciar do zero de forma simples', icon: '🆕' },
    { id: 'escala', label: 'Escalar minhas vendas online e faturamento', icon: '🚀' }
];

const EXPECTATIONS = [
    { id: 'mentoria', label: 'Quero aprender a fazer eu mesmo com aulas práticas individuais', icon: '🖥️' },
    { id: 'assessoria', label: 'Quero delegar o serviço (Assessoria Completa)', icon: '🤝' },
    { id: 'curso_gravado', label: 'Quero apenas assistir a um curso gravado básico', icon: '📼' }
];

// --- CONFIGURAÇÃO PADRÃO DO SISTEMA ---
const DEFAULT_CONFIG = {
    whatsapp: '551195198994',
    whatsappMessage: 'Olá Alexandre! Acabei de fazer o teste no qualificador de leads dos anúncios.\n\nMeu nome é *{nome}*, tenho um negócio no modelo *{negocio}* com faturamento mensal de *{faturamento}*.\n\nHoje posso investir *{verba}* em anúncios e meu principal desafio é *{desafio}*.\n\nGostaria de entender melhor como a Mentoria Individual pode me ajudar no meu caso!',
    webhookUrl: '',
    adminPin: '1234',
    allowedBudgets: ['500-2k', '2k-5k', 'mais5k'],
    allowedRevenues: ['5k-20k', '20k-50k', 'mais50k'],
    allowedBusinessTypes: ['local', 'servico', 'ecommerce', 'infoproduto', 'agencia'],
    allowedExpectations: ['mentoria', 'assessoria']
};

// --- ESTADO GLOBAL DA APLICAÇÃO ---
let state = {
    currentStep: 1,
    totalSteps: 6,
    leadAnswers: {
        name: '',
        phone: '',
        businessType: '',
        revenue: '',
        budget: '',
        challenge: '',
        expectation: ''
    },
    config: {},
    leads: [],
    isAdminAuthenticated: false
};

// --- ELEMENTOS DO DOM ---
const elements = {
    mainCard: document.getElementById('main-card'),
    quizSection: document.getElementById('quiz-section'),
    quizHeader: document.getElementById('quiz-header'),
    quizFooter: document.getElementById('quiz-footer'),
    successScreen: document.getElementById('success-screen'),
    alternativeScreen: document.getElementById('alternative-screen'),
    adminSection: document.getElementById('admin-section'),
    
    // Passos e Botões
    stepViews: document.querySelectorAll('.step-view'),
    progressBar: document.getElementById('quiz-progress'),
    btnNext: document.getElementById('btn-next'),
    btnPrev: document.getElementById('btn-prev'),
    btnAdminAccess: document.getElementById('btn-admin-access'),
    
    // Inputs Passo 1
    inputName: document.getElementById('lead-name'),
    inputPhone: document.getElementById('lead-phone'),
    
    // Grids de opções
    gridBusinessType: document.getElementById('grid-business-type'),
    gridRevenue: document.getElementById('grid-revenue'),
    gridBudget: document.getElementById('grid-budget'),
    gridChallenge: document.getElementById('grid-challenge'),
    gridExpectation: document.getElementById('grid-expectation'),
    
    // Telas Finais
    btnWhatsappRedirect: document.getElementById('btn-whatsapp-redirect'),
    successMessage: document.getElementById('success-message'),
    alternativeMessage: document.getElementById('alternative-message'),
    
    // Admin Modal PIN
    pinModal: document.getElementById('pin-modal'),
    pinInputs: document.querySelectorAll('.pin-input'),
    pinError: document.getElementById('pin-error'),
    btnPinCancel: document.getElementById('btn-pin-cancel'),
    btnPinConfirm: document.getElementById('btn-pin-confirm'),
    
    // Admin Dashboard Tabs & Ações
    tabBtns: document.querySelectorAll('.tab-btn'),
    tabContents: document.querySelectorAll('.tab-content'),
    btnLogout: document.getElementById('btn-logout'),
    btnExportCsv: document.getElementById('btn-export-csv'),
    leadsSearch: document.getElementById('leads-search'),
    leadsFilter: document.getElementById('leads-filter'),
    leadsTableBody: document.getElementById('leads-table-body'),
    
    // Métricas
    metricTotalLeads: document.getElementById('metric-total-leads'),
    metricQualLeads: document.getElementById('metric-qual-leads'),
    metricUnqualLeads: document.getElementById('metric-unqual-leads'),
    metricConversionRate: document.getElementById('metric-conversion-rate'),
    
    // Configurações inputs
    configWhatsapp: document.getElementById('config-whatsapp-number'),
    configWhatsappMessage: document.getElementById('config-whatsapp-message'),
    configWebhookUrl: document.getElementById('config-webhook-url'),
    configAdminPin: document.getElementById('config-admin-pin'),
    btnSaveConfig: document.getElementById('btn-save-config'),
    
    // Checkboxes de Configuração
    configAllowedBudget: document.getElementById('config-allowed-budget'),
    configAllowedRevenue: document.getElementById('config-allowed-revenue'),
    configAllowedBusiness: document.getElementById('config-allowed-business'),
    configAllowedExpectation: document.getElementById('config-allowed-expectation'),
    
    // Gráficos
    chartBusinessContainer: document.getElementById('chart-business-container'),
    chartBudgetContainer: document.getElementById('chart-budget-container'),
    
    toastContainer: document.getElementById('toast-container')
};

// --- MÁSCARA TELEFÔNICA (BRASIL) ---
function formatPhoneInput(value) {
    if (!value) return value;
    const phoneNumber = value.replace(/[^\d]/g, '');
    const phoneNumberLength = phoneNumber.length;
    if (phoneNumberLength < 3) return phoneNumber;
    if (phoneNumberLength < 7) {
        return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2)}`;
    }
    if (phoneNumberLength < 11) {
        return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2, 6)}-${phoneNumber.slice(6)}`;
    }
    return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2, 7)}-${phoneNumber.slice(7, 11)}`;
}

if (elements.inputPhone) {
    elements.inputPhone.addEventListener('input', (e) => {
        const formatted = formatPhoneInput(e.target.value);
        e.target.value = formatted;
        validateStep1();
    });
    elements.inputName.addEventListener('input', () => {
        validateStep1();
    });
}

function validateStep1() {
    const name = elements.inputName.value.trim();
    const phone = elements.inputPhone.value.replace(/[^\d]/g, '');
    const isValidName = name.length >= 3;
    const isValidPhone = phone.length >= 10 && phone.length <= 11;
    
    if (state.currentStep === 1) {
        elements.btnNext.disabled = !(isValidName && isValidPhone);
    }
    return isValidName && isValidPhone;
}

// --- RENDERIZAÇÃO DINÂMICA DAS OPÇÕES DO QUIZ ---
function renderQuizOptions() {
    // 2. Modelo de negócio
    elements.gridBusinessType.innerHTML = BUSINESS_TYPES.map(type => `
        <div class="option-card" data-val="${type.id}">
            <div class="option-icon">${type.icon}</div>
            <div class="option-text">${type.label}</div>
        </div>
    `).join('');

    // 3. Faturamento
    elements.gridRevenue.innerHTML = REVENUES.map(rev => `
        <div class="option-card" data-val="${rev.id}">
            <div class="option-icon">${rev.icon}</div>
            <div class="option-text">${rev.label}</div>
        </div>
    `).join('');

    // 4. Verba Anúncios
    elements.gridBudget.innerHTML = BUDGETS.map(budget => `
        <div class="option-card" data-val="${budget.id}">
            <div class="option-icon">${budget.icon}</div>
            <div class="option-text">${budget.label}</div>
        </div>
    `).join('');

    // 5. Maior desafio
    elements.gridChallenge.innerHTML = CHALLENGES.map(ch => `
        <div class="option-card" data-val="${ch.id}">
            <div class="option-icon">${ch.icon}</div>
            <div class="option-text">${ch.label}</div>
        </div>
    `).join('');

    // 6. Expectativa
    elements.gridExpectation.innerHTML = EXPECTATIONS.map(ex => `
        <div class="option-card" data-val="${ex.id}">
            <div class="option-icon">${ex.icon}</div>
            <div class="option-text">${ex.label}</div>
        </div>
    `).join('');

    // Adiciona cliques em cards
    const cardGrids = [
        { grid: elements.gridBusinessType, field: 'businessType' },
        { grid: elements.gridRevenue, field: 'revenue' },
        { grid: elements.gridBudget, field: 'budget' },
        { grid: elements.gridChallenge, field: 'challenge' },
        { grid: elements.gridExpectation, field: 'expectation' }
    ];

    cardGrids.forEach(item => {
        const cards = item.grid.querySelectorAll('.option-card');
        cards.forEach(card => {
            card.addEventListener('click', () => {
                // Desmarca outros
                cards.forEach(c => c.classList.remove('selected'));
                // Seleciona atual
                card.classList.add('selected');
                state.leadAnswers[item.field] = card.getAttribute('data-val');
                elements.btnNext.disabled = false;
                
                // Avança automaticamente após curto delay para melhorar UX
                setTimeout(() => {
                    navigateStep(1);
                }, 300);
            });
        });
    });
}

// --- CONTROLE DE CONFIGURAÇÕES (LOCALSTORAGE) ---
function loadSystemConfig() {
    const savedConfig = localStorage.getItem('lead_qualifier_config');
    if (savedConfig) {
        state.config = JSON.parse(savedConfig);
        // Se ainda estiver com o WhatsApp antigo padrão, atualiza para o novo
        if (state.config.whatsapp === '5511999999999') {
            state.config.whatsapp = '551195198994';
            localStorage.setItem('lead_qualifier_config', JSON.stringify(state.config));
        }
    } else {
        state.config = { ...DEFAULT_CONFIG };
        localStorage.setItem('lead_qualifier_config', JSON.stringify(state.config));
    }
}

function saveSystemConfig(newConfig) {
    state.config = { ...state.config, ...newConfig };
    localStorage.setItem('lead_qualifier_config', JSON.stringify(state.config));
    showToast('Configurações salvas com sucesso!');
}

// --- CONTROLE DE LEADS (LOCALSTORAGE) ---
function loadLeads() {
    const savedLeads = localStorage.getItem('lead_qualifier_leads');
    state.leads = savedLeads ? JSON.parse(savedLeads) : [];
}

function saveLead(lead) {
    state.leads.push(lead);
    localStorage.setItem('lead_qualifier_leads', JSON.stringify(state.leads));
}

function deleteLead(id) {
    state.leads = state.leads.filter(l => l.id !== id);
    localStorage.setItem('lead_qualifier_leads', JSON.stringify(state.leads));
    showToast('Lead removido da base de dados.', 'error');
    renderLeadsTable();
    renderStatistics();
}

// --- MOTOR DE QUALIFICAÇÃO ---
function evaluateLead() {
    const answers = state.leadAnswers;
    const rules = state.config;

    // Critérios de elegibilidade
    const isBudgetOk = rules.allowedBudgets.includes(answers.budget);
    const isRevenueOk = rules.allowedRevenues.includes(answers.revenue);
    const isBusinessOk = rules.allowedBusinessTypes.includes(answers.businessType);
    const isExpectationOk = rules.allowedExpectations.includes(answers.expectation);

    const isQualified = isBudgetOk && isRevenueOk && isBusinessOk && isExpectationOk;

    // Estrutura do lead
    const newLead = {
        id: 'lead_' + Date.now() + Math.random().toString(36).substr(2, 5),
        date: new Date().toISOString(),
        name: elements.inputName.value.trim(),
        phone: elements.inputPhone.value.replace(/[^\d]/g, ''),
        answers: { ...answers },
        qualified: isQualified
    };

    saveLead(newLead);
    fireWebhook(newLead);

    // Roteamento de Tela
    elements.quizSection.classList.add('hidden');
    elements.quizHeader.classList.add('hidden');
    elements.quizFooter.classList.add('hidden');

    if (isQualified) {
        setupSuccessScreen(newLead);
    } else {
        setupAlternativeScreen(newLead);
    }
}

// --- SETUP TELA SUCESSO ---
function setupSuccessScreen(lead) {
    elements.successScreen.classList.remove('hidden');

    // Variáveis WhatsApp
    const typeLabel = BUSINESS_TYPES.find(b => b.id === lead.answers.businessType)?.label || '';
    const revenueLabel = REVENUES.find(r => r.id === lead.answers.revenue)?.label || '';
    const budgetLabel = BUDGETS.find(b => b.id === lead.answers.budget)?.label || '';
    const challengeLabel = CHALLENGES.find(c => c.id === lead.answers.challenge)?.label || '';

    let customMsg = state.config.whatsappMessage
        .replace('{nome}', lead.name)
        .replace('{negocio}', typeLabel)
        .replace('{faturamento}', revenueLabel)
        .replace('{verba}', budgetLabel)
        .replace('{desafio}', challengeLabel);

    const encodedMsg = encodeURIComponent(customMsg);
    const waUrl = `https://api.whatsapp.com/send?phone=${state.config.whatsapp}&text=${encodedMsg}`;
    
    elements.btnWhatsappRedirect.setAttribute('href', waUrl);
}

// --- SETUP TELA ALTERNATIVA ---
function setupAlternativeScreen(lead) {
    elements.alternativeScreen.classList.remove('hidden');
}

// --- DISPARO WEBHOOK ---
async function fireWebhook(lead) {
    if (!state.config.webhookUrl) return;

    // Enviar dados legíveis traduzidos
    const payload = {
        lead_id: lead.id,
        data_cadastro: lead.date,
        nome: lead.name,
        whatsapp: lead.phone,
        status: lead.qualified ? 'Qualificado' : 'Nao Qualificado',
        respostas: {
            modelo_negocio: BUSINESS_TYPES.find(b => b.id === lead.answers.businessType)?.label || lead.answers.businessType,
            faturamento_mensal: REVENUES.find(r => r.id === lead.answers.revenue)?.label || lead.answers.revenue,
            verba_anuncios: BUDGETS.find(b => b.id === lead.answers.budget)?.label || lead.answers.budget,
            desafio_principal: CHALLENGES.find(c => c.id === lead.answers.challenge)?.label || lead.answers.challenge,
            solucao_desejada: EXPECTATIONS.find(e => e.id === lead.answers.expectation)?.label || lead.answers.expectation
        }
    };

    try {
        await fetch(state.config.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            mode: 'cors'
        });
        console.log('Webhook disparado com sucesso.');
    } catch (e) {
        console.warn('Falha no webhook. Disparando em segundo modo de compatibilidade...');
        // Fallback em caso de bloqueio CORS
        try {
            await fetch(state.config.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                mode: 'no-cors'
            });
        } catch (err) {
            console.error('Erro na requisição webhook:', err);
        }
    }
}

// --- NAVEGAÇÃO DOS PASSOS ---
function updateStepUI() {
    // Esconde todos
    elements.stepViews.forEach(view => view.classList.remove('active'));
    
    // Mostra atual
    const currentView = document.querySelector(`.step-view[data-step="${state.currentStep}"]`);
    if (currentView) currentView.classList.add('active');

    // Atualiza Barra de Progresso
    const percentage = ((state.currentStep - 1) / (state.totalSteps - 1)) * 100;
    elements.progressBar.style.width = `${percentage}%`;

    // Atualiza botões
    if (state.currentStep === 1) {
        elements.btnPrev.classList.add('hidden');
        validateStep1();
    } else {
        elements.btnPrev.classList.remove('hidden');
        
        // Verifica se a opção do passo atual está selecionada
        let fieldName = '';
        if (state.currentStep === 2) fieldName = 'businessType';
        else if (state.currentStep === 3) fieldName = 'revenue';
        else if (state.currentStep === 4) fieldName = 'budget';
        else if (state.currentStep === 5) fieldName = 'challenge';
        else if (state.currentStep === 6) fieldName = 'expectation';

        const isOptionSelected = !!state.leadAnswers[fieldName];
        elements.btnNext.disabled = !isOptionSelected;
    }

    // Botão final
    if (state.currentStep === state.totalSteps) {
        elements.btnNext.innerHTML = `Enviar Respostas <i class="fa-solid fa-check"></i>`;
        elements.btnNext.classList.add('btn-whatsapp');
    } else {
        elements.btnNext.innerHTML = `Avançar <i class="fa-solid fa-arrow-right"></i>`;
        elements.btnNext.classList.remove('btn-whatsapp');
    }
}

function navigateStep(direction) {
    if (direction === 1) {
        if (state.currentStep === 1 && !validateStep1()) return;
        
        if (state.currentStep === state.totalSteps) {
            evaluateLead();
            return;
        }
        state.currentStep++;
    } else {
        if (state.currentStep > 1) state.currentStep--;
    }
    updateStepUI();
}

elements.btnNext.addEventListener('click', () => navigateStep(1));
elements.btnPrev.addEventListener('click', () => navigateStep(-1));

// --- ADMIN MODAL PIN ---
elements.btnAdminAccess.addEventListener('click', () => {
    if (state.isAdminAuthenticated) {
        showAdminDashboard();
    } else {
        openPinModal();
    }
});

function openPinModal() {
    elements.pinError.textContent = '';
    elements.pinInputs.forEach(i => i.value = '');
    elements.pinModal.classList.add('active');
    elements.pinInputs[0].focus();
}

function closePinModal() {
    elements.pinModal.classList.remove('active');
}

elements.btnPinCancel.addEventListener('click', closePinModal);

// Salto de input automático do PIN
elements.pinInputs.forEach((input, index) => {
    input.addEventListener('keyup', (e) => {
        if (e.key >= '0' && e.key <= '9') {
            if (index < 3) {
                elements.pinInputs[index + 1].focus();
            } else {
                verifyPin();
            }
        } else if (e.key === 'Backspace') {
            if (index > 0) {
                elements.pinInputs[index - 1].focus();
            }
        }
    });
});

elements.btnPinConfirm.addEventListener('click', verifyPin);

function verifyPin() {
    let pinCode = '';
    elements.pinInputs.forEach(i => pinCode += i.value);
    
    if (pinCode === state.config.adminPin) {
        state.isAdminAuthenticated = true;
        sessionStorage.setItem('admin_auth', 'true');
        closePinModal();
        showToast('Login de administrador realizado.');
        showAdminDashboard();
    } else {
        elements.pinError.textContent = 'PIN inválido. Tente novamente.';
        elements.pinInputs.forEach(i => i.value = '');
        elements.pinInputs[0].focus();
    }
}

// --- ADMIN DASHBOARD ---
function showAdminDashboard() {
    window.location.hash = 'admin';
    elements.mainCard.classList.add('card-admin');
    elements.quizSection.classList.add('hidden');
    elements.quizHeader.classList.add('hidden');
    elements.quizFooter.classList.add('hidden');
    elements.successScreen.classList.add('hidden');
    elements.alternativeScreen.classList.add('hidden');
    elements.adminSection.classList.remove('hidden');

    loadLeads();
    renderLeadsTable();
    renderStatistics();
    setupConfigPanel();
}

function exitAdminDashboard() {
    window.location.hash = '';
    elements.mainCard.classList.remove('card-admin');
    elements.adminSection.classList.add('hidden');
    elements.quizSection.classList.remove('hidden');
    elements.quizHeader.classList.remove('hidden');
    elements.quizFooter.classList.remove('hidden');
    
    // Reseta form do zero
    state.currentStep = 1;
    state.leadAnswers = { name: '', phone: '', businessType: '', revenue: '', budget: '', challenge: '', expectation: '' };
    elements.inputName.value = '';
    elements.inputPhone.value = '';
    
    // Desmarca cards selecionados
    document.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
    
    updateStepUI();
}

elements.btnLogout.addEventListener('click', () => {
    state.isAdminAuthenticated = false;
    sessionStorage.removeItem('admin_auth');
    exitAdminDashboard();
    showToast('Sessão administrativa finalizada.');
});

// Controle de abas do dashboard
elements.tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        elements.tabBtns.forEach(b => b.classList.remove('active'));
        elements.tabContents.forEach(c => c.classList.remove('active'));
        
        btn.classList.add('active');
        const targetTab = btn.getAttribute('data-tab');
        document.getElementById(`tab-${targetTab}`).classList.add('active');
    });
});

// --- RENDERIZAR TABELA DE LEADS ---
function renderLeadsTable() {
    const searchQuery = elements.leadsSearch.value.toLowerCase();
    const statusFilter = elements.leadsFilter.value;
    
    const filteredLeads = state.leads.filter(lead => {
        const matchesSearch = lead.name.toLowerCase().includes(searchQuery) || lead.phone.includes(searchQuery);
        const matchesFilter = 
            statusFilter === 'all' || 
            (statusFilter === 'qualified' && lead.qualified) || 
            (statusFilter === 'unqualified' && !lead.qualified);
            
        return matchesSearch && matchesFilter;
    }).sort((a, b) => new Date(b.date) - new Date(a.date)); // Mais recentes primeiro

    if (filteredLeads.length === 0) {
        elements.leadsTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <div class="empty-state-icon">📂</div>
                    Nenhum lead encontrado com os filtros atuais.
                </td>
            </tr>
        `;
        return;
    }

    elements.leadsTableBody.innerHTML = filteredLeads.map(lead => {
        const dateStr = new Date(lead.date).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });

        const bizLabel = BUSINESS_TYPES.find(b => b.id === lead.answers.businessType)?.label.split(' (')[0] || lead.answers.businessType;
        const revLabel = REVENUES.find(r => r.id === lead.answers.revenue)?.label.replace(' / mês', '') || lead.answers.revenue;
        const budLabel = BUDGETS.find(b => b.id === lead.answers.budget)?.label.replace(' / mês', '') || lead.answers.budget;

        return `
            <tr>
                <td>
                    <span class="lead-name">${lead.name}</span>
                    <span class="lead-date">${dateStr}</span>
                </td>
                <td>
                    <a href="https://wa.me/${lead.phone}" target="_blank" class="alternative-link" style="font-size:12.5px;">
                        <i class="fa-brands fa-whatsapp text-success"></i> ${formatPhoneInput(lead.phone)}
                    </a>
                </td>
                <td>${bizLabel}</td>
                <td>
                    <div>Verba: <strong class="text-cyan">${budLabel}</strong></div>
                    <div style="font-size:11px; color:var(--text-muted);">Fat.: ${revLabel}</div>
                </td>
                <td>
                    <span class="status-badge ${lead.qualified ? 'qualified' : 'unqualified'}">
                        ${lead.qualified ? 'Elegível' : 'Filtrado'}
                    </span>
                </td>
                <td>
                    <div class="leads-action-buttons">
                        <a href="https://wa.me/${lead.phone}" target="_blank" class="row-btn row-btn-chat" title="Iniciar Conversa no WhatsApp">
                            <i class="fa-brands fa-whatsapp"></i>
                        </a>
                        <button class="row-btn row-btn-delete" onclick="deleteLead('${lead.id}')" title="Excluir Lead">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

elements.leadsSearch.addEventListener('input', renderLeadsTable);
elements.leadsFilter.addEventListener('change', renderLeadsTable);

// --- RENDERIZAR ESTATÍSTICAS E GRÁFICOS SVG ---
function renderStatistics() {
    const total = state.leads.length;
    const qualified = state.leads.filter(l => l.qualified).length;
    const unqualified = total - qualified;
    const rate = total > 0 ? Math.round((qualified / total) * 100) : 0;

    elements.metricTotalLeads.textContent = total;
    elements.metricQualLeads.textContent = qualified;
    elements.metricUnqualLeads.textContent = unqualified;
    elements.metricConversionRate.textContent = `${rate}%`;

    // Gráfico de Modelos de Negócio
    renderBusinessChart();
    // Gráfico de Verbas de Anúncio
    renderBudgetChart();
}

function renderBusinessChart() {
    const counts = {};
    BUSINESS_TYPES.forEach(t => counts[t.id] = 0);
    state.leads.forEach(l => {
        if (counts[l.answers.businessType] !== undefined) counts[l.answers.businessType]++;
    });

    const maxCount = Math.max(...Object.values(counts), 1);
    const data = BUSINESS_TYPES.map(t => ({
        label: t.label.split(' (')[0],
        count: counts[t.id],
        pct: maxCount > 0 ? (counts[t.id] / maxCount) * 100 : 0
    }));

    if (state.leads.length === 0) {
        elements.chartBusinessContainer.innerHTML = '<div class="empty-state">Sem dados estatísticos.</div>';
        return;
    }

    let barsSvg = '';
    const barHeight = 22;
    const gap = 12;
    const paddingLeft = 140;
    const chartWidth = 400;
    const chartHeight = data.length * (barHeight + gap) + 20;

    data.forEach((item, index) => {
        const y = index * (barHeight + gap) + 10;
        const barWidth = Math.max((item.pct / 100) * (chartWidth - paddingLeft - 50), 3);
        barsSvg += `
            <text x="10" y="${y + 15}" fill="#94a3b8" font-size="11" font-weight="600">${item.label}</text>
            <rect x="${paddingLeft}" y="${y}" width="${barWidth}" height="${barHeight}" rx="4" class="chart-bar" />
            <text x="${paddingLeft + barWidth + 8}" y="${y + 15}" fill="#ffffff" font-size="11" font-weight="700">${item.count}</text>
        `;
    });

    elements.chartBusinessContainer.innerHTML = `
        <svg viewBox="0 0 ${chartWidth} ${chartHeight}" class="chart-svg">
            ${barsSvg}
        </svg>
    `;
}

function renderBudgetChart() {
    const counts = {};
    BUDGETS.forEach(b => counts[b.id] = 0);
    state.leads.forEach(l => {
        if (counts[l.answers.budget] !== undefined) counts[l.answers.budget]++;
    });

    const maxCount = Math.max(...Object.values(counts), 1);
    const data = BUDGETS.map(b => ({
        label: b.label.split(' /')[0],
        count: counts[b.id],
        pct: maxCount > 0 ? (counts[b.id] / maxCount) * 100 : 0
    }));

    if (state.leads.length === 0) {
        elements.chartBudgetContainer.innerHTML = '<div class="empty-state">Sem dados estatísticos.</div>';
        return;
    }

    let barsSvg = '';
    const barHeight = 22;
    const gap = 12;
    const paddingLeft = 110;
    const chartWidth = 400;
    const chartHeight = data.length * (barHeight + gap) + 20;

    data.forEach((item, index) => {
        const y = index * (barHeight + gap) + 10;
        const barWidth = Math.max((item.pct / 100) * (chartWidth - paddingLeft - 50), 3);
        barsSvg += `
            <text x="10" y="${y + 15}" fill="#94a3b8" font-size="11" font-weight="600">${item.label}</text>
            <rect x="${paddingLeft}" y="${y}" width="${barWidth}" height="${barHeight}" rx="4" class="chart-bar" style="fill: var(--accent-yellow);" />
            <text x="${paddingLeft + barWidth + 8}" y="${y + 15}" fill="#ffffff" font-size="11" font-weight="700">${item.count}</text>
        `;
    });

    elements.chartBudgetContainer.innerHTML = `
        <svg viewBox="0 0 ${chartWidth} ${chartHeight}" class="chart-svg">
            ${barsSvg}
        </svg>
    `;
}

// --- SETUP TAB CONFIGURAÇÕES ---
function setupConfigPanel() {
    elements.configWhatsapp.value = state.config.whatsapp;
    elements.configWhatsappMessage.value = state.config.whatsappMessage;
    elements.configWebhookUrl.value = state.config.webhookUrl;
    elements.configAdminPin.value = state.config.adminPin;

    // Budget Rule checkboxes
    elements.configAllowedBudget.innerHTML = BUDGETS.map(b => `
        <label class="checkbox-label">
            <input type="checkbox" value="${b.id}" ${state.config.allowedBudgets.includes(b.id) ? 'checked' : ''}>
            ${b.label}
        </label>
    `).join('');

    // Revenue Rule checkboxes
    elements.configAllowedRevenue.innerHTML = REVENUES.map(r => `
        <label class="checkbox-label">
            <input type="checkbox" value="${r.id}" ${state.config.allowedRevenues.includes(r.id) ? 'checked' : ''}>
            ${r.label}
        </label>
    `).join('');

    // Business Type Rule checkboxes
    elements.configAllowedBusiness.innerHTML = BUSINESS_TYPES.map(b => `
        <label class="checkbox-label">
            <input type="checkbox" value="${b.id}" ${state.config.allowedBusinessTypes.includes(b.id) ? 'checked' : ''}>
            ${b.label.split(' (')[0]}
        </label>
    `).join('');

    // Expectation Rule checkboxes
    elements.configAllowedExpectation.innerHTML = EXPECTATIONS.map(e => `
        <label class="checkbox-label">
            <input type="checkbox" value="${e.id}" ${state.config.allowedExpectations.includes(e.id) ? 'checked' : ''}>
            ${e.label.split(' (')[0]}
        </label>
    `).join('');
}

elements.btnSaveConfig.addEventListener('click', () => {
    const pin = elements.configAdminPin.value.trim();
    if (pin.length !== 4 || isNaN(pin)) {
        showToast('O PIN de segurança deve ter exatamente 4 dígitos numéricos.', 'error');
        return;
    }

    const whatsapp = elements.configWhatsapp.value.replace(/[^\d]/g, '');
    if (whatsapp.length < 10) {
        showToast('Número do WhatsApp inválido.', 'error');
        return;
    }

    // Coleta dos checkboxes
    const getCheckedValues = (container) => {
        const checkboxes = container.querySelectorAll('input[type="checkbox"]:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    };

    const allowedBudgets = getCheckedValues(elements.configAllowedBudget);
    const allowedRevenues = getCheckedValues(elements.configAllowedRevenue);
    const allowedBusinessTypes = getCheckedValues(elements.configAllowedBusiness);
    const allowedExpectations = getCheckedValues(elements.configAllowedExpectation);

    if (allowedBudgets.length === 0 || allowedRevenues.length === 0 || allowedBusinessTypes.length === 0 || allowedExpectations.length === 0) {
        showToast('Você deve manter ao menos uma opção selecionada em cada critério de filtro.', 'error');
        return;
    }

    saveSystemConfig({
        whatsapp: whatsapp,
        whatsappMessage: elements.configWhatsappMessage.value,
        webhookUrl: elements.configWebhookUrl.value.trim(),
        adminPin: pin,
        allowedBudgets,
        allowedRevenues,
        allowedBusinessTypes,
        allowedExpectations
    });
});

// --- EXPORTAR CSV ---
elements.btnExportCsv.addEventListener('click', () => {
    if (state.leads.length === 0) {
        showToast('Não há leads cadastrados para exportação.', 'error');
        return;
    }

    let csvContent = '\uFEFF'; // BOM para Excel reconhecer caracteres especiais (acentos)
    csvContent += 'Data;Nome;Telefone;Tipo de Negocio;Faturamento;Verba Anuncios;Desafio;Expectativa;Qualificado\n';

    state.leads.forEach(lead => {
        const dateStr = new Date(lead.date).toLocaleString('pt-BR');
        const biz = BUSINESS_TYPES.find(b => b.id === lead.answers.businessType)?.label.split(' (')[0] || lead.answers.businessType;
        const rev = REVENUES.find(r => r.id === lead.answers.revenue)?.label || lead.answers.revenue;
        const bud = BUDGETS.find(b => b.id === lead.answers.budget)?.label || lead.answers.budget;
        const ch = CHALLENGES.find(c => c.id === lead.answers.challenge)?.label || lead.answers.challenge;
        const ex = EXPECTATIONS.find(e => e.id === lead.answers.expectation)?.label || lead.answers.expectation;

        csvContent += `"${dateStr}";"${lead.name}";"${lead.phone}";"${biz}";"${rev}";"${bud}";"${ch}";"${ex}";"${lead.qualified ? 'Sim' : 'Não'}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `leads_mentoria_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Arquivo CSV baixado com sucesso!');
});

// --- SISTEMA DE NOTIFICAÇÕES (TOAST) ---
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconClass = 'fa-circle-check';
    if (type === 'error') iconClass = 'fa-triangle-exclamation';
    
    toast.innerHTML = `
        <i class="fa-solid ${iconClass}"></i>
        <span>${message}</span>
    `;
    
    elements.toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse forwards';
        setTimeout(() => {
            elements.toastContainer.removeChild(toast);
        }, 300);
    }, 3000);
}

// --- EVENTOS INICIAIS ---
window.addEventListener('load', () => {
    loadSystemConfig();
    loadLeads();
    renderQuizOptions();
    updateStepUI();

    // Reconhece hash de rota
    if (window.location.hash === '#admin') {
        const isAuth = sessionStorage.getItem('admin_auth') === 'true';
        if (isAuth) {
            state.isAdminAuthenticated = true;
            showAdminDashboard();
        } else {
            openPinModal();
        }
    }
});

window.addEventListener('hashchange', () => {
    if (window.location.hash === '#admin') {
        const isAuth = sessionStorage.getItem('admin_auth') === 'true';
        if (isAuth) {
            state.isAdminAuthenticated = true;
            showAdminDashboard();
        } else {
            openPinModal();
        }
    } else if (window.location.hash === '') {
        if (elements.adminSection.classList.contains('hidden') === false) {
            exitAdminDashboard();
        }
    }
});
