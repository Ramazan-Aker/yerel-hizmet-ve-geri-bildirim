import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { useAuth } from '../hooks/useAuth';
import { issueService } from '../services/api';
import FilterPanel from '../components/FilterPanel';
import { toast } from 'react-hot-toast';

// Leaflet default icon fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Mavi "kullanıcı konumu" ikonu
const userLocationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Harita içeriği güncelleyen bileşen
function MapUpdater({ issues }) {
  const map = useMap();
  
  useEffect(() => {
    if (issues && issues.length > 0) {
      try {
        const bounds = L.latLngBounds(
          issues.map(issue => {
            const coords = issue.location.coordinates;
            return [coords[1], coords[0]]; // Leaflet uses [lat, lng]
          })
        );
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
      } catch (err) {
        console.error('Harita sınırları ayarlanırken hata:', err);
        // Default Türkiye merkezi
        map.setView([39.9334, 32.8597], 6);
      }
    } else {
      // Default Türkiye merkezi
      map.setView([39.9334, 32.8597], 6);
    }
  }, [issues, map]);
  
  return null;
}

// Kullanıcının konumunu gösteren bileşen
const LocationMarker = ({ onLocationFound }) => {
  const [position, setPosition] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [accuracy, setAccuracy] = useState(null);
  const map = useMap();

  const locateUser = () => {
    setIsLocating(true);
    // Konum belirleme ayarlarını geliştir
    map.locate({ 
      setView: true, 
      maxZoom: 16, // Daha yakın zoom seviyesi
      timeout: 15000, // Daha uzun timeout
      enableHighAccuracy: true, // Yüksek doğruluk modu
      watch: true // Sürekli konum izleme - daha iyi sonuçlar için
    });
    
    console.log('Konum belirleniyor, yüksek doğruluk modu aktif');
  };

  useEffect(() => {
    // Konum bulunduğunda
    map.on('locationfound', (e) => {
      // Koordinatları 6 ondalık basamak hassasiyetle kaydet
      const preciseLat = parseFloat(e.latlng.lat.toFixed(6));
      const preciseLng = parseFloat(e.latlng.lng.toFixed(6));
      
      console.log(`Konum bulundu: ${preciseLat}, ${preciseLng}, doğruluk: ${e.accuracy} metre`);
      setPosition([preciseLat, preciseLng]);
      setAccuracy(e.accuracy);
      setIsLocating(false);
      
      // Kullanıcının konumu bulunduğunda pozisyonu bildiren callback'i çağır
      if (onLocationFound) {
        onLocationFound([preciseLat, preciseLng], e.accuracy);
      }
      
      // 5 saniye sonra izlemeyi durdur - tek seferlik konum için yeterli
      setTimeout(() => {
        map.stopLocate();
        console.log('Konum izleme durduruldu.');
      }, 5000);
    });

    // Konum bulunamadığında
    map.on('locationerror', (e) => {
      console.error('Konum bulunamadı:', e.message);
      setIsLocating(false);
      
      // Hata durumunda kullanıcıya bilgi ver
      toast.error('Konumunuz alınamadı: ' + e.message);
      
      // İzlemeyi durdur
      map.stopLocate();
    });

    return () => {
      // Cleanup
      map.off('locationfound');
      map.off('locationerror');
      map.stopLocate();
    };
  }, [map, onLocationFound]);

  return position === null ? (
    <div className="leaflet-control leaflet-control-locate">
      <button 
        onClick={locateUser} 
        className={`locate-button ${isLocating ? 'locating' : ''}`}
        disabled={isLocating}
        title="Konumumu bul"
      >
        {isLocating ? (
          <span className="spinner"></span>
        ) : (
          <span className="locate-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0 0 13 3.06V1h-2v2.06A8.994 8.994 0 0 0 3.06 11H1v2h2.06A8.994 8.994 0 0 0 11 20.94V23h2v-2.06A8.994 8.994 0 0 0 20.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
            </svg>
          </span>
        )}
      </button>
    </div>
  ) : (
    <>
      <Circle 
        center={position} 
        radius={accuracy} 
        pathOptions={{ 
          fillColor: '#3388ff', 
          fillOpacity: 0.15, 
          weight: 1, 
          color: '#3388ff' 
        }} 
      />
      <Marker position={position}>
        <Popup>
          <div>
            <p><strong>Konumunuz</strong></p>
            <p>Koordinatlar: {position[0].toFixed(6)}, {position[1].toFixed(6)}</p>
            {accuracy && (
              <p>Doğruluk: {accuracy.toFixed(0)} metre</p>
            )}
          </div>
        </Popup>
      </Marker>
    </>
  );
};

// Varsayılan görsel
const placeholderImage = 'https://via.placeholder.com/300x200?text=Görsel+Yok';

// Durumlar için renk kodları
const statusColors = {
  'Yeni': 'bg-blue-100 text-blue-800',
  'İnceleniyor': 'bg-yellow-100 text-yellow-800',
  'Çözüldü': 'bg-green-100 text-green-800',
  'Reddedildi': 'bg-red-100 text-red-800',
  'pending': 'bg-blue-100 text-blue-800',
  'in_progress': 'bg-yellow-100 text-yellow-800',
  'resolved': 'bg-green-100 text-green-800',
  'rejected': 'bg-red-100 text-red-800'
};

// Önem derecesi için renk kodları
const severityColors = {
  'Düşük': 'bg-gray-100 text-gray-800',
  'Orta': 'bg-yellow-100 text-yellow-800',
  'Yüksek': 'bg-orange-100 text-orange-800',
  'Kritik': 'bg-red-100 text-red-800',
  'low': 'bg-gray-100 text-gray-800',
  'medium': 'bg-yellow-100 text-yellow-800',
  'high': 'bg-orange-100 text-orange-800',
  'critical': 'bg-red-100 text-red-800'
};

// Durum çevirileri
const statusTranslation = {
  'pending': 'Yeni',
  'in_progress': 'İnceleniyor',
  'resolved': 'Çözüldü',
  'rejected': 'Reddedildi',
  'open': 'Yeni',
  'Yeni': 'Yeni',
  'İnceleniyor': 'İnceleniyor',
  'Çözüldü': 'Çözüldü',
  'Reddedildi': 'Reddedildi'
};

// Önem seviyesi çevirileri
const severityTranslation = {
  'low': 'Düşük',
  'medium': 'Orta',
  'high': 'Yüksek',
  'critical': 'Kritik',
  'Düşük': 'Düşük',
  'Orta': 'Orta',
  'Yüksek': 'Yüksek',
  'Kritik': 'Kritik'
};

// Türkiye'deki ilçeler listesi (örnek)
const allDistricts = [
  'Adalar', 'Arnavutköy', 'Ataşehir', 'Avcılar', 'Bağcılar', 'Bahçelievler', 
  'Bakırköy', 'Başakşehir', 'Bayrampaşa', 'Beşiktaş', 'Beykoz', 'Beylikdüzü', 
  'Beyoğlu', 'Büyükçekmece', 'Çatalca', 'Çekmeköy', 'Esenler', 'Esenyurt', 
  'Eyüp', 'Fatih', 'Gaziosmanpaşa', 'Güngören', 'Kadıköy', 'Kağıthane', 
  'Kartal', 'Küçükçekmece', 'Maltepe', 'Pendik', 'Sancaktepe', 'Sarıyer',
  'Silivri', 'Sultanbeyli', 'Sultangazi', 'Şile', 'Şişli', 'Tuzla', 
  'Ümraniye', 'Üsküdar', 'Zeytinburnu'
];

const IssuesPage = () => {
  const { user } = useAuth();
  const [issues, setIssues] = useState([]);
  const [filteredIssues, setFilteredIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'
  const [districts, setDistricts] = useState([]);
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);
  const [showAllCities, setShowAllCities] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    category: 'Tümü',
    status: 'Tümü',
    district: '',
    city: user?.city || '' // Varsayılan olarak kullanıcının şehrini kullan
  });

  // Sort state
  const [sortBy, setSortBy] = useState('newest');

  // Kullanıcı değiştiğinde şehir filtresini güncelle
  useEffect(() => {
    if (user && user.city && !showAllCities) {
      setFilters(prev => ({
        ...prev,
        city: user.city
      }));
      // Filtreleri uygula
      setIsApplyingFilters(true);
    }
  }, [user, showAllCities]);

  // Memoize API query params to avoid unnecessary re-renders
  const apiQueryParams = useMemo(() => {
    const params = {};
    
    if (filters.search) params.search = filters.search;
    if (filters.category !== 'Tümü') params.category = filters.category;
    if (filters.status !== 'Tümü') params.status = filters.status;
    if (filters.district) params.district = filters.district;
    if (filters.city) params.city = filters.city;
    
    // Sorting
    params.sort = sortBy;
    
    return params;
  }, [filters, sortBy]);

  // Fetch issues on first load or when filters are applied
  useEffect(() => {
    const fetchIssues = async () => {
      try {
        setLoading(true);
        
        console.log('Sorunlar için API isteği gönderiliyor, parametreler:', apiQueryParams);
        const response = await issueService.getAllIssues(apiQueryParams);
        
        if (response && response.data) {
          // Format issues data
          const formattedIssues = response.data.map(issue => {
            // Koordinatları düzgün formata getir
            let formattedIssue = {
              ...issue,
              // Use default placeholder if no images
              images: issue.images && issue.images.length > 0 ? issue.images : [placeholderImage]
            };
            
            // Eğer location.coordinates yoksa boş bir array ekle
            if (!formattedIssue.location || !formattedIssue.location.coordinates) {
              console.warn(`Sorun ID: ${issue._id} - Koordinatlar eksik. Varsayılan koordinatlar atanıyor.`);
              
              // Location objesi yoksa oluştur
              if (!formattedIssue.location) {
                formattedIssue.location = {};
              }
              
              // Varsayılan İstanbul koordinatları (dummy)
              formattedIssue.location.coordinates = [28.9784, 41.0082]; // [lng, lat] formatı
            }
            
            return formattedIssue;
          });
          
          setIssues(formattedIssues);
          setFilteredIssues(formattedIssues);
          console.log('Sorunlar başarıyla yüklendi:', formattedIssues.length);
          
          // Districleri topla
          const uniqueDistricts = [...new Set(
            formattedIssues
              .filter(issue => issue.location && issue.location.district)
              .map(issue => issue.location.district)
          )].sort();
          
          setDistricts(uniqueDistricts.length > 0 ? uniqueDistricts : allDistricts);
        } else {
          setError('Sorunlar yüklenemedi');
        }
      } catch (err) {
        console.error('Sorunlar yüklenirken hata:', err);
        setError('Sorunlar yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
        setIsApplyingFilters(false);
      }
    };

    fetchIssues();
  }, [apiQueryParams, isApplyingFilters]);

  // Apply filters function - triggers API call by changing isApplyingFilters
  const applyFilters = () => {
    // Gereksiz render'ları önlemek için mevcut durum kontrolü yapılır
    // Eğer zaten filtre uygulama durumundaysak tekrar tetiklenmesini önler
    if (!isApplyingFilters) {
    setIsApplyingFilters(true);
    }
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      search: '',
      category: 'Tümü',
      status: 'Tümü',
      district: '',
      city: user?.city || ''
    });
    
    // Filtreleri sıfırlama işleminden sonra uygula
    setIsApplyingFilters(true);
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  // Get status display text
  const getStatusDisplayText = (status) => {
    return statusTranslation[status] || status;
  };

  // Get severity display text
  const getSeverityDisplayText = (severity) => {
    return severityTranslation[severity] || severity;
  };

  // Tüm şehirler modunu değiştir
  const handleToggleAllCities = (isAllCitiesMode) => {
    setShowAllCities(isAllCitiesMode);
    if (!isAllCitiesMode && user?.city) {
      // Kullanıcının kendi şehrini filtrele
      setFilters(prev => ({
        ...prev,
        city: user.city
      }));
    } else {
      // Tüm şehirleri göster
      setFilters(prev => ({
        ...prev,
        city: ''
      }));
    }
    setIsApplyingFilters(true);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-3 text-gray-600">Sorunlar yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 text-red-700 p-4 rounded-lg">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Şehir Sorunları</h1>
        <Link
          to="/report-issue"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
        >
          + Yeni Sorun Bildir
        </Link>
      </div>

      <FilterPanel 
        filters={filters} 
        setFilters={setFilters} 
        sortBy={sortBy} 
        setSortBy={setSortBy} 
        districts={districts}
        applyFilters={applyFilters}
        resetFilters={resetFilters}
        showAllCities={showAllCities}
        onToggleAllCities={handleToggleAllCities}
        userCity={user?.city}
      />

      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <div className="mb-4 sm:mb-0">
          <span className="text-gray-700 mr-2">Görünüm:</span>
          <div className="inline-flex shadow-sm rounded-md">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 text-sm font-medium ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              } rounded-l-lg border border-gray-300`}
            >
              Liste
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-4 py-2 text-sm font-medium ${
                viewMode === 'map'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              } rounded-r-lg border border-gray-300 border-l-0`}
            >
              Harita
            </button>
          </div>
        </div>
      </div>

      {/* Sonuçlar */}
      <div className="mb-4">
        <p className="text-gray-600">
          {filteredIssues.length} sonuç bulundu
        </p>
      </div>

      {/* Liste Görünümü */}
      {viewMode === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredIssues.map(issue => (
            <Link 
              key={issue._id} 
              to={`/issues/${issue._id}`}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition"
            >
              <div className="relative h-48 overflow-hidden">
                  <img
                  src={issue.images && issue.images[0] ? issue.images[0] : placeholderImage} 
                    alt={issue.title}
                    className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = placeholderImage;
                  }}
                />
                <div className="absolute top-0 right-0 m-2 flex space-x-1">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[issue.status] || 'bg-gray-100 text-gray-800'}`}>
                      {getStatusDisplayText(issue.status)}
                    </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${severityColors[issue.severity] || 'bg-gray-100 text-gray-800'}`}>
                      {getSeverityDisplayText(issue.severity)}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <h2 className="text-xl font-semibold text-gray-800 mb-2 line-clamp-2">{issue.title}</h2>
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">{issue.description}</p>
                
                {/* Location information */}
                {issue.location && (issue.location.city || issue.location.district) && (
                  <div className="flex items-center mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    <p className="text-gray-500 text-sm">
                      {issue.location.district && issue.location.city 
                        ? `${issue.location.district}, ${issue.location.city}`
                        : issue.location.district || issue.location.city}
                    </p>
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">
                    {formatDate(issue.createdAt)}
                    </span>
                  <div className="flex items-center space-x-2">
                    <span className="flex items-center text-blue-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                      {issue.upvotes || 0}
                    </span>
                    <span className="flex items-center text-gray-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
                      </svg>
                      {issue.comments ? issue.comments.length : 0}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Harita Görünümü */}
      {viewMode === 'map' && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden" style={{ height: '70vh' }}>
          <MapContainer 
            center={[39.9334, 32.8597]} // Türkiye ortası
            zoom={6} 
            style={{ height: '100%', width: '100%' }}
            whenCreated={(map) => {
              // Auto-zoom to fit all markers when map is loaded
              if (filteredIssues.length > 0) {
                const bounds = L.latLngBounds(
                  filteredIssues.map(issue => {
                    const coords = issue.location.coordinates;
                    return [coords[1], coords[0]]; // Leaflet uses [lat, lng]
                  })
                );
                map.fitBounds(bounds, { padding: [50, 50] });
              }
            }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            <MapUpdater issues={filteredIssues} />
            <LocationMarker onLocationFound={(latlng) => console.log('Konum bulundu:', latlng)} />
            
            {filteredIssues.map(issue => {
              // Location coordinates are in [longitude, latitude] format in MongoDB
              // But Leaflet uses [latitude, longitude] format
              const position = issue.location && issue.location.coordinates ? 
                [issue.location.coordinates[1], issue.location.coordinates[0]] : 
                [41.0082, 28.9784]; // Default to Istanbul
                  
                  return (
                <Marker
                  key={issue._id}
                  position={position}
                >
                      <Popup>
                    <div className="w-64">
                      <div className="relative h-32 mb-2">
                        <img 
                          src={issue.images[0]} 
                          alt={issue.title}
                          className="w-full h-full object-cover rounded"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = placeholderImage;
                          }}
                        />
                      </div>
                      <h3 className="text-lg font-bold mb-1">{issue.title}</h3>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{issue.description}</p>
                      
                      {/* Location information */}
                      {issue.location && (issue.location.city || issue.location.district) && (
                        <div className="flex items-center mb-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                          </svg>
                          <p className="text-gray-500 text-xs">
                            {issue.location.district && issue.location.city 
                              ? `${issue.location.district}, ${issue.location.city}`
                              : issue.location.district || issue.location.city}
                          </p>
                        </div>
                      )}
                      
                      <div className="flex space-x-1 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[issue.status] || 'bg-gray-100 text-gray-800'}`}>
                              {getStatusDisplayText(issue.status)}
                            </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${severityColors[issue.severity] || 'bg-gray-100 text-gray-800'}`}>
                              {getSeverityDisplayText(issue.severity)}
                            </span>
                          </div>
                          <Link 
                            to={`/issues/${issue._id}`}
                        className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-center py-1 px-3 rounded"
                          >
                            Detayları Gör
                          </Link>
                        </div>
                      </Popup>
                    </Marker>
                  );
            })}
            
            {filteredIssues.length === 0 && (
              // Filtrelenmiş sonuç yoksa mesaj göster
              <div className="absolute z-[1000] top-4 left-0 right-0 mx-auto w-max bg-white p-3 shadow-md rounded-lg">
                <p className="text-red-600">Filtreleme kriterlerine uygun sorun bulunamadı.</p>
              </div>
            )}
          </MapContainer>
        </div>
      )}

      {/* Sonuç Bulunamadı */}
      {filteredIssues.length === 0 && (
        <div className="bg-white shadow-md rounded-lg p-8 text-center mt-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold mb-2">Sonuç Bulunamadı</h3>
          <p className="text-gray-600 mb-4">
            Arama kriterlerinize uygun sorun bulunamadı. Lütfen farklı filtreler deneyin.
          </p>
          <button
            onClick={resetFilters}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg transition"
          >
            Filtreleri Temizle
          </button>
        </div>
      )}
    </div>
  );
};

export default IssuesPage; 