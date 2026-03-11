// ==========================================
// 1. CONFIGURAÇÕES GERAIS E SEGURANÇA
// ==========================================
const API_URL = 'http://localhost:8080';
const token = localStorage.getItem('token');
let workspaceAtualId = null;
let filtroStatusAtual = 'all'; // Estado do nosso Filtro Rápido (Pílulas)
let tarefaAtualComentariosId = null;

if (!token) {
    window.location.href = 'index.html';
}

// ==========================================
// 2. UTILIDADES (Toasts e Tema)
// ==========================================
function showToast(mensagem, tipo = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) { alert(mensagem); return; }
    
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

    document.querySelectorAll('.checkbox-theme').forEach(cb => { cb.checked = isDark; });
}

// ==========================================
// 3. SISTEMA DE MODAIS CUSTOMIZADOS
// ==========================================
let tipoAcaoModal = null; 
let idItemModal = null;   

function fecharModais() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
        overlay.style.display = 'none'; // Some com a tela preta
    }

    const modais = ['modal-confirm', 'modal-edit', 'modal-comments'];
    modais.forEach(id => {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none'; // Some com as caixas
        }
    });
    
    tipoAcaoModal = null; idItemModal = null; tarefaAtualComentariosId = null;
}

function abrirModalDeletar(tipo, id, titulo, mensagem) {
    tipoAcaoModal = tipo; idItemModal = id;
    document.getElementById('modal-confirm-title').innerText = titulo;
    document.getElementById('modal-confirm-msg').innerText = mensagem;
    document.getElementById('modal-overlay').classList.remove('hidden');
    document.getElementById('modal-confirm').classList.remove('hidden');
    document.getElementById('modal-overlay').style.display = 'flex';
    document.getElementById('modal-confirm').style.display = 'block';
}

async function confirmarDelecaoModal() {
    if (!idItemModal) return;
    const url = tipoAcaoModal === 'workspace' ? `${API_URL}/workspaces/${idItemModal}` : `${API_URL}/tasks/${idItemModal}`;

    try {
        const response = await fetch(url, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        if (response.ok) {
            if (tipoAcaoModal === 'workspace') carregarWorkspaces(); else carregarTasks();
            showToast("Item apagado com sucesso.", "success");
        } else {
            showToast("Erro ao deletar.", "error");
        }
    } catch (error) { console.error("Erro:", error); }
    fecharModais();
}

function editarWorkspace(event, id, nomeAtual, descAtual) {
    event.stopPropagation(); idItemModal = id;
    document.getElementById('modal-edit-name').value = nomeAtual;
    document.getElementById('modal-edit-desc').value = descAtual === 'undefined' ? '' : descAtual;
    document.getElementById('modal-overlay').classList.remove('hidden');
    document.getElementById('modal-edit').classList.remove('hidden');
    document.getElementById('modal-overlay').style.display = 'flex';
    document.getElementById('modal-edit').style.display = 'block';
}

async function confirmarEdicaoModal() {
    if (!idItemModal) return;
    const novoNome = document.getElementById('modal-edit-name').value;
    const novaDesc = document.getElementById('modal-edit-desc').value;

    if (!novoNome.trim()) { showToast("O nome do projeto é obrigatório!", "warning"); return; }

    try {
        const response = await fetch(`${API_URL}/workspaces/${idItemModal}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ nome: novoNome, descricao: novaDesc })
        });
        if (response.ok) {
            carregarWorkspaces();
            showToast("Projeto editado com sucesso!", "success");
        } else { showToast("Erro ao editar o projeto.", "error"); }
    } catch (error) { console.error("Erro ao editar:", error); }
    fecharModais();
}

// ==========================================
// 4. LÓGICA DE PROJETOS (WORKSPACES)
// ==========================================
async function carregarWorkspaces() {
    const listAtivos = document.getElementById('workspaces-list');
    const listConcluidos = document.getElementById('completed-workspaces-list');
    const listNotificacoes = document.getElementById('notifications-list');
    
    try {
        const response = await fetch(`${API_URL}/workspaces`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (response.ok) {
            const workspaces = await response.json();
            
            // Limpa todas as listas antes de preencher
            if(listAtivos) listAtivos.innerHTML = '';
            if(listConcluidos) listConcluidos.innerHTML = '';
            if(listNotificacoes) listNotificacoes.innerHTML = '';
            
            let notificacoesCount = 0;
            const hoje = new Date();
            hoje.setHours(0,0,0,0); // Zera a hora para comparar só o dia

            if (workspaces.length === 0) {
                if(listAtivos) listAtivos.innerHTML = '<p style="color: var(--text-muted);">Nenhum projeto encontrado. Crie um acima!</p>';
                return;
            }
            
            workspaces.forEach(ws => {
                // --- FORMATAÇÃO DE DATAS ---
                let dataCriacaoFormatada = 'N/A';
                if (ws.dataCriacao) {
                    const data = new Date(ws.dataCriacao);
                    dataCriacaoFormatada = data.toLocaleDateString('pt-BR');
                }

                let dataEntregaFormatada = 'Sem prazo';
                if (ws.dataEntrega) {
                    const partes = ws.dataEntrega.split('-'); 
                    if(partes.length === 3) dataEntregaFormatada = `${partes[2]}/${partes[1]}/${partes[0]}`;
                }

                // --- SISTEMA DE NOTIFICAÇÕES (PRAZOS) ---
                if (!ws.concluido && ws.dataEntrega) {
                    const partes = ws.dataEntrega.split('-');
                    const dataVencimento = new Date(partes[0], partes[1] - 1, partes[2]);
                    
                    // Calcula a diferença em dias
                    const diffTempo = dataVencimento.getTime() - hoje.getTime();
                    const diffDias = Math.ceil(diffTempo / (1000 * 3600 * 24));

                    if (diffDias === 1) {
                        // VENCE AMANHÃ!
                        notificacoesCount++;
                        if(listNotificacoes) listNotificacoes.innerHTML += `
                            <div style="background: rgba(241, 196, 15, 0.1); border-left: 4px solid #f1c40f; padding: 15px; border-radius: 4px;">
                                ⚠️ <strong>Atenção:</strong> O projeto <b>${ws.nome}</b> vence amanhã!
                            </div>`;
                        // Mostra o Toast na tela
                        showToast(`O projeto "${ws.nome}" vence amanhã!`, 'warning');
                    } else if (diffDias < 0) {
                        // ESTÁ ATRASADO!
                        notificacoesCount++;
                        if(listNotificacoes) listNotificacoes.innerHTML += `
                            <div style="background: rgba(231, 76, 60, 0.1); border-left: 4px solid #e74c3c; padding: 15px; border-radius: 4px;">
                                ❌ <strong>Atrasado:</strong> O projeto <b>${ws.nome}</b> passou do prazo de entrega!
                            </div>`;
                    }
                }

                // --- CRIAÇÃO DO CARTÃO DO PROJETO ---
                const textoConcluir = ws.concluido ? '↩ Reabrir' : '✔ Concluir';
                const corConcluir = ws.concluido ? '#95a5a6' : '#2ecc71';

                const div = document.createElement('div');
                div.className = `workspace-card ${ws.concluido ? 'concluido' : ''}`;
                
                div.innerHTML = `
                    <div onclick="abrirWorkspace(${ws.id}, '${ws.nome.replace(/'/g, "\\'")}')" style="cursor:pointer; padding-bottom: 15px;">
                        <h3>${ws.nome}</h3>
                        <p>${ws.descricao || 'Sem descrição'}</p>
                        
                        <div style="display: flex; gap: 15px; margin-top: 15px; font-size: 12px; color: var(--text-muted);">
                            <span title="Data de Criação">📅 Criado: <strong>${dataCriacaoFormatada}</strong></span>
                            <span title="Prazo de Entrega">🎯 Prazo: <strong>${dataEntregaFormatada}</strong></span>
                        </div>
                    </div>
                    
                    <div style="border-top: 1px solid var(--border-color); padding-top: 15px; display: flex; gap: 10px;">
                        <button onclick="toggleConcluirWorkspace(event, ${ws.id})" class="btn-primary" style="background-color: ${corConcluir}; height: 32px;">${textoConcluir}</button>
                        <button onclick="editarWorkspace(event, ${ws.id}, '${ws.nome.replace(/'/g, "\\'")}', '${(ws.descricao || '').replace(/'/g, "\\'")}')" class="btn-primary" style="background-color: #3498db; height: 32px;">✏️ Editar</button>
                        <button onclick="deletarWorkspace(event, ${ws.id})" class="btn-primary" style="background-color: #e74c3c; height: 32px;">🗑️ Deletar</button>
                    </div>
                `;
                
                // --- SEPARAÇÃO DE ABAS ---
                if (ws.concluido) {
                    if(listConcluidos) listConcluidos.appendChild(div);
                } else {
                    if(listAtivos) listAtivos.appendChild(div);
                }
            });

            // Mostra se não tiver nenhum concluído
            if (listConcluidos && listConcluidos.innerHTML === '') {
                listConcluidos.innerHTML = '<p style="color: var(--text-muted);">Você ainda não possui projetos concluídos.</p>';
            }
            if (listNotificacoes && listNotificacoes.innerHTML === '') {
                listNotificacoes.innerHTML = '<p style="color: var(--text-muted);">Tudo tranquilo! Nenhuma notificação no momento.</p>';
            }

            // Acende a bolinha vermelha se tiver notificação
            const badge = document.getElementById('badge-notif');
            if (badge) {
                if (notificacoesCount > 0) {
                    badge.innerText = notificacoesCount;
                    badge.style.display = 'inline-block';
                } else {
                    badge.style.display = 'none';
                }
            }

        }
    } catch (error) { 
        console.error("Erro ao carregar workspaces:", error); 
    }
}

async function criarWorkspace() {
    const nome = document.getElementById('new-workspace-name').value;
    const desc = document.getElementById('new-workspace-desc') ? document.getElementById('new-workspace-desc').value : '';
    const dataEntrega = document.getElementById('new-workspace-date') ? document.getElementById('new-workspace-date').value : null;

    if (!nome) { showToast("O nome do projeto é obrigatório!", "warning"); return; }

    // --- A VALIDAÇÃO TEM QUE FICAR AQUI (ANTES DE MANDAR PRO JAVA) ---
    if (dataEntrega) {
        // Pega a data que o usuário digitou e ajusta o fuso horário
        const dataEscolhida = new Date(dataEntrega + 'T00:00:00'); 
        
        // Pega a data de hoje e zera as horas para comparar apenas os dias
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        if (dataEscolhida < hoje) {
            showToast("⚠️ O prazo final não pode ser no passado!", "warning");
            return; // O 'return' aqui faz a função parar Imediatamente. O fetch lá embaixo nem chega a ser executado!
        }
    }
    
    try {
        const response = await fetch(`${API_URL}/workspaces`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ nome: nome, descricao: desc, dataEntrega: dataEntrega })
        });
        if (response.ok) {
            document.getElementById('new-workspace-name').value = '';
            if(document.getElementById('new-workspace-desc')) document.getElementById('new-workspace-desc').value = '';
            if(document.getElementById('new-workspace-date')) document.getElementById('new-workspace-date').value = '';
            carregarWorkspaces();
            showToast("Projeto criado com sucesso!", "success");
        } else { showToast("Erro ao criar o projeto no servidor.", "error"); }
    } catch (error) { showToast("Erro de conexão.", "error"); }
}

function deletarWorkspace(event, id) {
    event.stopPropagation();
    abrirModalDeletar('workspace', id, 'Deletar Projeto', 'Tem certeza? Todas as tarefas vão desaparecer para sempre!');
}

async function toggleConcluirWorkspace(event, id) {
    event.stopPropagation(); // O pulo do gato: impede que o clique no botão abra a tela de tarefas!
    
    try {
        const response = await fetch(`${API_URL}/workspaces/${id}/concluir`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            carregarWorkspaces(); // Recarrega a tela para mostrar o novo visual
            showToast("Status do projeto atualizado!", "success");
        } else {
            showToast("Erro ao atualizar o projeto.", "error");
        }
    } catch (error) {
        console.error("Erro ao concluir projeto:", error);
    }
}

// ==========================================
// 5. LÓGICA DE TAREFAS
// ==========================================
async function abrirWorkspace(id, nome) {
    const searchInput = document.getElementById('task-search');
    if (searchInput) searchInput.value = '';

    filtroStatusAtual = 'all';
    document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    const btnAll = document.querySelector('.filter-pill[data-filter="all"]');
    if(btnAll) btnAll.classList.add('active');

    workspaceAtualId = id;
    document.getElementById('workspace-title').innerText = nome;
    document.getElementById('view-workspaces').classList.add('hidden');
    document.getElementById('view-tasks').classList.remove('hidden');
    carregarTasks();
}

async function carregarTasks() {
    const listFazer = document.getElementById('tasks-fazer');
    const listAndamento = document.getElementById('tasks-andamento');
    const listConcluidas = document.getElementById('tasks-concluidas');
    
    listFazer.innerHTML = ''; listAndamento.innerHTML = ''; listConcluidas.innerHTML = '';

    try {
        const response = await fetch(`${API_URL}/tasks/workspace/${workspaceAtualId}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (response.ok) {
            const tasks = await response.json();
            
            // --- A MATEMÁTICA DA BARRA DE PROGRESSO ---
            const totalTarefas = tasks.length;
            const tarefasConcluidas = tasks.filter(t => t.status === 'CONCLUIDO').length;
            const porcentagem = totalTarefas === 0 ? 0 : Math.round((tarefasConcluidas / totalTarefas) * 100);
            
            const barra = document.getElementById('progress-bar');
            const textoProgresso = document.getElementById('progress-text');
            if (barra && textoProgresso) {
                barra.style.width = `${porcentagem}%`;
                textoProgresso.innerText = `${porcentagem}% (${tarefasConcluidas}/${totalTarefas})`;
                barra.style.background = porcentagem === 100 ? '#f1c40f' : '#2ecc71'; 
            }
            // ------------------------------------------

            if (tasks.length === 0) {
                listFazer.innerHTML = '<p style="color: var(--text-muted); text-align: center; margin-top: 20px;">Nenhuma tarefa ainda.</p>';
                aplicarFiltrosTasks(); return;
            }

            tasks.forEach(t => {
                const div = document.createElement('div');
                const isConcluida = t.status === 'CONCLUIDO';
                div.className = `task-card ${isConcluida ? 'concluida' : ''}`;
                div.setAttribute('draggable', 'true');
                div.setAttribute('ondragstart', `dragStart(event, ${t.id}, '${t.titulo.replace(/'/g, "\\'")}')`);

                // Lógica inteligente do botão (Avança o status)
                let textoBotao = '▶️ Iniciar';
                let novoStatusClick = 'ANDAMENTO';
                let classeBotao = 'btn-concluir';

                if (t.status === 'ANDAMENTO') {
                    textoBotao = '✔ Concluir';
                    novoStatusClick = 'CONCLUIDO';
                } else if (isConcluida) {
                    textoBotao = '↩ Reabrir';
                    novoStatusClick = 'PENDENTE';
                    classeBotao = 'btn-desfazer';
                }

                div.innerHTML = `
                    <div class="task-content">
                        <h4 class="${isConcluida ? 'texto-riscado' : ''}">${t.titulo}</h4>
                    </div>
                    <div class="task-actions">
                        <button onclick="abrirModalComentarios(${t.id}, '${t.titulo.replace(/'/g, "\\'")}')" class="btn-comentarios" title="Ver Comentários">💬</button>
                        <button onclick="mudarStatusTask(${t.id}, '${t.titulo.replace(/'/g, "\\'")}', '${novoStatusClick}')" class="${classeBotao}">${textoBotao}</button>
                        <button onclick="deletarTask(${t.id})" class="btn-deletar">🗑️</button>
                    </div>
                `;
                
                // Joga a tarefa na coluna certa
                if (t.status === 'ANDAMENTO') listAndamento.appendChild(div);
                else if (t.status === 'CONCLUIDO') listConcluidas.appendChild(div);
                else listFazer.appendChild(div); // PENDENTE ou qualquer outra coisa cai aqui
            });
            
            aplicarFiltrosTasks(); 
        }
    } catch (error) { console.error("Erro ao carregar tarefas:", error); }
}

async function criarTask() {
    const titulo = document.getElementById('new-task-title').value;
    if (!titulo) { showToast("O título da tarefa é obrigatório!", "warning"); return; }

    try {
        const response = await fetch(`${API_URL}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            // Manda o status ao invés de concluida: false
            body: JSON.stringify({ titulo: titulo, status: 'PENDENTE', workspace: { id: workspaceAtualId } })
        });
        if (response.ok) {
            document.getElementById('new-task-title').value = '';
            carregarTasks();
            showToast("Tarefa adicionada!", "success");
        } else { showToast("Erro ao adicionar tarefa.", "error"); }
    } catch (error) { console.error(error); }
}

// A NOVA FUNÇÃO QUE SUBSTITUI A TOGGLE CONCLUIR
async function mudarStatusTask(id, titulo, novoStatus) {
    try {
        const response = await fetch(`${API_URL}/tasks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            // O segredo está aqui: agora enviamos o 'status' com a palavra certa (PENDENTE, ANDAMENTO ou CONCLUIDO)
            body: JSON.stringify({ titulo: titulo, status: novoStatus })
        });
        if (response.ok) {
            carregarTasks(); 
        } else {
            showToast("Erro ao atualizar a tarefa.", "error");
        }
    } catch (error) { 
        console.error("Erro ao mudar status:", error); 
    }
}

function deletarTask(id) {
    abrirModalDeletar('task', id, 'Deletar Tarefa', 'Quer mesmo apagar essa tarefa da lista?');
}

// ==========================================
// 6. FILTROS RÁPIDOS E BUSCA 
// ==========================================
function configurarFiltroBusca() {
    const searchInput = document.getElementById('task-search');
    const pills = document.querySelectorAll('.filter-pill');
    
    if (searchInput) {
        searchInput.addEventListener('input', aplicarFiltrosTasks);
    }

    pills.forEach(pill => {
        pill.addEventListener('click', (e) => {
            pills.forEach(p => p.classList.remove('active'));
            const clickedPill = e.target;
            clickedPill.classList.add('active');
            filtroStatusAtual = clickedPill.getAttribute('data-filter');
            aplicarFiltrosTasks();
        });
    });
}

function aplicarFiltrosTasks() {
    const searchInput = document.getElementById('task-search');
    const termoBusca = searchInput ? searchInput.value.toLowerCase() : '';
    const todosOsCards = document.querySelectorAll('.task-card');

    todosOsCards.forEach(card => {
        const tituloTarefa = card.querySelector('h4').innerText.toLowerCase();
        const isConcluida = card.classList.contains('concluida');
        
        const bateTexto = tituloTarefa.includes(termoBusca);
        
        let bateStatus = true;
        if (filtroStatusAtual === 'pending' && isConcluida) bateStatus = false;
        if (filtroStatusAtual === 'completed' && !isConcluida) bateStatus = false;

        if (bateTexto && bateStatus) {
            card.style.display = 'flex'; 
        } else {
            card.style.display = 'none'; 
        }
    });
}

// ==========================================
// 7. LÓGICA DE ARRASTAR E SOLTAR (DRAG & DROP)
// ==========================================
// 1. Quando você começa a arrastar
function dragStart(event, taskId, titulo) {
    console.log("Iniciando arraste da tarefa:", taskId);
    event.dataTransfer.setData("taskId", taskId);
    event.dataTransfer.setData("titulo", titulo);
    
    // Pequeno delay para o efeito visual de "fantasma" do card
    setTimeout(() => event.target.classList.add('dragging'), 0);
}

// 2. Avisa o navegador que pode soltar ali (Obrigatório!)
function allowDrop(event) {
    event.preventDefault(); 
}

// 3. Quando você solta o card na nova coluna
async function dropTask(event, novoStatusDaColuna) {
    event.preventDefault();
    console.log("Soltando tarefa na coluna:", novoStatusDaColuna);

    // Remove a classe de arraste de todos os cards
    document.querySelectorAll('.task-card').forEach(card => card.classList.remove('dragging'));

    const taskId = event.dataTransfer.getData("taskId");
    const titulo = event.dataTransfer.getData("titulo");

    if (!taskId) {
        console.error("Erro: ID da tarefa não encontrado no drop!");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${token}` 
            },
            // IMPORTANTE: Mandamos o status e o titulo para satisfazer o @Valid do Java
            body: JSON.stringify({ 
                titulo: titulo, 
                status: novoStatusDaColuna 
            })
        });

        if (response.ok) {
            console.log("Status atualizado com sucesso no banco!");
            carregarTasks(); // Recarrega as colunas
        } else {
            const erroTxt = await response.text();
            console.error("O Java recusou o movimento:", erroTxt);
            showToast("Erro ao mover: " + erroTxt, "error");
        }
    } catch (error) {
        console.error("Erro na conexão ao tentar mover:", error);
    }
}

// ==========================================
// 8. LÓGICA DE COMENTÁRIOS NAS TAREFAS
// ==========================================
async function abrirModalComentarios(taskId, tituloTarefa) {
    console.log("Abrindo chat para a tarefa:", taskId); 
    
    tarefaAtualComentariosId = taskId;
    document.getElementById('modal-comments-title').innerText = `💬 Comentários: ${tituloTarefa}`;
    
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.remove('hidden');
    overlay.style.display = 'flex';

    const modalComments = document.getElementById('modal-comments');
    modalComments.classList.remove('hidden');
    modalComments.style.display = 'block'; 
    
    await carregarComentarios(taskId);
}

async function carregarComentarios(taskId) {
    const list = document.getElementById('comments-list');
    list.innerHTML = '<p style="color: var(--text-muted); text-align: center;">Carregando...</p>';

    try {
        const response = await fetch(`${API_URL}/tasks/${taskId}/comments`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const comentarios = await response.json();
            list.innerHTML = '';
            
            if (comentarios.length === 0) {
                list.innerHTML = '<p style="color: var(--text-muted); text-align: center; margin-top: 50px;">Nenhum comentário ainda. Seja o primeiro!</p>';
                return;
            }

            comentarios.forEach(c => {
                let dataFormatada = 'Agora';
                if (c.dataCriacao) {
                    const data = new Date(c.dataCriacao);
                    dataFormatada = data.toLocaleDateString('pt-BR') + ' às ' + data.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
                }

                const bubble = document.createElement('div');
                bubble.className = 'comment-bubble';
                bubble.innerHTML = `
                    <div class="comment-text">${c.texto}</div>
                    <span class="comment-date">${dataFormatada}</span>
                `;
                list.appendChild(bubble);
            });
            
            list.scrollTop = list.scrollHeight;
        } else {
            list.innerHTML = '<p style="color: red;">Erro ao carregar comentários.</p>';
        }
    } catch (error) {
        console.error("Erro:", error);
    }
}

async function adicionarComentario() {
    if (!tarefaAtualComentariosId) return;
    
    const inputTexto = document.getElementById('new-comment-text');
    const texto = inputTexto.value.trim();
    
    if (!texto) {
        showToast("O comentário não pode estar vazio!", "warning");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/tasks/${tarefaAtualComentariosId}/comments`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ texto: texto })
        });
        
        if (response.ok) {
            inputTexto.value = ''; 
            await carregarComentarios(tarefaAtualComentariosId); 
        } else {
            showToast("Erro ao enviar comentário.", "error");
        }
    } catch (error) {
        console.error("Erro ao enviar:", error);
    }
}

// ==========================================
// 9. INICIALIZAÇÃO DA PÁGINA (Executado ao final)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    carregarWorkspaces();
    configurarFiltroBusca(); 

    // Bloqueia dias passados no calendário do novo projeto
    const inputDate = document.getElementById('new-workspace-date');
    if (inputDate) {
        // Pega o dia de hoje no formato YYYY-MM-DD
        const hojeString = new Date().toISOString().split('T')[0];
        inputDate.setAttribute('min', hojeString);
    }

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

    const pressionouEnterProjeto = (event) => { if (event.key === 'Enter') criarWorkspace(); };
    const inputWsName = document.getElementById('new-workspace-name');
    const inputWsDesc = document.getElementById('new-workspace-desc');
    if (inputWsName) inputWsName.addEventListener('keypress', pressionouEnterProjeto);
    if (inputWsDesc) inputWsDesc.addEventListener('keypress', pressionouEnterProjeto);

    const inputTaskTitle = document.getElementById('new-task-title');
    if (inputTaskTitle) {
        inputTaskTitle.addEventListener('keypress', (event) => { if (event.key === 'Enter') criarTask(); });
    }
    
    // Escuta Enter para adicionar comentário (Agora dentro do bloco correto)
    const inputComment = document.getElementById('new-comment-text');
    if (inputComment) {
        inputComment.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') adicionarComentario();
        });
    }
    
    const temaSalvo = localStorage.getItem('omni_theme');
    if (temaSalvo === 'dark') {
        document.body.classList.add('dark-mode');
        document.querySelectorAll('.checkbox-theme').forEach(cb => cb.checked = true);
    }
});

// ==========================================
// NAVEGAÇÃO ENTRE ABAS
// ==========================================
function mudarAba(abaDestino) {
    // 1. Esconde todas as telas
    document.getElementById('view-workspaces').classList.add('hidden');
    document.getElementById('view-tasks').classList.add('hidden');
    document.getElementById('view-completed').classList.add('hidden');
    document.getElementById('view-notifications').classList.add('hidden');

    // 2. Tira o "active" de todos os botões da sidebar
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(btn => btn.classList.remove('active'));

    // 3. Mostra a tela certa e acende o botão certo
    if (abaDestino === 'projetos') {
        document.getElementById('view-workspaces').classList.remove('hidden');
        document.getElementById('nav-projetos').classList.add('active');
        carregarWorkspaces(); // Recarrega a lista
    } else if (abaDestino === 'concluidos') {
        document.getElementById('view-completed').classList.remove('hidden');
        document.getElementById('nav-concluidos').classList.add('active');
        carregarWorkspaces(); // Recarrega para preencher a aba de concluídos
    } else if (abaDestino === 'notificacoes') {
        document.getElementById('view-notifications').classList.remove('hidden');
        document.getElementById('nav-notificacoes').classList.add('active');
        // Esconde a bolinha vermelha porque você já "leu"
        document.getElementById('badge-notif').style.display = 'none'; 
    }
}