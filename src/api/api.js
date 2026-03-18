import axios from 'axios';

// O Vite injeta automaticamente o valor correto dependendo de como você roda o projeto
// npm run dev -> pega do .env.development
// npm run build -> pega do .env.production
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
});

// Interceptor para injetar o token JWT em todas as requisições
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
