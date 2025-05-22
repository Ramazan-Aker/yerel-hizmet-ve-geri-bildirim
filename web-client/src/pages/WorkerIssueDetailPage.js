import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { workerService } from '../services/api';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { toast } from 'react-hot-toast';

const WorkerIssueDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // İşlem state'leri
  const [statusUpdate, setStatusUpdate] = useState('');
  const [progressPhotos, setProgressPhotos] = useState([]);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [previewImages, setPreviewImages] = useState([]);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  
  // Sorun detaylarını getir
  useEffect(() => {
    const fetchIssueDetails = async () => {
      try {
        setLoading(true);
        const response = await workerService.getIssueById(id);
        
        if (response && response.data) {
          const issueData = response.data;
          
          // Tarih formatını düzenle
          const formattedIssue = {
            ...issueData,
            id: issueData._id,
            date: new Date(issueData.createdAt).toLocaleDateString('tr-TR'),
            statusText: getStatusText(issueData.status),
            updates: issueData.updates ? issueData.updates.map(update => ({
              ...update,
              date: new Date(update.date).toLocaleDateString('tr-TR') + ' ' + new Date(update.date).toLocaleTimeString('tr-TR').slice(0, 5)
            })) : [],
            progressPhotos: issueData.progressPhotos || []
          };
          
          setIssue(formattedIssue);
        }
      } catch (err) {
        console.error('Sorun detaylarını getirirken hata oluştu:', err);
        setError('Sorun detayları yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchIssueDetails();
  }, [id]);
  
  // Durum kodunu metne çevir
  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Yeni';
      case 'in_progress': return 'İnceleniyor';
      case 'resolved': return 'Çözüldü';
      case 'rejected': return 'Reddedildi';
      default: return status;
    }
  };
  
  // Durum rengini belirle
  const getStatusColor = (status) => {
    switch (status) {
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Fotoğraf seçildiğinde
  const handlePhotoChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    
    // Mevcut görüntü sayısını kontrol et
    const totalImages = previewImages.length + files.length;
    if (totalImages > 5) {
      toast.error(`En fazla 5 fotoğraf yükleyebilirsiniz (şu anda ${previewImages.length} fotoğraf seçili)`);
      return;
    }
    
    // Dosya boyutu kontrolü
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error(`'${file.name}' dosyası çok büyük (${Math.round(file.size/1024/1024)}MB). Lütfen 5MB'dan küçük dosyalar seçin.`);
        return;
      }
    }
    
    // Yükleme bildirimi
    toast.loading('Fotoğraflar işleniyor...', { id: 'image-processing' });
    
    try {
      // Preview oluştur ve dosyaları sakla
      setProgressPhotos(prev => [...prev, ...files]);
      
      // Dosyaları preview için hazırla
      const newImagePreviews = [];
      
      for (const file of files) {
        try {
          const reader = new FileReader();
          const base64Promise = new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error(`Dosya okunamadı: ${file.name}`));
            reader.readAsDataURL(file);
          });
          
          const base64 = await base64Promise;
          newImagePreviews.push(base64);
        } catch (fileError) {
          console.error(`Dosya işleme hatası (${file.name}):`, fileError);
          // Hata durumunda devam et, diğer dosyaları işlemeye çalış
        }
      }
      
      if (newImagePreviews.length > 0) {
        // Başarılı görüntüleri ekle
        setPreviewImages(prev => [...prev, ...newImagePreviews]);
        toast.success(`${newImagePreviews.length} fotoğraf başarıyla işlendi`, { id: 'image-processing' });
      } else {
        toast.error('Hiçbir fotoğraf işlenemedi', { id: 'image-processing' });
      }
      
    } catch (error) {
      console.error('Fotoğraf işleme hatası:', error);
      toast.error('Fotoğraflar işlenirken hata oluştu', { id: 'image-processing' });
    }
  };
  
  // Resmi kaldırma fonksiyonu
  const removeImage = (index) => {
    setPreviewImages(prev => prev.filter((_, i) => i !== index));
    setProgressPhotos(prev => prev.filter((_, i) => i !== index));
  };
  
  // Sorun durumunu güncelle
  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    if (!statusUpdate) return;
    
    try {
      setUpdatingStatus(true);
      
      // API çağrısı
      const response = await workerService.updateIssueStatus(id, statusUpdate);
      
      if (response && response.data) {
        // Güncellenmiş sorun bilgilerini ayarla
        const updatedIssue = response.data;
        
        setIssue(prevIssue => ({
          ...prevIssue,
          status: updatedIssue.status,
          statusText: getStatusText(updatedIssue.status),
          updates: updatedIssue.updates ? updatedIssue.updates.map(update => ({
            ...update,
            date: new Date(update.date).toLocaleDateString('tr-TR') + ' ' + new Date(update.date).toLocaleTimeString('tr-TR').slice(0, 5)
          })) : prevIssue.updates
        }));
        
        // Form alanını temizle
        setStatusUpdate('');
      }
    } catch (err) {
      console.error('Durum güncellenirken hata oluştu:', err);
      setError('Durum güncellenirken bir hata oluştu.');
    } finally {
      setUpdatingStatus(false);
    }
  };
  
  // Çözüm fotoğraflarını yükle
  const handleUploadPhotos = async (e) => {
    e.preventDefault();
    if (progressPhotos.length === 0) return;
    
    try {
      setUploadingPhotos(true);
      toast.loading('Fotoğraflar yükleniyor...', { id: 'upload-progress' });
      
      // FormData oluştur
      const formData = new FormData();
      progressPhotos.forEach(photo => {
        formData.append('photos', photo);
      });
      
      // API çağrısı
      const response = await workerService.uploadProgressPhotos(id, formData);
      
      if (response && response.data) {
        // Güncellenmiş sorun bilgilerini ayarla
        const updatedIssue = response.data;
        
        setIssue(prevIssue => ({
          ...prevIssue,
          progressPhotos: updatedIssue.progressPhotos || prevIssue.progressPhotos
        }));
        
        // Form alanlarını temizle
        setProgressPhotos([]);
        setPreviewImages([]);
        
        toast.success('Fotoğraflar başarıyla yüklendi', { id: 'upload-progress' });
      }
    } catch (err) {
      console.error('Fotoğraflar yüklenirken hata oluştu:', err);
      setError('Fotoğraflar yüklenirken bir hata oluştu.');
      toast.error('Fotoğraflar yüklenirken bir hata oluştu', { id: 'upload-progress' });
    } finally {
      setUploadingPhotos(false);
    }
  };
  
  // Görsel modalını kapat
  const closeImageModal = () => {
    setShowImageModal(false);
    setSelectedImage(null);
  };
  
  // Görseli görüntüle
  const viewImage = (imageUrl) => {
    setSelectedImage(imageUrl);
    setShowImageModal(true);
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (error || !issue) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error || 'Sorun bulunamadı veya yüklenirken bir hata oluştu.'}</p>
        </div>
        <div className="mt-4">
          <Link to="/worker/issues" className="text-blue-600 hover:text-blue-900">
            &larr; Tüm sorunlara dön
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Üst Bilgi ve Navigasyon */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link to="/worker/issues" className="text-blue-600 hover:text-blue-900 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Tüm sorunlara dön
          </Link>
          <h1 className="text-2xl font-bold text-gray-800 mt-2">{issue.title}</h1>
        </div>
        <div>
          <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${getStatusColor(issue.status)}`}>
            {issue.statusText}
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol Kolon - Sorun Detayları */}
        <div className="lg:col-span-2">
          {/* Sorun Detayları Kartı */}
          <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Sorun Detayları</h2>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Açıklama</h3>
                <p className="text-gray-800">{issue.description}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Kategori</h3>
                  <p className="text-gray-800">{issue.category}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">İlçe</h3>
                  <p className="text-gray-800">{issue.location?.district || 'Belirtilmemiş'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Adres</h3>
                  <p className="text-gray-800">{issue.address || issue.location?.address || 'Belirtilmemiş'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Bildirim Tarihi</h3>
                  <p className="text-gray-800">{issue.date}</p>
                </div>
              </div>
              
              {/* Görseller */}
              {issue.images && issue.images.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Sorun Görselleri</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {issue.images.map((image, index) => (
                      <a 
                        key={index} 
                        href={image} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block h-32 overflow-hidden rounded-lg relative"
                      >
                        <img 
                          src={image} 
                          alt={`Sorun görseli ${index + 1}`} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = ''; // Boş kaynak
                            e.target.className = 'hidden'; // Resmi gizle
                            e.target.parentNode.className = 'block h-32 overflow-hidden rounded-lg relative bg-gray-200 flex items-center justify-center'; // Container'ı gri yap
                            const textNode = document.createElement('span');
                            textNode.textContent = 'Görsel Yüklenemedi';
                            textNode.className = 'text-gray-500 text-sm';
                            e.target.parentNode.appendChild(textNode);
                          }}
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Çözüm Süreci Görselleri */}
              {issue.progressPhotos && issue.progressPhotos.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Çözüm Süreci Görselleri</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {issue.progressPhotos.map((photo, index) => {
                      // Sunucu API URL'sini al (örn. http://localhost:5001/api)
                      const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
                      // Sunucu kök URL'sini oluştur (örn. http://localhost:5001)
                      const baseUrl = apiBase.replace(/\/api$/, '');
                      
                      // Tam fotoğraf URL'sini oluştur
                      const photoUrl = photo.url.startsWith('http') 
                        ? photo.url 
                        : `${baseUrl}${photo.url}`;
                      
                      return (
                        <div 
                          key={index} 
                          onClick={() => viewImage(photoUrl)}
                          className="block h-32 overflow-hidden rounded-lg relative cursor-pointer hover:opacity-90 transition-opacity"
                        >
                          <img 
                            src={photoUrl} 
                            alt={`Çözüm görseli ${index + 1}`} 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = ''; // Boş kaynak
                              e.target.className = 'hidden'; // Resmi gizle
                              e.target.parentNode.className = 'block h-32 overflow-hidden rounded-lg relative bg-gray-200 flex items-center justify-center cursor-pointer'; // Container'ı gri yap
                              const textNode = document.createElement('span');
                              textNode.textContent = 'Görsel Yüklenemedi';
                              textNode.className = 'text-gray-500 text-sm';
                              e.target.parentNode.appendChild(textNode);
                            }}
                          />
                          <div className="bg-black bg-opacity-70 text-white text-xs p-1 absolute bottom-0 left-0 right-0">
                            {new Date(photo.uploadedAt).toLocaleDateString('tr-TR')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Bildiren Kullanıcı Bilgileri */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Bildiren Kullanıcı</h3>
                <div className="flex items-center">
                  <div className="bg-gray-100 rounded-full p-2 mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-gray-800 font-medium">{issue.user?.name || 'İsimsiz Kullanıcı'}</p>
                    {issue.user?.phone && (
                      <p className="text-gray-600 text-sm">{issue.user.phone}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Durum Güncellemeleri Kartı */}
          <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Durum Güncellemeleri</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {issue.updates && issue.updates.length > 0 ? (
                  issue.updates.map((update, index) => (
                    <div key={index} className="flex">
                      <div className="mr-3">
                        <div className={`w-3 h-3 rounded-full mt-1.5 ${getStatusColor(update.status)}`}></div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-800">{update.text}</p>
                        <p className="text-xs text-gray-500">{update.date}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">Henüz güncelleme bulunmuyor.</p>
                )}
              </div>
            </div>
          </div>
          
          {/* Yorumlar Kartı */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">
                Yorumlar {issue.comments && issue.comments.length > 0 && `(${issue.comments.length})`}
              </h2>
            </div>
            <div className="p-6">
              {/* Yorumlar Listesi */}
              {issue.comments && issue.comments.length > 0 ? (
                <div className="space-y-4">
                  {issue.comments.map((comment, index) => (
                    <div key={index} className="border-b pb-4 last:border-0 last:pb-0">
                      <div className="flex items-start mb-2">
                        <div className="bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center mr-2 flex-shrink-0">
                          {comment.user?.profileImage ? (
                            <img 
                              src={comment.user.profileImage} 
                              alt={comment.user.name} 
                              className="w-8 h-8 rounded-full"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.style.display = 'none';
                                e.target.parentNode.innerHTML = `
                                  <div class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                                    ${comment.user?.name?.charAt(0)?.toUpperCase() || '?'}
                                  </div>
                                `;
                              }}
                            />
                          ) : (
                            <span className="text-gray-500 font-bold">
                              {comment.user?.name?.charAt(0) || '?'}
                            </span>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-medium text-sm">{comment.user?.name || 'Anonim Kullanıcı'}</span>
                              <span className="text-xs text-gray-500 ml-2">
                                {new Date(comment.createdAt).toLocaleDateString('tr-TR')}
                              </span>
                            </div>
                          </div>
                          <p className="text-gray-700 mt-1 whitespace-pre-line">{comment.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Henüz yorum yapılmamış.</p>
              )}
            </div>
          </div>
        </div>
        
        {/* Sağ Kolon - İşlemler */}
        <div>
          {/* Durum Güncelleme Kartı */}
          <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Durum Güncelle</h2>
            </div>
            <div className="p-6">
              <form onSubmit={handleStatusUpdate}>
                <div className="mb-4">
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                    Yeni Durum
                  </label>
                  <select
                    id="status"
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={statusUpdate}
                    onChange={(e) => setStatusUpdate(e.target.value)}
                    required
                  >
                    <option value="">Durum seçin</option>
                    <option value="in_progress">İnceleniyor</option>
                    <option value="resolved">Çözüldü</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 w-full disabled:opacity-50"
                  disabled={updatingStatus || !statusUpdate}
                >
                  {updatingStatus ? 'Güncelleniyor...' : 'Durumu Güncelle'}
                </button>
              </form>
            </div>
          </div>
          
          {/* Çözüm Fotoğrafları Yükleme Kartı */}
          <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Çözüm Fotoğrafları Yükle</h2>
            </div>
            <div className="p-6">
              <form onSubmit={handleUploadPhotos}>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="photos">
                    Fotoğraflar
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current.click()}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg text-sm transition"
                    >
                      Fotoğraf Ekle
                    </button>
                    <input
                      type="file"
                      id="photos"
                      name="photos"
                      multiple
                      accept="image/*"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handlePhotoChange}
                    />
                    <span className="text-xs text-gray-500">En fazla 5 fotoğraf, her biri max 5MB</span>
                  </div>
                  
                  {/* Fotoğraf sayısı bilgisi */}
                  {previewImages.length > 0 && (
                    <div className="mt-2 flex items-center">
                      <span className="text-sm text-gray-600">
                        {previewImages.length} fotoğraf seçildi ({5 - previewImages.length} fotoğraf daha ekleyebilirsiniz)
                      </span>
                    </div>
                  )}
                  
                  {/* JPG uyarısı */}
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-xs text-yellow-700">
                      <strong>Not:</strong> JPG/JPEG formatındaki fotoğraflar yüklenirken sorun yaşanabilir. 
                      Mümkünse PNG formatında fotoğraflar kullanmanızı öneririz. JPG formatında sorun yaşarsanız, daha küçük boyutlu veya daha düşük çözünürlüklü fotoğraflar deneyin.
                    </p>
                  </div>
                </div>
                
                {/* Seçilen fotoğrafların önizlemesi */}
                {previewImages.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Seçilen Fotoğraflar</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {previewImages.map((preview, index) => (
                        <div key={index} className="rounded-md overflow-hidden h-32 relative group">
                          <img
                            src={preview}
                            alt={`Fotoğraf ${index + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = ''; // Boş kaynak
                              e.target.className = 'hidden'; // Resmi gizle
                              e.target.parentNode.className = 'rounded-md overflow-hidden h-32 bg-gray-200 flex items-center justify-center'; // Container'ı gri yap
                              const textNode = document.createElement('span');
                              textNode.textContent = 'Önizleme Yüklenemedi';
                              textNode.className = 'text-gray-500 text-sm';
                              e.target.parentNode.appendChild(textNode);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Fotoğrafı kaldır"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 w-full disabled:opacity-50"
                  disabled={uploadingPhotos || progressPhotos.length === 0}
                >
                  {uploadingPhotos ? 'Yükleniyor...' : 'Fotoğrafları Yükle'}
                </button>
              </form>
            </div>
          </div>
          
          {/* Konum Kartı */}
          {issue.location && issue.location.coordinates && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800">Konum</h2>
              </div>
              <div className="p-6">
                <div className="aspect-w-16 aspect-h-9 mb-3">
                  <div className="w-full h-48 rounded-lg border relative">
                    {/* Harita görünümü için try-catch kullanmak doğrudan mümkün olmadığından
                        fallback ekleyerek olası hataları yönetiyoruz */}
                    {(() => {
                      try {
                        return (
                          <MapContainer
                            center={[issue.location.coordinates[1], issue.location.coordinates[0]]}
                            zoom={15}
                            style={{ height: '100%', width: '100%' }}
                          >
                            <TileLayer
                              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <Marker position={[issue.location.coordinates[1], issue.location.coordinates[0]]} />
                          </MapContainer>
                        );
                      } catch (error) {
                        console.error("Harita yüklenirken hata:", error);
                        return (
                          <div className="flex items-center justify-center h-full bg-gray-100">
                            <div className="text-center p-4">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                              </svg>
                              <p className="text-gray-600">Harita yüklenemedi</p>
                              <p className="text-sm text-gray-500">İnternet bağlantınızı kontrol edin</p>
                            </div>
                          </div>
                        );
                      }
                    })()}
                  </div>
                </div>
                <div className="text-center">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${issue.location.coordinates[1]},${issue.location.coordinates[0]}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm mr-3"
                  >
                    Google Maps'te Aç
                  </a>
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${issue.location.coordinates[1]}&mlon=${issue.location.coordinates[0]}&zoom=15`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    OpenStreetMap'te Aç
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Görsel Modal */}
      {showImageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75" onClick={closeImageModal}>
          <div className="relative max-w-4xl max-h-full p-2" onClick={e => e.stopPropagation()}>
            <button 
              onClick={closeImageModal}
              className="absolute top-4 right-4 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-75 focus:outline-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img 
              src={selectedImage} 
              alt="Büyütülmüş görsel" 
              className="max-h-[80vh] max-w-full object-contain mx-auto"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = ''; // Boş kaynak
                e.target.style.display = 'none';
                const errorMsg = document.createElement('div');
                errorMsg.innerHTML = `
                  <div class="bg-white p-4 rounded-lg">
                    <p class="text-red-500">Görsel yüklenemedi</p>
                  </div>
                `;
                e.target.parentNode.appendChild(errorMsg);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerIssueDetailPage; 