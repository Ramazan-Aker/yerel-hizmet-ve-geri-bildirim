import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../utils/api';

// Context oluşturma
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Uygulama başlatıldığında kayıtlı kullanıcı bilgilerini kontrol et
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        // AsyncStorage'dan token ve kullanıcı bilgilerini al
        const token = await AsyncStorage.getItem('token');
        const userString = await AsyncStorage.getItem('user');
        
        if (token && userString) {
          // Geçerli bir oturum var, kullanıcı bilgilerini ayarla
          setUser(JSON.parse(userString));
          
          // İsteğe bağlı olarak, token'ın hala geçerli olduğunu doğrulamak için 
          // API'ye bir istek gönderilebilir. Başarısız olursa, kullanıcıyı çıkış yaptırabilirsiniz.
          try {
            // Kullanıcı profilini al (token doğrulaması için)
            const { data } = await api.auth.getUserProfile();
            // API'den gelen güncel kullanıcı bilgilerini güncelle
            await AsyncStorage.setItem('user', JSON.stringify(data.user));
            setUser(data.user);
          } catch (profileError) {
            // Token geçersiz veya süresi dolmuş, kullanıcıyı çıkış yaptır
            if (profileError.response && profileError.response.status === 401) {
              await AsyncStorage.removeItem('token');
              await AsyncStorage.removeItem('user');
              setUser(null);
            }
          }
        }
      } catch (e) {
        console.error('Kullanıcı bilgisi alınırken hata:', e);
      } finally {
        setLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  // Giriş yapma fonksiyonu
  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Giriş isteği gönderiliyor:', { email, password });
      
      // API ile giriş yap - Doğru JSON nesne formatı kullanarak
      const loginData = {
        email: email,
        password: password
      };
      
      // API request
      const response = await api.auth.login(loginData);
      console.log('Giriş yanıtı:', response.data);
      
      const { data } = response;
      
      if (data && data.success) {
        // Token ve kullanıcı bilgilerini kaydet
        const userData = data.data;
        const token = userData.token;
        
        // Token ve kullanıcı bilgilerini AsyncStorage'a kaydet
        await AsyncStorage.setItem('token', token);
        
        // Token'ı userData'dan çıkar ve user nesnesini oluştur
        const { token: _, ...userInfo } = userData;
        await AsyncStorage.setItem('user', JSON.stringify(userInfo));
        
        // Kullanıcı bilgilerini state'e kaydet
        setUser(userInfo);
        return true;
      } else {
        setError(data?.message || 'Giriş başarısız');
        return false;
      }
    } catch (e) {
      console.error('Giriş yaparken hata:', e);
      
      // API'den dönen hata mesajını kullan
      if (e.response && e.response.data && e.response.data.message) {
        setError(e.response.data.message);
      } else {
        setError('Giriş yapılırken bir hata oluştu');
      }
      
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Kayıt olma fonksiyonu
  const register = async (name, email, password, city, district) => {
    setLoading(true);
    setError(null);
    
    try {
      // Doğru formatla kayıt verileri oluştur
      const registerData = {
        name: name, 
        email: email, 
        password: password,
        city: city,
        district: district
      };
      
      // API ile kayıt ol
      const response = await api.auth.register(registerData);
      
      const { data } = response;
      
      if (data && data.success) {
        // Token ve kullanıcı bilgilerini kaydet
        const userData = data.data;
        const token = userData.token;
        
        // Token ve kullanıcı bilgilerini AsyncStorage'a kaydet
        await AsyncStorage.setItem('token', token);
        
        // Token'ı userData'dan çıkar ve user nesnesini oluştur
        const { token: _, ...userInfo } = userData;
        await AsyncStorage.setItem('user', JSON.stringify(userInfo));
        
        // Kullanıcı bilgilerini state'e kaydet
        setUser(userInfo);
        return true;
      } else {
        setError(data?.message || 'Kayıt başarısız');
        return false;
      }
    } catch (e) {
      console.error('Kayıt olurken hata:', e);
      
      // API'den dönen hata mesajını kullan
      if (e.response && e.response.data && e.response.data.message) {
        setError(e.response.data.message);
      } else {
        setError('Kayıt olurken bir hata oluştu');
      }
      
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Çıkış yapma fonksiyonu
  const logout = async () => {
    setLoading(true);
    
    try {
      // Token ve kullanıcı bilgilerini AsyncStorage'dan sil
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      setUser(null);
    } catch (e) {
      console.error('Çıkış yaparken hata:', e);
    } finally {
      setLoading(false);
    }
  };

  // Kullanıcı bilgilerini güncelleme
  const updateUser = async (userData) => {
    try {
      // API ile kullanıcı bilgilerini güncelle
      const response = await api.auth.updateUserProfile(userData);
      const { user: updatedUser } = response.data;
      
      // Güncellenmiş kullanıcı bilgilerini AsyncStorage'a kaydet
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Kullanıcı bilgilerini state'e kaydet
      setUser(updatedUser);
      return true;
    } catch (e) {
      console.error('Kullanıcı güncellenirken hata:', e);
      
      // API'den dönen hata mesajını kullan
      if (e.response && e.response.data && e.response.data.message) {
        setError(e.response.data.message);
      } else {
        setError('Kullanıcı güncellenirken bir hata oluştu');
      }
      
      return false;
    }
  };

  // Demo kullanıcısı ile giriş yapma (API olmadığında test için)
  const loginWithDemo = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Demo kullanıcısı
      const demoUser = {
        id: '1',
        name: 'Demo Kullanıcı',
        email: 'demo@example.com',
        phone: '555-123-4567',
        address: 'Örnek Mahallesi, Örnek Sokak No:1, Örnek Şehir',
        profileImage: null,
        notifications: true,
        role: 'user',
        createdAt: new Date().toISOString()
      };
      
      // Demo token
      const demoToken = 'demo-token';
      
      // Token ve kullanıcı bilgilerini AsyncStorage'a kaydet
      await AsyncStorage.setItem('token', demoToken);
      await AsyncStorage.setItem('user', JSON.stringify(demoUser));
      
      // Kullanıcı bilgilerini state'e kaydet
      setUser(demoUser);
      return true;
    } catch (e) {
      console.error('Demo giriş yaparken hata:', e);
      setError('Demo giriş yapılırken bir hata oluştu');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Context değerleri
  const authContext = {
    user,
    loading,
    error,
    setError,
    login,
    loginWithDemo,  // Demo kullanıcısı ile giriş yapma
    register,
    logout,
    updateUser
  };

  return (
    <AuthContext.Provider value={authContext}>
      {children}
    </AuthContext.Provider>
  );
}; 