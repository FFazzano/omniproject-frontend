import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Sparkles } from 'lucide-react';
import api from './api/api';

const TrixChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    { id: 1, text: 'Olá! O que vamos criar hoje?', sender: 'trix' }
  ]);
  const messagesEndRef = useRef(null);

  // Função para sempre dar scroll para a última mensagem
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userText = message;
    // Adiciona a mensagem do usuário
    setMessages((prev) => [...prev, { id: Date.now(), text: userText, sender: 'user' }]);
    setMessage('');

    const loadingId = Date.now() + 1;
    // Mostra indicador de pensamento
    setMessages((prev) => [...prev, { id: loadingId, text: 'Pensando... ✨', sender: 'trix' }]);

    try {
      // Faz a requisição para a sua API real passando o token pelo axios configurado
      const response = await api.post('/api/trix', { textoUsuario: userText });
      
      // Remove a mensagem temporária de loading
      setMessages((prev) => prev.filter(msg => msg.id !== loadingId));
      
      const { nomeProjeto, tarefas } = response.data;
      const qtdTarefas = tarefas ? tarefas.length : 0;

      setMessages((prev) => [...prev, { id: Date.now() + 2, text: `Pronto! Criei o projeto "${nomeProjeto}" com ${qtdTarefas} tarefas.\n\nDê um F5 (ou atualize a página) para ver no seu Lobby!`, sender: 'trix' }]);
    } catch (error) {
      console.error('Erro ao chamar a Trix:', error);
      setMessages((prev) => prev.filter(msg => msg.id !== loadingId));
      setMessages((prev) => [...prev, { id: Date.now() + 2, text: 'Ops, tive um problema de conexão com o meu cérebro. Verifique se o Back-end está rodando e tente novamente!', sender: 'trix' }]);
    }
  };

  return (
    <div className="trix-container">
      {/* Janela de Chat (Popover) */}
      {isOpen && (
        <div className="trix-popover">
          
          {/* Cabeçalho */}
          <div className="trix-header">
            <h3><Sparkles size={18} /> Trix AI</h3>
            <button onClick={() => setIsOpen(false)} className="trix-close-btn" title="Fechar chat">
              <X size={20} />
            </button>
          </div>

          {/* Área de Mensagens */}
          <div className="trix-chat-area">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`trix-msg ${msg.sender === 'user' ? 'user' : 'trix'}`}
              >
                {msg.text}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Área de Input */}
          <div className="trix-input-area">
            <form onSubmit={handleSend} className="trix-form">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Digite sua mensagem..."
                className="trix-input"
              />
              <button type="submit" disabled={!message.trim()} className="trix-send-btn">
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Action Button (FAB) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="trix-fab"
        title="Conversar com a Trix"
      >
        {isOpen ? <X size={26} /> : <Bot size={28} />}
      </button>
    </div>
  );
};

export default TrixChat;