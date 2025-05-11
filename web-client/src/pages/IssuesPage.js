import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { useAuth } from '../hooks/useAuth';
import { issueService } from '../services/api';
import FilterPanel from '../components/FilterPanel';

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
  const map = useMap();

  const locateUser = () => {
    setIsLocating(true);
    map.locate({ setView: true, maxZoom: 13 });
  };

  useEffect(() => {
    map.on('locationfound', (e) => {
      setPosition(e.latlng);
      setIsLocating(false);
      if (onLocationFound) {
        onLocationFound(e.latlng);
      }
    });

    map.on('locationerror', (e) => {
      console.error('Konum bulunamadı:', e.message);
      alert('Konumunuz bulunamadı. Lütfen konum izinlerinizi kontrol edin.');
      setIsLocating(false);
    });

    return () => {
      map.off('locationfound');
      map.off('locationerror');
    };
  }, [map, onLocationFound]);

  return (
    <div className="leaflet-top leaflet-right" style={{ marginTop: '80px', marginRight: '10px' }}>
      <div className="leaflet-control leaflet-bar">
        <button 
          onClick={locateUser}
          className="bg-white p-2 rounded-lg shadow flex items-center justify-center"
          title="Konumumu göster"
          disabled={isLocating}
        >
          {isLocating ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </button>
      </div>
      {position && (
        <Marker position={position} icon={userLocationIcon}>
          <Popup>Bulunduğunuz konum</Popup>
        </Marker>
      )}
    </div>
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
  
  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    category: 'Tümü',
    status: 'Tümü',
    district: ''
  });

  // Sort state
  const [sortBy, setSortBy] = useState('newest');

  // Memoize API query params to avoid unnecessary re-renders
  const apiQueryParams = useMemo(() => {
    const params = {};
    
    if (filters.search) params.search = filters.search;
    if (filters.category !== 'Tümü') params.category = filters.category;
    if (filters.status !== 'Tümü') params.status = filters.status;
    if (filters.district) params.district = filters.district;
    
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
    setIsApplyingFilters(true);
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      search: '',
      category: 'Tümü',
      status: 'Tümü',
      district: ''
    });
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

      {/* Gelişmiş filtreleme paneli */}
      <FilterPanel 
        filters={filters} 
        setFilters={setFilters} 
        sortBy={sortBy} 
        setSortBy={setSortBy} 
        districts={districts}
        applyFilters={applyFilters}
        resetFilters={resetFilters}
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