import React, { useState, useEffect, useCallback } from 'react';
import api from './api/api';
import './App.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [tasks, setTasks] = useState([]);
  
  // Estados do formulário de login temporário
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setTasks([]);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // Exemplo de como será a chamada à sua rota de Auth
      const response = await api.post('/auth/login', { email, senha: password });
      const newToken = response.data.token; 
      
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setError('');
    } catch (err) {
      console.error('Erro ao fazer login:', err);
      setError('Falha no login. Verifique suas credenciais.');
    }
  };

  // Efeito que roda assim que um token é detectado
  useEffect(() => {
    const carregarTarefas = async () => {
      try {
        // Como seu Controller usa DTO, ele já retorna um JSON limpo (TaskResponseDTO)
        // Nota: Usei /tasks/workspace/1 como placeholder, pois seu backend pede o workspaceId na rota
        const response = await api.get('/tasks/workspace/1'); 
        setTasks(response.data);
      } catch (err) {
        console.error('Erro ao buscar tarefas:', err);
        // Caso o token seja rejeitado com 403, forçamos o logout
        if (err.response && err.response.status === 403) handleLogout();
      }
    };

    if (token) {
      carregarTarefas();
    }
  }, [token, handleLogout]);

  // Renderização Condicional: Se não há token, barra na tela de Login
  if (!token) {
    return (
      <div className="app-container" style={{ maxWidth: '400px', margin: '50px auto' }}>
        <h2>Login - OmniProject</h2>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
          <input type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} required style={{ padding: '10px' }} />
          <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} required style={{ padding: '10px' }} />
          <button type="submit" style={{ padding: '10px', background: '#4A90E2', color: 'white', border: 'none', cursor: 'pointer' }}>Entrar</button>
          {error && <p style={{ color: 'red' }}>{error}</p>}
        </form>
      </div>
    );
  }

  // Renderização Condicional: Dashboard autenticado
  return (
    <div className="app-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ccc', paddingBottom: '15px', marginBottom: '20px' }}>
        <h1>Dashboard</h1>
        <button onClick={handleLogout} style={{ padding: '5px 15px', cursor: 'pointer' }}>🚪 Sair</button>
      </header>
      
      <h3>Minhas Tarefas (Teste Base)</h3>
      <ul style={{ marginTop: '15px', listStyle: 'none' }}>
        {tasks.map(task => (
          <li key={task.id} style={{ background: '#fff', padding: '10px', margin: '10px 0', borderRadius: '5px', border: '1px solid #ddd' }}>
            <strong>{task.titulo}</strong> - {task.status}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;