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
      // Hata ayıklama için tam gelen veriyi logla
      console.log('createIssue fonksiyonuna gelen orijinal veri:', JSON.stringify(issueData, null, 2));
      
      // Veriyi klonla, asıl veriyi değiştirmemek için
      const processedData = JSON.parse(JSON.stringify(issueData));
      
      // Verinin doğru formatta olduğundan emin olalım
      if (!processedData.location) {
        processedData.location = {};
      }

      // Location bilgilerinin doğruluğunu kontrol et
      if (processedData.location) {
        // Şehir bilgisinin ayarlanması
        if (!processedData.location.city && processedData.city) {
          processedData.location.city = processedData.city;
        }
        
        // Koordinatların doğru formatta olduğunu kontrol et ([longitude, latitude])
        if (processedData.location.coordinates && Array.isArray(processedData.location.coordinates)) {
          // Koordinatlar array ama sayı değil ise sayıya dönüştür
          processedData.location.coordinates = processedData.location.coordinates.map(coord => 
            typeof coord === 'string' ? parseFloat(coord) : coord
          );
          
          console.log('İşlenmiş koordinatlar:', processedData.location.coordinates);
        }
        
        // Konum tipi belirtilmemişse ekle
        if (!processedData.location.type) {
          processedData.location.type = 'Point';
        }
      }
      
      // Fotoğraflar varsa base64 formatında olduğundan emin ol
      if (processedData.images && Array.isArray(processedData.images)) {
        // Base64 formatında olduğundan emin ol
        processedData.images = processedData.images.filter(img => img && (typeof img === 'string'));
        
        // Bazı base64 verileri "data:image/jpeg;base64," ile başlar, bazıları sadece base64 veridir
        // Backend'in ihtiyacına göre uyarla. Gerekirse prefix ekle veya kaldır.
        processedData.images = processedData.images.map(img => {
          if (img.startsWith('data:image')) {
            // Base64 öneki var, bu formatta gönderebiliriz
            return img;
          } else {
            // Öneki yoksa ekle
            return `data:image/jpeg;base64,${img}`;
          }
        });
        
        console.log(`${processedData.images.length} adet fotoğraf gönderilecek`);
      }
      
      console.log('API\'ye gönderilecek işlenmiş veri:', JSON.stringify(processedData, null, 2));
      
      // API isteğini gönder
      const response = await apiClient.post('/issues', processedData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('API yanıtı başarılı:', response.data);
      return response.data;
    } catch (error) {
      console.error('API - Issue oluşturma hatası:', error);
      
      // Hata detaylarını konsola yazdır
      if (error.response) {
        console.error('API - Sunucu yanıtı:', error.response.data);
        console.error('API - Durum kodu:', error.response.status);
        console.error('API - Yanıt başlıkları:', error.response.headers);
        
        // Hata mesajını döndür (varsa)
        if (error.response.data && error.response.data.message) {
          throw error.response.data.message;
        } else {
          throw `Sunucu hatası: ${error.response.status}`;
        }
      } else if (error.request) {
        console.error('API - İstek gönderildi ama yanıt alınamadı:', error.request);
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