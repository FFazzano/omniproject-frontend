import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import api from './api/api';

const Agenda = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [workspaces, setWorkspaces] = useState([]);
  const [tasks, setTasks] = useState([]);

  // Busca todos os projetos e tarefas do usuário
  useEffect(() => {
    const fetchData = async () => {
      try {
        const wsRes = await api.get('/workspaces');
        setWorkspaces(wsRes.data);

        const allTasks = [];
        await Promise.all(
          wsRes.data.map(async (ws) => {
            try {
              const tRes = await api.get(`/tasks/workspace/${ws.id}`);
              allTasks.push(...tRes.data);
            } catch (e) {
              console.error(`Erro ao buscar tarefas do projeto ${ws.id}`, e);
            }
          })
        );
        setTasks(allTasks);
      } catch (error) {
        console.error('Erro ao buscar projetos para a agenda', error);
      }
    };
    fetchData();
  }, []);

  // Controles do Calendário
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay(); // Dia da semana que o mês começa

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);

  return (
    <div className="agenda-wrapper">
      <main className="agenda-main">
        
        {/* Cabeçalho */}
        <div className="agenda-header">
          <div>
            <button onClick={() => navigate('/dashboard')} className="btn-back">
              <ArrowLeft size={16} /> Voltar para Projetos
            </button>
            <h1 className="agenda-title">
              <CalendarIcon size={32} style={{ color: 'var(--accent)' }} />
              Agenda
            </h1>
          </div>
          <div className="agenda-controls">
            <button onClick={prevMonth} className="btn-agenda-nav">
              <ChevronLeft size={20} />
            </button>
            <h2 className="agenda-month">
              {monthNames[month]} {year}
            </h2>
            <button onClick={nextMonth} className="btn-agenda-nav">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Grid do Calendário */}
        <div className="agenda-calendar-container">
          <div className="agenda-weekdays">
            {weekDays.map(day => (
              <div key={day} className="agenda-weekday">{day}</div>
            ))}
          </div>
          <div className="agenda-days-grid">
            {blanks.map(b => (
              <div key={`blank-${b}`} className="agenda-day empty"></div>
            ))}
            {days.map(day => {
              const currentDayString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              
              // Filtra os projetos pela data de entrega correspondente ao dia
              const dayWorkspaces = workspaces.filter(ws => ws.dataEntrega && ws.dataEntrega.startsWith(currentDayString));
              
              // Filtra as tarefas recorrentes pela data de próxima execução correspondente ao dia
              const dayTasks = tasks.filter(t => t.dataProximaExecucao && t.dataProximaExecucao.startsWith(currentDayString));

              return (
                <div key={day} className="agenda-day">
                  <span className="agenda-day-number">{day}</span>
                  
                  {dayWorkspaces.map(ws => (
                    <div key={ws.id} className="agenda-task-badge normal" title={ws.nome}>
                      📁 {ws.nome}
                    </div>
                  ))}
                  
                  {dayTasks.map(task => (
                    <div key={`task-${task.id}`} className="agenda-task-badge recorrente" title={task.titulo}>
                      🔁 {task.titulo}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};
export default Agenda;
