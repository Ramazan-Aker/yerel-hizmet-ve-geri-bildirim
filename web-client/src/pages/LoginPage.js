import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/api';
import { toast } from 'react-hot-toast';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(() => {
    // Sayfa yüklendiğinde localStorage'dan hata mesajını al
    const savedError = localStorage.getItem('loginError');
    if (savedError) {
      // Bir kereliğine kullan ve temizle
      localStorage.removeItem('loginError');
      return savedError;
    }
    return '';
  });
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const errorRef = useRef(null);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  // Hata mesajını temizleme işlemini manuel kontrol ediyoruz
  const clearErrors = () => {
    setError('');
    setEmailError('');
    localStorage.removeItem('loginError'); // localStorage'dan da temizle
  };

  // Kullanıcı form alanlarına yazmaya başladığında hata mesajını temizleme
  useEffect(() => {
    if (email || password) {
      clearErrors();
    }
  }, [email, password]);
  
  // Hata mesajı değiştiğinde DOM'a ekleyelim
  useEffect(() => {
    if (error) {
      // Hata mesajı varsa, DOM'da kalıcı bir element olarak gösterelim
      const errorContainer = document.getElementById('login-error-container');
      if (errorContainer) {
        errorContainer.style.display = 'block';
        errorContainer.innerHTML = `
          <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 relative" role="alert">
            <p class="font-medium">${error}</p>
            <button 
              onclick="document.getElementById('login-error-container').style.display='none';" 
              class="absolute top-0 right-0 p-2 text-red-700"
              aria-label="Kapat"
            >
              <span class="text-xl">&times;</span>
            </button>
          </div>
        `;
      }
    }
  }, [error]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Form verilerini kontrol et
      if (!email || !password) {
        const errorMsg = 'Lütfen e-posta ve şifrenizi girin.';
        setError(errorMsg);
        localStorage.setItem('loginError', errorMsg); // Hatayı localStorage'a kaydet
        setLoading(false);
        return;
      }
      
      // Email format kontrolü
      if (!validateEmail(email)) {
        const errorMsg = 'Lütfen geçerli bir e-posta adresi girin.';
        setEmailError(errorMsg);
        localStorage.setItem('loginError', errorMsg); // Hatayı localStorage'a kaydet
        setLoading(false);
        return;
      }
      
      console.log('Giriş denemesi:', email);
      
      // API'den kullanıcı girişi yap
      const response = await authService.login(email, password);
      console.log('Login response:', response);
      
      if (response && response.success) {
        // Context'e kullanıcı bilgisini kaydet
        await login(response.data);
        console.log('Giriş başarılı. Kullanıcı rolü:', response.data.role);
        
        // Başarılı bildirim göster
        toast.success('Giriş başarılı!');
        
        // Kullanıcı rolüne göre yönlendirme yap
        if (response.data.role === 'admin' || response.data.role === 'municipal_worker') {
          console.log('Admin kullanıcısı, yönetim paneline yönlendiriliyor');
          navigate('/admin');
        } else if (response.data.role === 'worker') {
          console.log('Çalışan kullanıcısı, çalışan paneline yönlendiriliyor');
          navigate('/worker');
        } else {
          console.log('Normal kullanıcı, ana sayfaya yönlendiriliyor');
          navigate('/');
        }
      } else {
        // API'den başarısız yanıt geldi, hata mesajını göster
        const errorMsg = response?.message || 'Giriş yapılırken bir hata oluştu.';
        setError(errorMsg);
        localStorage.setItem('loginError', errorMsg); // Hatayı localStorage'a kaydet
        
        // Sayfayı yeniden yükle - bu hata mesajının görünmesini sağlar
        if (!error) {
          window.location.reload();
        }
        
        // Toast ile de hata mesajını göster
        toast.error(errorMsg, {
          duration: 5000 // 5 saniye göster
        });
      }
    } catch (err) {
      console.error('Giriş hatası:', err);
      
      let errorMessage = '';
      
      // String olarak gelen hata mesajını doğrudan göster
      if (typeof err === 'string') {
        errorMessage = err;
      } else {
        // Daha açıklayıcı hata mesajları
        if (err.message && (
            err.message.includes('Invalid credentials') || 
            err.message.includes('Geçersiz kimlik bilgileri'))) {
          errorMessage = 'E-posta veya şifre hatalı. Lütfen bilgilerinizi kontrol ediniz.';
        } else if (err.message && err.message.includes('not found')) {
          errorMessage = 'Bu e-posta adresi ile kayıtlı bir kullanıcı bulunamadı.';
        } else {
          errorMessage = err?.message || 'Giriş yapılırken bir hata oluştu. Lütfen tekrar deneyiniz.';
        }
      }
      
      setError(errorMessage);
      localStorage.setItem('loginError', errorMessage); // Hatayı localStorage'a kaydet
      
      // Sayfayı yeniden yükle - bu hata mesajının görünmesini sağlar
      if (!error) {
        window.location.reload();
      }
      
      // Toast ile de hata mesajını göster
      toast.error(errorMessage, {
        duration: 5000 // 5 saniye göster
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setEmail('demo@example.com');
    setPassword('password123');
    
    setLoading(true);
    
    try {
      const response = await authService.login('demo@example.com', 'password123');
      if (response && response.data) {
        await login(response.data);
        
        // Kullanıcı rolüne göre yönlendirme yap
        if (response.data.role === 'admin' || response.data.role === 'municipal_worker') {
          navigate('/admin');
        } else {
          navigate('/');
        }
      }
    } catch (err) {
      const errorMsg = 'Demo hesabı ile giriş başarısız oldu.';
      setError(errorMsg);
      localStorage.setItem('loginError', errorMsg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-3xl font-bold text-center mb-8">Giriş Yap</h1>
      
      {/* Kalıcı hata mesajı konteynerı - JavaScript ile manipüle edilecek */}
      <div id="login-error-container" style={{ display: error ? 'block' : 'none' }}>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 relative" role="alert">
            <p className="font-medium">{error}</p>
            <button 
              onClick={() => clearErrors()} 
              className="absolute top-0 right-0 p-2 text-red-700"
              aria-label="Kapat"
            >
              <span className="text-xl">&times;</span>
            </button>
          </div>
        )}
      </div>
      
      {emailError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 relative" role="alert">
          <p className="font-medium">{emailError}</p>
          <button 
            onClick={() => setEmailError('')} 
            className="absolute top-0 right-0 p-2 text-red-700"
            aria-label="Kapat"
          >
            <span className="text-xl">&times;</span>
          </button>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6">
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
            E-posta
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="email"
            type="email"
            name="email"
            placeholder="E-posta adresiniz"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
            Şifre
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="password"
            type="password"
            name="password"
            placeholder="Şifreniz"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        
        <div className="flex items-center justify-between">
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
          </button>
        </div>
        
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            Hesabınız yok mu?{' '}
            <Link to="/register" className="text-blue-600 hover:text-blue-800">
              Kayıt ol
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
};

export default LoginPage; 