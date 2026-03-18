import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Mail, Lock, LayoutDashboard, Folder, Plus, Trash2, CheckCircle, Circle, LogOut } from 'lucide-react';
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

        if (workspacesData.length > 0) {
          setCurrentWorkspace(workspacesData[0]);
        }
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
      const res = await api.post('/workspaces', { nome: newWorkspaceName, descricao: '' });
      setWorkspaces([...workspaces, res.data]);
      setCurrentWorkspace(res.data);
      setNewWorkspaceName('');
    } catch (err) {
      console.error('Erro ao criar workspace:', err);
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

  const handleToggleTaskStatus = async (task) => {
    const novoStatus = task.status === 'CONCLUIDA' ? 'PENDENTE' : 'CONCLUIDA';
    try {
      const res = await api.put(`/tasks/${task.id}`, { status: novoStatus });
      // Atualiza apenas a task modificada no state
      setTasks(tasks.map(t => (t.id === task.id ? { ...t, status: res.data.status } : t)));
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks(tasks.filter(t => t.id !== taskId));
    } catch (err) {
      console.error('Erro ao deletar tarefa:', err);
    }
  };

  return (
    <div className="app-layout">
      {/* SIDEBAR - MENU LATERAL */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <LayoutDashboard className="brand-icon" size={24} />
          <h2>OmniProject</h2>
        </div>

        <div className="workspaces-section">
          <p className="section-title">MEUS WORKSPACES</p>
          <ul className="workspace-list">
            {workspaces.map(ws => (
              <li 
                key={ws.id} 
                className={`workspace-item ${currentWorkspace?.id === ws.id ? 'active' : ''}`}
                onClick={() => setCurrentWorkspace(ws)}
              >
                <Folder size={18} />
                <span>{ws.nome}</span>
              </li>
            ))}
          </ul>

          <form onSubmit={handleCreateWorkspace} className="create-workspace-form">
            <input 
              type="text" 
              placeholder="Novo workspace..." 
              value={newWorkspaceName} 
              onChange={e => setNewWorkspaceName(e.target.value)} 
            />
            <button type="submit" disabled={!newWorkspaceName.trim()}>
              <Plus size={18} />
            </button>
          </form>
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
          <div className="empty-state">
            <h3>Bem-vindo ao OmniProject!</h3>
            <p>Crie ou selecione um Workspace no menu lateral para começar.</p>
          </div>
        ) : (
          <div className="tasks-container">
            <header className="tasks-header">
              <h1>{currentWorkspace.nome}</h1>
              <p className="tasks-subtitle">Gerencie suas tarefas deste projeto.</p>
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

            <div className="tasks-grid">
              {tasks.length === 0 ? (
                <p className="no-tasks-message">Nenhuma tarefa encontrada neste projeto. Crie a primeira acima!</p>
              ) : (
                tasks.map(task => (
                  <div key={task.id} className={`task-card ${task.status === 'CONCLUIDA' ? 'concluida' : ''}`}>
                    <div className="task-content">
                      <button className="status-toggle-btn" onClick={() => handleToggleTaskStatus(task)}>
                        {task.status === 'CONCLUIDA' ? (
                          <CheckCircle className="icon-success" size={24} />
                        ) : (
                          <Circle className="icon-pending" size={24} />
                        )}
                      </button>
                      <div className="task-info">
                        <h4 className={task.status === 'CONCLUIDA' ? 'text-strikethrough' : ''}>{task.titulo}</h4>
                        <span className={`status-badge ${task.status.toLowerCase()}`}>
                          {task.status}
                        </span>
                      </div>
                    </div>
                    <div className="task-actions">
                      <button className="delete-btn" onClick={() => handleDeleteTask(task.id)} title="Excluir Tarefa">
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
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