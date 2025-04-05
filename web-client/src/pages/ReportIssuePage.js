import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { issueService } from '../services/api';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { toast } from 'react-hot-toast';

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

const LocationMarker = ({ position, setPosition }) => {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return position ? <Marker position={position} /> : null;
};

const ReportIssuePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    
    // Preview images
    const newPreviewImages = files.map(file => URL.createObjectURL(file));
    setPreviewImages(prev => [...prev, ...newPreviewImages]);
    
    // Store files for later upload
    setFormData(prev => ({ 
      ...prev, 
      images: [...prev.images, ...files] 
    }));
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
      
      // Lokasyon nesnesini düzgün formatta oluştur
      const locationData = {
        address: formData.address.trim(),
        district: formData.district.trim(),
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
        images: formData.images
      };
      
      // API isteği gönder
      const response = await issueService.createIssue(issueData);
      console.log('Sorun bildirimi başarılı:', response);
      
      toast.success('Sorun başarıyla bildirildi');
      navigate('/');
    } catch (error) {
      console.log('Sorun bildirilirken hata:', error);
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
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Haritadan Konum Seçin*
              </label>
              <div className="h-[300px] w-full rounded-lg overflow-hidden border border-gray-300">
                <MapContainer center={[41.0082, 28.9784]} zoom={13} style={{ height: '100%', width: '100%' }}>
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <LocationMarker position={position} setPosition={setPosition} />
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