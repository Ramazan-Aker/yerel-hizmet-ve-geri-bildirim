import React, { createContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

// Auth Context
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Kullanıcı bilgilerini güncel tut
  useEffect(() => {
    // Token varsa kullanıcı bilgilerini kontrol et
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (token) {
          try {
            console.log('Token bulundu, kullanıcı bilgileri alınıyor...');
            // Token varsa sunucudan kullanıcı bilgilerini al
            const userData = await authService.getCurrentUser();
            console.log('Kullanıcı verileri alındı:', userData);
            
            if (userData && userData.data) {
              // Kullanıcı rolünü kontrol et ve logla
              console.log('Kullanıcı rolü:', userData.data.role);
              
              setUser(userData.data);
              setIsAuthenticated(true);
            } else {
              // Token geçersiz veya süresi dolmuş
              console.warn('Token var ama kullanıcı bilgileri alınamadı');
              localStorage.removeItem('token');
              setUser(null);
              setIsAuthenticated(false);
            }
          } catch (err) {
            console.error('Token doğrulama hatası:', err);
            localStorage.removeItem('token');
            setUser(null);
            setIsAuthenticated(false);
          }
        } else {
          console.log('Token bulunamadı, kullanıcı oturumu açık değil');
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (err) {
        setError('Authentication check failed');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Login function - API bağlantılı
  const login = async (userData) => {
    try {
      console.log('Login data received:', userData);
      
      // API'den gelen token'ı sakla
      if (userData && userData.token) {
        localStorage.setItem('token', userData.token);
        
        // Kullanıcı bilgilerini state'e kaydet
        const userInfo = {
          id: userData.id,
          name: userData.name,
          email: userData.email,
          role: userData.role,
          phone: userData.phone,
          district: userData.district
        };
        
        // Kullanıcı rolünü kontrol et ve logla
        console.log('Giriş yapan kullanıcı rolü:', userData.role);
        
        setUser(userInfo);
        setIsAuthenticated(true);
        setError(null);
        
        // Hata mesajını localStorage'dan temizle
        localStorage.removeItem('loginError');
        
        console.log('Kullanıcı başarıyla giriş yaptı:', userData.name);
        return true;
      } else {
        const errorMsg = 'Geçersiz kullanıcı verisi';
        setError(errorMsg);
        // Hata mesajını localStorage'a kaydet
        localStorage.setItem('loginError', errorMsg);
        return false;
      }
    } catch (err) {
      console.error('Login error in context:', err);
      
      // Hata mesajını belirle
      let errorMsg = 'Giriş başarısız';
      
      if (typeof err === 'string') {
        errorMsg = err;
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      setError(errorMsg);
      
      // Hata mesajını localStorage'a kaydet
      localStorage.setItem('loginError', errorMsg);
      
      return false;
    }
  };

  // Logout function
  const logout = () => {
    try {
      // Tarayıcı depolama alanındaki token'ı kaldır
      localStorage.removeItem('token');
      
      // Kullanıcı state'ini temizle
      setUser(null);
      setIsAuthenticated(false);
      setError(null);
      
      console.log('Kullanıcı çıkış yaptı');
      
      // Sayfayı yenile
      window.location.href = '/login';
    } catch (err) {
      console.error('Çıkış yapma hatası:', err);
      setError('Çıkış yapılırken bir hata oluştu');
    }
  };

  // Update user data
  const updateUser = (updatedData) => {
    setUser(prevUser => {
      const newUser = {
        ...prevUser,
        ...updatedData
      };
      console.log('Kullanıcı bilgileri güncellendi:', newUser);
      return newUser;
    });
  };

  // Kullanıcı rolü kontrolü
  const isAdmin = () => {
    return user && (user.role === 'admin' || user.role === 'municipal_worker');
  };

  const contextValue = {
    user,
    isAuthenticated,
    loading,
    error,
    login,
    logout,
    updateUser,
    setError,
    isAdmin
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}; 