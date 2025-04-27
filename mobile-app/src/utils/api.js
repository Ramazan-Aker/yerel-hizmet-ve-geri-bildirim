import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Android emülatörü için localhost yerine 10.0.2.2 kullanıyoruz
// Web tarayıcısında localhost:5001, Android Emülatörde 10.0.2.2:5001 kullanılır
const isAndroid = Platform.OS === 'android';
const BASE_URL = isAndroid 
  ? 'http://10.0.2.2:5001/api'
  : 'http://localhost:5001/api';

// Axios client instance oluştur
const client = axios.create({
  baseURL: BASE_URL,
  timeout: 10000, // 10 saniye timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// İstek gönderilmeden önce çalışacak interceptor
client.interceptors.request.use(
  async (config) => {
    console.log(`API İsteği: ${config.method.toUpperCase()} ${config.url}`);
    
    // İstek verilerini logla
    if (config.data) {
      console.log('İstek verisi:', config.data);
    }
    
    // Kullanıcı token'ı varsa, header'a ekle
    const userToken = await AsyncStorage.getItem('token');
    if (userToken) {
      config.headers.Authorization = `Bearer ${userToken}`;
    }
    
    return config;
  },
  (error) => {
    console.error('İstek gönderilirken hata oluştu:', error);
    return Promise.reject(error);
  }
);

// Yanıt alındıktan sonra çalışacak interceptor
client.interceptors.response.use(
  (response) => {
    console.log(`API Yanıtı: ${response.status} ${response.config.url}`);
    return response;
  },
  async (error) => {
    // Network hatası kontrolü - Demo modu için önemli
    if (error.message === 'Network Error') {
      console.warn('API sunucusuna bağlanılamadı. Demo verileri kullanılacak.');
      
      // Demo modu için özel hata nesnesi
      const customError = new Error('API bağlantısı kurulamadı');
      customError.isDemoMode = true;
      customError.originalError = error;
      
      return Promise.reject(customError);
    }
    
    // API yanıt hatası
    if (error.response) {
      console.error(`API Hata: ${error.response.status}`, error.response.data);
      
      // 500 hatası için daha detaylı log
      if (error.response.status === 500) {
        console.error('500 SUNUCU HATASI DETAYLARI:');
        console.error('Request URL:', error.config.url);
        console.error('Request Method:', error.config.method);
        console.error('Request Headers:', error.config.headers);
        if (error.config.data) {
          try {
            console.error('Request Data:', JSON.parse(error.config.data));
          } catch (e) {
            console.error('Request Data (raw):', error.config.data);
          }
        }
        console.error('Response:', error.response.data);
      }
      
      // 401 Unauthorized hatası - token süresi dolmuş veya geçersiz
      if (error.response.status === 401) {
        // Token'ı kaldır ve giriş sayfasına yönlendir
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
        // Burada global bir event emitter ile oturum sonlandırma işlemini tetikleyebilirsiniz
      }
    } else if (error.request) {
      // İstek gönderildi ama yanıt alınamadı
      console.error('Sunucudan yanıt alınamadı:', error.request);
    }
    
    return Promise.reject(error);
  }
);

// API endpoints
const api = {
  // Auth işlemleri
  auth: {
    // Login ve register fonksiyonlarını düzenliyoruz
    login: async (data) => {
      console.log('Login isteği gönderiliyor:', data);
      try {
        const response = await client.post('/auth/login', data);
        console.log('Login yanıtı:', response.data);
        return response;
      } catch (error) {
        console.error('Login hatası:', error);
        throw error;
      }
    },
    
    register: async (data) => {
      console.log('Register isteği gönderiliyor:', data);
      try {
        const response = await client.post('/auth/register', data);
        console.log('Register yanıtı:', response.data);
        return response;
      } catch (error) {
        console.error('Register hatası:', error);
        throw error;
      }
    },
    
    getUserProfile: async () => {
      try {
        console.log('Kullanıcı profil bilgileri getiriliyor...');
        const response = await client.get('/auth/me');
        console.log('Kullanıcı profil yanıtı:', response.data);
        return { success: true, data: response.data };
      } catch (error) {
        console.error('Kullanıcı profili getirme hatası:', error);
        return { 
          success: false, 
          message: error.response?.data?.message || 'Kullanıcı bilgileri alınamadı' 
        };
      }
    },
    updateProfile: async (userData) => {
      try {
        console.log('Profile update request:', userData);
        const response = await client.put('/auth/profile', userData);
        console.log('Profile update response:', response.data);
        return response;
      } catch (error) {
        console.error('Profile update error:', error);
        throw error;
      }
    },
    changePassword: (passwordData) => client.put('/auth/updatepassword', passwordData),
  },
  
  // Bildirim işlemleri - reports yerine issues kullanıyoruz
  issues: {
    getAll: async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        
        // Kullanıcının şehri ile ilgili verileri al
        let userCity = null;
        try {
          const userJson = await AsyncStorage.getItem('user');
          if (userJson) {
            const userData = JSON.parse(userJson);
            userCity = userData.city;
          }
        } catch (userError) {
          console.error('Kullanıcı bilgisi alınamadı:', userError);
        }
        
        // API isteği
        const response = await client.get('/issues', {
          headers: { Authorization: `Bearer ${token}` },
          params: userCity ? { city: userCity } : {} // Kullanıcı şehrine göre filtrele
        });
        
        console.log(`API yanıtı: ${response.data.data?.length || 0} sorun bulundu`);
        
        return { success: true, data: response.data };
      } catch (error) {
        console.error('Error fetching issues:', error);
        return { 
          success: false, 
          message: error.response?.data?.message || 'Sorunlar alınamadı' 
        };
      }
    },
    
    getById: async (issueId) => {
      try {
        const token = await AsyncStorage.getItem('token');
        const response = await client.get(`/issues/${issueId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        return { success: true, data: response.data };
      } catch (error) {
        console.error(`Error fetching issue ${issueId}:`, error);
        return { 
          success: false, 
          message: error.response?.data?.message || 'Sorun detayları alınamadı' 
        };
      }
    },
    
    create: async (issueData) => {
      try {
        console.log('Creating issue with data:', JSON.stringify(issueData, null, 2));
        
        // JSON'ı basitleştirerek konsola yazdıralım (debugging için)
        console.log('Issue data details:');
        console.log('- title:', issueData.title);
        console.log('- description:', issueData.description ? issueData.description.substring(0, 20) + '...' : 'empty');
        console.log('- category:', issueData.category);
        console.log('- severity:', issueData.severity);
        console.log('- location.coordinates:', issueData.location?.coordinates);
        console.log('- location.city:', issueData.location?.city);
        console.log('- location.district:', issueData.location?.district);
        console.log('- location.type:', issueData.location?.type);
        console.log('- has images:', issueData.images && issueData.images.length > 0);
        
        // Validate and format location data
        if (issueData.location) {
          // Ensure coordinates is an array if it exists
          if (!Array.isArray(issueData.location.coordinates)) {
            console.warn('Location coordinates is not an array, initializing it');
            issueData.location.coordinates = [];
          }
          
          // If coordinates are empty or invalid, use default coordinates (Istanbul)
          if (issueData.location.coordinates.length !== 2) {
            console.warn('Invalid coordinates format, using default Istanbul coordinates');
            issueData.location.coordinates = [28.9784, 41.0082]; // Istanbul coordinates
          }
          
          // Set default type if not specified
          if (!issueData.location.type) {
            issueData.location.type = 'Point';
          }
        } else {
          // Create a default location object if none provided
          console.warn('No location data provided, creating default');
          issueData.location = {
            address: '',
            district: '',
            city: '',
            type: 'Point',
            coordinates: [28.9784, 41.0082] // Istanbul coordinates
          };
        }
        
        // Ensure images array is properly formatted
        if (issueData.images && issueData.images.length > 0) {
          // Verify all images have the data:image prefix
          issueData.images = issueData.images.filter(img => 
            img && typeof img === 'string' && img.startsWith('data:image')
          );
          
          console.log(`Processing ${issueData.images.length} images for upload`);
        }
        
        const response = await client.post('/issues', issueData);
        console.log('Issue created successfully, response:', response.data);
        return { success: true, data: response.data };
      } catch (error) {
        console.error('Error creating issue:', error);
        return handleApiError(error);
      }
    },
    update: (id, issueData) => client.put(`/issues/${id}`, issueData),
    delete: (id) => client.delete(`/issues/${id}`),
    getMyIssues: async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const response = await client.get('/issues/myissues', {
          headers: { Authorization: `Bearer ${token}` }
        });
        return { success: true, data: response.data.data || response.data };
      } catch (error) {
        console.error('Error fetching my issues:', error);
        return { 
          success: false, 
          message: error.response?.data?.message || 'Sorunlarınız alınamadı' 
        };
      }
    },
    addComment: (issueId, comment) => client.post(`/issues/${issueId}/comments`, comment),
    uploadImage: (issueId, formData) => client.post(`/issues/${issueId}/images`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
    updateStatus: async (issueId, newStatus) => {
      try {
        const token = await AsyncStorage.getItem('token');
        const response = await client.patch(
          `/issues/${issueId}/status`, 
          { status: newStatus },
          { headers: { Authorization: `Bearer ${token}` }}
        );
        return { success: true, data: response.data };
      } catch (error) {
        console.error(`Error updating status for issue ${issueId}:`, error);
        return { 
          success: false, 
          message: error.response?.data?.message || 'Sorun durumu güncellenemedi' 
        };
      }
    }
  },
  
  // Eski reports API'sini issues'a bağlayarak geriye dönük uyumluluk sağlayalım
  reports: {
    getAll: (params) => api.issues.getAll(params),
    getById: (id) => api.issues.getById(id),
    create: (reportData) => api.issues.create(reportData),
    update: (id, reportData) => api.issues.update(id, reportData),
    delete: (id) => api.issues.delete(id),
    addComment: (reportId, comment) => api.issues.addComment(reportId, comment),
    uploadImage: (reportId, formData) => api.issues.uploadImage(reportId, formData),
  },
  
  // Kategori işlemleri
  categories: {
    getAll: () => client.get('/categories'),
  },
  
  // İstatistik işlemleri
  statistics: {
    getReportStats: () => client.get('/statistics/reports'),
    getUserStats: () => client.get('/statistics/users'),
  },
};

// Yardımcı fonksiyonlar
const handleApiError = (error) => {
  console.error('API Error:', error);
  
  if (error.response && error.response.data) {
    return {
      success: false,
      message: error.response.data.message || 'Bir hata oluştu',
      error: error.response.data
    };
  } else if (error.isDemoMode) {
    return {
      success: false,
      message: 'Demo modunda bazı özellikler kısıtlıdır',
      isDemoMode: true
    };
  } else {
    return {
      success: false,
      message: error.message || 'Beklenmeyen bir hata oluştu'
    };
  }
};

export default api; 