import axios from 'axios';

// Criação da instância base apontando para o Render
const api = axios.create({
    baseURL: 'https://omniproject-api.onrender.com',
});

// Interceptor de Requisição: Antes de sair do frontend, ele adiciona o Token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;