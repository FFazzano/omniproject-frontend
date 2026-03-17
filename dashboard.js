const API_URL = 'https://omniproject-api.onrender.com';
const TOKEN = localStorage.getItem('token');

if (!TOKEN) {
    window.location.href = 'index.html';
}

// ======================
// CONSTANTES E ENUMS
// ======================
const Status = {
    PENDENTE: 'PENDENTE',
    ANDAMENTO: 'ANDAMENTO',
    CONCLUIDO: 'CONCLUIDO'
};

const TipoToast = {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning'
};

const IconeToast = {
    [TipoToast.SUCCESS]: '✅',
    [TipoToast.ERROR]: '❌',
    [TipoToast.WARNING]: '⚠️'
};

const Filtro = {
    TODOS: 'all',
    PENDENTES: 'pending',
    CONCLUIDOS: 'completed'
};

// ======================
// ESTADO GLOBAL
// ======================
const state = {
    workspaceAtualId: null,
    filtroStatusAtual: Filtro.TODOS,
    tarefaComentariosId: null,
    tipoAcaoModal: null,
    idItemModal: null
};

// ======================
// UTILITÁRIOS
// ======================
const api = {
    async request(endpoint, options = {}) {
        const url = `${API_URL}${endpoint}`;
        const config = {
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            return response;
        } catch (error) {
            console.error('Erro na requisição:', error);
            throw error;
        }
    },

    async json(endpoint, options = {}) {
        const response = await this.request(endpoint, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        return response;
    }
};

const dom = {
    get: (id) => document.getElementById(id),
    query: (selector) => document.querySelector(selector),
    queryAll: (selector) => document.querySelectorAll(selector)
};

const formatador = {
    data(dataString) {
        if (!dataString) return 'N/A';
        return new Date(dataString).toLocaleDateString('pt-BR');
    },

    dataEntrega(dataString) {
        if (!dataString) return 'Sem prazo';
        const [ano, mes, dia] = dataString.split('-');
        return `${dia}/${mes}/${ano}`;
    },

    dataComentario(data) {
        if (!data) return 'Agora';
        const dataObj = new Date(data);
        const dataStr = dataObj.toLocaleDateString('pt-BR');
        const horaStr = dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        return `${dataStr} às ${horaStr}`;
    },

    escaparHtml(texto) {
        return texto?.replace(/'/g, "\\'") ?? '';
    }
};

// ======================
// TOASTS E TEMA
// ======================
function mostrarToast(mensagem, tipo = TipoToast.SUCCESS) {
    const container = dom.get('toast-container');
    if (!container) {
        alert(mensagem);
        return;
    }

    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    toast.innerHTML = `<span>${IconeToast[tipo]}</span> <div>${mensagem}</div>`;

    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function alternarTemaEscuro() {
    const body = document.body;
    body.classList.toggle('dark-mode');
    const isDark = body.classList.contains('dark-mode');
    localStorage.setItem('omni_theme', isDark ? 'dark' : 'light');
    dom.queryAll('.checkbox-theme').forEach(cb => cb.checked = isDark);
}

// ======================
// MODAIS
// ======================
const modal = {
    fechar() {
        const overlay = dom.get('modal-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
            overlay.style.display = 'none';
        }

        ['modal-confirm', 'modal-edit', 'modal-comments'].forEach(id => {
            const el = dom.get(id);
            if (el) {
                el.classList.add('hidden');
                el.style.display = 'none';
            }
        });

        state.tipoAcaoModal = null;
        state.idItemModal = null;
        state.tarefaComentariosId = null;
    },

    abrirDelecao(tipo, id, titulo, mensagem) {
        state.tipoAcaoModal = tipo;
        state.idItemModal = id;
        dom.get('modal-confirm-title').innerText = titulo;
        dom.get('modal-confirm-msg').innerText = mensagem;
        this.mostrar('modal-confirm');
    },

    abrirEdicao(nome, descricao) {
        dom.get('modal-edit-name').value = nome;
        dom.get('modal-edit-desc').value = descricao === 'undefined' ? '' : descricao;
        this.mostrar('modal-edit');
    },

    abrirComentarios(titulo) {
        dom.get('modal-comments-title').innerText = `💬 Comentários: ${titulo}`;
        this.mostrar('modal-comments');
    },

    mostrar(id) {
        const overlay = dom.get('modal-overlay');
        const modalEl = dom.get(id);
        overlay?.classList.remove('hidden');
        overlay && (overlay.style.display = 'flex');
        modalEl?.classList.remove('hidden');
        modalEl && (modalEl.style.display = 'block');
    },

    abrirConvite(workspaceId) {
        dom.get('convite-workspace-id').value = workspaceId;
        dom.get('convite-email').value = '';
        dom.get('modal-convite').style.display = 'flex';
    },

    fecharConvite() {
        dom.get('modal-convite').style.display = 'none';
    }
};

async function confirmarDelecao() {
    if (!state.idItemModal) return;

    const endpoint = state.tipoAcaoModal === 'workspace'
        ? `/workspaces/${state.idItemModal}`
        : `/tasks/${state.idItemModal}`;

    try {
        const response = await api.request(endpoint, { method: 'DELETE' });
        if (!response.ok) {
            mostrarToast('Erro ao deletar.', TipoToast.ERROR);
            return;
        }

        const recarregar = state.tipoAcaoModal === 'workspace' ? carregarWorkspaces : carregarTasks;
        recarregar();
        mostrarToast('Item apagado com sucesso.', TipoToast.SUCCESS);
    } catch (error) {
        console.error('Erro:', error);
    } finally {
        modal.fechar();
    }
}

async function confirmarEdicao() {
    if (!state.idItemModal) return;

    const nome = dom.get('modal-edit-name')?.value?.trim();
    const descricao = dom.get('modal-edit-desc')?.value ?? '';

    if (!nome) {
        mostrarToast('O nome do projeto é obrigatório!', TipoToast.WARNING);
        return;
    }

    try {
        const response = await api.json(`/workspaces/${state.idItemModal}`, {
            method: 'PUT',
            body: JSON.stringify({ nome, descricao })
        });

        if (!response.ok) {
            mostrarToast('Erro ao editar o projeto.', TipoToast.ERROR);
            return;
        }

        carregarWorkspaces();
        mostrarToast('Projeto editado com sucesso!', TipoToast.SUCCESS);
    } catch (error) {
        console.error('Erro ao editar:', error);
    } finally {
        modal.fechar();
    }
}

function editarWorkspace(event, id, nomeAtual, descAtual) {
    event.stopPropagation();
    state.idItemModal = id;
    modal.abrirEdicao(nomeAtual, descAtual);
}

// ======================
// WORKSPACES
// ======================
async function carregarWorkspaces() {
    const listaAtivos = dom.get('workspaces-list');
    const listaConcluidos = dom.get('completed-workspaces-list');
    const listaNotificacoes = dom.get('notifications-list');

    try {
        const response = await api.request('/workspaces');
        if (!response.ok) return;

        const workspaces = await response.json();
        limparListas([listaAtivos, listaConcluidos, listaNotificacoes]);

        if (workspaces.length === 0) {
            listaAtivos && (listaAtivos.innerHTML = mensagemListaVazia('Nenhum projeto encontrado. Crie um acima!'));
            return;
        }

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        let notificacoesCount = 0;

        workspaces.forEach(ws => {
            renderizarWorkspace(ws, listaAtivos, listaConcluidos, listaNotificacoes, hoje, notificacoesCount);
            notificacoesCount = atualizarNotificacoes(ws, hoje, listaNotificacoes, notificacoesCount);
        });

        ajustarListaVazia(listaConcluidos, 'Você ainda não possui projetos concluídos.');
        ajustarListaVazia(listaNotificacoes, 'Tudo tranquilo! Nenhuma notificação no momento.');
        atualizarBadgeNotificacoes(notificacoesCount);

    } catch (error) {
        console.error('Erro ao carregar workspaces:', error);
    }
}

function limparListas(listas) {
    listas.forEach(lista => lista && (lista.innerHTML = ''));
}

function mensagemListaVazia(texto) {
    return `<p style="color: var(--text-muted);">${texto}</p>`;
}

function ajustarListaVazia(lista, mensagem) {
    if (lista && lista.innerHTML === '') {
        lista.innerHTML = mensagemListaVazia(mensagem);
    }
}

function renderizarWorkspace(ws, listaAtivos, listaConcluidos, listaNotificacoes, hoje, notificacoesCount) {
    const dataCriacao = formatador.data(ws.dataCriacao);
    const dataEntrega = formatador.dataEntrega(ws.dataEntrega);
    const textoConcluir = ws.concluido ? '↩ Reabrir' : '✔ Concluir';
    const corConcluir = ws.concluido ? '#95a5a6' : '#2ecc71';

    const div = document.createElement('div');
    div.className = `workspace-card ${ws.concluido ? 'concluido' : ''}`;
    div.innerHTML = `
        <div onclick="abrirWorkspace(${ws.id}, '${formatador.escaparHtml(ws.nome)}')" style="cursor:pointer; padding-bottom: 15px;">
            <h3>${ws.nome}</h3>
            <p>${ws.descricao || 'Sem descrição'}</p>
            <div style="display: flex; gap: 15px; margin-top: 15px; font-size: 12px; color: var(--text-muted);">
                <span title="Data de Criação">📅 Criado: <strong>${dataCriacao}</strong></span>
                <span title="Prazo de Entrega">🎯 Prazo: <strong>${dataEntrega}</strong></span>
            </div>
        </div>
        <div style="border-top: 1px solid var(--border-color); padding-top: 15px; display: flex; gap: 10px;">
            <button onclick="toggleConcluirWorkspace(event, ${ws.id})" class="btn-primary" style="background-color: ${corConcluir}; height: 32px;">${textoConcluir}</button>
            <button onclick="editarWorkspace(event, ${ws.id}, '${formatador.escaparHtml(ws.nome)}', '${formatador.escaparHtml(ws.descricao)}')" class="btn-primary" style="background-color: #3498db; height: 32px;">✏️ Editar</button>
            <button onclick="convidarAmigo(event, ${ws.id})" class="btn-primary" style="background-color: #9b59b6; height: 32px;">🤝 Convidar</button>
            <button onclick="deletarWorkspace(event, ${ws.id})" class="btn-primary" style="background-color: #e74c3c; height: 32px;">🗑️ Deletar</button>
        </div>
    `;

    const destino = ws.concluido ? listaConcluidos : listaAtivos;
    destino?.appendChild(div);
}

function atualizarNotificacoes(ws, hoje, listaNotificacoes, count) {
    if (ws.concluido || !ws.dataEntrega) return count;

    const [ano, mes, dia] = ws.dataEntrega.split('-');
    const dataVencimento = new Date(ano, mes - 1, dia);
    const diffDias = Math.ceil((dataVencimento - hoje) / (1000 * 3600 * 24));

    if (diffDias === 1) {
        adicionarNotificacao(listaNotificacoes, ws, 'warning', '⚠️', 'Atenção', `O projeto <b>${ws.nome}</b> vence amanhã!`);
        mostrarToast(`O projeto "${ws.nome}" vence amanhã!`, TipoToast.WARNING);
        return count + 1;
    }

    if (diffDias < 0) {
        adicionarNotificacao(listaNotificacoes, ws, 'danger', '❌', 'Atrasado', `O projeto <b>${ws.nome}</b> passou do prazo de entrega!`);
        return count + 1;
    }

    return count;
}

function adicionarNotificacao(lista, ws, tipo, icone, titulo, mensagem) {
    if (!lista) return;
    const cores = {
        warning: 'rgba(241, 196, 15, 0.1)',
        danger: 'rgba(231, 76, 60, 0.1)'
    };
    const bordas = {
        warning: '#f1c40f',
        danger: '#e74c3c'
    };
    lista.innerHTML += `
        <div style="background: ${cores[tipo]}; border-left: 4px solid ${bordas[tipo]}; padding: 15px; border-radius: 4px;">
            ${icone} <strong>${titulo}:</strong> ${mensagem}
        </div>`;
}

function atualizarBadgeNotificacoes(count) {
    const badge = dom.get('badge-notif');
    if (!badge) return;

    badge.innerText = count;
    badge.style.display = count > 0 ? 'inline-block' : 'none';
}

async function criarWorkspace() {
    const nome = dom.get('new-workspace-name')?.value?.trim();
    const descricao = dom.get('new-workspace-desc')?.value ?? '';
    const dataEntrega = dom.get('new-workspace-date')?.value;

    if (!nome) {
        mostrarToast('O nome do projeto é obrigatório!', TipoToast.WARNING);
        return;
    }

    if (dataEntrega && !validarDataFutura(dataEntrega)) {
        mostrarToast('O prazo final não pode ser no passado!', TipoToast.WARNING);
        return;
    }

    try {
        const response = await api.json('/workspaces', {
            method: 'POST',
            body: JSON.stringify({ nome, descricao, dataEntrega })
        });

        if (!response.ok) {
            mostrarToast('Erro ao criar o projeto no servidor.', TipoToast.ERROR);
            return;
        }

        limparCamposWorkspace();
        carregarWorkspaces();
        mostrarToast('Projeto criado com sucesso!', TipoToast.SUCCESS);
    } catch (error) {
        mostrarToast('Erro de conexão.', TipoToast.ERROR);
    }
}

function validarDataFutura(dataString) {
    const dataEscolhida = new Date(`${dataString}T00:00:00`);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return dataEscolhida >= hoje;
}

function limparCamposWorkspace() {
    dom.get('new-workspace-name').value = '';
    const desc = dom.get('new-workspace-desc');
    const data = dom.get('new-workspace-date');
    if (desc) desc.value = '';
    if (data) data.value = '';
}

function deletarWorkspace(event, id) {
    event.stopPropagation();
    modal.abrirDelecao('workspace', id, 'Deletar Projeto', 'Tem certeza? Todas as tarefas vão desaparecer para sempre!');
}

async function toggleConcluirWorkspace(event, id) {
    event.stopPropagation();

    try {
        const response = await api.request(`/workspaces/${id}/concluir`, { method: 'PUT' });
        if (!response.ok) {
            mostrarToast('Erro ao atualizar o projeto.', TipoToast.ERROR);
            return;
        }
        carregarWorkspaces();
        mostrarToast('Status do projeto atualizado!', TipoToast.SUCCESS);
    } catch (error) {
        console.error('Erro ao concluir projeto:', error);
    }
}

// ======================
// TAREFAS
// ======================
async function abrirWorkspace(id, nome) {
    const searchInput = dom.get('task-search');
    if (searchInput) searchInput.value = '';

    state.filtroStatusAtual = Filtro.TODOS;
    dom.queryAll('.filter-pill').forEach(p => p.classList.remove('active'));
    dom.query('.filter-pill[data-filter="all"]')?.classList.add('active');

    state.workspaceAtualId = id;
    dom.get('workspace-title').innerText = nome;
    dom.get('view-workspaces').classList.add('hidden');
    dom.get('view-tasks').classList.remove('hidden');
    carregarTasks();
}

async function carregarTasks() {
    const colunas = {
        fazer: dom.get('tasks-fazer'),
        andamento: dom.get('tasks-andamento'),
        concluidas: dom.get('tasks-concluidas')
    };

    Object.values(colunas).forEach(col => col && (col.innerHTML = ''));

    try {
        const response = await api.request(`/tasks/workspace/${state.workspaceAtualId}`);
        if (!response.ok) return;

        const tasks = await response.json();
        atualizarProgresso(tasks);

        if (tasks.length === 0) {
            colunas.fazer.innerHTML = mensagemListaVazia('Nenhuma tarefa ainda.');
            aplicarFiltrosTasks();
            return;
        }

        tasks.forEach(task => renderizarTask(task, colunas));
        aplicarFiltrosTasks();
    } catch (error) {
        console.error('Erro ao carregar tarefas:', error);
    }
}

function atualizarProgresso(tasks) {
    const total = tasks.length;
    const concluidas = tasks.filter(t => t.status === Status.CONCLUIDO).length;
    const porcentagem = total === 0 ? 0 : Math.round((concluidas / total) * 100);

    const barra = dom.get('progress-bar');
    const texto = dom.get('progress-text');

    if (!barra || !texto) return;

    barra.style.width = `${porcentagem}%`;
    texto.innerText = `${porcentagem}% (${concluidas}/${total})`;
    barra.style.background = porcentagem === 100 ? '#f1c40f' : '#2ecc71';
}

function getConfigBotaoStatus(status) {
    const configs = {
        [Status.PENDENTE]: { texto: '▶️ Iniciar', novoStatus: Status.ANDAMENTO, classe: 'btn-concluir' },
        [Status.ANDAMENTO]: { texto: '✔ Concluir', novoStatus: Status.CONCLUIDO, classe: 'btn-concluir' },
        [Status.CONCLUIDO]: { texto: '↩ Reabrir', novoStatus: Status.PENDENTE, classe: 'btn-desfazer' }
    };
    return configs[status] || configs[Status.PENDENTE];
}

function renderizarTask(task, colunas) {
    const isConcluida = task.status === Status.CONCLUIDO;
    const config = getConfigBotaoStatus(task.status);

    const div = document.createElement('div');
    div.className = `task-card ${isConcluida ? 'concluida' : ''}`;
    div.setAttribute('draggable', 'true');
    div.setAttribute('ondragstart', `dragStart(event, ${task.id}, '${formatador.escaparHtml(task.titulo)}')`);
    div.innerHTML = `
        <div class="task-content">
            <h4 class="${isConcluida ? 'texto-riscado' : ''}">${task.titulo}</h4>
        </div>
        <div class="task-actions">
            <button onclick="abrirModalComentarios(${task.id}, '${formatador.escaparHtml(task.titulo)}')" class="btn-comentarios" title="Ver Comentários">💬</button>
            <button onclick="mudarStatusTask(${task.id}, '${formatador.escaparHtml(task.titulo)}', '${config.novoStatus}')" class="${config.classe}">${config.texto}</button>
            <button onclick="deletarTask(${task.id})" class="btn-deletar">🗑️</button>
        </div>
    `;

    const colunaDestino = {
        [Status.ANDAMENTO]: colunas.andamento,
        [Status.CONCLUIDO]: colunas.concluidas
    }[task.status] || colunas.fazer;

    colunaDestino?.appendChild(div);
}

async function criarTask() {
    const titulo = dom.get('new-task-title')?.value?.trim();
    if (!titulo) {
        mostrarToast('O título da tarefa é obrigatório!', TipoToast.WARNING);
        return;
    }

    try {
        const response = await api.json('/tasks', {
            method: 'POST',
            body: JSON.stringify({
                titulo,
                status: Status.PENDENTE,
                workspace: { id: state.workspaceAtualId }
            })
        });

        if (!response.ok) {
            mostrarToast('Erro ao adicionar tarefa.', TipoToast.ERROR);
            return;
        }

        dom.get('new-task-title').value = '';
        carregarTasks();
        mostrarToast('Tarefa adicionada!', TipoToast.SUCCESS);
    } catch (error) {
        console.error(error);
    }
}

async function mudarStatusTask(id, titulo, novoStatus) {
    try {
        const response = await api.json(`/tasks/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ titulo, status: novoStatus })
        });
        if (response.ok) {
            carregarTasks();
        } else {
            mostrarToast('Erro ao atualizar a tarefa.', TipoToast.ERROR);
        }
    } catch (error) {
        console.error('Erro ao mudar status:', error);
    }
}

function deletarTask(id) {
    modal.abrirDelecao('task', id, 'Deletar Tarefa', 'Quer mesmo apagar essa tarefa da lista?');
}

// ======================
// FILTROS E BUSCA
// ======================
function configurarFiltrosBusca() {
    const searchInput = dom.get('task-search');
    searchInput?.addEventListener('input', aplicarFiltrosTasks);

    dom.queryAll('.filter-pill').forEach(pill => {
        pill.addEventListener('click', (e) => {
            dom.queryAll('.filter-pill').forEach(p => p.classList.remove('active'));
            const clicked = e.target;
            clicked.classList.add('active');
            state.filtroStatusAtual = clicked.getAttribute('data-filter');
            aplicarFiltrosTasks();
        });
    });
}

function aplicarFiltrosTasks() {
    const termoBusca = dom.get('task-search')?.value?.toLowerCase() ?? '';
    const cards = dom.queryAll('.task-card');

    cards.forEach(card => {
        const titulo = card.querySelector('h4')?.innerText?.toLowerCase() ?? '';
        const isConcluida = card.classList.contains('concluida');

        const bateTexto = titulo.includes(termoBusca);
        const bateStatus = filtrarPorStatus(isConcluida);

        card.style.display = bateTexto && bateStatus ? 'flex' : 'none';
    });
}

function filtrarPorStatus(isConcluida) {
    if (state.filtroStatusAtual === Filtro.PENDENTES && isConcluida) return false;
    if (state.filtroStatusAtual === Filtro.CONCLUIDOS && !isConcluida) return false;
    return true;
}

// ======================
// DRAG AND DROP
// ======================
function dragStart(event, taskId, titulo) {
    event.dataTransfer.setData('taskId', taskId);
    event.dataTransfer.setData('titulo', titulo);
    setTimeout(() => event.target.classList.add('dragging'), 0);
}

function allowDrop(event) {
    event.preventDefault();
}

async function dropTask(event, novoStatus) {
    event.preventDefault();
    dom.queryAll('.task-card').forEach(card => card.classList.remove('dragging'));

    const taskId = event.dataTransfer.getData('taskId');
    const titulo = event.dataTransfer.getData('titulo');

    if (!taskId) {
        console.error('Erro: ID da tarefa não encontrado no drop!');
        return;
    }

    try {
        const response = await api.json(`/tasks/${taskId}`, {
            method: 'PUT',
            body: JSON.stringify({ titulo, status: novoStatus })
        });

        if (response.ok) {
            carregarTasks();
        } else {
            const erro = await response.text();
            console.error('Erro ao mover:', erro);
            mostrarToast(`Erro ao mover: ${erro}`, TipoToast.ERROR);
        }
    } catch (error) {
        console.error('Erro na conexão ao tentar mover:', error);
    }
}

// ======================
// COMENTÁRIOS
// ======================
async function abrirModalComentarios(taskId, tituloTarefa) {
    state.tarefaComentariosId = taskId;
    modal.abrirComentarios(tituloTarefa);
    await carregarComentarios(taskId);
}

async function carregarComentarios(taskId) {
    const lista = dom.get('comments-list');
    lista.innerHTML = mensagemListaVazia('Carregando...');

    try {
        const response = await api.request(`/tasks/${taskId}/comments`);
        if (!response.ok) {
            lista.innerHTML = '<p style="color: red;">Erro ao carregar comentários.</p>';
            return;
        }

        const comentarios = await response.json();
        lista.innerHTML = '';

        if (comentarios.length === 0) {
            lista.innerHTML = mensagemListaVazia('Nenhum comentário ainda. Seja o primeiro!');
            return;
        }

        comentarios.forEach(c => {
            const bubble = document.createElement('div');
            bubble.className = 'comment-bubble';
            bubble.innerHTML = `
                <div class="comment-text">${c.texto}</div>
                <span class="comment-date">${formatador.dataComentario(c.dataCriacao)}</span>
            `;
            lista.appendChild(bubble);
        });

        lista.scrollTop = lista.scrollHeight;
    } catch (error) {
        console.error('Erro:', error);
    }
}

async function adicionarComentario() {
    if (!state.tarefaComentariosId) return;

    const input = dom.get('new-comment-text');
    const texto = input?.value?.trim();

    if (!texto) {
        mostrarToast('O comentário não pode estar vazio!', TipoToast.WARNING);
        return;
    }

    try {
        const response = await api.json(`/tasks/${state.tarefaComentariosId}/comments`, {
            method: 'POST',
            body: JSON.stringify({ texto })
        });

        if (!response.ok) {
            mostrarToast('Erro ao enviar comentário.', TipoToast.ERROR);
            return;
        }

        input.value = '';
        await carregarComentarios(state.tarefaComentariosId);
    } catch (error) {
        console.error('Erro ao enviar:', error);
    }
}

// ======================
// CONVITES
// ======================
function convidarAmigo(event, workspaceId) {
    event.stopPropagation();
    modal.abrirConvite(workspaceId);
}

async function enviarConviteReal() {
    const workspaceId = dom.get('convite-workspace-id')?.value;
    const email = dom.get('convite-email')?.value?.trim();

    if (!email) {
        mostrarToast('Digite um e-mail válido!', TipoToast.WARNING);
        return;
    }

    try {
        const response = await api.json(`/workspaces/${workspaceId}/convidar`, {
            method: 'POST',
            body: JSON.stringify({ email })
        });

        const mensagem = await response.text();
        const tipo = response.ok ? TipoToast.SUCCESS : TipoToast.ERROR;
        const icone = response.ok ? '✅' : '❌';

        mostrarToast(`${icone} ${mensagem}`, tipo);
        if (response.ok) modal.fecharConvite();
    } catch (error) {
        console.error('Erro ao convidar:', error);
        mostrarToast('Erro de conexão.', TipoToast.ERROR);
    }
}

// ======================
// NAVEGAÇÃO
// ======================
function mudarAba(abaDestino) {
    dom.get('view-workspaces').classList.add('hidden');
    dom.get('view-tasks').classList.add('hidden');
    dom.get('view-completed').classList.add('hidden');
    dom.get('view-notifications').classList.add('hidden');

    dom.queryAll('.sidebar-nav .nav-item').forEach(btn => btn.classList.remove('active'));

    const config = {
        projetos: { view: 'view-workspaces', nav: 'nav-projetos' },
        concluidos: { view: 'view-completed', nav: 'nav-concluidos' },
        notificacoes: { view: 'view-notifications', nav: 'nav-notificacoes', esconderBadge: true }
    };

    const selecionado = config[abaDestino];
    if (!selecionado) return;

    dom.get(selecionado.view).classList.remove('hidden');
    dom.get(selecionado.nav).classList.add('active');
    carregarWorkspaces();

    if (selecionado.esconderBadge) {
        dom.get('badge-notif').style.display = 'none';
    }
}

// ======================
// INICIALIZAÇÃO
// ======================
function configurarEventListeners() {
    dom.get('btn-create-workspace') && (dom.get('btn-create-workspace').onclick = criarWorkspace);
    dom.get('btn-create-task') && (dom.get('btn-create-task').onclick = criarTask);

    const btnBack = dom.get('btn-back');
    if (btnBack) {
        btnBack.onclick = () => {
            dom.get('view-tasks').classList.add('hidden');
            dom.get('view-workspaces').classList.remove('hidden');
            state.workspaceAtualId = null;
        };
    }

    const btnLogout = dom.get('btn-logout');
    if (btnLogout) {
        btnLogout.onclick = () => {
            localStorage.removeItem('token');
            window.location.href = 'index.html';
        };
    }

    const pressionarEnter = (id, callback) => {
        dom.get(id)?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') callback();
        });
    };

    pressionarEnter('new-workspace-name', criarWorkspace);
    pressionarEnter('new-workspace-desc', criarWorkspace);
    pressionarEnter('new-task-title', criarTask);
    pressionarEnter('new-comment-text', adicionarComentario);
}

function configurarTema() {
    const temaSalvo = localStorage.getItem('omni_theme');
    if (temaSalvo === 'dark') {
        document.body.classList.add('dark-mode');
        dom.queryAll('.checkbox-theme').forEach(cb => cb.checked = true);
    }
}

function configurarCalendario() {
    const inputDate = dom.get('new-workspace-date');
    if (inputDate) {
        inputDate.setAttribute('min', new Date().toISOString().split('T')[0]);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    carregarWorkspaces();
    configurarFiltrosBusca();
    configurarCalendario();
    configurarEventListeners();
    configurarTema();
});
