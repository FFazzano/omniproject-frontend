import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Mail, Lock, LayoutDashboard, Folder, Plus, Trash2, CheckCircle, Circle, LogOut, Activity, MessageSquare, Paperclip, Clock, GripVertical, X, Download, Home, ArrowLeft, CheckSquare, Bell, Calendar, Target, Edit, UserPlus, Sun, Moon, RotateCcw } from 'lucide-react';
import api from './api/api';
import './App.css';
import toast, { Toaster } from 'react-hot-toast';

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
      toast.error('Usuário ou senha incorretos');
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
  const [newWorkspaceDeadline, setNewWorkspaceDeadline] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [newWorkspaceDesc, setNewWorkspaceDesc] = useState('');
  const [editingWorkspace, setEditingWorkspace] = useState(null);
  const [activeTab, setActiveTab] = useState('ativos'); // ativos, concluidos, notificacoes
  const [notifications, setNotifications] = useState([]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [workspaceToInvite, setWorkspaceToInvite] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') !== 'light');
  
  // Estados Avançados: Modais, Drawers e Arquivos
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [comments, setComments] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [newCommentText, setNewCommentText] = useState('');
  const fileInputRef = useRef(null);

  // Função utilitária para corrigir o bug de fuso horário de 1 dia a menos
  const formatarData = (dateString) => {
    if (!dateString) return '';
    // Pega apenas a parte 'YYYY-MM-DD' e força para o meio-dia
    const dataIso = dateString.split('T')[0];
    return new Date(`${dataIso}T12:00:00`).toLocaleDateString('pt-BR');
  };

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

  // Efeito do Theme Switch (Modo Escuro / Claro)
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Motor de Notificações
  useEffect(() => {
    const newNotifs = [];
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    workspaces.filter(ws => !ws.concluido && ws.dataEntrega).forEach(ws => {
      const entrega = new Date(ws.dataEntrega);
      entrega.setMinutes(entrega.getMinutes() + entrega.getTimezoneOffset());
      entrega.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((entrega - hoje) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        newNotifs.push({ id: ws.id, type: 'danger', message: `O projeto "${ws.nome}" está ATRASADO! (Prazo: ${entrega.toLocaleDateString('pt-BR')})` });
      } else if (diffDays <= 1) {
        newNotifs.push({ id: ws.id, type: 'warning', message: `Atenção: O projeto "${ws.nome}" vence ${diffDays === 0 ? 'HOJE' : 'AMANHÃ'}!` });
      }
    });
    setNotifications(newNotifs);
  }, [workspaces]);

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

  const handleOpenWorkspaceModal = (e, ws = null) => {
    if (e) e.stopPropagation();
    if (ws) {
      setEditingWorkspace(ws);
      setNewWorkspaceName(ws.nome);
      setNewWorkspaceDesc(ws.descricao || '');
      setNewWorkspaceDeadline(ws.dataEntrega ? ws.dataEntrega.split('T')[0] : '');
    } else {
      setEditingWorkspace(null);
      setNewWorkspaceName('');
      setNewWorkspaceDesc('');
      setNewWorkspaceDeadline('');
    }
    setIsWorkspaceModalOpen(true);
  };

  const handleSaveWorkspace = async (e) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    try {
      const payload = { nome: newWorkspaceName, descricao: newWorkspaceDesc, dataEntrega: newWorkspaceDeadline || null };
      if (editingWorkspace) {
        const res = await api.put(`/workspaces/${editingWorkspace.id}`, payload);
        setWorkspaces(workspaces.map(ws => ws.id === editingWorkspace.id ? res.data : ws));
        toast.success('Projeto atualizado com sucesso!');
      } else {
        const res = await api.post('/workspaces', payload);
        setWorkspaces([...workspaces, res.data]);
        toast.success('Projeto criado com sucesso!');
      }
      setIsWorkspaceModalOpen(false);
    } catch (err) {
      console.error('Erro ao salvar workspace:', err);
      toast.error('Erro ao salvar o projeto.');
    }
  };

  const handleToggleWorkspaceStatus = async (e, ws) => {
    e.stopPropagation();
    try {
      const res = await api.put(`/workspaces/${ws.id}/concluir`);
      setWorkspaces(workspaces.map(w => w.id === ws.id ? res.data : w));
      toast.success(res.data.concluido ? 'Projeto concluído!' : 'Projeto reaberto!');
    } catch (err) {
      console.error('Erro ao concluir projeto:', err);
      toast.error('Erro ao alterar o status do projeto.');
    }
  };

  const handleDeleteWorkspace = async (e, id) => {
    e.stopPropagation(); // Evita que o clique entre no workspace
    try {
      await api.delete(`/workspaces/${id}`);
      setWorkspaces(workspaces.filter(ws => ws.id !== id));
      if (currentWorkspace?.id === id) setCurrentWorkspace(null);
      toast.success('Projeto excluído com sucesso!');
    } catch (err) {
      console.error('Erro ao deletar workspace:', err);
      toast.error('Erro ao excluir o projeto.');
    }
  };

  const handleOpenInviteModal = (e, ws) => {
    e.stopPropagation();
    setWorkspaceToInvite(ws);
    setInviteEmail('');
    setIsInviteModalOpen(true);
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/workspaces/${workspaceToInvite.id}/convidar`, { email: inviteEmail });
      toast.success('Convite enviado com sucesso!');
      setIsInviteModalOpen(false);
    } catch (err) {
      console.error('Erro ao convidar:', err);
      toast.error(err.response?.data || 'Erro ao enviar convite.');
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
      toast.success('Tarefa adicionada!');

      // Sincroniza a criação da tarefa com o estado do Lobby para a barra de progresso
      setWorkspaces(prev => prev.map(ws => {
        if (ws.id === currentWorkspace.id) {
          return { ...ws, tasks: [...(ws.tasks || []), res.data] };
        }
        return ws;
      }));
    } catch (err) {
      console.error('Erro ao criar tarefa:', err);
      toast.error('Erro ao criar a tarefa.');
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks(tasks.filter(t => t.id !== taskId));
      if (isHistoryOpen) carregarHistorico();
      toast.success('Tarefa excluída!');

      // Sincroniza a exclusão da tarefa com o estado do Lobby
      setWorkspaces(prev => prev.map(ws => {
        if (ws.id === currentWorkspace.id) {
          return { ...ws, tasks: (ws.tasks || []).filter(t => t.id !== taskId) };
        }
        return ws;
      }));
    } catch (err) {
      console.error('Erro ao deletar tarefa:', err);
      toast.error('Erro ao excluir a tarefa.');
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

    // Sincroniza o movimento da tarefa com o estado do Lobby em tempo real
    setWorkspaces(prevWorkspaces => prevWorkspaces.map(ws => {
      if (ws.id === currentWorkspace.id) {
        const updatedTasks = (ws.tasks || []).map(t => t.id === parseInt(taskId) ? { ...t, status: newStatus } : t);
        return { ...ws, tasks: updatedTasks };
      }
      return ws;
    }));

    try {
      // Envia os campos obrigatórios para satisfazer as validações (@Valid) do Backend
      await api.put(`/tasks/${taskId}`, { 
        titulo: taskToUpdate.titulo, 
        descricao: taskToUpdate.descricao || '', 
        status: newStatus 
      });
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
      const token = localStorage.getItem('token');
      const baseURL = api.defaults?.baseURL || 'http://localhost:8080';
      
      // Usando fetch nativo sem o header Content-Type para gerar o boundary automaticamente
      const response = await fetch(`${baseURL}/tasks/${selectedTask.id}/attachments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (!response.ok) throw new Error('Falha no upload do arquivo');

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

  const filteredWorkspaces = workspaces.filter(ws => {
    if (activeTab === 'ativos') return !ws.concluido;
    if (activeTab === 'concluidos') return ws.concluido;
    return true;
  });

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
            <li className={`nav-item ${activeTab === 'ativos' && !currentWorkspace ? 'active' : ''}`} onClick={() => { setActiveTab('ativos'); setCurrentWorkspace(null); }}>
              <LayoutDashboard size={18} />
              <span>Projetos Ativos</span>
            </li>
            <li className={`nav-item ${activeTab === 'concluidos' && !currentWorkspace ? 'active' : ''}`} onClick={() => { setActiveTab('concluidos'); setCurrentWorkspace(null); }}>
              <CheckSquare size={18} />
              <span>Concluídos</span>
            </li>
            <li className={`nav-item ${activeTab === 'notificacoes' && !currentWorkspace ? 'active' : ''}`} onClick={() => { setActiveTab('notificacoes'); setCurrentWorkspace(null); }}>
              <Bell size={18} />
              <span>Notificações</span>
              {notifications.length > 0 && <span className="notif-badge">{notifications.length}</span>}
            </li>
          </ul>
        </div>

        <div className="sidebar-footer">
          <div className="theme-switch-wrapper">
            <Sun size={18} color={!isDarkMode ? "var(--accent)" : "var(--text-muted)"} />
            <label className="theme-switch">
              <input type="checkbox" checked={isDarkMode} onChange={(e) => setIsDarkMode(e.target.checked)} />
              <span className="slider"></span>
            </label>
            <Moon size={18} color={isDarkMode ? "var(--accent)" : "var(--text-muted)"} />
          </div>
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
              <h1>{activeTab === 'ativos' ? 'Projetos Ativos' : activeTab === 'concluidos' ? 'Projetos Concluídos' : 'Notificações'}</h1>
              <p>{activeTab === 'notificacoes' ? 'Seus alertas e prazos próximos.' : 'Gerencie seus espaços de trabalho.'}</p>
            </header>
            
            {activeTab === 'notificacoes' ? (
              <div className="notifications-list">
                {notifications.length === 0 ? <p className="empty-text">Você não possui alertas no momento.</p> : notifications.map((n, i) => (
                  <div key={i} className={`notif-card ${n.type}`}>
                    <Bell size={20} className={n.type === 'danger' ? 'icon-danger' : 'icon-warning'} />
                    <p>{n.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="workspaces-grid">
                {activeTab === 'ativos' && (
                  <div className="workspace-card-large dashed" onClick={(e) => handleOpenWorkspaceModal(e)}>
                    <Plus size={32} />
                    <h3>Criar Novo Projeto</h3>
                  </div>
                )}
                {filteredWorkspaces.map(ws => {
                  // Cálculo Inteligente de Progresso da UI
                  const tasksList = ws.tasks || [];
                  const totalTasks = tasksList.length;
                  const completedTasks = tasksList.filter(t => t.status === 'CONCLUIDA').length;
                  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

                  return (
                    <div key={ws.id} className={`workspace-card-large ${ws.concluido ? 'concluido' : ''}`} onClick={() => setCurrentWorkspace(ws)}>
                      <div className="ws-card-content">
                        <Folder className="ws-icon" size={24} />
                        <h3>{ws.nome}</h3>
                        <p className="ws-desc">{ws.descricao || 'Nenhuma descrição adicionada.'}</p>
                        <div className="ws-dates">
                          <span><Calendar size={14}/> Criado em: {ws.dataCriacao ? formatarData(ws.dataCriacao) : 'N/D'}</span>
                          <span><Target size={14}/> Prazo: {ws.dataEntrega ? formatarData(ws.dataEntrega) : 'Sem prazo'}</span>
                        </div>
                        {/* Nova Barra de Progresso Visual */}
                        <div className="ws-progress-section">
                          <div className="progress-info">
                            <span>Progresso das Tarefas</span>
                            <span>{completedTasks}/{totalTasks} ({progress}%)</span>
                          </div>
                          <div className="progress-bar-bg">
                            <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                          </div>
                        </div>
                      </div>
                      <div className="ws-actions-bar">
                        <button className="action-btn" onClick={(e) => handleToggleWorkspaceStatus(e, ws)} title={ws.concluido ? "Reabrir Projeto" : "Concluir Projeto"}>
                          {ws.concluido ? <RotateCcw size={16} /> : <CheckSquare size={16} />}
                        </button>
                        <button className="action-btn" onClick={(e) => handleOpenWorkspaceModal(e, ws)} title="Editar Projeto"><Edit size={16} /></button>
                        <button className="action-btn" onClick={(e) => handleOpenInviteModal(e, ws)} title="Convidar Membro"><UserPlus size={16} /></button>
                        <button className="action-btn danger" onClick={(e) => handleDeleteWorkspace(e, ws.id)} title="Excluir Projeto"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
                <button type="submit">Adicionar</button>
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
              <h3>{editingWorkspace ? 'Editar Projeto' : 'Criar Novo Projeto'}</h3>
              <button className="close-btn" onClick={() => setIsWorkspaceModalOpen(false)}><X size={20}/></button>
            </header>
            <div className="modal-body p-24">
              <form onSubmit={handleSaveWorkspace} className="standard-form">
                <input type="text" placeholder="Nome do Projeto (Ex: Sprint Q3)" value={newWorkspaceName} onChange={e => setNewWorkspaceName(e.target.value)} required />
                <textarea placeholder="Descrição (Opcional)" value={newWorkspaceDesc} onChange={e => setNewWorkspaceDesc(e.target.value)} rows={3}></textarea>
                <label className="input-label"><Calendar size={14}/> Data de Entrega (Opcional):</label>
                <input type="date" value={newWorkspaceDeadline} onChange={e => setNewWorkspaceDeadline(e.target.value)} />
                <button type="submit" disabled={!newWorkspaceName.trim()}>Salvar Projeto</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONVIDAR USUÁRIO */}
      {isInviteModalOpen && (
        <div className="modal-overlay" onClick={() => setIsInviteModalOpen(false)}>
          <div className="modal-content small-modal" onClick={e => e.stopPropagation()}>
            <header className="modal-header">
              <h3>Convidar Membro</h3>
              <button className="close-btn" onClick={() => setIsInviteModalOpen(false)}><X size={20}/></button>
            </header>
            <div className="modal-body p-24">
              <form onSubmit={handleSendInvite} className="standard-form">
                <input type="email" placeholder="E-mail do usuário" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required />
                <button type="submit" disabled={!inviteEmail.trim()}>Enviar Convite</button>
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
    <>
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
      {/* Injeta o provedor global de Toasts com uma UX clean e moderna */}
      <Toaster position="bottom-right" toastOptions={{ duration: 4000, style: { background: 'var(--bg-panel)', color: 'var(--text-main)', border: '1px solid var(--border-color)' } }} />
    </>
  );
}

export default App;