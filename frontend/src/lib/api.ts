import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach access token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED' && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = response.data.data;

        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// ============ API Functions ============

// Auth
export const authAPI = {
  register: (data: FormData | object) => api.post('/auth/register', data, {
    headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
  }),
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  refresh: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/me'),
  getPendingUsers: () => api.get('/auth/users/pending'),
  approveUser: (id: string, status: string) => api.patch(`/auth/users/${id}/approve`, { status }),
};

// Notifications
export const notificationAPI = {
  create: (data: object) => api.post('/notifications', data),
  getAll: (params?: object) => api.get('/notifications', { params }),
  getById: (id: string) => api.get(`/notifications/${id}`),
  getPending: () => api.get('/notifications/pending'),
  approve: (id: string, action: string) => api.patch(`/notifications/${id}/approve`, { action }),
};

// Complaints
export const complaintAPI = {
  create: (data: FormData | object) => api.post('/complaints', data, {
    headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
  }),
  getAll: (params?: object) => api.get('/complaints', { params }),
  getById: (id: string) => api.get(`/complaints/${id}`),
  updateStatus: (id: string, data: object) => api.patch(`/complaints/${id}/status`, data),
  addComment: (id: string, comment: string) => api.post(`/complaints/${id}/comments`, { comment }),
};

// Gate Passes
export const gatePassAPI = {
  request: (data: object) => api.post('/gatepass/request', data),
  getAll: (params?: object) => api.get('/gatepass', { params }),
  getById: (id: string) => api.get(`/gatepass/${id}`),
  approve: (id: string, action: string, remarks?: string) =>
    api.patch(`/gatepass/${id}/approve`, { action, remarks }),
  scan: (qrToken: string, scanType: string) =>
    api.post('/gatepass/scan', { qrToken, scanType }),
};

// Resources
export const resourceAPI = {
  getAll: (params?: object) => api.get('/resources', { params }),
  create: (data: object) => api.post('/resources', data),
  book: (data: object) => api.post('/resources/book', data),
  getBookings: (params?: object) => api.get('/resources/bookings', { params }),
  getAvailability: (resourceId: string, date: string) =>
    api.get(`/resources/${resourceId}/availability`, { params: { date } }),
  approveBooking: (id: string, action: string) =>
    api.patch(`/resources/bookings/${id}/approve`, { action }),
};

// Lost & Found
export const lostFoundAPI = {
  create: (data: FormData) => api.post('/lostfound', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getAll: (params?: object) => api.get('/lostfound', { params }),
  getById: (id: string) => api.get(`/lostfound/${id}`),
  resolve: (id: string, matchedItemId?: string) =>
    api.patch(`/lostfound/${id}/resolve`, { matchedItemId }),
};

// Departments
export const departmentAPI = {
  getAll: () => api.get('/departments'),
  create: (data: object) => api.post('/departments', data),
  update: (id: string, data: object) => api.patch(`/departments/${id}`, data),
  getClasses: (id: string) => api.get(`/departments/${id}/classes`),
};

// Analytics
export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getAuditLogs: (params?: object) => api.get('/analytics/audit-logs', { params }),
};
