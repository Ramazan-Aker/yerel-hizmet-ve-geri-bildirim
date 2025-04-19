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
    
    getUserProfile: () => client.get('/auth/me'),
    updateProfile: (userData) => client.put('/auth/profile', userData),
    changePassword: (passwordData) => client.put('/auth/updatepassword', passwordData),
  },
  
  // Bildirim işlemleri - reports yerine issues kullanıyoruz
  issues: {
    getAll: async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const response = await client.get('/issues', {
          headers: { Authorization: `Bearer ${token}` }
        });
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
        
        // Validate and format location data if provided
        if (issueData.location) {
          console.log('Processing location data:', JSON.stringify(issueData.location, null, 2));
          
          // Check if coordinates is provided and properly formatted
          if (issueData.location.coordinates) {
            console.log('Raw coordinates:', JSON.stringify(issueData.location.coordinates, null, 2));
            
            // Ensure coordinates is an array in the format [longitude, latitude]
            if (!Array.isArray(issueData.location.coordinates)) {
              console.log('Converting coordinates to array format');
              if (typeof issueData.location.coordinates === 'object') {
                const { longitude, latitude } = issueData.location.coordinates;
                issueData.location.coordinates = [longitude, latitude];
                console.log('Converted coordinates:', JSON.stringify(issueData.location.coordinates, null, 2));
              } else {
                throw new Error('Coordinates must be an array or object with longitude and latitude');
              }
            } else {
              // Make sure we have exactly 2 elements in the coordinates array
              if (issueData.location.coordinates.length !== 2) {
                throw new Error('Coordinates array must contain exactly 2 elements [longitude, latitude]');
              }
              
              // Validate that coordinates are numbers
              if (isNaN(issueData.location.coordinates[0]) || isNaN(issueData.location.coordinates[1])) {
                throw new Error('Coordinates must be valid numbers');
              }
            }
          } else {
            console.log('No coordinates provided in location data');
          }
          
          // Set default type if not provided
          if (!issueData.location.type) {
            console.log('Setting default location type to Point');
            issueData.location.type = 'Point';
          }
          
          // Validate required address fields
          if (!issueData.location.address || !issueData.location.district) {
            console.log('Missing required location fields:', {
              hasAddress: !!issueData.location.address,
              hasDistrict: !!issueData.location.district
            });
            throw new Error('Location must include address and district');
          }
        } else {
          console.log('No location data provided in the issue');
          throw new Error('Location data is required');
        }
        
        const requestData = JSON.stringify(issueData);
        console.log('Final request data:', requestData);
        
        const token = await AsyncStorage.getItem('token');
        const response = await client.post('/issues', issueData, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('Issue created successfully:', response.data);
        return { success: true, data: response.data };
      } catch (error) {
        console.error('Error creating issue:', error);
        console.error('Error details:', error.response?.data || error.message);
        return { 
          success: false, 
          message: error.response?.data?.message || error.message || 'Sorun oluşturulamadı' 
        };
      }
    },
    update: (id, issueData) => client.put(`/issues/${id}`, issueData),
    delete: (id) => client.delete(`/issues/${id}`),
    getMyIssues: () => client.get('/issues/myissues'),
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

export default api; 