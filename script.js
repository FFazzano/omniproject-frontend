const API_URL = 'https://omniproject-api.onrender.com';

const DOM = {
    loginCard: () => document.getElementById('login-card'),
    registerCard: () => document.getElementById('register-card'),
    loginEmail: () => document.getElementById('login-email'),
    loginPassword: () => document.getElementById('login-password'),
    registerNome: () => document.getElementById('register-nome'),
    registerEmail: () => document.getElementById('register-email'),
    registerPassword: () => document.getElementById('register-password'),
    registerConfirm: () => document.getElementById('register-confirm')
};

const Icones = {
    VISIVEL: '👁️',
    OCULTO: '🙈'
};

function alternarTelas() {
    DOM.loginCard()?.classList.toggle('hidden');
    DOM.registerCard()?.classList.toggle('hidden');
}

function togglePassword(inputId, iconElement) {
    const input = document.getElementById(inputId);
    if (!input) return;

    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    iconElement.innerText = isPassword ? Icones.OCULTO : Icones.VISIVEL;
}

function validarCredenciais(email, password) {
    if (!email?.trim() || !password?.trim()) {
        alert('Por favor, preencha e-mail e senha!');
        return false;
    }
    return true;
}

async function fazerLogin() {
    const email = DOM.loginEmail()?.value;
    const password = DOM.loginPassword()?.value;

    if (!validarCredenciais(email, password)) return;

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha: password })
        });

        if (!response.ok) {
            alert('E-mail ou senha incorretos.');
            return;
        }

        const data = await response.json();
        localStorage.setItem('token', data.token);
        window.location.href = 'dashboard.html';
    } catch (error) {
        console.error('Erro na requisição:', error);
        alert('Erro ao conectar com o servidor.');
    }
}

function validarCadastro(nome, email, password, confirmPassword) {
    if (password !== confirmPassword) {
        alert('As senhas não coincidem! Verifique e tente novamente.');
        return false;
    }

    if (!nome?.trim() || !email?.trim() || !password?.trim()) {
        alert('Preencha todos os campos!');
        return false;
    }

    return true;
}

function limparCamposCadastro() {
    DOM.registerNome().value = '';
    DOM.registerEmail().value = '';
    DOM.registerPassword().value = '';
    DOM.registerConfirm().value = '';
}

async function fazerCadastro() {
    const nome = DOM.registerNome()?.value;
    const email = DOM.registerEmail()?.value;
    const password = DOM.registerPassword()?.value;
    const confirmPassword = DOM.registerConfirm()?.value;

    if (!validarCadastro(nome, email, password, confirmPassword)) return;

    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, email, senha: password })
        });

        if (!response.ok) {
            alert('Erro ao criar conta. O e-mail já existe ou a senha é muito fraca.');
            return;
        }

        alert('Conta criada com sucesso! Faça login para entrar.');
        alternarTelas();
        DOM.loginEmail().value = email;
        limparCamposCadastro();
    } catch (error) {
        console.error('Erro na requisição:', error);
        alert('Erro ao conectar com o servidor.');
    }
}

function configurarTeclaEnter(inputId, callback) {
    const input = document.getElementById(inputId);
    input?.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') callback();
    });
}

document.addEventListener('DOMContentLoaded', () => {
    configurarTeclaEnter('login-password', fazerLogin);
    configurarTeclaEnter('register-confirm', fazerCadastro);
});
