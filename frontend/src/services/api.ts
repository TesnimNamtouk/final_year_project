import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Request interceptor — attach token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('accessToken');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle 401 / token refresh
let isRefreshing = false;
let failedQueue: { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }[] = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post('/api/auth/refresh', {}, { withCredentials: true });
        const newToken: string = data.data.accessToken;
        localStorage.setItem('accessToken', newToken);
        api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ─── Auth ────────────────────────────────────────────────────────────────────

export const authAPI = {
  register: (email: string, password: string, username: string) =>
    api.post('/auth/register', { email, password, username }),

  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  me: () => api.get('/auth/me'),

  logout: () => api.post('/auth/logout'),
};

// ─── Content ─────────────────────────────────────────────────────────────────

export const contentAPI = {
  search: (query: string, type?: string, genre?: string) =>
    api.get('/content/search', { params: { q: query || undefined, type, genre } }),

  detail: (id: string, type?: string, lang?: string) =>
    api.get('/content/detail', { params: { id, type, lang } }),
};

// ─── User Content ─────────────────────────────────────────────────────────────

export interface SaveContentPayload {
  externalId: string;
  title: string;
  type: string;
  description?: string | null;
  year?: number;
  genres?: string[];
  posterUrl?: string | null;
  status?: string;
  rating?: number;
}

export const userContentAPI = {
  save: (content: SaveContentPayload) =>
    api.post('/user-content', content),

  getAll: (type?: string) =>
    api.get('/user-content', { params: type ? { type } : {} }),

  patch: (id: string | number, data: Partial<{ status: string; rating: number }>) =>
    api.patch(`/user-content/${id}`, data),

  delete: (id: string | number) =>
    api.delete(`/user-content/${id}`),
};

// ─── Recommendations ──────────────────────────────────────────────────────────

export const recommendationsAPI = {
  get: () => api.get('/recommendations'),

  feedback: (id: string | number, liked: boolean) =>
    api.post(`/recommendations/${id}/feedback`, { liked }),
};

// ─── Users ───────────────────────────────────────────────────────────────────

export const usersAPI = {
  updateLanguage: (id: string | number, language: string) =>
    api.put(`/users/${id}`, { language }),

  updateProfile: (id: string | number, data: { username?: string; email?: string; phone?: string | null }) =>
    api.patch(`/users/${id}/profile`, data),

  changePassword: (id: string | number, currentPassword: string, newPassword: string) =>
    api.patch(`/users/${id}/password`, { currentPassword, newPassword }),

  uploadAvatar: (id: string | number, file: File) => {
    const form = new FormData();
    form.append('avatar', file);
    return api.post(`/users/${id}/avatar`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  onboarding: (id: string | number, genres: string[], contentIds: string[]) =>
    api.post(`/users/${id}/onboarding`, { genres, contentIds }),

  getPreferences: (id: string | number) =>
    api.get(`/users/${id}/preferences`),

  updatePreferences: (id: string | number, genres: string[]) =>
    api.post(`/users/${id}/onboarding`, { genres, contentIds: [] }),

  getStats: (id: string | number) =>
    api.get(`/users/${id}/stats`),
};

// ─── Logs ─────────────────────────────────────────────────────────────────────

export const logsAPI = {
  get: (params?: { category?: string; limit?: number; offset?: number }) =>
    api.get('/logs', { params }),

  categories: () => api.get('/logs/categories'),
};

export default api;
