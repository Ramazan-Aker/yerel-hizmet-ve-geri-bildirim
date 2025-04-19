import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authService, issueService } from '../services/api';

const ProfilePage = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    district: '',
    notifications: false
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // Aktivite istatistikleri
  const [activityStats, setActivityStats] = useState({
    totalIssues: 0,
    resolvedIssues: 0,
    loading: true,
    error: null
  });
  
  // Dummy veriyi kaldır ve gerçek kullanıcı verisini kullan
  useEffect(() => {
    if (user) {
      console.log("Profil güncelleniyor, gelen user verisi:", user);
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        city: user.city || '',
        district: user.district || '',
        notifications: false // API'de karşılığı yoksa false olarak bırak
      });
    } else {
      console.log("Kullanıcı verisi bulunamadı");
    }
  }, [user]);

  // Aktivite istatistiklerini getir
  useEffect(() => {
    const fetchUserIssues = async () => {
      if (!user) return;
      
      try {
        setActivityStats(prev => ({ ...prev, loading: true, error: null }));
        const response = await issueService.getUserIssues();
        
        if (response && response.data) {
          const issues = response.data;
          const resolvedCount = issues.filter(issue => 
            issue.status === 'resolved' || 
            issue.status === 'Çözüldü'
          ).length;
          
          setActivityStats({
            totalIssues: issues.length,
            resolvedIssues: resolvedCount,
            loading: false,
            error: null
          });
          
          console.log('Kullanıcı aktivite istatistikleri yüklendi:', {
            total: issues.length,
            resolved: resolvedCount
          });
        }
      } catch (error) {
        console.error('Aktivite istatistikleri yüklenirken hata:', error);
        setActivityStats(prev => ({
          ...prev,
          loading: false,
          error: 'İstatistikler yüklenemedi'
        }));
      }
    };
    
    fetchUserIssues();
  }, [user]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) newErrors.name = 'İsim gerekli';
    if (!formData.email.trim()) newErrors.email = 'E-posta gerekli';
    else if (!/^\S+@\S+\.\S+$/.test(formData.email)) newErrors.email = 'Geçerli bir e-posta adresi giriniz';
    
    if (formData.phone && !/^\d{10,11}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Geçerli bir telefon numarası giriniz';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const validatePasswordForm = () => {
    const newErrors = {};
    
    if (!passwordData.currentPassword) newErrors.currentPassword = 'Mevcut şifre gerekli';
    if (!passwordData.newPassword) newErrors.newPassword = 'Yeni şifre gerekli';
    else if (passwordData.newPassword.length < 6) newErrors.newPassword = 'Şifre en az 6 karakter olmalı';
    
    if (!passwordData.confirmPassword) newErrors.confirmPassword = 'Şifre tekrarı gerekli';
    else if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Şifreler eşleşmiyor';
    }
    
    setPasswordErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    setSuccessMessage('');
    
    try {
      // API çağrısı yap
      const response = await authService.updateProfile({
        name: formData.name,
        phone: formData.phone,
        city: formData.city,
        district: formData.district
      });
      
      console.log("Profil güncelleme yanıtı:", response);
      
      if (response && response.data) {
        // AuthContext içindeki kullanıcı bilgilerini güncelle
        updateUser(response.data);
      }
      
      setSuccessMessage('Profil bilgileriniz başarıyla güncellendi');
      setIsEditing(false);
    } catch (error) {
      console.error("Profil güncelleme hatası:", error);
      setErrors({ submit: 'Profil güncellenirken bir hata oluştu' });
    } finally {
      setLoading(false);
    }
  };
  
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (!validatePasswordForm()) return;
    
    setPasswordLoading(true);
    setPasswordSuccessMessage('');
    
    try {
      // API çağrısı yap
      const response = await authService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      console.log("Şifre değiştirme yanıtı:", response);
      
      setPasswordSuccessMessage('Şifreniz başarıyla güncellendi');
      setIsChangingPassword(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error("Şifre değiştirme hatası:", error);
      setPasswordErrors({ submit: 'Şifre değiştirilirken bir hata oluştu' });
    } finally {
      setPasswordLoading(false);
    }
  };
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Belirtilmemiş';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    });
  };
  
  // Yükleme durumu
  if (!user && loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-3 text-gray-600">Profil bilgileriniz yükleniyor...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Profilim</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Sol Kolon - Kişisel Bilgiler */}
        <div className="md:col-span-2">
          <div className="bg-white shadow-md rounded-lg p-6 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Kişisel Bilgiler</h2>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Düzenle
                </button>
              ) : (
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setErrors({});
                    setSuccessMessage('');
                    
                    // Formu orijinal değerlere sıfırla
                    if (user) {
                      setFormData({
                        name: user.name || '',
                        email: user.email || '',
                        phone: user.phone || '',
                        city: user.city || '',
                        district: user.district || '',
                        notifications: false
                      });
                    }
                  }}
                  className="text-gray-600 hover:text-gray-800 font-medium"
                >
                  İptal
                </button>
              )}
            </div>
            
            {successMessage && (
              <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
                {successMessage}
              </div>
            )}
            
            {errors.submit && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                {errors.submit}
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
                    Ad Soyad
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className={`shadow appearance-none border ${errors.name ? 'border-red-500' : 'border-gray-300'} rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${!isEditing ? 'bg-gray-100' : ''}`}
                  />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                    E-posta
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={true} // Email değiştirilemez
                    className="shadow appearance-none border border-gray-300 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-100"
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="phone">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={!isEditing}
                    placeholder="İsteğe bağlı"
                    className={`shadow appearance-none border ${errors.phone ? 'border-red-500' : 'border-gray-300'} rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${!isEditing ? 'bg-gray-100' : ''}`}
                  />
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="city">
                    Şehir
                  </label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    disabled={!isEditing}
                    placeholder="İsteğe bağlı"
                    className={`shadow appearance-none border ${errors.city ? 'border-red-500' : 'border-gray-300'} rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${!isEditing ? 'bg-gray-100' : ''}`}
                  />
                  {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="district">
                    İlçe
                  </label>
                  <input
                    type="text"
                    id="district"
                    name="district"
                    value={formData.district}
                    onChange={handleChange}
                    disabled={!isEditing}
                    placeholder="İsteğe bağlı"
                    className={`shadow appearance-none border ${errors.district ? 'border-red-500' : 'border-gray-300'} rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${!isEditing ? 'bg-gray-100' : ''}`}
                  />
                  {errors.district && <p className="text-red-500 text-xs mt-1">{errors.district}</p>}
                </div>
              </div>
              
              <div className="mt-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="notifications"
                    checked={formData.notifications}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-gray-700">Bildirimler (e-posta) almak istiyorum</span>
                </label>
              </div>
              
              {isEditing && (
                <div className="mt-6">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg disabled:opacity-50 transition"
                  >
                    {loading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                  </button>
                </div>
              )}
            </form>
          </div>
          
          {/* Şifre Değiştirme */}
          <div className="bg-white shadow-md rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Şifre Değiştir</h2>
              {!isChangingPassword ? (
                <button
                  onClick={() => setIsChangingPassword(true)}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Şifremi Değiştir
                </button>
              ) : (
                <button
                  onClick={() => {
                    setIsChangingPassword(false);
                    setPasswordErrors({});
                    setPasswordSuccessMessage('');
                    setPasswordData({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: ''
                    });
                  }}
                  className="text-gray-600 hover:text-gray-800 font-medium"
                >
                  İptal
                </button>
              )}
            </div>
            
            {passwordSuccessMessage && (
              <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
                {passwordSuccessMessage}
              </div>
            )}
            
            {passwordErrors.submit && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                {passwordErrors.submit}
              </div>
            )}
            
            {isChangingPassword ? (
              <form onSubmit={handlePasswordSubmit}>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="currentPassword">
                    Mevcut Şifre
                  </label>
                  <input
                    type="password"
                    id="currentPassword"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    className={`shadow appearance-none border ${passwordErrors.currentPassword ? 'border-red-500' : 'border-gray-300'} rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline`}
                  />
                  {passwordErrors.currentPassword && (
                    <p className="text-red-500 text-xs mt-1">{passwordErrors.currentPassword}</p>
                  )}
                </div>
                
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="newPassword">
                    Yeni Şifre
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    className={`shadow appearance-none border ${passwordErrors.newPassword ? 'border-red-500' : 'border-gray-300'} rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline`}
                  />
                  {passwordErrors.newPassword && (
                    <p className="text-red-500 text-xs mt-1">{passwordErrors.newPassword}</p>
                  )}
                </div>
                
                <div className="mb-6">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="confirmPassword">
                    Yeni Şifre (Tekrar)
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    className={`shadow appearance-none border ${passwordErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'} rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline`}
                  />
                  {passwordErrors.confirmPassword && (
                    <p className="text-red-500 text-xs mt-1">{passwordErrors.confirmPassword}</p>
                  )}
                </div>
                
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg disabled:opacity-50 transition"
                >
                  {passwordLoading ? 'Değiştiriliyor...' : 'Şifreyi Değiştir'}
                </button>
              </form>
            ) : (
              <p className="text-gray-600">
                Hesabınızın şifresini değiştirmek için "Şifremi Değiştir" butonuna tıklayın.
              </p>
            )}
          </div>
        </div>
        
        {/* Sağ Kolon - Profil Özeti ve İstatistikler */}
        <div>
          {/* Profil Özeti */}
          <div className="bg-white shadow-md rounded-lg p-6 mb-8">
            <div className="flex flex-col items-center mb-4">
              <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-bold mb-4">
                {formData.name ? formData.name.charAt(0).toUpperCase() : '?'}
              </div>
              
              <h2 className="text-xl font-semibold text-center">{formData.name}</h2>
              <p className="text-gray-600 mb-2">{formData.email}</p>
              
              <span className="inline-block px-3 py-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-800">
                {user?.role === 'admin' ? 'Yönetici' : user?.role === 'municipal_worker' ? 'Belediye Çalışanı' : 'Vatandaş'}
              </span>
            </div>
            
            <div className="border-t border-gray-200 pt-4 mt-4">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Üyelik Tarihi:</span>
                <span className="font-medium">{formatDate(user?.createdAt)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Durum:</span>
                <span className="font-medium text-green-600">Aktif</span>
              </div>
            </div>
          </div>
          
          {/* Aktivite İstatistikleri - API'den alınabilir veya kaldırılabilir */}
          <div className="bg-white shadow-md rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Aktivite</h2>
            
            {activityStats.loading ? (
              <div className="flex justify-center p-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : activityStats.error ? (
              <div className="text-center text-red-500 p-2">
                {activityStats.error}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <p className="text-3xl font-bold text-blue-600">{activityStats.totalIssues}</p>
                  <p className="text-gray-600">Bildirilen Sorun</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <p className="text-3xl font-bold text-green-600">{activityStats.resolvedIssues}</p>
                  <p className="text-gray-600">Çözülen Sorun</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Hesap İşlemleri */}
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Hesap İşlemleri</h2>
            
            <button
              onClick={handleLogout}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition mb-2"
            >
              Çıkış Yap
            </button>
            
            <button
              className="w-full mt-2 border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-2 px-4 rounded-lg transition"
            >
              Hesabımı Dondur
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage; 