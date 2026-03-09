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
        iconElement.innerText = '🙈'; 
    } else {
        input.type = 'password';
        iconElement.innerText = '👁️'; 
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
    // Pegando todos os dados da tela (Agora com o Nome!)
    const nome = document.getElementById('register-nome').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm').value;

    // VALIDAÇÃO UX: Senha e Confirmação são iguais?
    if (password !== confirmPassword) {
        alert("As senhas não coincidem! Verifique e tente novamente.");
        return;
    }

    // VALIDAÇÃO UX: Todos os campos estão preenchidos?
    if (!nome || !email || !password) {
        alert("Preencha todos os campos!");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // A MÁGICA: Enviando o 'nome' no corpo da requisição!
            body: JSON.stringify({ nome: nome, email: email, senha: password })
        });

        if (response.ok) {
            alert("Conta criada com sucesso! Faça login para entrar.");
            alternarTelas(); // Volta pra tela de login automaticamente
            
            // Limpa os campos e preenche o e-mail no login
            document.getElementById('login-email').value = email;
            document.getElementById('register-nome').value = '';
            document.getElementById('register-email').value = '';
            document.getElementById('register-password').value = '';
            document.getElementById('register-confirm').value = '';
        } else {
            alert("Erro ao criar conta. O e-mail já existe ou a senha é muito fraca.");
        }
    } catch (error) {
        console.error("Erro na requisição:", error);
        alert("Erro ao conectar com o servidor.");
    }
}

// 5. Acionando pelo botão Enter
document.addEventListener('DOMContentLoaded', () => {
    const inputLoginPassword = document.getElementById('login-password');
    if (inputLoginPassword) {
        inputLoginPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') fazerLogin();
        });
    }
    
    const inputRegisterConfirm = document.getElementById('register-confirm');
    if (inputRegisterConfirm) {
        inputRegisterConfirm.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') fazerCadastro();
        });
    }
});