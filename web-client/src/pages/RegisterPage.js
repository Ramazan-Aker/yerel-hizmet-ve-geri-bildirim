import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/api';
import { cities } from '../data/cities';
import { allDistricts } from '../data/allDistricts';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    city: '',
    district: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [availableDistricts, setAvailableDistricts] = useState([]);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  // İlçeleri şehire göre güncelle
  useEffect(() => {
    if (formData.city) {
      const districtsList = allDistricts[formData.city] || ['Merkez'];
      setAvailableDistricts(districtsList);
      
      // Eğer önceden seçili bir ilçe varsa ve yeni şehirde bu ilçe yoksa, ilçeyi sıfırla
      if (formData.district && !districtsList.includes(formData.district)) {
        setFormData(prev => ({ ...prev, district: '' }));
      }
    } else {
      setAvailableDistricts([]);
      setFormData(prev => ({ ...prev, district: '' }));
    }
  }, [formData.city]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Password validation
    if (formData.password !== formData.confirmPassword) {
      setError('Şifreler eşleşmiyor.');
      return;
    }

    if (!formData.city) {
      setError('Lütfen şehir seçiniz.');
      return;
    }

    if (!formData.district) {
      setError('Lütfen ilçe seçiniz.');
      return;
    }
    
    setLoading(true);

    try {
      // Remove confirmPassword before sending to API
      const { confirmPassword, ...registrationData } = formData;
      
      // Log registration data to troubleshoot
      console.log('Sending registration data:', registrationData);
      
      const response = await authService.register(registrationData);
      console.log('Registration response:', response);
      
      // Sunucudan dönen cevaptaki token ve kullanıcı bilgilerini login'e gönder
      if (response && response.data) {
        // Login fonksiyonuna doğru veriyi gönder
        login(response.data);
        navigate('/');
      } else {
        throw new Error('Kayıt başarılı ancak kullanıcı bilgileri alınamadı');
      }
    } catch (err) {
      console.error('Register error:', err);
      setError(err.response?.data?.message || err.message || 'Kayıt olurken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-3xl font-bold text-center mb-8">Kayıt Ol</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
          <p>{error}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6">
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
            Ad Soyad
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="name"
            type="text"
            name="name"
            placeholder="Ad Soyad"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
            E-posta
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="email"
            type="email"
            name="email"
            placeholder="E-posta adresinizi girin"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="phone">
            Telefon
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="phone"
            type="tel"
            name="phone"
            placeholder="05XX XXX XX XX"
            value={formData.phone}
            onChange={handleChange}
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="city">
            Şehir
          </label>
          <select
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="city"
            name="city"
            value={formData.city}
            onChange={handleChange}
            required
          >
            <option value="">Şehir Seçin</option>
            {cities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="district">
            İlçe
          </label>
          <select
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="district"
            name="district"
            value={formData.district}
            onChange={handleChange}
            required
            disabled={!formData.city}
          >
            <option value="">İlçe Seçin</option>
            {availableDistricts.map(district => (
              <option key={district} value={district}>{district}</option>
            ))}
          </select>
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
            Şifre
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="password"
            type="password"
            name="password"
            placeholder="Şifreniz"
            value={formData.password}
            onChange={handleChange}
            required
            minLength="6"
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="confirmPassword">
            Şifre Tekrar
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="confirmPassword"
            type="password"
            name="confirmPassword"
            placeholder="Şifrenizi tekrar girin"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            minLength="6"
          />
        </div>
        
        <div className="flex items-center justify-between">
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Kayıt Olunuyor...' : 'Kayıt Ol'}
          </button>
        </div>
        
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            Zaten hesabınız var mı?{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-800">
              Giriş yap
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
};

export default RegisterPage; 