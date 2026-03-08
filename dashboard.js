// ==========================================
// 1. CONFIGURAÇÕES GERAIS E SEGURANÇA
// ==========================================
const API_URL = 'http://localhost:8080';
const token = localStorage.getItem('token');
let workspaceAtualId = null;

if (!token) {
    window.location.href = 'index.html';
}

// ==========================================
// 2. UTILIDADES (Toasts e Tema)
// ==========================================
function showToast(mensagem, tipo = 'success') {
    const container = document.getElementById('toast-container');
    
    if (!container) {
        alert(mensagem);
        return;
    }
    
    const toast = document.createElement('div');
    let icone = '✅';
    if (tipo === 'error') icone = '❌';
    if (tipo === 'warning') icone = '⚠️';

    toast.className = `toast ${tipo}`;
    toast.innerHTML = `<span>${icone}</span> <div>${mensagem}</div>`;
    
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function toggleDarkMode() {
    const body = document.body;
    body.classList.toggle('dark-mode');
    const isDark = body.classList.contains('dark-mode');
    localStorage.setItem('omni_theme', isDark ? 'dark' : 'light');

    document.querySelectorAll('.checkbox-theme').forEach(cb => {
        cb.checked = isDark;
    });
}

// ==========================================
// 3. SISTEMA DE MODAIS CUSTOMIZADOS
// ==========================================
let tipoAcaoModal = null; 
let idItemModal = null;   

function fecharModais() {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.getElementById('modal-confirm').classList.add('hidden');
    document.getElementById('modal-edit').classList.add('hidden');
    tipoAcaoModal = null;
    idItemModal = null;
}

function abrirModalDeletar(tipo, id, titulo, mensagem) {
    tipoAcaoModal = tipo;
    idItemModal = id;
    document.getElementById('modal-confirm-title').innerText = titulo;
    document.getElementById('modal-confirm-msg').innerText = mensagem;
    document.getElementById('modal-overlay').classList.remove('hidden');
    document.getElementById('modal-confirm').classList.remove('hidden');
}

async function confirmarDelecaoModal() {
    if (!idItemModal) return;

    const url = tipoAcaoModal === 'workspace' 
        ? `${API_URL}/workspaces/${idItemModal}` 
        : `${API_URL}/tasks/${idItemModal}`;

    try {
        const response = await fetch(url, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            if (tipoAcaoModal === 'workspace') carregarWorkspaces();
            else carregarTasks();
            showToast("Item apagado com sucesso.", "success");
        } else {
            showToast("Erro ao deletar.", "error");
        }
    } catch (error) { console.error("Erro:", error); }
    
    fecharModais();
}

function editarWorkspace(event, id, nomeAtual, descAtual) {
    event.stopPropagation();
    idItemModal = id;
    document.getElementById('modal-edit-name').value = nomeAtual;
    const descLimpa = descAtual === 'undefined' ? '' : descAtual;
    document.getElementById('modal-edit-desc').value = descLimpa;

    document.getElementById('modal-overlay').classList.remove('hidden');
    document.getElementById('modal-edit').classList.remove('hidden');
}

async function confirmarEdicaoModal() {
    if (!idItemModal) return;

    const novoNome = document.getElementById('modal-edit-name').value;
    const novaDesc = document.getElementById('modal-edit-desc').value;

    if (!novoNome.trim()) {
        showToast("O nome do projeto é obrigatório!", "warning");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/workspaces/${idItemModal}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ nome: novoNome, descricao: novaDesc })
        });

        if (response.ok) {
            carregarWorkspaces();
            showToast("Projeto editado com sucesso!", "success");
        } else {
            showToast("Erro ao editar o projeto.", "error");
        }
    } catch (error) { console.error("Erro ao editar:", error); }
    
    fecharModais();
}

// ==========================================
// 4. LÓGICA DE PROJETOS (WORKSPACES)
// ==========================================
async function carregarWorkspaces() {
    const list = document.getElementById('workspaces-list');
    try {
        const response = await fetch(`${API_URL}/workspaces`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const workspaces = await response.json();
            list.innerHTML = '';

            if (workspaces.length === 0) {
                list.innerHTML = '<p>Nenhum projeto encontrado. Crie um acima!</p>';
                return;
            }

            workspaces.forEach(ws => {
                const div = document.createElement('div');
                div.className = 'workspace-card';
                div.innerHTML = `
                    <div onclick="abrirWorkspace(${ws.id}, '${ws.nome.replace(/'/g, "\\'")}')" style="cursor:pointer; padding-bottom: 15px;">
                        <h3>${ws.nome}</h3>
                        <p>${ws.descricao || 'Sem descrição'}</p>
                    </div>
                    <div style="border-top: 1px solid var(--border-color); padding-top: 10px; display: flex; gap: 10px;">
                        <button onclick="editarWorkspace(event, ${ws.id}, '${ws.nome.replace(/'/g, "\\'")}', '${(ws.descricao || '').replace(/'/g, "\\'")}')" class="btn-primary" style="background-color: #3498db; padding: 5px 10px; font-size: 12px; width: auto;">✏️ Editar</button>
                        <button onclick="deletarWorkspace(event, ${ws.id})" class="btn-primary" style="background-color: #e74c3c; padding: 5px 10px; font-size: 12px; width: auto;">🗑️ Deletar</button>
                    </div>
                `;
                list.appendChild(div);
            });
        }
    } catch (error) {
        console.error("Erro ao carregar workspaces:", error);
    }
}

async function criarWorkspace() {
    const nome = document.getElementById('new-workspace-name').value;
    const descElement = document.getElementById('new-workspace-desc');
    const desc = descElement ? descElement.value : '';

    if (!nome) {
        showToast("O nome do projeto é obrigatório!", "warning");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/workspaces`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ nome: nome, descricao: desc })
        });

        if (response.ok) {
            document.getElementById('new-workspace-name').value = '';
            if(descElement) descElement.value = '';
            carregarWorkspaces();
            showToast("Projeto criado com sucesso!", "success");
        } else {
            showToast("Erro ao criar o projeto no servidor.", "error");
        }
    } catch (error) {
        console.error("Erro ao criar workspace:", error);
        showToast("Erro de conexão.", "error");
    }
}

function deletarWorkspace(event, id) {
    event.stopPropagation();
    abrirModalDeletar('workspace', id, 'Deletar Projeto', 'Tem certeza? Todas as tarefas vão desaparecer para sempre!');
}

// ==========================================
// 5. LÓGICA DE TAREFAS E BUSCA
// ==========================================
async function abrirWorkspace(id, nome) {
    const searchInput = document.getElementById('task-search');
    if (searchInput) searchInput.value = '';

    workspaceAtualId = id;
    document.getElementById('workspace-title').innerText = nome;
    document.getElementById('view-workspaces').classList.add('hidden');
    document.getElementById('view-tasks').classList.remove('hidden');
    carregarTasks();
}

async function carregarTasks() {
    const listFazer = document.getElementById('tasks-fazer');
    const listConcluidas = document.getElementById('tasks-concluidas');

    listFazer.innerHTML = '';
    listConcluidas.innerHTML = '';

    try {
        const response = await fetch(`${API_URL}/tasks/workspace/${workspaceAtualId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const tasks = await response.json();

            if (tasks.length === 0) {
                listFazer.innerHTML = '<p style="color: #777;">Nenhuma tarefa ainda. Crie a primeira!</p>';
                return;
            }

            tasks.forEach(t => {
                const div = document.createElement('div');
                div.className = `task-card ${t.concluida ? 'concluida' : ''}`;
                
                div.setAttribute('draggable', 'true');
                div.setAttribute('ondragstart', `dragStart(event, ${t.id}, '${t.titulo.replace(/'/g, "\\'")}')`);

                const textoBotao = t.concluida ? '↩ Desfazer' : '✔ Concluir';
                const classeBotao = t.concluida ? 'btn-desfazer' : 'btn-concluir';

                div.innerHTML = `
                    <div class="task-content">
                        <h4 class="${t.concluida ? 'texto-riscado' : ''}">${t.titulo}</h4>
                    </div>
                    <div class="task-actions" style="align-items: center;">
                        <button onclick="toggleConcluirTask(${t.id}, '${t.titulo.replace(/'/g, "\\'")}', ${t.concluida})" class="${classeBotao}">${textoBotao}</button>
                        <button onclick="deletarTask(${t.id})" class="btn-deletar">🗑️</button>
                    </div>
                `;

                if (t.concluida) {
                    listConcluidas.appendChild(div);
                } else {
                    listFazer.appendChild(div);
                }
            });
        }
    } catch (error) { 
        console.error("Erro ao carregar tarefas:", error); 
    }
}

async function criarTask() {
    const titulo = document.getElementById('new-task-title').value;
    if (!titulo) {
        showToast("O título da tarefa é obrigatório!", "warning");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/tasks`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ titulo: titulo, concluida: false, workspace: { id: workspaceAtualId } })
        });
        if (response.ok) {
            document.getElementById('new-task-title').value = '';
            carregarTasks();
            showToast("Tarefa adicionada!", "success");
        } else {
            showToast("Erro ao adicionar tarefa.", "error");
        }
    } catch (error) { console.error(error); }
}

async function toggleConcluirTask(id, titulo, statusAtual) {
    try {
        const response = await fetch(`${API_URL}/tasks/${id}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ titulo: titulo, concluida: !statusAtual })
        });

        if (response.ok) {
            carregarTasks();
        } else {
            showToast("Erro ao atualizar a tarefa.", "error");
        }
    } catch (error) {
        console.error("Erro ao concluir tarefa:", error);
    }
}

function deletarTask(id) {
    abrirModalDeletar('task', id, 'Deletar Tarefa', 'Quer mesmo apagar essa tarefa da lista?');
}

function configurarFiltroBusca() {
    const searchInput = document.getElementById('task-search');
    
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const termoBusca = searchInput.value.toLowerCase();
            const todosOsCards = document.querySelectorAll('.task-card');

            todosOsCards.forEach(card => {
                const tituloTarefa = card.querySelector('h4').innerText.toLowerCase();
                if (tituloTarefa.includes(termoBusca)) {
                    card.style.display = 'flex'; 
                } else {
                    card.style.display = 'none'; 
                }
            });
        });
    }
}

// ==========================================
// 6. LÓGICA DE ARRASTAR E SOLTAR (DRAG & DROP)
// ==========================================
function dragStart(event, taskId, titulo) {
    event.dataTransfer.setData("taskId", taskId);
    event.dataTransfer.setData("titulo", titulo);
    setTimeout(() => event.target.classList.add('dragging'), 0);
}

function allowDrop(event) {
    event.preventDefault();
}

async function dropTask(event, novaSituacaoConcluida) {
    event.preventDefault();
    document.querySelectorAll('.task-card').forEach(card => card.classList.remove('dragging'));

    const taskId = event.dataTransfer.getData("taskId");
    const titulo = event.dataTransfer.getData("titulo");

    if (!taskId) return;

    try {
        const response = await fetch(`${API_URL}/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ titulo: titulo, concluida: novaSituacaoConcluida })
        });

        if (response.ok) {
            carregarTasks();
        } else {
            showToast("Erro ao mover a tarefa.", "error");
        }
    } catch (error) {
        console.error("Erro no Drag & Drop:", error);
    }
}

// ==========================================
// 7. INICIALIZAÇÃO E EVENTOS DA PÁGINA
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Carrega dados iniciais e ativa utilidades
    carregarWorkspaces();
    configurarFiltroBusca();

    // 2. Configura botões de clique
    const btnWS = document.getElementById('btn-create-workspace');
    if(btnWS) btnWS.onclick = criarWorkspace;

    const btnTK = document.getElementById('btn-create-task');
    if(btnTK) btnTK.onclick = criarTask;

    const btnBack = document.getElementById('btn-back');
    if (btnBack) {
        btnBack.onclick = () => {
            document.getElementById('view-tasks').classList.add('hidden');
            document.getElementById('view-workspaces').classList.remove('hidden');
            workspaceAtualId = null;
        };
    }

    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.onclick = () => {
            localStorage.removeItem('token');
            window.location.href = 'index.html';
        };
    }

    // 3. Configura a tecla "Enter" nos inputs
    const inputWsName = document.getElementById('new-workspace-name');
    const inputWsDesc = document.getElementById('new-workspace-desc');
    const pressionouEnterProjeto = (event) => {
        if (event.key === 'Enter') criarWorkspace();
    };

    if (inputWsName) inputWsName.addEventListener('keypress', pressionouEnterProjeto);
    if (inputWsDesc) inputWsDesc.addEventListener('keypress', pressionouEnterProjeto);

    const inputTaskTitle = document.getElementById('new-task-title');
    if (inputTaskTitle) {
        inputTaskTitle.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') criarTask();
        });
    }
    
    // 4. Verifica se o Modo Escuro estava salvo
    const temaSalvo = localStorage.getItem('omni_theme');
    if (temaSalvo === 'dark') {
        document.body.classList.add('dark-mode');
        document.querySelectorAll('.checkbox-theme').forEach(cb => cb.checked = true);
    }
});