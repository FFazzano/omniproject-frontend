import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Mail, Lock, LayoutDashboard, Folder, Plus, Trash2, CheckCircle, Circle, LogOut, Activity, MessageSquare, Paperclip, Clock, GripVertical, X, Download, Home, ArrowLeft } from 'lucide-react';
import api from './api/api';
import './App.css';

// --- COMPONENTE DE LOGIN ---
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // Payload exato esperado pelo backend Spring Boot (email e senha)
      const response = await api.post('/auth/login', { email, senha: password });
      console.log('Resposta do Login:', response.data);
      const token = response.data.token;
      localStorage.setItem('token', token);
      navigate('/dashboard'); // Redireciona para o dashboard após o sucesso
    } catch (err) {
      console.error('Erro ao fazer login:', err);
      alert('Usuário ou senha incorretos');
      setError('Não foi possível realizar o login.');
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-container">
        <h2>Login - OmniProject</h2>
        <form onSubmit={handleLogin} className="login-form">
          <div className="input-group">
            <Mail className="input-icon" size={20} />
            <input type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="input-group">
            <Lock className="input-icon" size={20} />
            <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit">Entrar</button>
          {error && <p className="error-message">{error}</p>}
        </form>
      </div>
    </div>
  );
};

// --- COMPONENTE DO DASHBOARD ---
const Dashboard = () => {
  const [workspaces, setWorkspaces] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [newWorkspaceDesc, setNewWorkspaceDesc] = useState('');
  
  // Estados Avançados: Modais, Drawers e Arquivos
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [comments, setComments] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [newCommentText, setNewCommentText] = useState('');
  const fileInputRef = useRef(null);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    // Recarrega a página forçando a limpeza do estado de memória e redirecionando
    window.location.href = '/login';
  }, []);

  useEffect(() => {
    const carregarDados = async () => {
      try {
        const wsResponse = await api.get('/workspaces');
        const workspacesData = wsResponse.data;
        setWorkspaces(workspacesData);
      } catch (err) {
        console.error('Erro ao buscar workspaces:', err);
        if (err.response && (err.response.status === 401 || err.response.status === 403)) {
          console.error('Erro de permissão:', err);
          handleLogout();
        }
      }
    };
    carregarDados();
  }, [handleLogout]);

  // Efeito para buscar as tarefas sempre que o Workspace atual mudar
  useEffect(() => {
    const carregarTarefas = async () => {
      if (!currentWorkspace) return;
      try {
        const tasksResponse = await api.get(`/tasks/workspace/${currentWorkspace.id}`);
        setTasks(tasksResponse.data);
      } catch (err) {
        console.error('Erro ao buscar tarefas:', err);
      }
    };
    carregarTarefas();
  }, [currentWorkspace]);

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    try {
      const res = await api.post('/workspaces', { nome: newWorkspaceName, descricao: newWorkspaceDesc });
      setWorkspaces([...workspaces, res.data]);
      setNewWorkspaceName('');
      setNewWorkspaceDesc('');
      setIsWorkspaceModalOpen(false);
    } catch (err) {
      console.error('Erro ao criar workspace:', err);
    }
  };

  const handleDeleteWorkspace = async (e, id) => {
    e.stopPropagation(); // Evita que o clique entre no workspace
    try {
      await api.delete(`/workspaces/${id}`);
      setWorkspaces(workspaces.filter(ws => ws.id !== id));
      if (currentWorkspace?.id === id) setCurrentWorkspace(null);
    } catch (err) {
      console.error('Erro ao deletar workspace:', err);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !currentWorkspace) return;
    try {
      const payload = { titulo: newTaskTitle, status: 'PENDENTE', workspaceId: currentWorkspace.id };
      const res = await api.post('/tasks', payload);
      setTasks([...tasks, res.data]);
      setNewTaskTitle('');
    } catch (err) {
      console.error('Erro ao criar tarefa:', err);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks(tasks.filter(t => t.id !== taskId));
      if (isHistoryOpen) carregarHistorico();
    } catch (err) {
      console.error('Erro ao deletar tarefa:', err);
    }
  };

  // --- LÓGICA: KANBAN DRAG & DROP ---
  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (!taskId) return;

    // Atualização Otimista
    const taskToUpdate = tasks.find(t => t.id === parseInt(taskId));
    if (!taskToUpdate || taskToUpdate.status === newStatus) return;
    
    setTasks(prev => prev.map(t => t.id === parseInt(taskId) ? { ...t, status: newStatus } : t));

    try {
      await api.put(`/tasks/${taskId}`, { status: newStatus });
      if (isHistoryOpen) carregarHistorico();
    } catch (err) {
      console.error('Erro ao mover tarefa:', err);
    }
  };

  const handleDragOver = (e) => e.preventDefault();

  // --- LÓGICA: HISTÓRICO (DRAWER) ---
  const carregarHistorico = async () => {
    if (!currentWorkspace) return;
    try {
      const res = await api.get(`/workspaces/${currentWorkspace.id}/logs`);
      setHistoryLogs(res.data);
    } catch (err) {
      console.error('Erro ao buscar histórico:', err);
    }
  };

  const openHistoryDrawer = () => {
    setIsHistoryOpen(true);
    carregarHistorico();
  };

  // --- LÓGICA: COMENTÁRIOS E ANEXOS (MODAL) ---
  const openTaskModal = async (task) => {
    setSelectedTask(task);
    fetchCommentsAndAttachments(task.id);
  };

  const fetchCommentsAndAttachments = async (taskId) => {
    try {
      const [resComments, resAttachments] = await Promise.all([
        api.get(`/tasks/${taskId}/comments`),
        api.get(`/tasks/${taskId}/attachments`)
      ]);
      setComments(resComments.data);
      setAttachments(resAttachments.data);
    } catch (err) {
      console.error('Erro ao buscar detalhes da tarefa', err);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedTask) return;
    try {
      await api.post(`/tasks/${selectedTask.id}/comments`, { texto: newCommentText });
      setNewCommentText('');
      fetchCommentsAndAttachments(selectedTask.id);
    } catch (err) {
      console.error('Erro ao enviar comentário:', err);
    }
  };

  const handleUploadAttachment = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedTask) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      await api.post(`/tasks/${selectedTask.id}/attachments`, formData);
      fetchCommentsAndAttachments(selectedTask.id);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error('Erro no upload:', err);
    }
  };

  const handleDownloadAttachment = async (anexo) => {
    try {
      const res = await api.get(`/attachments/${anexo.id}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = anexo.fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      console.error('Erro ao baixar anexo:', err);
    }
  };

  // Definição das colunas do Kanban
  const KANBAN_COLUMNS = [
    { id: 'PENDENTE', title: 'Para Fazer', icon: <Circle size={16} /> },
    { id: 'ANDAMENTO', title: 'Em Andamento', icon: <Clock size={16} /> },
    { id: 'CONCLUIDA', title: 'Concluído', icon: <CheckCircle size={16} /> }
  ];

  return (
    <div className="app-layout">
      {/* SIDEBAR - MENU LATERAL */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <LayoutDashboard className="brand-icon" size={24} />
          <h2>OmniSaaS</h2>
        </div>

        <div className="sidebar-nav">
          <p className="section-title">NAVEGAÇÃO</p>
          <ul className="nav-list">
            <li 
              className={`nav-item ${!currentWorkspace ? 'active' : ''}`}
              onClick={() => setCurrentWorkspace(null)}
            >
              <Home size={18} />
              <span>Meus Projetos</span>
            </li>
          </ul>
        </div>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-button">
            <LogOut size={18} />
            Sair da conta
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT - ÁREA DE TAREFAS */}
      <main className="main-content">
        {!currentWorkspace ? (
          <div className="lobby-container">
            <header className="lobby-header">
              <h1>Meus Projetos</h1>
              <p>Escolha um workspace para ver suas tarefas ou crie um novo.</p>
            </header>
            <div className="workspaces-grid">
              <div className="workspace-card-large dashed" onClick={() => setIsWorkspaceModalOpen(true)}>
                <Plus size={32} />
                <h3>Criar Novo Projeto</h3>
              </div>
              {workspaces.map(ws => (
                <div key={ws.id} className="workspace-card-large" onClick={() => setCurrentWorkspace(ws)}>
                  <div className="ws-card-content">
                    <Folder className="ws-icon" size={24} />
                    <h3>{ws.nome}</h3>
                    <p className="ws-desc">{ws.descricao || 'Nenhuma descrição adicionada.'}</p>
                  </div>
                  <div className="ws-card-actions">
                    <span className="ws-status">{ws.concluido ? 'Concluído' : 'Em andamento'}</span>
                    <button className="btn-icon-small danger" onClick={(e) => handleDeleteWorkspace(e, ws.id)} title="Excluir Projeto">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="tasks-container">
            <header className="tasks-header">
              <div className="header-title-group">
                <button className="btn-back" onClick={() => setCurrentWorkspace(null)}>
                  <ArrowLeft size={16} /> Voltar para Projetos
                </button>
                <h1>{currentWorkspace.nome}</h1>
                <p className="tasks-subtitle">Gerencie suas tarefas deste projeto.</p>
              </div>
              <button className="btn-secondary" onClick={openHistoryDrawer}>
                <Activity size={18} /> Histórico
              </button>
            </header>

            <form onSubmit={handleCreateTask} className="create-task-form">
              <div className="input-group-task">
                <Plus className="input-icon-task" size={20} />
                <input 
                  type="text" 
                  placeholder="O que precisa ser feito?" 
                  value={newTaskTitle} 
                  onChange={e => setNewTaskTitle(e.target.value)} 
                />
                <button type="submit" disabled={!newTaskTitle.trim()}>Adicionar</button>
              </div>
            </form>

            {/* BOARD KANBAN */}
            <div className="kanban-board">
              {KANBAN_COLUMNS.map(col => (
                <div 
                  key={col.id} 
                  className="kanban-column"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, col.id)}
                >
                  <div className="column-header">
                    {col.icon} <h3>{col.title}</h3>
                    <span className="task-count">{tasks.filter(t => t.status === col.id).length}</span>
                  </div>
                  <div className="scrollable-column">
                    {tasks.filter(t => t.status === col.id).map(task => (
                      <div 
                        key={task.id} 
                        className="task-card"
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                      >
                        <div className="task-drag-handle"><GripVertical size={16} /></div>
                        <div className="task-content">
                          <h4 className={task.status === 'CONCLUIDA' ? 'text-strikethrough' : ''}>{task.titulo}</h4>
                        </div>
                        <div className="task-actions">
                          <button className="btn-icon-small" onClick={() => openTaskModal(task)} title="Ver Detalhes">
                            <MessageSquare size={16} />
                          </button>
                          <button className="btn-icon-small danger" onClick={() => handleDeleteTask(task.id)} title="Excluir">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* MODAL DE TAREFA (COMENTÁRIOS E ANEXOS) */}
      {selectedTask && (
        <div className="modal-overlay" onClick={() => setSelectedTask(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <header className="modal-header">
              <h3>{selectedTask.titulo}</h3>
              <button className="close-btn" onClick={() => setSelectedTask(null)}><X size={20}/></button>
            </header>
            <div className="modal-body layout-split">
              <div className="comments-section">
                <h4><MessageSquare size={16}/> Comentários</h4>
                <div className="comments-list">
                  {comments.length === 0 ? <p className="empty-text">Nenhum comentário.</p> : comments.map(c => (
                    <div key={c.id} className="comment-bubble">
                      <span className="comment-author">{c.nomeAutor || 'Membro'}</span>
                      <p>{c.texto}</p>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleAddComment} className="comment-form">
                  <input type="text" placeholder="Escreva um comentário..." value={newCommentText} onChange={e => setNewCommentText(e.target.value)} />
                  <button type="submit" disabled={!newCommentText.trim()}>Enviar</button>
                </form>
              </div>
              <div className="attachments-section">
                <h4><Paperclip size={16}/> Anexos</h4>
                <div className="attachments-list">
                  {attachments.length === 0 ? <p className="empty-text">Sem anexos.</p> : attachments.map(a => (
                    <button key={a.id} className="attachment-pill" onClick={() => handleDownloadAttachment(a)}>
                      <Download size={14}/> {a.fileName}
                    </button>
                  ))}
                </div>
                <div className="upload-box">
                  <input type="file" id="file-upload" className="hidden-input" ref={fileInputRef} onChange={handleUploadAttachment}/>
                  <label htmlFor="file-upload" className="upload-btn"><Plus size={16}/> Novo Arquivo</label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER DE HISTÓRICO */}
      <div className={`drawer-overlay ${isHistoryOpen ? 'open' : ''}`} onClick={() => setIsHistoryOpen(false)}></div>
      <div className={`history-drawer ${isHistoryOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <h3><Activity size={18}/> Histórico do Projeto</h3>
          <button className="close-btn" onClick={() => setIsHistoryOpen(false)}><X size={20}/></button>
        </div>
        <div className="drawer-content">
          {historyLogs.length === 0 ? (
            <p className="empty-text">Nenhuma atividade registrada ainda.</p>
          ) : (
            historyLogs.map(log => (
              <div key={log.id} className="log-item">
                <div className="log-dot"></div>
                <div className="log-details">
                  <p>{log.descricao}</p>
                  <span>{new Date(log.dataHora).toLocaleString('pt-BR')}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL DE CRIAR WORKSPACE */}
      {isWorkspaceModalOpen && (
        <div className="modal-overlay" onClick={() => setIsWorkspaceModalOpen(false)}>
          <div className="modal-content small-modal" onClick={e => e.stopPropagation()}>
            <header className="modal-header">
              <h3>Criar Novo Projeto</h3>
              <button className="close-btn" onClick={() => setIsWorkspaceModalOpen(false)}><X size={20}/></button>
            </header>
            <div className="modal-body p-24">
              <form onSubmit={handleCreateWorkspace} className="standard-form">
                <input type="text" placeholder="Nome do Projeto (Ex: Sprint Q3)" value={newWorkspaceName} onChange={e => setNewWorkspaceName(e.target.value)} required />
                <textarea placeholder="Descrição (Opcional)" value={newWorkspaceDesc} onChange={e => setNewWorkspaceDesc(e.target.value)} rows={3}></textarea>
                <button type="submit" disabled={!newWorkspaceName.trim()}>Criar Projeto</button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- PROTEÇÃO DE ROTAS ---
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// --- COMPONENTE PRINCIPAL (APP) ---
function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<Login />} />
      
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      
      {/* Catch-all para rotas não encontradas */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;