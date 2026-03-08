const API_URL = 'http://localhost:8080';

// 1. Função para trocar entre a tela de Login e a tela de Cadastro
function alternarTelas() {
    document.getElementById('login-card').classList.toggle('hidden');
    document.getElementById('register-card').classList.toggle('hidden');
}

// 2. Função para o Olhinho (Mostrar/Esconder Senha)
function togglePassword(inputId, iconElement) {
    const input = document.getElementById(inputId);
    
    if (input.type === 'password') {
        input.type = 'text';
        iconElement.innerText = '🙈'; // Troca pro macaquinho tampando o rosto (ou outro emoji se preferir)
    } else {
        input.type = 'password';
        iconElement.innerText = '👁️'; // Volta pro olho
    }
}

// 3. Função para Fazer Login (Botão Entrar)
async function fazerLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        alert("Por favor, preencha e-mail e senha!");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, senha: password })
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('token', data.token); // Salva a chave de acesso
            window.location.href = 'dashboard.html';   // Redireciona para o painel!
        } else {
            alert("E-mail ou senha incorretos.");
        }
    } catch (error) {
        console.error("Erro na requisição:", error);
        alert("Erro ao conectar com o servidor.");
    }
}

// 4. Função para Fazer Cadastro (Botão Cadastrar)
async function fazerCadastro() {
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm').value;

    // VALIDAÇÃO UX: Senha e Confirmação são iguais?
    if (password !== confirmPassword) {
        alert("As senhas não coincidem! Verifique e tente novamente.");
        return;
    }

    if (!email || !password) {
        alert("Preencha todos os campos!");
        return;
    }

    try {
        // *Amanhã no Java precisamos garantir que essa URL seja a correta para cadastro*
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, senha: password })
        });

        if (response.ok) {
            alert("Conta criada com sucesso! Faça login para entrar.");
            alternarTelas(); // Volta pra tela de login automaticamente
            
            // Já preenche o e-mail pro usuário não ter que digitar de novo (Toque de Mestre UX)
            document.getElementById('login-email').value = email;
            document.getElementById('register-password').value = '';
            document.getElementById('register-confirm').value = '';
        } else {
            alert("Erro ao criar conta. Esse e-mail já existe?");
        }
    } catch (error) {
        console.error("Erro na requisição:", error);
        alert("Erro ao conectar com o servidor.");
    }
}

// 5. Acionando pelo botão Enter (Para ficar profissa)
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('login-password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') fazerLogin();
    });
    
    document.getElementById('register-confirm').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') fazerCadastro();
    });
});