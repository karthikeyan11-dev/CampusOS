import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
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
        // Enforce safe header setting for Axios 1.x compatibility
        config.headers.set('Authorization', `Bearer ${token}`);
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

    // Standardized check for error_code as returned by backend authMiddleware
    const errorCode = error.response?.data?.error_code || error.response?.data?.code;

    if (error.response?.status === 401 && !originalRequest._retry) {
      // Branch A: Primary Token Expired -> Attempt Refresh
      if (errorCode === 'TOKEN_EXPIRED') {
        originalRequest._retry = true;
        try {
          console.log('[AUTH] Syncing identity: Token expired. Attempting refresh...');
          const refreshToken = localStorage.getItem('refreshToken');
          if (!refreshToken) throw new Error('No refresh token');

          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
          const { accessToken, refreshToken: newRefreshToken } = response.data.data;

          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);
          document.cookie = `campusos_token=${accessToken}; path=/; max-age=86400; SameSite=Lax`;

          // Retry with hardened header setter
          if (originalRequest.headers.set) {
            originalRequest.headers.set('Authorization', `Bearer ${accessToken}`);
          } else {
            originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
          }
          return api(originalRequest);
        } catch (refreshError) {
          console.warn('[AUTH] Session sync failed. Cleaning up identity shards.');
          handleLogout();
          return Promise.reject(refreshError);
        }
      }

      // Branch B: Generic Unauthorized or Refresh Failure -> Logout
      if (errorCode === 'UNAUTHORIZED' || errorCode === 'INVALID_TOKEN' || errorCode === 'USER_NOT_FOUND') {
        handleLogout();
      }
    }

    return Promise.reject(error);
  }
);

const handleLogout = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('campusos-auth-storage');
  document.cookie = 'campusos_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  window.location.href = '/login';
};

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
  getAllUsers: (params?: object) => api.get('/auth/users', { params }),
  getFacultyMapping: () => api.get('/auth/faculty/mapping'),
  approveUser: (id: string, status: string) => api.patch(`/auth/users/${id}/approve`, { status }),
  promote: (id: string, data: { role?: string, designation?: string }) => api.patch(`/auth/users/${id}/promote`, data),
  updateClassAssignment: (data: { className: string, mentorId: string, departmentId: string }) => api.post('/auth/assignments/class', data),
  updateDepartmentAssignment: (data: { departmentId: string, hodId: string }) => api.post('/auth/assignments/department', data),
  updateProfile: (data: { name?: string; phone?: string; fatherName?: string; fatherPhone?: string; motherName?: string; motherPhone?: string }) =>
    api.patch('/auth/me', data),
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
  scan: (qrToken: string) => api.post('/gatepass/scan', { qrToken }, { 
    headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' } 
  }),
  open: (passId: string) => api.post('/gatepass/open', { passId }, {
    headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
  }),
  close: (passId: string) => api.post('/gatepass/close', { passId }, {
    headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
  }),
  // Faculty Specific
  facultyRequest: (data: object) => api.post('/gatepass/faculty', data),
  facultyApprove: (id: string, action: string, remarks?: string) =>
    api.patch(`/gatepass/faculty/${id}/approve`, { action, remarks }),
};

// Resources
export const resourceAPI = {
  getAll: (params?: object) => api.get('/resources', { params }),
  create: (data: object) => api.post('/resources', data),
  update: (id: string, data: object) => api.patch(`/resources/${id}`, data),
  delete: (id: string) => api.delete(`/resources/${id}`),
  book: (data: object) => api.post('/resources/book', data),
  getBookings: (params?: object) => api.get('/resources/bookings', { params }),
  getAvailability: (resourceId: string, date: string) =>
    api.get(`/resources/${resourceId}/availability`, { params: { date } }),
  checkConflicts: (resourceId: string, startTime: string, endTime: string, skipBookingId?: string) =>
    api.get(`/resources/${resourceId}/conflicts`, { params: { startTime, endTime, skipBookingId } }),
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

// Hostel
export const hostelAPI = {
  getAll: () => api.get('/hostels'),
  create: (data: object) => api.post('/hostels', data),
  assignWardens: (id: string, data: { wardenId?: string; deputyWardenId?: string }) =>
    api.patch(`/hostels/${id}/assign`, data),
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

// Governance & Institution Management
export const governanceAPI = {
  // Departments
  getDepartments: () => api.get('/governance/departments'),
  createDepartment: (data: object) => api.post('/governance/departments', data),
  getDepartmentDetails: (id: string) => api.get(`/governance/departments/${id}`),
  updateDepartment: (id: string, data: object) => api.patch(`/governance/departments/${id}`, data),
  deleteDepartment: (id: string) => api.delete(`/governance/departments/${id}`),

  // Hostels
  getHostels: () => api.get('/governance/hostels'),
  createHostel: (data: object) => api.post('/governance/hostels', data),
  getHostelDetails: (id: string) => api.get(`/governance/hostels/${id}`),
  updateHostel: (id: string, data: object) => api.patch(`/governance/hostels/${id}`, data),
  deleteHostel: (id: string) => api.delete(`/governance/hostels/${id}`),

  // Mappings
  getMappingSummary: () => api.get('/governance/mappings/summary'),
  getFacultyForMapping: () => api.get('/governance/mappings/faculty'),
  createHostelMapping: (data: { hostelId: string, wardenId: string, deputyWardenId?: string }) => 
    api.post('/governance/mappings/hostel', data),

  // Lookups (High Performance)
  lookupDepartments: () => api.get('/governance/lookup/departments'),
  lookupHostels: () => api.get('/governance/lookup/hostels'),
};
