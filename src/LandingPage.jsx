import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, ChevronLeft, ChevronRight, ArrowRight, Sun, Moon, Folder, CheckSquare, Shield, Calendar, Check, Github, Linkedin } from 'lucide-react';

const LandingPage = () => {
    
  const [currentImage, setCurrentImage] = useState(0);

  // Aqui você pode colocar o caminho real dos prints do seu sistema.
  // Estou usando placeholders responsivos por enquanto.
  const images = [
    'workspace.png',
    'conclusao.png'
  ];

  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') !== 'light');

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const nextImage = useCallback(() => {
    setCurrentImage((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const prevImage = () => {
    setCurrentImage((prev) => (prev - 1 + images.length) % images.length);
  };

  // Efeito para passar as imagens automaticamente a cada 5 segundos
  useEffect(() => {
    const interval = setInterval(nextImage, 5000);
    return () => clearInterval(interval); // Limpa o intervalo se o componente for desmontado
  }, [nextImage]);

  return (
    <div className="landing-wrapper">
      {/* Header / Navbar */}
      <header className="landing-header">
        <div className="landing-brand">
          <LayoutDashboard className="brand-icon-large" size={28} />
          <h2>OmniSaaS</h2>
        </div>
        
        <nav className="landing-nav">
          <a href="#sobre">Sobre o Sistema</a>
          <a href="#funcionalidades">Funcionalidades</a>
          <a href="#planos">Planos</a>
        </nav>
        
        <div className="landing-actions">
          <div className="theme-switch-wrapper" style={{ marginBottom: 0 }}>
            <Sun size={18} color={!isDarkMode ? "var(--accent)" : "var(--text-muted)"} />
            <label className="theme-switch">
              <input type="checkbox" checked={isDarkMode} onChange={(e) => setIsDarkMode(e.target.checked)} />
              <span className="slider"></span>
            </label>
            <Moon size={18} color={isDarkMode ? "var(--accent)" : "var(--text-muted)"} />
          </div>

          {/* Reaproveitando botões do seu index.css */}
          <Link to="/login" className="btn-secondary" style={{ textDecoration: 'none', padding: '10px 16px' }}>
            Login
          </Link>
          <Link to="/login" state={{ register: true }} className="btn-success-solid" style={{ textDecoration: 'none', padding: '10px 16px' }}>
            Começar Grátis
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="landing-main">
        <section className="hero-section">
          <h1 className="hero-title">Organize seus projetos e decole a produtividade da sua equipe</h1>
          <p className="hero-subtitle">
            O OmniSaaS é a plataforma definitiva para equipes ágeis. Gerencie tarefas através de Kanban, colabore em tempo real e entregue resultados excepcionais dentro do prazo.
          </p>
          <Link to="/login" state={{ register: true }} className="hero-cta">
            Acessar o Sistema <ArrowRight size={20} />
          </Link>
        </section>

        {/* Carousel Section */}
        <section className="carousel-section">
          <div className="carousel-container">
            <button className="carousel-btn left" onClick={prevImage} aria-label="Anterior">
              <ChevronLeft size={28} />
            </button>
            <div className="carousel-track" style={{ transform: `translateX(-${currentImage * 100}%)` }}>
              {images.map((img, index) => (
                <img key={index} src={img} alt={`Funcionalidade ${index + 1}`} className="carousel-image" />
              ))}
            </div>
            <button className="carousel-btn right" onClick={nextImage} aria-label="Próximo">
              <ChevronRight size={28} />
            </button>
          </div>
        </section>

        {/* Tech Banner Section */}
        <section className="tech-banner">
          <p className="tech-banner-title">Arquitetura de ponta construída com</p>
          <div className="tech-logos">
            <span>Java 21</span>
            <span>Spring Boot 3</span>
            <span>React</span>
            <span>Tailwind CSS</span>
            <span>PostgreSQL</span>
            <span>Neon DB</span>
          </div>
        </section>

        {/* Features Section */}
        <section className="features-section" id="funcionalidades">
          <h2 className="about-title">Tudo o que você precisa para entregar mais</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <Folder size={24} />
              </div>
              <h3>Workspaces Isolados</h3>
              <p>Crie múltiplos ambientes de trabalho para separar projetos profissionais, pessoais ou de estudos. Mantenha o foco absoluto no que importa, sem misturar os contextos.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <CheckSquare size={24} />
              </div>
              <h3>Gestão Dinâmica de Tarefas</h3>
              <p>Acompanhe o ciclo de vida de cada entrega com facilidade. Mova tarefas entre os status (A Fazer, Em Andamento, Concluído) e tenha uma visão clara do progresso da sua equipe.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <Shield size={24} />
              </div>
              <h3>Proteção de Nível Empresarial</h3>
              <p>Durma tranquilo sabendo que seus dados estão blindados. O sistema utiliza criptografia de senhas avançada e autenticação rigorosa via tokens JWT, garantindo que apenas você acesse suas informações.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <Moon size={24} />
              </div>
              <h3>Experiência Imersiva (Dark Mode)</h3>
              <p>Uma interface inteligente e responsiva que se adapta ao seu estilo. Alterne perfeitamente entre o modo claro e escuro, reduzindo o cansaço visual durante longas sessões de foco.</p>
            </div>
            
            <div className="feature-card" style={{ borderColor: 'var(--accent)' }}>
              <div className="feature-icon-wrapper">
                <Calendar size={24} />
              </div>
              <h3>Agenda e Recorrência <span className="badge-soon">Em Breve</span></h3>
              <p>Automatize sua rotina. Configure tarefas que se repetem automaticamente e visualize todos os seus prazos em um calendário interativo e integrado.</p>
            </div>
          </div>
        </section>

        {/* Sobre Section */}
        <section className="about-section" id="sobre">
          <h2 className="about-title">Por trás da interface limpa: Engenharia de Software levada a sério.</h2>
          
          <div className="about-content">
            <p>O <strong>Omniproject</strong> não nasceu apenas para ser mais um gerenciador de tarefas visualmente bonito. Ele foi idealizado e arquitetado para ser a prova de que um sistema de alto nível precisa ser resiliente do banco de dados até o clique do usuário. É a união entre a produtividade sem distrações e uma infraestrutura que não te deixa na mão.</p>
            <p>A verdadeira magia acontece por baixo do capô. A arquitetura foi desenhada com um foco obsessivo no Back-end: o coração do sistema bate em <strong>Java 21 com Spring Boot 3</strong>, garantindo segurança de nível empresarial com autenticação Stateless (JWT) e proteção total das rotas. O desafio não era apenas "fazer funcionar", mas criar uma fundação sólida, escalável, com ambientes isolados e coberta por testes automatizados (JUnit/Mockito).</p>
            <p>Todo esse poder de processamento é entregue ao usuário através de uma interface React ultrarrápida, que consome os dados de forma assíncrona e fluida, respeitando o tema (Light/Dark mode) e a experiência de quem usa.</p>
          </div>

          <div className="about-pillars">
            <div className="pillar-card">
              <span className="pillar-icon">🏗️</span>
              <h4>Arquitetura Limpa</h4>
              <p>Código manutenível e regras de negócio isoladas.</p>
            </div>
            <div className="pillar-card">
              <span className="pillar-icon">🔒</span>
              <h4>Segurança by Design</h4>
              <p>Tokens JWT, CORS configurado e senhas criptografadas.</p>
            </div>
            <div className="pillar-card">
              <span className="pillar-icon">⚡</span>
              <h4>Performance</h4>
              <p>Consultas otimizadas no banco relacional em nuvem.</p>
            </div>
            <div className="pillar-card">
              <span className="pillar-icon">🧪</span>
              <h4>Confiabilidade</h4>
              <p>Lógica de negócio validada por testes automatizados.</p>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="pricing-section" id="planos">
          <div className="pricing-header">
            <h2>Escolha o plano ideal</h2>
            <p>Escale a produtividade da sua equipe sem complexidade.</p>
          </div>

          <div className="pricing-grid">
            {/* Card Starter */}
            <div className="pricing-card">
              <h3>Starter</h3>
              <p className="desc">Perfeito para organizar projetos pessoais.</p>
              <div className="pricing-price">Grátis</div>
              <ul className="pricing-features">
                <li><Check size={18} /> 1 Workspace</li>
                <li><Check size={18} /> Tarefas Ilimitadas</li>
                <li><Check size={18} /> Quadro Kanban</li>
              </ul>
              <Link to="/login" state={{ register: true }} className="btn-pricing outline">Começar Agora</Link>
            </div>

            {/* Card Pro */}
            <div className="pricing-card pro">
              <div className="tag">MAIS ESCOLHIDO</div>
              <h3>Pro</h3>
              <p className="desc">O poder total para desenvolvedores e equipes.</p>
              <div className="pricing-price">R$ 29<span>/mês</span></div>
              <ul className="pricing-features">
                <li><Check size={18} /> Workspaces Ilimitados</li>
                <li><Check size={18} /> Agenda Interativa <span style={{fontSize: '11px', color: 'var(--accent)'}}>(Em Breve)</span></li>
                <li><Check size={18} /> Tarefas Recorrentes <span style={{fontSize: '11px', color: 'var(--accent)'}}>(Em Breve)</span></li>
              </ul>
              <Link to="/login" state={{ register: true }} className="btn-pricing solid">Assinar Pro</Link>
            </div>

            {/* Card Enterprise */}
            <div className="pricing-card">
              <h3>Enterprise</h3>
              <p className="desc">Para grandes operações e alta segurança.</p>
              <div className="pricing-price">Sob consulta</div>
              <ul className="pricing-features">
                <li><Check size={18} /> Banco de dados dedicado</li>
                <li><Check size={18} /> Suporte prioritário 24/7</li>
                <li><Check size={18} /> SLA de 99.9%</li>
              </ul>
              <Link to="/login" className="btn-pricing outline">Falar com Vendas</Link>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="final-cta-section">
          <h2>Pronto para assumir o controle?</h2>
          <p>Crie sua conta gratuitamente hoje e descubra como uma engenharia de software bem feita pode acelerar sua rotina.</p>
          <Link to="/login" state={{ register: true }} className="btn-cta-final">
            Acessar o Sistema
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="landing-footer">
        <p>© 2026 Omniproject. Todos os direitos reservados.</p>
        <p>Desenvolvido com ☕ por Felipe.</p>
        <div className="footer-socials">
          {/* Altere os links para os seus perfis reais */}
          <a href="https://www.linkedin.com/in/felipe-fazzano" target="_blank" rel="noopener noreferrer"><Linkedin size={20} /></a>
          <a href="https://github.com/FFazzano" target="_blank" rel="noopener noreferrer"><Github size={20} /></a>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
