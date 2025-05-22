import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/api';
import { toast } from 'react-hot-toast';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Uyarıları temizle
      clearErrors();
      setLoading(true);
      
      // Form verilerini kontrol et
      if (!email || !password) {
        setError('Lütfen e-posta ve şifrenizi girin.');
        return;
      }
      
      // Email format kontrolü
      if (!validateEmail(email)) {
        setEmailError('Lütfen geçerli bir e-posta adresi girin.');
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
        setError(response?.message || 'Giriş yapılırken bir hata oluştu.');
      }
    } catch (err) {
      console.error('Giriş hatası:', err);
      setError(err?.message || 'Giriş yapılırken bir hata oluştu.');
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
      setError('Demo hesabı ile giriş başarısız oldu.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const clearErrors = () => {
    setError('');
    setEmailError('');
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-3xl font-bold text-center mb-8">Giriş Yap</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
          <p>{error}</p>
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