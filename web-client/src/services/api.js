import axios from 'axios';

// API temel URL'si
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// API istemcisi oluştur
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 120000, // 120 saniye varsayılan zaman aşımı
  maxContentLength: 50 * 1024 * 1024, // 50MB maksimum içerik boyutu
  maxBodyLength: 50 * 1024 * 1024 // 50MB maksimum istek gövdesi
});

// İstek interceptor'ı - her istekte token ekle
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Yanıt interceptor'ı - hata durumunda
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 hataları (Yetkisiz)
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API servisleri
export const authService = {
  login: async (email, password) => {
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Giriş başarısız';
    }
  },

  register: async (userData) => {
    try {
      const response = await apiClient.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Kayıt başarısız';
    }
  },

  getCurrentUser: async () => {
    try {
      const response = await apiClient.get('/auth/me');
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Kullanıcı bilgileri alınamadı';
    }
  },

  updateProfile: async (userData) => {
    try {
      const response = await apiClient.put('/auth/profile', userData);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Profil güncellenemedi';
    }
  },

  changePassword: async (passwordData) => {
    try {
      const response = await apiClient.put('/auth/updatepassword', passwordData);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Şifre değiştirilemedi';
    }
  }
};

// Issue API servisleri
export const issueService = {
  getAllIssues: async (filters = {}) => {
    try {
      console.log('Sorunlar için API isteği gönderiliyor, filtreler:', filters);
      
      // Boş string değerleri temizle
      const cleanedFilters = {};
      Object.keys(filters).forEach(key => {
        if (filters[key] !== '' && filters[key] !== null && filters[key] !== undefined) {
          cleanedFilters[key] = filters[key];
        }
      });
      
      // Türkçe-İngilizce çevirileri yap
      if (cleanedFilters.status) {
        const statusMapping = {
          'Yeni': 'pending',
          'İnceleniyor': 'in_progress',
          'Çözüldü': 'resolved',
          'Reddedildi': 'rejected'
        };
        
        if (statusMapping[cleanedFilters.status]) {
          cleanedFilters.status = statusMapping[cleanedFilters.status];
        }
      }
      
      if (cleanedFilters.severity) {
        const severityMapping = {
          'Düşük': 'low',
          'Orta': 'medium',
          'Yüksek': 'high',
          'Kritik': 'critical'
        };
        
        if (severityMapping[cleanedFilters.severity]) {
          cleanedFilters.severity = severityMapping[cleanedFilters.severity];
        }
      }
      
      // Şehir filtresi için özel işlem
      if (cleanedFilters.city) {
        // Backend'de location.city olarak filtreleneceği için isimlendirmeyi düzelt
        cleanedFilters['city'] = cleanedFilters.city;
        console.log('Şehir filtresi uygulanıyor:', cleanedFilters.city);
      }
      
      const response = await apiClient.get('/issues', { params: cleanedFilters });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Sorunlar alınamadı';
    }
  },

  getIssueById: async (id) => {
    try {
      const response = await apiClient.get(`/issues/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Sorun detayları alınamadı';
    }
  },

  createIssue: async (issueData) => {
    try {
      // Hata ayıklama için tam gelen veriyi logla
      console.log('createIssue fonksiyonuna gelen orijinal veri:', JSON.stringify(issueData, null, 2));
      
      // Fotoğraf boyutlarını kontrol et
      let totalImagesSize = 0;
      let hasJpgImage = false;
      
      if (issueData.images && Array.isArray(issueData.images)) {
        // Her bir görüntünün boyutunu kontrol et
        issueData.images.forEach((img, index) => {
          if (img && typeof img === 'string') {
            const imgSize = Math.round(img.length / 1024); // KB
            console.log(`Resim ${index + 1} boyutu: ~${imgSize} KB`);
            
            // JPG formatında bir görüntü olup olmadığını kontrol et
            if (img.startsWith('data:image/jpeg') || img.startsWith('data:image/jpg')) {
              hasJpgImage = true;
              console.log(`Resim ${index + 1} JPG formatında`);
            }
            
            totalImagesSize += imgSize;
          }
        });
        
        console.log(`Toplam resim boyutu: ~${totalImagesSize} KB, JPG görüntü var mı: ${hasJpgImage}`);
        
        // Toplam resim boyutu 3MB'dan büyükse ve JPG görüntüsü varsa, daha fazla optimize et
        if (totalImagesSize > 3 * 1024 && hasJpgImage) { // 3MB
          console.warn('Resim boyutu çok büyük ve JPG görüntü var! Ek optimizasyon uygulanacak.');
          
          // JPG görüntülerini daha fazla sıkıştır (sadece JPG'leri sıkıştır)
          issueData.images = issueData.images.map((img, index) => {
            if (img && typeof img === 'string' && (img.startsWith('data:image/jpeg') || img.startsWith('data:image/jpg'))) {
              // Canvas kullanarak tekrar sıkıştır
              try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const tempImg = new Image();
                
                // Senkron çalıştığı için Promise formatında yapmalıyız
                tempImg.onload = () => {
                  const maxWidth = 400; // JPG için maksimum 400px genişlik
                  
                  // Oranları hesapla
                  let width = tempImg.width;
                  let height = tempImg.height;
                  
                  if (width > maxWidth) {
                    const ratio = maxWidth / width;
                    width = maxWidth;
                    height = Math.round(height * ratio);
                  }
                  
                  canvas.width = width;
                  canvas.height = height;
                  
                  // Arka planı beyaz yap (şeffaflık sorunları için)
                  ctx.fillStyle = '#FFFFFF';
                  ctx.fillRect(0, 0, width, height);
                  
                  // Görüntüyü çiz
                  ctx.drawImage(tempImg, 0, 0, width, height);
                };
                
                tempImg.src = img;
                
                // Canvas tamamen yüklenmesi için biraz bekleyelim
                setTimeout(() => {
                  // Çok düşük kalite (0.4) ile sıkıştır
                  const optimizedJpg = canvas.toDataURL('image/jpeg', 0.4);
                  console.log(`API - Resim ${index + 1} yeniden optimize edildi: ${Math.round(optimizedJpg.length / 1024)} KB`);
                  return optimizedJpg;
                }, 100);
              } catch (error) {
                console.error(`API - Resim ${index + 1} optimizasyon hatası:`, error);
                return img; // Hata durumunda orijinal görüntüyü kullan
              }
            }
            return img; // PNG ve diğer formatları değiştirme
          });
          
          // Yeniden boyut kontrolü
          totalImagesSize = issueData.images.reduce((total, img) => {
            return total + (img ? Math.round(img.length / 1024) : 0);
          }, 0);
          console.log(`API - Toplam resim boyutu (yeniden optimize sonrası): ~${totalImagesSize} KB`);
        }
      }
      
      // Veriyi klonla, asıl veriyi değiştirmemek için
      const processedData = JSON.parse(JSON.stringify(issueData));
      
      // Verinin doğru formatta olduğundan emin olalım
      if (!processedData.location) {
        processedData.location = {};
      }

      // Location bilgilerinin doğruluğunu kontrol et
      if (processedData.location) {
        // Şehir bilgisinin ayarlanması
        if (!processedData.location.city && processedData.city) {
          processedData.location.city = processedData.city;
        }
        
        // Koordinatların doğru formatta olduğunu kontrol et ([longitude, latitude])
        if (processedData.location.coordinates && Array.isArray(processedData.location.coordinates)) {
          // Koordinatlar array ama sayı değil ise sayıya dönüştür
          processedData.location.coordinates = processedData.location.coordinates.map(coord => 
            typeof coord === 'string' ? parseFloat(coord) : coord
          );
          
          console.log('İşlenmiş koordinatlar:', processedData.location.coordinates);
        }
        
        // Konum tipi belirtilmemişse ekle
        if (!processedData.location.type) {
          processedData.location.type = 'Point';
        }
      }
      
      // Fotoğraflar varsa base64 formatında olduğundan emin ol
      if (processedData.images && Array.isArray(processedData.images)) {
        // Base64 formatında olduğundan emin ol
        processedData.images = processedData.images.filter(img => img && (typeof img === 'string'));
        
        // Desteklenen formatları kontrol et ve prefix ekle
        processedData.images = processedData.images.map(img => {
          // Desteklenen görüntü formatlarını kontrol et
          if (img.startsWith('data:image/jpeg') || img.startsWith('data:image/jpg') || img.startsWith('data:image/png')) {
            // Base64 öneki doğru formatta, bu şekilde gönder
            console.log(`Görüntü formatı: ${img.substring(5, 15)}...`);
            return img;
          } else if (img.startsWith('data:image')) {
            // Tanımlanamayan format ama base64 olduğu belli, JPEG olarak varsay
            console.log('Bilinmeyen görüntü formatı, JPEG olarak varsayılıyor');
            return img;
          } else {
            // Öneki yoksa, JPEG olarak varsay
            console.log('Öneksiz görüntü, JPEG olarak önekleniyor');
            return `data:image/jpeg;base64,${img}`;
          }
        });
        
        console.log(`${processedData.images.length} adet fotoğraf gönderilecek`);
        
        // Tüm fotoğrafların doğru formatta olduğunu bir kez daha kontrol et
        const validImages = processedData.images.filter(img => 
          img.startsWith('data:image/jpeg') || 
          img.startsWith('data:image/jpg') || 
          img.startsWith('data:image/png')
        );
        
        if (validImages.length !== processedData.images.length) {
          console.warn(`${processedData.images.length - validImages.length} adet geçersiz format tespit edildi ve temizlendi`);
          processedData.images = validImages;
        }
        
        // JPG görüntüsü varsa ve toplam boyut büyükse, sadece küçük boyutlu dosyalar gönder
        if (hasJpgImage && totalImagesSize > 2 * 1024) { // 2MB
          // En fazla 2 görüntü ile sınırla
          console.warn('Boyut sınırlaması uygulanıyor - maksimum 2 görüntü gönderilecek');
          processedData.images = processedData.images.slice(0, 2);
        }
      }
      
      // console.log('API\'ye gönderilecek işlenmiş veri:', JSON.stringify(processedData, null, 2));
      // İstek verilerinin boyutunu yazdır
      console.log(`İstek boyutu: ~${Math.round(JSON.stringify(processedData).length / 1024)} KB`);
      
      // Zaman aşımını arttıralım
      const customConfig = {
        timeout: hasJpgImage ? 120000 : 60000, // JPG varsa 120 saniye, yoksa 60 saniye
        maxRedirects: 5,
        headers: {
          'Content-Type': 'application/json'
        }
      };
      
      // API isteğini gönder
      console.log('API isteği gönderiliyor...');
      const response = await apiClient.post('/issues', processedData, {
        ...customConfig,
        onUploadProgress: (progressEvent) => {
          console.log(`Yükleniyor: ${Math.round((progressEvent.loaded * 100) / progressEvent.total)}%`);
        }
      });
      
      console.log('API yanıtı başarılı:', response.data);
      return response.data;
    } catch (error) {
      console.error('API - Issue oluşturma hatası:', error);
      
      // Hata detaylarını konsola yazdır
      if (error.response) {
        console.error('API - Sunucu yanıtı:', error.response.data);
        console.error('API - Durum kodu:', error.response.status);
        
        // Spesifik hata türlerine göre mesajlar
        if (error.response.status === 413) {
          throw 'Fotoğraflar çok büyük! Lütfen daha küçük boyutlu veya daha az sayıda fotoğraf yükleyin.';
        } else if (error.response.status === 400) {
          // Görüntü formatlarıyla ilgili bir hata olabilir
          const errorMessage = error.response.data?.message || '';
          if (errorMessage.toLowerCase().includes('fotoğraf') || errorMessage.toLowerCase().includes('image')) {
            throw `Fotoğraf hatası: ${errorMessage}`;
          }
          throw error.response.data?.message || 'Geçersiz veri formatı. Lütfen alanları kontrol edin.';
        } else if (error.response.status === 401) {
          throw 'Oturum süresi dolmuş olabilir. Lütfen tekrar giriş yapın.';
        } else if (error.response.status >= 500) {
          throw 'Sunucuda bir hata oluştu. Lütfen daha sonra tekrar deneyin.';
        }
        
        // Hata mesajını döndür (varsa)
        if (error.response.data && error.response.data.message) {
          throw error.response.data.message;
        } else {
          throw `Sunucu hatası: ${error.response.status}`;
        }
      } else if (error.code === 'ECONNABORTED') {
        console.error('API - İstek zaman aşımına uğradı');
        throw 'JPG formatındaki fotoğraflar çok büyük olabilir. Lütfen daha düşük çözünürlüklü veya PNG formatında fotoğraf yüklemeyi deneyin.';
      } else if (error.request) {
        console.error('API - İstek gönderildi ama yanıt alınamadı:', error.request);
        throw 'JPG formatındaki fotoğraflar işlenirken sorun oluştu. Lütfen PNG formatında fotoğraf kullanın veya daha sonra tekrar deneyin.';
      } else {
        console.error('API - İstek oluşturulurken hata:', error.message);
        throw error.message || 'Sorun oluşturulamadı: İstek hatası';
      }
    }
  },

  updateIssue: async (id, issueData) => {
    try {
      const response = await apiClient.put(`/issues/${id}`, issueData);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Sorun güncellenemedi';
    }
  },

  getUserIssues: async () => {
    try {
      const response = await apiClient.get('/issues/myissues');
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Kullanıcının sorunları alınamadı';
    }
  },

  upvoteIssue: async (id) => {
    try {
      const response = await apiClient.put(`/issues/${id}/upvote`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Oy verilemedi';
    }
  },

  addComment: async (id, comment) => {
    try {
      const response = await apiClient.post(`/issues/${id}/comments`, { content: comment });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Yorum eklenemedi';
    }
  },
  
  // Yoruma cevap verme fonksiyonu
  addReply: async (issueId, commentId, replyText) => {
    try {
      const response = await apiClient.post(`/issues/${issueId}/comments/${commentId}/replies`, { 
        content: replyText 
      });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Cevap eklenemedi';
    }
  },
  
  // Yorum beğenme fonksiyonu
  likeComment: async (issueId, commentId, isReply = false) => {
    try {
      const endpoint = isReply 
        ? `/issues/${issueId}/comments/replies/${commentId}/like` 
        : `/issues/${issueId}/comments/${commentId}/like`;
        
      const response = await apiClient.put(endpoint);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Yorum beğenilemedi';
    }
  }
};

// Admin API servisleri
export const adminService = {
  getDashboardStats: async () => {
    try {
      const response = await apiClient.get('/admin/dashboard');
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'İstatistikler alınamadı';
    }
  },

  getAllUsers: async () => {
    try {
      const response = await apiClient.get('/admin/users');
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Kullanıcılar alınamadı';
    }
  },

  updateUserRole: async (userId, role) => {
    try {
      const response = await apiClient.put(`/admin/users/${userId}/role`, { role });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Kullanıcı rolü güncellenemedi';
    }
  },
  
  // Sorun detaylarını getir
  getIssueById: async (issueId) => {
    try {
      const response = await apiClient.get(`/admin/issues/${issueId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Sorun detayları alınamadı';
    }
  },
  
  // Raporları getir
  getReports: async (timeRange = 'last30days') => {
    try {
      const response = await apiClient.get('/admin/reports', {
        params: { timeRange }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Raporlar alınamadı';
    }
  },
  
  // Sorun durumunu güncelle
  updateIssueStatus: async (issueId, status) => {
    try {
      const response = await apiClient.put(`/admin/issues/${issueId}/status`, { status });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Sorun durumu güncellenemedi';
    }
  },
  
  // Resmi yanıt ekle
  addOfficialResponse: async (issueId, responseText) => {
    try {
      const response = await apiClient.post(`/admin/issues/${issueId}/response`, { response: responseText });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Resmi yanıt eklenemedi';
    }
  },
  
  // Çalışan ata
  assignWorker: async (issueId, workerId) => {
    try {
      const response = await apiClient.put(`/admin/issues/${issueId}/assign`, { workerId });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Çalışan atanamadı';
    }
  },
  
  // Çalışanları getir
  getWorkers: async () => {
    try {
      const response = await apiClient.get('/admin/workers');
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Çalışanlar alınamadı';
    }
  },
  
  // Yorum ekle (belediye çalışanı olarak)
  addComment: async (issueId, commentText) => {
    try {
      const response = await apiClient.post(`/issues/${issueId}/comments`, { 
        content: commentText 
      });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Yorum eklenemedi';
    }
  }
};

export default apiClient; 