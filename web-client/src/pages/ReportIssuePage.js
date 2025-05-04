import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { issueService } from '../services/api';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { toast } from 'react-hot-toast';
import { cityCoordinates } from '../data/cityCoordinates';
import { getAddressFromCoordinates, formatAddress, improveStreetInfo } from '../services/geocoding';

// Leaflet default icon fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon,
  shadowUrl: markerShadow,
});

const categories = [
  'Altyapı',
  'Üstyapı',
  'Çevre',
  'Ulaşım',
  'Güvenlik',
  'Temizlik',
  'Diğer'
];

const severities = [
  'Düşük',
  'Orta',
  'Yüksek',
  'Kritik'
];

// Haritanın merkez konumunu ayarlayan bileşen
const MapCenter = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 13);
    }
  }, [center, map]);
  return null;
};

const LocationMarker = ({ position, setPosition, setFormData }) => {
  const map = useMapEvents({
    click(e) {
      const newPosition = [e.latlng.lat, e.latlng.lng];
      setPosition(newPosition);
      
      // Yeni geocoding servisi ile adres bilgisini al
      fetchAddressInfo(newPosition[0], newPosition[1]);
    },
  });

  // Koordinatlardan adres bilgisini getir
  const fetchAddressInfo = async (lat, lng) => {
    try {
      console.log(`Koordinatlardan adres bilgisi getiriliyor: ${lat}, ${lng}`);
      toast.loading('Adres bilgisi alınıyor...', { id: 'geocoding' });
      
      // Gelişmiş geocoding servisi kullan
      const addressData = await getAddressFromCoordinates(lat, lng);
      console.log('Adres bilgisi alındı:', addressData);
      
      // Adres bilgisini temizle ve sadeleştir
      let simplifiedAddress = '';
      
      // 1. Önce mahalle bilgisi
      if (addressData.neighbourhood) {
        simplifiedAddress = addressData.neighbourhood;
        // "Mahallesi" ekle eğer yoksa
        if (!simplifiedAddress.includes('Mahal')) {
          simplifiedAddress += ' Mahallesi';
        }
      }
      
      // 2. Sonra ilçe (eğer mahalle ile aynı değilse)
      if (addressData.district && 
          addressData.district !== addressData.neighbourhood && 
          !simplifiedAddress.includes(addressData.district)) {
        simplifiedAddress += simplifiedAddress ? ', ' + addressData.district : addressData.district;
      }
      
      // 3. Son olarak şehir (eğer ilçe ile aynı değilse)
      if (addressData.city && 
          addressData.city !== addressData.district && 
          !simplifiedAddress.includes(addressData.city)) {
        simplifiedAddress += simplifiedAddress ? ', ' + addressData.city : addressData.city;
      }
      
      // Adresin kısa ve öz olduğundan emin ol
      simplifiedAddress = simplifiedAddress.replace(/,\s*,/g, ','); // Çift virgülleri temizle
      simplifiedAddress = simplifiedAddress.replace(/Mah\.\s+Mahallesi/g, 'Mahallesi'); // "Mah. Mahallesi" -> "Mahallesi"
      simplifiedAddress = simplifiedAddress.replace(/Mahallesi\s+Mahallesi/g, 'Mahallesi'); // "Mahallesi Mahallesi" -> "Mahallesi"
      
      // Eğer en az bir bilgi yoksa, daha basit bir şekilde ele al
      if (!simplifiedAddress) {
        const fullParts = (addressData.fullAddress || '').split(',');
        if (fullParts.length > 0) {
          // Sadece ilk iki kısmı al
          simplifiedAddress = fullParts.slice(0, 2).join(',');
        } else {
          simplifiedAddress = 'Konum belirlendi';
        }
      }
      
      console.log('Basitleştirilmiş adres:', simplifiedAddress);
      
      // Form verilerini güncelle
      setFormData(prev => ({
        ...prev,
        address: simplifiedAddress,
        district: addressData.district || ''
      }));
      
      console.log('Form verileri güncellendi:', {
        address: simplifiedAddress,
        district: addressData.district || ''
      });
      
      toast.success('Adres bilgisi alındı', { id: 'geocoding' });
    } catch (error) {
      console.error('Adres bilgisi getirme hatası:', error);
      toast.error('Adres bilgisi alınamadı. Lütfen manuel olarak girin.', { id: 'geocoding' });
    }
  };

  return position ? <Marker position={position} /> : null;
};

const ReportIssuePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [mapCenter, setMapCenter] = useState([41.0082, 28.9784]); // Varsayılan: İstanbul

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    severity: 'Orta',
    address: '',
    district: '',
    images: []
  });

  const [position, setPosition] = useState(null);
  const [previewImages, setPreviewImages] = useState([]);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Kullanıcının şehrine göre harita merkezini ayarla
  useEffect(() => {
    if (user && user.city) {
      const cityName = user.city.charAt(0).toUpperCase() + user.city.slice(1);
      if (cityCoordinates[cityName]) {
        // [longitude, latitude] formatından [latitude, longitude] formatına dönüştür
        const coords = cityCoordinates[cityName];
        setMapCenter([coords[1], coords[0]]);
        console.log(`Harita merkezi ${cityName} olarak ayarlandı:`, [coords[1], coords[0]]);
      }
    }
  }, [user]);

  // Form verilerini kullanıcı profil bilgileriyle başlat
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        city: user.city || ''
      }));
      console.log('Kullanıcı şehri form verisine atandı:', user.city);
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Şehir alanını manuel olarak değiştirmeye izin verme
    if (name === 'city') return;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    
    // Mevcut görüntü sayısını kontrol et
    const totalImages = previewImages.length + files.length;
    if (totalImages > 3) {
      toast.error(`En fazla 3 fotoğraf yükleyebilirsiniz (şu anda ${previewImages.length} fotoğraf seçili)`);
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
    toast.loading('Fotoğraflar yükleniyor...', { id: 'image-processing' });
    
    try {
      const processedImages = [];
      
      for (const file of files) {
        try {
          // Dosyayı base64'e dönüştür - hiçbir işlem yapmadan
        const reader = new FileReader();
          const base64Promise = new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error(`Dosya okunamadı: ${file.name}`));
        reader.readAsDataURL(file);
      });
          
          const base64 = await base64Promise;
          processedImages.push(base64);
          
        } catch (fileError) {
          console.error(`Dosya işleme hatası (${file.name}):`, fileError);
          // Hata durumunda devam et, diğer dosyaları işlemeye çalış
        }
      }
      
      if (processedImages.length > 0) {
        // Başarılı görüntüleri ekle
        setPreviewImages(prev => [...prev, ...processedImages]);
        
        // Form verilerini güncelle
      setFormData(prev => ({
        ...prev,
          images: [...prev.images, ...processedImages]
      }));
        
        toast.success(`${processedImages.length} fotoğraf başarıyla yüklendi`, { id: 'image-processing' });
      } else {
        toast.error('Hiçbir fotoğraf yüklenemedi', { id: 'image-processing' });
      }
      
    } catch (error) {
      console.error('Fotoğraf işleme hatası:', error);
      toast.error('Fotoğraflar işlenirken hata oluştu');
    }
  };

  const removeImage = (index) => {
    setPreviewImages(prev => prev.filter((_, i) => i !== index));
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('Form gönderiliyor, veriler:', {
      formData,
      position
    });

    // Form doğrulama
    setErrors({});
    
    if (!formData.title.trim()) {
      setErrors(prev => ({ ...prev, title: 'Başlık gereklidir' }));
      return;
    }
    
    if (!formData.description.trim()) {
      setErrors(prev => ({ ...prev, description: 'Açıklama gereklidir' }));
      return;
    }
    
    if (!formData.category) {
      setErrors(prev => ({ ...prev, category: 'Kategori seçilmelidir' }));
      return;
    }
    
    if (!formData.severity) {
      setErrors(prev => ({ ...prev, severity: 'Önem seviyesi seçilmelidir' }));
      return;
    }
    
    if (!formData.address?.trim() || !formData.district?.trim()) {
      setErrors(prev => ({ ...prev, location: 'Hem adres hem de ilçe bilgisi gereklidir' }));
      return;
    }
    
    if (!position) {
      setErrors(prev => ({ ...prev, location: 'Haritadan konum seçilmelidir' }));
      return;
    }

    // İstek verilerini hazırla
    try {
      setIsSubmitting(true);
      
      // Kullanıcı bilgisinden şehir alınıyor, yoksa İstanbul varsayılan değer
      const userCity = user?.city || 'İstanbul';
      console.log('Kullanıcı şehri:', userCity);
      
      // Lokasyon nesnesini düzgün formatta oluştur
      const locationData = {
        type: 'Point',
        address: formData.address.trim(),
        district: formData.district.trim(),
        city: userCity, // Kullanıcının profil bilgisinden şehir bilgisi
        coordinates: position ? [position[1], position[0]] : []
      };
      
      console.log('Gönderilecek location verisi:', locationData);
      
      // Form verilerini hazırla
      const issueData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        severity: formData.severity,
        location: locationData,
        images: formData.images || []
        // Status alanı belirtilmedi, backend varsayılanı kullanacak
      };
      
      console.log('Gönderilecek veri:', issueData);
      
      // API isteği gönder
      const response = await issueService.createIssue(issueData);
      console.log('Sorun bildirimi başarılı:', response);
      
      toast.success('Sorun başarıyla bildirildi');
      navigate('/');
    } catch (error) {
      console.error('Sorun bildirilirken hata:', error);
      toast.error(error || 'Sorun bildirilirken bir hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Yeni Sorun Bildir</h1>
      
      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Sol Kolon */}
          <div>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="title">
                Başlık*
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className={`shadow appearance-none border ${errors.title ? 'border-red-500' : 'border-gray-300'} rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline`}
                placeholder="Sorunun kısa başlığı"
              />
              {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="category">
                Kategori*
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className={`shadow appearance-none border ${errors.category ? 'border-red-500' : 'border-gray-300'} rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline`}
              >
                <option value="">Kategori Seçin</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="severity">
                Önem Derecesi
              </label>
              <select
                id="severity"
                name="severity"
                value={formData.severity}
                onChange={handleChange}
                className="shadow appearance-none border border-gray-300 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              >
                {severities.map(severity => (
                  <option key={severity} value={severity}>{severity}</option>
                ))}
              </select>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">
                Açıklama*
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className={`shadow appearance-none border ${errors.description ? 'border-red-500' : 'border-gray-300'} rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline`}
                placeholder="Sorunu detaylı açıklayın"
                rows="4"
              />
              {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="images">
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
                  id="images"
                  name="images"
                  onChange={handleImageChange}
                  multiple
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                />
                <span className="text-xs text-gray-500">En fazla 3 fotoğraf, her biri max 5MB</span>
              </div>
              
              {/* Fotoğraf sayısı bilgisi */}
              {previewImages.length > 0 && (
                <div className="mt-2 flex items-center">
                  <span className="text-sm text-gray-600">
                    {previewImages.length} fotoğraf seçildi ({3 - previewImages.length} fotoğraf daha ekleyebilirsiniz)
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
              
              {previewImages.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {previewImages.map((url, index) => (
                    <div key={index} className="relative">
                      <img 
                        src={url} 
                        alt={`Preview ${index + 1}`} 
                        className="w-16 h-16 object-cover rounded" 
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Sağ Kolon */}
          <div>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="address">
                Adres*
              </label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className={`shadow appearance-none border ${errors.address ? 'border-red-500' : 'border-gray-300'} rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline`}
                placeholder="Sorunun tam adresi"
              />
              {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="district">
                İlçe*
              </label>
              <input
                type="text"
                id="district"
                name="district"
                value={formData.district}
                onChange={handleChange}
                className={`shadow appearance-none border ${errors.district ? 'border-red-500' : 'border-gray-300'} rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline`}
                placeholder="İlçe"
              />
              {errors.district && <p className="text-red-500 text-xs mt-1">{errors.district}</p>}
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="city">
                Şehir (Otomatik)
              </label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city || (user?.city || 'İstanbul')}
                disabled
                className="shadow appearance-none border border-gray-300 rounded w-full py-2 px-3 text-gray-500 leading-tight bg-gray-100"
              />
              <p className="text-xs text-gray-500 mt-1">
                Şehir bilgisi profilinizden otomatik olarak alınmaktadır.
              </p>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Haritadan Konum Seçin*
              </label>
              <div className="h-[300px] w-full rounded-lg overflow-hidden border border-gray-300">
                <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <LocationMarker position={position} setPosition={setPosition} setFormData={setFormData} />
                  <MapCenter center={mapCenter} />
                </MapContainer>
              </div>
              {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location}</p>}
              {position && (
                <p className="text-xs text-gray-500 mt-1">
                  Seçilen konum: {position[0].toFixed(6)}, {position[1].toFixed(6)}
                </p>
              )}
            </div>
          </div>
        </div>
        
        {errors.submit && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {errors.submit}
          </div>
        )}
        
        <div className="flex justify-end mt-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mr-4 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg transition"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg disabled:opacity-50 transition"
          >
            {isSubmitting ? 'Gönderiliyor...' : 'Sorun Bildir'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReportIssuePage; 