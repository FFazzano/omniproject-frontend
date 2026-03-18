import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
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
      const token = response.data.token;
      console.log('Token recebido:', token);
      localStorage.setItem('token', token);
      navigate('/dashboard'); // Redireciona para o dashboard após o sucesso
    } catch (err) {
      console.error('Erro ao fazer login:', err);
      alert('Usuário ou senha incorretos');
      setError('Não foi possível realizar o login.');
    }
  };

  return (
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
  );
};

// --- COMPONENTE DO DASHBOARD ---
const Dashboard = () => {
  const [tasks, setTasks] = useState([]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    // Recarrega a página forçando a limpeza do estado de memória e redirecionando
    window.location.href = '/login';
  }, []);

  useEffect(() => {
    const carregarTarefas = async () => {
      try {
        // Usando a rota que retorna a lista baseada no workspace (ajuste o ID caso precise)
        const response = await api.get('/tasks/workspace/1');
        setTasks(response.data);
      } catch (err) {
        console.error('Erro ao buscar tarefas:', err);
        if (err.response && err.response.status === 403) {
          handleLogout();
        }
      }
    };
    carregarTarefas();
  }, [handleLogout]);

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Dashboard</h1>
        <button onClick={handleLogout} className="logout-button">🚪 Sair</button>
      </header>
      
      <h3>Minhas Tarefas</h3>
      <ul className="task-list">
        {tasks.map(task => (
          <li key={task.id} className="task-item">
            <strong>{task.titulo}</strong> - <span className="task-status">{task.status}</span>
          </li>
        ))}
      </ul>
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