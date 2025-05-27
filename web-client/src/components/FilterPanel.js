import React, { useState, useEffect, useRef } from 'react';
import { FiFilter, FiChevronDown, FiChevronUp, FiSearch } from 'react-icons/fi';

// Kategoriler
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

// Durum filtresi seçenekleri
const statusOptions = [
  'Tümü',
  'Yeni',
  'İnceleniyor',
  'Çözüldü',
  'Reddedildi'
];

// Sıralama seçenekleri
const sortOptions = [
  { value: 'newest', label: 'En Yeni' },
  { value: 'oldest', label: 'En Eski' },
  { value: 'upvotes', label: 'En Çok Oylanan' },
  { value: 'severity', label: 'Önem Derecesi' },
  { value: 'most_comments', label: 'En Çok Yorumlanan' }
];

const FilterPanel = ({ 
  filters, 
  setFilters, 
  sortBy, 
  setSortBy, 
  applyFilters, 
  resetFilters,
  showAllCities,
  onToggleAllCities,
  userCity
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [localShowAllCities, setLocalShowAllCities] = useState(showAllCities);
  const [localSearch, setLocalSearch] = useState(filters.search);
  const debounceTimerRef = useRef(null);
  
  // showAllCities prop değiştiğinde yerel state'i güncelle
  useEffect(() => {
    setLocalShowAllCities(showAllCities);
  }, [showAllCities]);
  
  // filters.search değiştiğinde localSearch'ü güncelle (dışarıdan gelen değişiklikler için)
  useEffect(() => {
    setLocalSearch(filters.search);
  }, [filters.search]);

  // Component unmount olduğunda debounce timer'ı temizle
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    
    // Eğer arama alanı ise, local state'i güncelle ama global state'i hemen güncelleme
    if (name === 'search') {
      setLocalSearch(value);
      
      // Önceki timer'ı temizle
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      // Yeni timer başlat - kullanıcı yazmayı bıraktıktan 800ms sonra filtreleri uygula
      debounceTimerRef.current = setTimeout(() => {
        setFilters(prev => ({ ...prev, search: value }));
        applyFilters();
      }, 800);
    } else {
      // Diğer filtreler için normal davran
      setFilters(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  // Enter tuşuna basıldığında filtreleri uygula
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      // Timeout'u temizle
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      // Filtreleri hemen uygula
      setFilters(prev => ({ ...prev, search: localSearch }));
      applyFilters();
    }
  };
  
  // Arama butonuna tıklandığında filtreleri uygula
  const handleSearchButtonClick = () => {
    // Timeout'u temizle
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Filtreleri hemen uygula
    setFilters(prev => ({ ...prev, search: localSearch }));
    applyFilters();
  };

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
  };

  // Tüm şehirler butonuna tıklandığında filtreleri güncelle
  const handleAllCitiesToggle = () => {
    const newState = !localShowAllCities;
    setLocalShowAllCities(newState);
    
    // Parent bileşene durumu bildir
    if (onToggleAllCities) {
      onToggleAllCities(newState);
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-4 mb-6 relative">
      {/* Filter toggle button for mobile */}
      <div className="md:hidden mb-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full flex items-center justify-between bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg transition"
        >
          <span className="flex items-center">
            <FiFilter className="mr-2" />
            Filtreler
          </span>
          {showFilters ? <FiChevronUp /> : <FiChevronDown />}
        </button>
      </div>

      {/* Tüm Şehirler Butonu - Toggle şeklinde */}
      <div className="mb-4">
        <button
          onClick={handleAllCitiesToggle}
          className={`flex items-center justify-center py-2 px-4 rounded-lg transition w-full md:w-auto font-medium ${
            localShowAllCities 
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
          }`}
        >
          <span className="mr-2">
            {localShowAllCities ? 'Tüm Şehirler (Açık)' : 'Tüm Şehirler (Kapalı)'}
          </span>
          <span className={`inline-block w-3 h-3 rounded-full ${localShowAllCities ? 'bg-white' : 'bg-gray-500'}`}></span>
        </button>
      </div>
      
      {/* Şehir bilgisi eksikse ve tüm şehirler kapalıysa uyarı göster */}
      {!localShowAllCities && !userCity && (
        <div className="mb-4 p-3 bg-yellow-100 text-yellow-800 rounded-lg">
          <p className="text-sm">
            Profil sayfanızdan şehir bilgisi eklemediğiniz için tüm şehirlerdeki sorunlar gösteriliyor. 
            Kendi şehrinize ait sorunları görmek için profil sayfanızdan şehir bilgisi ekleyebilirsiniz.
          </p>
        </div>
      )}
      
      {/* Şehir bilgisi varsa ve tüm şehirler kapalıysa bilgi göster */}
      {!localShowAllCities && userCity && (
        <div className="mb-4 p-3 bg-blue-100 text-blue-800 rounded-lg">
          <p className="text-sm">
            Şu anda sadece <strong>{userCity}</strong> şehrine ait sorunlar gösteriliyor.
          </p>
        </div>
      )}

      <div className={`${showFilters ? 'block' : 'hidden'} md:block`}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {/* Arama */}
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="search">
              Ara
            </label>
            <div className="relative">
              <input
                type="text"
                id="search"
                name="search"
                value={localSearch}
                onChange={handleFilterChange}
                onKeyDown={handleSearchKeyDown}
                placeholder="Başlık, açıklama veya adrese göre ara"
                className="shadow appearance-none border border-gray-300 rounded w-full py-2 px-3 pr-10 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              />
              <button 
                onClick={handleSearchButtonClick}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-700 hover:text-blue-600"
                title="Ara"
              >
                <FiSearch />
              </button>
            </div>
          </div>
          
          {/* Kategori */}
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
          
          {/* Durum */}
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
              {statusOptions.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          
          {/* Sıralama */}
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="sortBy">
              Sırala
            </label>
            <select
              id="sortBy"
              name="sortBy"
              value={sortBy}
              onChange={handleSortChange}
              className="shadow appearance-none border border-gray-300 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Filtre Butonları */}
        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 mt-4 pt-4 border-t">
          <button
            onClick={resetFilters}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition"
          >
            Filtreleri Temizle
          </button>
          <button
            onClick={applyFilters}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition"
          >
            Filtreleri Uygula
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterPanel; 