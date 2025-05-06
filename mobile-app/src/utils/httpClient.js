import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'http://192.168.1.54:5001/api';

/**
 * Fetch kullanan basit HTTP istemcisi
 */
const httpClient = {
  /**
   * HTTP GET isteği yapar
   * @param {string} endpoint - API endpoint
   * @param {Object} options - İstek seçenekleri
   * @returns {Promise<any>} - API yanıtı
   */
  get: async (endpoint, options = {}) => {
    const url = `${BASE_URL}${endpoint}`;
    const token = await AsyncStorage.getItem('token');
    
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };
    
    try {
      console.log(`GET isteği yapılıyor: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
        ...options
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw { 
          response: { 
            status: response.status,
            data
          } 
        };
      }
      
      return data;
    } catch (error) {
      console.error(`GET hatası (${url}):`, error);
      throw error;
    }
  },
  
  /**
   * HTTP POST isteği yapar
   * @param {string} endpoint - API endpoint
   * @param {any} body - İstek gövdesi
   * @param {Object} options - İstek seçenekleri
   * @returns {Promise<any>} - API yanıtı
   */
  post: async (endpoint, body = {}, options = {}) => {
    const url = `${BASE_URL}${endpoint}`;
    const token = await AsyncStorage.getItem('token');
    
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };
    
    try {
      console.log(`POST isteği yapılıyor: ${url}`);
      console.log('İstek gövdesi:', JSON.stringify(body));
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        ...options
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw { 
          response: { 
            status: response.status,
            data
          } 
        };
      }
      
      return data;
    } catch (error) {
      console.error(`POST hatası (${url}):`, error);
      throw error;
    }
  }
};

export default httpClient; 