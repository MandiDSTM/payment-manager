import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE
  || (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api');

export const fileUrl = (relativePath) => {
  if (!relativePath) return '';
  const origin = import.meta.env.VITE_FILE_ORIGIN
    ?? (import.meta.env.DEV ? 'http://localhost:5000' : '');
  const normalized = String(relativePath).replace(/^\/+/, '');
  return `${origin}/${normalized}`;
};

export const ROLES = {
  admin: { value: 'admin', label: 'مدیر' },
  accountant: { value: 'accountant', label: 'حسابدار' },
  viewer: { value: 'viewer', label: 'مشاهده‌گر' },
};

let authToken = localStorage.getItem('authToken') || null;
let currentUser = JSON.parse(localStorage.getItem('authUser') || 'null');

export const getAuthToken = () => authToken;
export const getCurrentUser = () => currentUser;
export const getUserRole = () => currentUser?.role || null;

export const isAdmin = () => currentUser?.role === 'admin';
export const canCreatePayment = () => ['admin', 'accountant'].includes(currentUser?.role);
export const canEditCommercialPayment = () => ['admin', 'accountant'].includes(currentUser?.role);
export const SELECTABLE_PERMIT_STATUSES = ['فرم خام', 'در انتظار پرداخت'];

export const isSelectablePermit = (status) => SELECTABLE_PERMIT_STATUSES.includes(status);

export const setAuth = (token, user) => {
  authToken = token;
  currentUser = user;
  localStorage.setItem('authToken', token);
  localStorage.setItem('authUser', JSON.stringify(user));
};

export const clearAuth = () => {
  authToken = null;
  currentUser = null;
  localStorage.removeItem('authToken');
  localStorage.removeItem('authUser');
};

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      clearAuth();
      window.dispatchEvent(new Event('auth:logout'));
    }
    return Promise.reject(error);
  },
);

export const login = async (username, password) => {
  const res = await api.post('/auth/login', { username, password });
  setAuth(res.data.token, res.data.user);
  return res.data.user;
};

export const fetchMe = async () => {
  const res = await api.get('/auth/me');
  setAuth(authToken, res.data.user);
  return res.data.user;
};

export const logout = () => {
  clearAuth();
};

export default api;
