import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { useAuth } from '../hooks/useAuth';
import { issueService } from '../services/api';

// Leaflet default icon fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Placeholder resimleri için daha güvenilir bir kaynak kullan
const placeholderImage = 'https://placehold.co/500x500/eee/999?text=Resim+Yok';

// Status Renk Kodları
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

// Severity Renk Kodları
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

// Status Translation
const statusTranslation = {
  'pending': 'Yeni',
  'in_progress': 'İnceleniyor',
  'resolved': 'Çözüldü',
  'rejected': 'Reddedildi'
};

// Severity Translation
const severityTranslation = {
  'low': 'Düşük',
  'medium': 'Orta',
  'high': 'Yüksek',
  'critical': 'Kritik'
};

const categories = [
  'Tümü',
  'Altyapı',
  'Üstyapı',
  'Çevre',
  'Ulaşım',
  'Güvenlik',
  'Temizlik',
  'Diğer'
];

const statuses = [
  'Tümü',
  'Yeni',
  'İnceleniyor',
  'Çözüldü',
  'Reddedildi'
];

const IssuesPage = () => {
  const { user } = useAuth();
  const [issues, setIssues] = useState([]);
  const [filteredIssues, setFilteredIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'
  
  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    category: 'Tümü',
    status: 'Tümü',
    district: ''
  });

  // Sort state
  const [sortBy, setSortBy] = useState('newest');

  // Kullanıcının şehri değiştiğinde artık filtre uygulamıyoruz
  useEffect(() => {
    console.log('Tüm şehirlerdeki sorunlar gösteriliyor');
  }, [user]);

  // Get issues from API
  useEffect(() => {
    const fetchIssues = async () => {
      try {
        setLoading(true);
        
        // Tüm sorunları getir, filtre yok
        console.log('Tüm sorunlar getiriliyor, filtreleme yok');
        const response = await issueService.getAllIssues();
        
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
        } else {
          setError('Sorunlar yüklenemedi');
        }
      } catch (err) {
        console.error('Sorunlar yüklenirken hata:', err);
        setError('Sorunlar yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };

    fetchIssues();
  }, []);

  // Apply filters - şehir filtresi kaldırıldı
  useEffect(() => {
    let result = [...issues];
    
    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(issue => 
        issue.title.toLowerCase().includes(searchLower) ||
        issue.description.toLowerCase().includes(searchLower) ||
        (issue.location && issue.location.address && issue.location.address.toLowerCase().includes(searchLower))
      );
    }
    
    // Apply category filter
    if (filters.category !== 'Tümü') {
      result = result.filter(issue => {
        const category = issue.category || '';
        return category.toLowerCase() === filters.category.toLowerCase();
      });
    }
    
    // Apply status filter
    if (filters.status !== 'Tümü') {
      result = result.filter(issue => {
        const status = issue.status || '';
        const translatedStatus = statusTranslation[status] || status;
        return translatedStatus === filters.status;
      });
    }
    
    // Apply district filter
    if (filters.district) {
      result = result.filter(issue => 
        issue.location && 
        issue.location.district && 
        issue.location.district.toLowerCase().includes(filters.district.toLowerCase())
      );
    }
    
    // Apply sorting
    result = sortIssues(result, sortBy);
    
    console.log('Filtrelenmiş sonuç sayısı:', result.length);
    setFilteredIssues(result);
  }, [issues, filters, sortBy]);

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle sort changes
  const handleSortChange = (e) => {
    setSortBy(e.target.value);
  };

  // Sort issues based on criteria
  const sortIssues = (issues, criteria) => {
    const sorted = [...issues];
    
    switch (criteria) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      case 'upvotes':
        return sorted.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
      case 'severity':
        const severityOrder = { 'critical': 3, 'high': 2, 'medium': 1, 'low': 0 };
        return sorted.sort((a, b) => {
          const severityA = a.severity || 'low';
          const severityB = b.severity || 'low';
          return severityOrder[severityB] - severityOrder[severityA];
        });
      default:
        return sorted;
    }
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

      {/* Şehir filtresi kaldırıldı */}

      {/* Filtreler */}
      <div className="bg-white shadow-md rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="search">
              Ara
            </label>
            <input
              type="text"
              id="search"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Başlık, açıklama veya adrese göre ara"
              className="shadow appearance-none border border-gray-300 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="category">
              Kategori
            </label>
            <select
              id="category"
              name="category"
              value={filters.category}
              onChange={handleFilterChange}
              className="shadow appearance-none border border-gray-300 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            >
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="status">
              Durum
            </label>
            <select
              id="status"
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="shadow appearance-none border border-gray-300 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            >
              {statuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="district">
              İlçe
            </label>
            <input
              type="text"
              id="district"
              name="district"
              value={filters.district}
              onChange={handleFilterChange}
              placeholder="İlçe adı girin"
              className="shadow appearance-none border border-gray-300 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
        </div>
      </div>

      {/* Görünüm ve Sıralama Seçenekleri */}
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
        
        <div className="flex items-center">
          <span className="text-gray-700 mr-2">Sırala:</span>
          <select
            value={sortBy}
            onChange={handleSortChange}
            className="shadow border border-gray-300 rounded-md py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          >
            <option value="newest">En Yeni</option>
            <option value="oldest">En Eski</option>
            <option value="upvotes">En Çok Oylanan</option>
            <option value="severity">Önem Derecesi</option>
          </select>
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
          {filteredIssues.map((issue) => (
            <div key={issue._id} className="bg-white shadow-md rounded-lg overflow-hidden">
              {issue.images && issue.images.length > 0 && (
                <div className="h-48 overflow-hidden">
                  <img
                    src={issue.images[0]}
                    alt={issue.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${statusColors[issue.status]}`}>
                      {getStatusDisplayText(issue.status)}
                    </span>
                    <span className={`inline-block ml-2 px-2 py-1 text-xs font-semibold rounded-full ${severityColors[issue.severity]}`}>
                      {getSeverityDisplayText(issue.severity)}
                    </span>
                  </div>
                  <span className="text-gray-500 text-sm">
                    {formatDate(issue.createdAt)}
                  </span>
                </div>
                
                <h2 className="text-xl font-semibold mb-2">
                  <Link to={`/issues/${issue._id}`} className="text-blue-600 hover:text-blue-800">
                    {issue.title}
                  </Link>
                </h2>
                
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {issue.description}
                </p>
                
                <div className="flex justify-between items-center">
                  <div className="text-gray-500 text-sm">
                    <span className="inline-block px-2 py-1 bg-gray-100 rounded-full text-xs mr-2">
                      {issue.category}
                    </span>
                    <span>{issue.location?.district}</span>
                  </div>
                  
                  <div className="flex items-center">
                    <button className="text-gray-500 hover:text-blue-600 mr-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <span className="text-gray-700 font-medium">{issue.upvotes || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Harita Görünümü */}
      {viewMode === 'map' && (
        <div className="bg-white shadow-md rounded-lg overflow-hidden h-[600px]">
          <MapContainer center={[41.0082, 28.9784]} zoom={12} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {filteredIssues.length > 0 ? (
              filteredIssues.map((issue) => {
                // Debug - konumları log'la
                console.log(`Haritada gösterilecek sorun: ${issue._id}`, issue.location.coordinates);
                
                // Her sorun için koordinatlar olduğunu garantiledik
                if (issue.location && issue.location.coordinates && 
                    Array.isArray(issue.location.coordinates) && 
                    issue.location.coordinates.length === 2) {
                  
                  let position;
                  
                  // Check if coordinates are numbers
                  const coord1 = parseFloat(issue.location.coordinates[0]);
                  const coord2 = parseFloat(issue.location.coordinates[1]);
                  
                  if (isNaN(coord1) || isNaN(coord2)) {
                    console.error(`Sorun ${issue._id} için geçersiz koordinatlar:`, issue.location.coordinates);
                    return null;
                  }
                  
                  // Leaflet [lat, lng] bekler, MongoDB [lng, lat] kullanır
                  // MongoDB GeoJSON spesifikasyonu: https://docs.mongodb.com/manual/reference/geojson/
                  position = [coord2, coord1];
                  console.log(`Sorun ${issue._id} için haritada kullanılan koordinatlar:`, position);
                  
                  return (
                    <Marker key={issue._id} position={position}>
                      <Popup>
                        <div className="w-60">
                          <div className="mb-2">
                            <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${statusColors[issue.status]}`}>
                              {getStatusDisplayText(issue.status)}
                            </span>
                            <span className={`inline-block ml-1 px-2 py-1 text-xs font-semibold rounded-full ${severityColors[issue.severity]}`}>
                              {getSeverityDisplayText(issue.severity)}
                            </span>
                          </div>
                          
                          <h3 className="text-lg font-semibold mb-1">{issue.title}</h3>
                          
                          <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                            {issue.description}
                          </p>
                          
                          <div className="text-xs text-gray-500 mb-2">
                            {issue.location.address}, {issue.location.district}
                          </div>
                          
                          <Link 
                            to={`/issues/${issue._id}`}
                            className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-1 px-2 rounded transition"
                          >
                            Detayları Gör
                          </Link>
                        </div>
                      </Popup>
                    </Marker>
                  );
                }
                return null;
              })
            ) : (
              // Filtrelenmiş sonuç yoksa mesaj göster
              <div className="absolute z-[1000] top-4 left-0 right-0 mx-auto w-max bg-white p-3 shadow-md rounded-lg">
                <p className="text-red-600">Filtreleme kriterlerine uygun sorun bulunamadı.</p>
              </div>
            )}
          </MapContainer>
        </div>
      )}

      {/* Sayfalama (ileride eklenebilir) */}
      {filteredIssues.length > 0 && (
        <div className="mt-8 flex justify-center">
          {/* Pagination component will be added here */}
        </div>
      )}

      {/* Sonuç Bulunamadı */}
      {filteredIssues.length === 0 && (
        <div className="bg-white shadow-md rounded-lg p-8 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold mb-2">Sonuç Bulunamadı</h3>
          <p className="text-gray-600 mb-4">
            Arama kriterlerinize uygun sorun bulunamadı. Lütfen farklı filtreler deneyin.
          </p>
          <button
            onClick={() => {
              setFilters({
                search: '',
                category: 'Tümü',
                status: 'Tümü',
                district: ''
              });
            }}
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