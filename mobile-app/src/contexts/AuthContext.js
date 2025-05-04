import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../utils/api';
import { Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

// Context oluşturma
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const [serverStatus, setServerStatus] = useState('unknown'); // 'online', 'offline', 'unknown'

  // Ağ bağlantısını izle
  useEffect(() => {
    const checkServerConnection = async () => {
      try {
        const result = await api.checkConnection();
        setServerStatus(result.success ? 'online' : 'offline');
        setIsOffline(!result.success);
        if (!result.success) {
          console.warn('Sunucu bağlantısı kurulamadı:', result.message);
        }
      } catch (error) {
        console.error('Sunucu bağlantı kontrolü sırasında hata:', error);
        setServerStatus('offline');
        setIsOffline(true);
      }
    };
    
    // Uygulama başlatıldığında sunucu bağlantı durumunu kontrol et
    checkServerConnection();
    
    // 60 saniyede bir bağlantı durumunu otomatik kontrol et
    const connectionCheckInterval = setInterval(() => {
      checkServerConnection();
    }, 60000);
    
    return () => clearInterval(connectionCheckInterval);
  }, []);

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
            const { success, data, message } = await api.auth.getUserProfile();
            
            if (success && data && data.user) {
              // AsyncStorage'a kaydetmeden önce user verisi içeriğini kontrol et
              if (data.user && typeof data.user === 'object') {
                // Null değerleri kaldır
                const safeUserData = Object.fromEntries(
                  Object.entries(data.user).filter(([_, value]) => value !== null && value !== undefined)
                );
                
                console.log('Güncellenmiş kullanıcı verileri:', safeUserData);
                
                // AsyncStorage'a kaydet
                await AsyncStorage.setItem('user', JSON.stringify(safeUserData));
                setUser(safeUserData);
              } else {
                console.warn('API yanıtında geçerli bir user nesnesi yok:', data);
              }
            } else {
              console.warn('Kullanıcı profili güncellenemedi:', message);
              // Sunucu offline durumunda mevcut kullanıcı bilgilerini koruyalım
              if (!isOffline) {
                console.warn('Sunucu yanıt verdiği halde profil güncellenemedi');
              }
            }
          } catch (profileError) {
            console.error('Profil alma hatası:', profileError);
            
            // Token geçersiz veya süresi dolmuş, kullanıcıyı çıkış yaptır
            if (profileError.response && profileError.response.status === 401) {
              await AsyncStorage.removeItem('token');
              await AsyncStorage.removeItem('user');
              setUser(null);
            } 
            // Sunucu bağlantı hatası - mevcut kullanıcı verileriyle devam et
            else if (profileError.message && 
                    (profileError.message.includes('timeout') || 
                     profileError.message === 'Network Error')) {
              console.warn('Bağlantı problemi nedeniyle profil güncellenemedi');
              setIsOffline(true);
              // Mevcut kullanıcı bilgilerini koruyalım, çıkış yapma
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
  }, [isOffline]);

  // Ağ bağlantısını tekrar kontrol et
  const checkConnection = async () => {
    try {
      setLoading(true);
      const result = await api.checkConnection();
      setServerStatus(result.success ? 'online' : 'offline');
      setIsOffline(!result.success);
      
      if (!result.success) {
        Alert.alert(
          'Bağlantı Problemi',
          'Sunucuya bağlanılamıyor. Lütfen internet bağlantınızı kontrol edin.'
        );
      } else {
        // Bağlantı başarılı, kullanıcı bilgilerini güncelle
        if (user) {
          try {
            const { success, data } = await api.auth.getUserProfile();
            if (success && data && data.user) {
              await AsyncStorage.setItem('user', JSON.stringify(data.user));
              setUser(data.user);
              console.log('Kullanıcı profili güncellendi:', data.user);
            }
          } catch (error) {
            console.warn('Bağlantı kuruldu ancak profil güncellenemedi:', error);
          }
        }
      }
      
      return result.success;
    } catch (error) {
      console.error('Bağlantı kontrolü sırasında hata:', error);
      setServerStatus('offline');
      setIsOffline(true);
      return false;
    } finally {
      setLoading(false);
    }
  };

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
        
        // Null/undefined değer kontrolü
        const safeUserInfo = Object.fromEntries(
          Object.entries(userInfo).filter(([_, value]) => value !== null && value !== undefined)
        );
        
        // Kullanıcı bilgilerini kaydet
        await AsyncStorage.setItem('user', JSON.stringify(safeUserInfo));
        
        // Kullanıcı bilgilerini state'e kaydet
        setUser(safeUserInfo);
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
        
        // Null/undefined değer kontrolü
        const safeUserInfo = Object.fromEntries(
          Object.entries(userInfo).filter(([_, value]) => value !== null && value !== undefined)
        );
        
        // Kullanıcı bilgilerini kaydet
        await AsyncStorage.setItem('user', JSON.stringify(safeUserInfo));
        
        // Kullanıcı bilgilerini state'e kaydet
        setUser(safeUserInfo);
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
      console.log('Profil güncelleme isteği gönderiliyor:', userData);
      
      // API ile kullanıcı bilgilerini güncelle
      const response = await api.auth.updateProfile(userData);
      
      // API yanıtından güncellenmiş kullanıcı bilgilerini al
      if (!response || !response.data) {
        console.error('API yanıtında veri bulunamadı');
        throw new Error('API yanıtı geçersiz');
      }
      
      console.log('API yanıtı:', response.data);
      
      // Kullanıcı verisinin formatını kontrol et
      let updatedUser = response.data.data || response.data;
      
      if (!updatedUser) {
        console.error('Güncellenmiş kullanıcı verisi bulunamadı');
        throw new Error('Kullanıcı verisi bulunamadı');
      }
      
      console.log('Güncellenecek kullanıcı verileri:', updatedUser);
      console.log('Mevcut kullanıcı verileri:', user);
      
      // Mevcut kullanıcı verisiyle birleştir
      updatedUser = {
        ...user,
        ...updatedUser,
        // Alanların undefined olmamasını sağla
        name: updatedUser.name || user?.name || '',
        email: updatedUser.email || user?.email || '',
        phone: updatedUser.phone || user?.phone || '',
        city: updatedUser.city || user?.city || '',
        address: updatedUser.address || user?.address || '',
        district: updatedUser.district || user?.district || ''
      };
      
      console.log('Birleştirilmiş kullanıcı verisi:', updatedUser);
      
      // Güncellenmiş kullanıcı bilgilerini AsyncStorage'a kaydet
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Kullanıcı bilgilerini state'e kaydet
      setUser(updatedUser);
      console.log('Context state kullanıcı verisi güncellendi:', updatedUser);
      
      // Profil verilerini güncellemek için API çağrısı yap
      try {
        const refreshedProfile = await api.auth.getUserProfile();
        if (refreshedProfile && refreshedProfile.data && refreshedProfile.data.user) {
          const freshUserData = refreshedProfile.data.user;
          console.log('Yenilenen profil bilgileri:', freshUserData);
          
          // Null/undefined değerleri kaldır
          if (freshUserData && typeof freshUserData === 'object') {
            const safeFreshUserData = Object.fromEntries(
              Object.entries(freshUserData).filter(([_, value]) => value !== null && value !== undefined)
            );
          
          // En güncel kullanıcı bilgilerini kaydet
            await AsyncStorage.setItem('user', JSON.stringify(safeFreshUserData));
            setUser(safeFreshUserData);
            console.log('Yenilenen kullanıcı verileri state\'e kaydedildi:', safeFreshUserData);
          }
        }
      } catch (refreshError) {
        console.warn('Profil bilgileri yenilenirken hata oluştu:', refreshError);
        // Bu hata kritik değil, güncelleme başarılı oldu sayalım
      }
      
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

  // Provider component - Context değerlerini sağlar
  return (
    <AuthContext.Provider
      value={{
    user,
    loading,
    error,
        isOffline,
        serverStatus,
    login,
        loginWithDemo,
    register,
    logout,
        updateUser,
        checkConnection, // Yeni eklenen bağlantı kontrol fonksiyonu
        clearError: () => setError(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 