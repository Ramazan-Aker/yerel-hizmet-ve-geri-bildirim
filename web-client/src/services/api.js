import axios from 'axios';

// API temel URL'si
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// API istemcisi oluştur
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// İstek interceptor'ı - her istekte token ekle
apiClient.interceptors.request.use(
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

// Yanıt interceptor'ı - hata durumunda
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 hataları (Yetkisiz)
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API servisleri
export const authService = {
  login: async (email, password) => {
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Giriş başarısız';
    }
  },

  register: async (userData) => {
    try {
      const response = await apiClient.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Kayıt başarısız';
    }
  },

  getCurrentUser: async () => {
    try {
      const response = await apiClient.get('/auth/me');
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Kullanıcı bilgileri alınamadı';
    }
  },

  updateProfile: async (userData) => {
    try {
      const response = await apiClient.put('/auth/profile', userData);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Profil güncellenemedi';
    }
  },

  changePassword: async (passwordData) => {
    try {
      const response = await apiClient.put('/auth/updatepassword', passwordData);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Şifre değiştirilemedi';
    }
  }
};

// Issue API servisleri
export const issueService = {
  getAllIssues: async (filters = {}) => {
    try {
      // Şehir için otomatik filtre ekleme kaldırıldı - kullanıcı tercihine bırakıldı
      
      console.log('Sorunlar için API isteği gönderiliyor, filtreler:', filters);
      const response = await apiClient.get('/issues', { params: filters });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Sorunlar alınamadı';
    }
  },

  getIssueById: async (id) => {
    try {
      const response = await apiClient.get(`/issues/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Sorun detayları alınamadı';
    }
  },

  createIssue: async (issueData) => {
    try {
      // Gönderimden önce şehir bilgisinin location içinde olduğundan emin olalım
      if (!issueData.location.city && issueData.city) {
        issueData.location.city = issueData.city;
      }
      
      // Eğer şehir yoksa ve kullanıcı oturum açmışsa, profil bilgisinden alalım
      if (!issueData.location.city && localStorage.getItem('token')) {
        try {
          const userResponse = await apiClient.get('/users/profile');
          if (userResponse.data && userResponse.data.city) {
            issueData.location.city = userResponse.data.city;
            console.log('Şehir bilgisi kullanıcı profilinden alındı:', userResponse.data.city);
          }
        } catch (profileError) {
          console.error('Şehir bilgisi alınamadı:', profileError);
        }
      }
      
      console.log('API\'ye gönderilecek sorun verisi:', issueData);
      
      const response = await apiClient.post('/issues', issueData);
      
      return response.data;
    } catch (error) {
      console.error('API - Issue oluşturma hatası:', error);
      
      // Daha detaylı hata mesajı
      if (error.response) {
        console.error('API - Sunucu yanıtı:', error.response.data);
        throw error.response.data.message || 'Sorun oluşturulamadı: Sunucu hatası';
      } else if (error.request) {
        console.error('API - İstek gönderildi ama yanıt alınamadı');
        throw 'Sunucu yanıt vermiyor, lütfen daha sonra tekrar deneyin';
      } else {
        console.error('API - İstek oluşturulurken hata:', error.message);
        throw error.message || 'Sorun oluşturulamadı: İstek hatası';
      }
    }
  },

  updateIssue: async (id, issueData) => {
    try {
      const response = await apiClient.put(`/issues/${id}`, issueData);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Sorun güncellenemedi';
    }
  },

  getUserIssues: async () => {
    try {
      const response = await apiClient.get('/issues/myissues');
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Kullanıcının sorunları alınamadı';
    }
  },

  upvoteIssue: async (id) => {
    try {
      const response = await apiClient.put(`/issues/${id}/upvote`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Oy verilemedi';
    }
  },

  addComment: async (id, comment) => {
    try {
      const response = await apiClient.post(`/issues/${id}/comments`, { content: comment });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Yorum eklenemedi';
    }
  }
};

// Admin API servisleri
export const adminService = {
  getDashboardStats: async () => {
    try {
      const response = await apiClient.get('/admin/dashboard');
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'İstatistikler alınamadı';
    }
  },

  getAllUsers: async () => {
    try {
      const response = await apiClient.get('/admin/users');
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Kullanıcılar alınamadı';
    }
  },

  updateUserRole: async (userId, role) => {
    try {
      const response = await apiClient.put(`/admin/users/${userId}/role`, { role });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Kullanıcı rolü güncellenemedi';
    }
  }
};

export default apiClient; 