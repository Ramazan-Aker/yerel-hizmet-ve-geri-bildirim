import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add a request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user && user.token) {
      config.headers.Authorization = `Bearer ${user.token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Authentication services
export const authService = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  getProfile: () => api.get('/auth/me'),
  updatePassword: (passwordData) => api.put('/auth/updatepassword', passwordData)
};

// Issue services
export const issueService = {
  createIssue: (issueData) => api.post('/issues', issueData),
  getIssues: () => api.get('/issues'),
  getIssueById: (id) => api.get(`/issues/${id}`),
  updateIssue: (id, issueData) => api.put(`/issues/${id}`, issueData),
  deleteIssue: (id) => api.delete(`/issues/${id}`)
};

export default api; 