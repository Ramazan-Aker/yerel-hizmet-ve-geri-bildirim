import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { adminService, municipalService } from '../services/api';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';

const AdminIssueDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusUpdate, setStatusUpdate] = useState('');
  const [officialResponse, setOfficialResponse] = useState('');
  const [assignedWorker, setAssignedWorker] = useState('');
  const [workers, setWorkers] = useState([]);
  const [loadingWorkers, setLoadingWorkers] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [addingResponse, setAddingResponse] = useState(false);
  const [assigningWorker, setAssigningWorker] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  
  // Modallar için state'ler
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [workerModalVisible, setWorkerModalVisible] = useState(false);
  
  // Görsel modalı için state'ler
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  
  // Municipal worker rolü kontrolü
  const isMunicipalWorker = user && user.role === 'municipal_worker';
  
  // Sorun detaylarını ve çalışanları getir
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        let issueResponse;
        
        // Belediye çalışanı ise municipal servis kullan
        if (user && user.role === 'municipal_worker') {
          console.log('Belediye çalışanı şehrine ait sorunu görüntülüyor');
          issueResponse = await municipalService.getIssueById(id);
        } else {
          // Admin ise normal admin servisini kullan
          issueResponse = await adminService.getIssueById(id);
        }
        
        console.log('Sorun detayları:', issueResponse);
        
        if (issueResponse && issueResponse.data) {
          const issueData = issueResponse.data;
          
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
            officialResponses: issueData.officialResponses ? issueData.officialResponses.map(response => ({
              ...response,
              date: new Date(response.date).toLocaleDateString('tr-TR') + ' ' + new Date(response.date).toLocaleTimeString('tr-TR').slice(0, 5)
            })) : []
          };
          
          setIssue(formattedIssue);
          
          // Atanmış çalışan varsa seçili hale getir
          if (formattedIssue.assignedWorker && formattedIssue.assignedWorker._id) {
            setAssignedWorker(formattedIssue.assignedWorker._id);
          }
        }
        
        // Çalışanları al
        setLoadingWorkers(true);
        const workersResponse = await adminService.getWorkers();
        console.log('Çalışanlar:', workersResponse);
        
        if (workersResponse && workersResponse.data) {
          setWorkers(workersResponse.data);
        }
      } catch (error) {
        console.error('Veri alınırken hata:', error);
      } finally {
        setLoading(false);
        setLoadingWorkers(false);
      }
    };
    
    fetchData();
  }, [id, user]);
  
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
  
  // Durum güncelleme işlemi
  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    if (!statusUpdate) return;
    
    try {
      setUpdatingStatus(true);
      console.log('Durum güncelleniyor:', statusUpdate);
      
      // API çağrısı yap
      const response = await adminService.updateIssueStatus(id, statusUpdate);
      console.log('Durum güncelleme yanıtı:', response);
      
      if (response && response.data) {
        const updatedIssue = response.data;
        
        // Güncellenmiş sorun verilerini ayarla
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
    } catch (error) {
      console.error('Durum güncellenirken hata:', error);
      alert('Durum güncellenirken bir hata oluştu: ' + error);
    } finally {
      setUpdatingStatus(false);
    }
  };
  
  // Resmi yanıt ekleme
  const handleAddOfficialResponse = async (e) => {
    e.preventDefault();
    if (!officialResponse) return;
    
    try {
      setAddingResponse(true);
      console.log('Resmi yanıt ekleniyor:', officialResponse);
      
      // API çağrısı yap
      const response = await adminService.addOfficialResponse(id, officialResponse);
      console.log('Resmi yanıt ekleme yanıtı:', response);
      
      if (response && response.data) {
        const updatedIssue = response.data;
        
        // Güncellenmiş sorun verilerini ayarla
        setIssue(prevIssue => ({
          ...prevIssue,
          officialResponses: updatedIssue.officialResponses ? updatedIssue.officialResponses.map(response => ({
            ...response,
            date: new Date(response.date).toLocaleDateString('tr-TR') + ' ' + new Date(response.date).toLocaleTimeString('tr-TR').slice(0, 5)
          })) : prevIssue.officialResponses
        }));
        
        // Form alanını temizle
        setOfficialResponse('');
      }
    } catch (error) {
      console.error('Resmi yanıt eklenirken hata:', error);
      alert('Resmi yanıt eklenirken bir hata oluştu: ' + error);
    } finally {
      setAddingResponse(false);
    }
  };
  
  // Çalışan atama
  const handleAssignWorker = async (e) => {
    e.preventDefault();
    if (!assignedWorker) return;
    
    try {
      setAssigningWorker(true);
      console.log('Çalışan atanıyor:', assignedWorker);
      
      // API çağrısı yap
      const response = await adminService.assignWorker(id, assignedWorker);
      console.log('Çalışan atama yanıtı:', response);
      
      if (response && response.data) {
        const updatedIssue = response.data;
        
        // Güncellenmiş sorun verilerini ayarla
        setIssue(prevIssue => ({
          ...prevIssue,
          assignedWorker: updatedIssue.assignedWorker,
          updates: updatedIssue.updates ? updatedIssue.updates.map(update => ({
            ...update,
            date: new Date(update.date).toLocaleDateString('tr-TR') + ' ' + new Date(update.date).toLocaleTimeString('tr-TR').slice(0, 5)
          })) : prevIssue.updates
        }));
      }
    } catch (error) {
      console.error('Çalışan atanırken hata:', error);
      alert('Çalışan atanırken bir hata oluştu: ' + error);
    } finally {
      setAssigningWorker(false);
    }
  };
  
  // Yorum gönderme
  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    
    try {
      setSubmittingComment(true);
      console.log('Yorum gönderiliyor:', commentText);
      
      // API çağrısı yap
      const response = await adminService.addComment(id, commentText);
      console.log('Yorum gönderme yanıtı:', response);
      
      if (response && response.data) {
        // API yanıtında tüm issue nesnesi varsa onu kullan
        if (response.issue) {
          const updatedIssue = response.issue;
          
          // Tarih formatını düzenle
          const formattedIssue = {
            ...updatedIssue,
            id: updatedIssue._id,
            date: new Date(updatedIssue.createdAt).toLocaleDateString('tr-TR'),
            statusText: getStatusText(updatedIssue.status),
            updates: updatedIssue.updates ? updatedIssue.updates.map(update => ({
              ...update,
              date: new Date(update.date).toLocaleDateString('tr-TR') + ' ' + new Date(update.date).toLocaleTimeString('tr-TR').slice(0, 5)
            })) : [],
            officialResponses: updatedIssue.officialResponses ? updatedIssue.officialResponses.map(response => ({
              ...response,
              date: new Date(response.date).toLocaleDateString('tr-TR') + ' ' + new Date(response.date).toLocaleTimeString('tr-TR').slice(0, 5)
            })) : []
          };
          
          setIssue(formattedIssue);
        } else {
          // Alternatif olarak sorunu yeniden yükle
          const issueResponse = await adminService.getIssueById(id);
          if (issueResponse && issueResponse.data) {
            const updatedIssue = issueResponse.data;
            
            // Tarih formatını düzenle
            const formattedIssue = {
              ...updatedIssue,
              id: updatedIssue._id,
              date: new Date(updatedIssue.createdAt).toLocaleDateString('tr-TR'),
              statusText: getStatusText(updatedIssue.status),
              updates: updatedIssue.updates ? updatedIssue.updates.map(update => ({
                ...update,
                date: new Date(update.date).toLocaleDateString('tr-TR') + ' ' + new Date(update.date).toLocaleTimeString('tr-TR').slice(0, 5)
              })) : [],
              officialResponses: updatedIssue.officialResponses ? updatedIssue.officialResponses.map(response => ({
                ...response,
                date: new Date(response.date).toLocaleDateString('tr-TR') + ' ' + new Date(response.date).toLocaleTimeString('tr-TR').slice(0, 5)
              })) : []
            };
            
            setIssue(formattedIssue);
          }
        }
        
        // Form alanını temizle
        setCommentText('');
      }
    } catch (error) {
      console.error('Yorum gönderilirken hata:', error);
      alert('Yorum gönderilirken bir hata oluştu: ' + error);
    } finally {
      setSubmittingComment(false);
    }
  };

  // Görsel modalını aç
  const openImageModal = (imageUrl) => {
    setSelectedImage(imageUrl);
    setModalVisible(true);
  };
  
  // Resim URL'sini düzeltme fonksiyonu
  const getFullImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    
    // Base64 formatındaki görüntüler için doğrudan URL'yi döndür
    if (imageUrl.startsWith('data:image')) {
      return imageUrl;
    }
    
    // Eğer URL http ile başlıyorsa, tam URL'dir
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }
    
    // API URL'si ekle
    const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
    // Sunucu kök URL'sini oluştur (örn. http://localhost:5001)
    const baseUrl = apiBaseUrl.replace(/\/api$/, '');
    
    // URL'deki çift slash'ları önlemek için kontrol et
    if (imageUrl.startsWith('/')) {
      return `${baseUrl}${imageUrl}`;
    } else {
      return `${baseUrl}/${imageUrl}`;
    }
  };
  
  // Görsel modalını kapat
  const closeImageModal = () => {
    setModalVisible(false);
    setSelectedImage(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>Sorun bulunamadı veya yüklenirken bir hata oluştu.</p>
        </div>
        <div className="mt-4">
          <Link to="/admin/issues" className="text-blue-600 hover:text-blue-900">
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
          <Link to="/admin/issues" className="text-blue-600 hover:text-blue-900 flex items-center">
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
              
              {/* Fotoğraflar Bölümü */}
              {issue.images && issue.images.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Sorun Görselleri</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {issue.images.map((image, index) => {
                      const fullImageUrl = getFullImageUrl(image);
                      console.log(`Görsel ${index + 1} URL:`, fullImageUrl);
                      
                      return (
                        <div 
                          key={`image-${index}`} 
                          className="relative group"
                          onClick={() => openImageModal(image)}
                        >
                          <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-lg bg-gray-100 cursor-pointer">
                            <img
                              src={fullImageUrl}
                              alt={`Sorun görseli ${index + 1}`}
                              className="h-full w-full object-cover object-center transition-opacity group-hover:opacity-75"
                              onError={(e) => {
                                console.error(`Görsel yüklenemedi: ${fullImageUrl}`);
                                e.target.onerror = null;
                                e.target.src = ''; // Boş kaynak
                                e.target.className = 'hidden'; // Resmi gizle
                                e.target.parentNode.className = 'flex items-center justify-center h-full bg-gray-200'; // Container'ı gri yap
                                const textNode = document.createElement('span');
                                textNode.textContent = 'Görsel Yüklenemedi';
                                textNode.className = 'text-sm text-gray-500';
                                e.target.parentNode.appendChild(textNode);
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Çözüm Süreci Görselleri */}
              {issue.progressPhotos && issue.progressPhotos.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Çözüm Süreci Görselleri</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {issue.progressPhotos.map((photo, index) => {
                      // Fotoğraf URL'sini al
                      let photoUrl = '';
                      
                      if (typeof photo === 'string') {
                        photoUrl = getFullImageUrl(photo);
                      } else if (photo.url) {
                        photoUrl = getFullImageUrl(photo.url);
                      } else {
                        return null; // Geçersiz fotoğraf verisi
                      }
                      
                      return (
                        <div 
                          key={index} 
                          className="block h-32 overflow-hidden rounded-lg relative hover:opacity-90 transition-opacity cursor-pointer"
                          onClick={() => openImageModal(photoUrl)}
                        >
                          <img 
                            src={photoUrl} 
                            alt={`Çözüm görseli ${index + 1}`} 
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
                          {photo.uploadedAt && (
                            <div className="bg-black bg-opacity-70 text-white text-xs p-1 absolute bottom-0 left-0 right-0">
                              {new Date(photo.uploadedAt).toLocaleDateString('tr-TR')}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Kullanıcı Bilgileri */}
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
          
          {/* Resmi Yanıtlar Kartı */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Resmi Yanıtlar</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4 mb-6">
                {issue.officialResponses && issue.officialResponses.length > 0 ? (
                  issue.officialResponses.map((response, index) => (
                    <div key={index} className="bg-blue-50 rounded-lg p-4">
                      <p className="text-gray-800">{response.text}</p>
                      <div className="flex justify-between items-center mt-2">
                        <p className="text-sm text-gray-600">{response.respondent}</p>
                        <p className="text-xs text-gray-500">{response.date}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">Henüz resmi yanıt bulunmuyor.</p>
                )}
              </div>
              
              {/* Resmi Yanıt Ekleme Formu */}
              <form onSubmit={handleAddOfficialResponse}>
                <div className="mb-4">
                  <label htmlFor="officialResponse" className="block text-sm font-medium text-gray-700 mb-1">
                    Resmi Yanıt Ekle
                  </label>
                  <textarea
                    id="officialResponse"
                    rows="3"
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Resmi yanıtınızı buraya yazın..."
                    value={officialResponse}
                    onChange={(e) => setOfficialResponse(e.target.value)}
                    required
                  ></textarea>
                </div>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 w-full disabled:opacity-50"
                  disabled={addingResponse || !officialResponse}
                >
                  {addingResponse ? 'Ekleniyor...' : 'Yanıt Ekle'}
                </button>
              </form>
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
                    <option value="pending">Yeni</option>
                    <option value="in_progress">İnceleniyor</option>
                    <option value="resolved">Çözüldü</option>
                    <option value="rejected">Reddedildi</option>
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
          
          {/* Çalışan Atama Kartı */}
          <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Çalışan Ata</h2>
            </div>
            <div className="p-6">
              {issue.assignedWorker && (
                <div className="mb-4 bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Şu anda atanmış çalışan:</p>
                  <div className="flex items-center">
                    <div className="bg-blue-100 rounded-full p-2 mr-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium">{issue.assignedWorker.name}</p>
                      <p className="text-xs text-gray-500">{issue.assignedWorker.department}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <form onSubmit={handleAssignWorker}>
                <div className="mb-4">
                  <label htmlFor="worker" className="block text-sm font-medium text-gray-700 mb-1">
                    Çalışan Seç
                  </label>
                  {loadingWorkers ? (
                    <div className="flex justify-center py-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                  ) : (
                    <select
                      id="worker"
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={assignedWorker}
                      onChange={(e) => setAssignedWorker(e.target.value)}
                      required
                    >
                      <option value="">Çalışan seçin</option>
                      {workers.map(worker => (
                        <option key={worker._id} value={worker._id}>
                          {worker.name} ({worker.department})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 w-full disabled:opacity-50"
                  disabled={assigningWorker || !assignedWorker || loadingWorkers}
                >
                  {assigningWorker ? 'Atanıyor...' : 'Çalışan Ata'}
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
                  <div className="w-full h-48 rounded-lg border">
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
                  </div>
                </div>
                <div className="text-center">
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
          
          {/* Yorumlar Kartı */}
          <div className="bg-white rounded-lg shadow overflow-hidden mt-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">
                Yorumlar {issue.comments && issue.comments.length > 0 && `(${issue.comments.length})`}
              </h2>
            </div>
            <div className="p-6">
              {/* Yorum Ekleme Formu */}
              <form className="mb-6" onSubmit={handleSubmitComment}>
                <div className="mb-4">
                  <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
                    Yeni Yorum Ekle
                  </label>
                  <textarea
                    id="comment"
                    rows="3"
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Yorumunuzu buraya yazın..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                  ></textarea>
                </div>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  disabled={submittingComment || !commentText}
                >
                  {submittingComment ? 'Gönderiliyor...' : 'Yorum Gönder'}
                </button>
              </form>
              
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
                                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.user.name)}&background=random`;
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
                      
                      {/* Yoruma cevaplar */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="ml-10 space-y-3 mt-3">
                          {comment.replies.map((reply, replyIndex) => (
                            <div key={replyIndex} className="flex items-start">
                              <div className="bg-gray-100 rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0">
                                {reply.user?.profileImage ? (
                                  <img 
                                    src={reply.user.profileImage} 
                                    alt={reply.user.name} 
                                    className="w-6 h-6 rounded-full"
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(reply.user.name)}&background=random&size=32`;
                                    }}
                                  />
                                ) : (
                                  <span className="text-gray-500 font-bold text-xs">
                                    {reply.user?.name?.charAt(0) || '?'}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <span className="font-medium text-xs">{reply.user?.name || 'Anonim Kullanıcı'}</span>
                                    <span className="text-xs text-gray-500 ml-2">
                                      {new Date(reply.createdAt).toLocaleDateString('tr-TR')}
                                    </span>
                                  </div>
                                </div>
                                <p className="text-gray-700 text-sm mt-1 whitespace-pre-line">{reply.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Henüz yorum yapılmamış.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Görsel Modal */}
      {modalVisible && (
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
              src={selectedImage ? getFullImageUrl(selectedImage) : ''}
              alt="Büyütülmüş görsel" 
              className="max-h-[80vh] max-w-full object-contain mx-auto"
              onError={(e) => {
                console.error(`Modal görsel yüklenemedi: ${selectedImage}`);
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

export default AdminIssueDetailPage; 