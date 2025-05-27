import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Image,
  ScrollView,
  Dimensions,
  SafeAreaView,
  StatusBar,
  Alert,
  Platform,
  ActionSheetIOS,
  Modal
} from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import { useAuth } from '../hooks/useAuth';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import api from '../utils/api';
import { useFocusEffect } from '@react-navigation/native';
import moment from 'moment';

const { width } = Dimensions.get('window');

const IssuesScreen = ({ navigation }) => {
  const { user, isOffline, checkConnection } = useAuth();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' veya 'map'
  const [isDemoMode, setIsDemoMode] = useState(false);
  
  // Konum state'leri
  const [userLocation, setUserLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: 39.0128, // Türkiye'nin merkezi (yaklaşık)
    longitude: 35.9632,
    latitudeDelta: 5,
    longitudeDelta: 5,
  });

  // Filtre durumları
  const [filters, setFilters] = useState({
    search: '',
    category: 'Tümü',
    status: 'Tümü',
    district: ''
  });

  // Sıralama seçeneği
  const [sortBy, setSortBy] = useState('newest');
  
  // Tüm şehirleri göster - varsayılan olarak kapalı (kullanıcı önce kendi şehrini görsün)
  const [showAllCities, setShowAllCities] = useState(false);

  // Filtrelenmiş sorunlar
  const [filteredIssues, setFilteredIssues] = useState([]);

  // Dropdown modal states
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [dropdownTitle, setDropdownTitle] = useState('');
  const [dropdownOptions, setDropdownOptions] = useState([]);
  const [dropdownCallback, setDropdownCallback] = useState(null);

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

  // Durumlar
  const statuses = [
    'Tümü',
    'Yeni',
    'İnceleniyor',
    'Çözüldü',
    'Reddedildi'
  ];

  // Status çevirisi
  const statusTranslation = {
    'pending': 'Yeni',
    'in_progress': 'İnceleniyor',
    'resolved': 'Çözüldü',
    'rejected': 'Reddedildi'
  };

  // RNPickerSelect için kategoriler
  const categoryItems = categories.map(category => ({
    label: category,
    value: category,
    key: `category-${category}`
  }));

  // RNPickerSelect için durumlar
  const statusItems = statuses.map(status => ({
    label: status,
    value: status,
    key: `status-${status}`
  }));

  // RNPickerSelect için sıralama seçenekleri
  const sortByItems = [
    { label: 'En Yeni', value: 'newest', key: 'sort-newest' },
    { label: 'En Eski', value: 'oldest', key: 'sort-oldest' },
    { label: 'En Çok Oy', value: 'upvotes', key: 'sort-upvotes' }
  ];

  // Picker style
  const pickerSelectStyles = StyleSheet.create({
    inputIOS: {
      fontSize: 14,
      paddingVertical: 12,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: '#ccc',
      borderRadius: 6,
      color: '#000000',
      paddingRight: 30,
      backgroundColor: '#ffffff',
      width: 160,
      height: 45,
      fontWeight: '500'
    },
    inputAndroid: {
      fontSize: 14,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: '#ccc',
      borderRadius: 6,
      color: '#000000',
      paddingRight: 30,
      backgroundColor: '#ffffff',
      width: 160,
      height: 45,
      fontWeight: '500'
    },
    iconContainer: {
      top: 12,
      right: 10,
    },
    viewContainer: {
      backgroundColor: '#ffffff',
      borderRadius: 6,
    }
  });

  // Görüntü optimizasyonu için yardımcı fonksiyonlar
  const getOptimizedImageUrl = (imageUrl, width = 300) => {
    if (!imageUrl) return null;
    
    // URL formatını kontrol et
    if (typeof imageUrl !== 'string') {
      console.warn('Geçersiz görüntü URL formatı:', imageUrl);
      return null;
    }
    
    try {
      // Tam URL kontrolü
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        // Eğer zaten optimize edilmiş bir URL ise doğrudan döndür
        if (imageUrl.includes('?width=')) {
          return imageUrl;
        }
        
        // URL'ye boyut parametresi ekle
        return `${imageUrl}?width=${width}&quality=70`;
      } 
      
      // Göreceli URL ise, API base URL'sini ekle
      else if (imageUrl.startsWith('/')) {
        const baseUrl = api.getBaseUrl ? api.getBaseUrl() : 'https://api.sorunbildir.com'; // API base URL'si
        const fullUrl = `${baseUrl}${imageUrl}`;
        return `${fullUrl}?width=${width}&quality=70`;
      }
      
      // Görüntü verisi ise (base64 veya benzeri)
      else if (imageUrl.startsWith('data:image')) {
        return imageUrl;
      }
      
      // Desteklenmeyen format
      console.warn('Desteklenmeyen görüntü URL formatı:', imageUrl);
      return imageUrl;
    } catch (error) {
      console.error("Görüntü URL'si işlenirken hata:", error);
      return null;
    }
  };

  // Görüntü önbelleği için basit bir mekanizma
  const imageCache = {
    cache: {},
    preloadImage: (uri) => {
      if (!uri) return Promise.resolve();
      
      return new Promise((resolve, reject) => {
        if (imageCache.cache[uri]) {
          resolve(uri);
          return;
        }
        
        Image.prefetch(uri)
          .then(() => {
            imageCache.cache[uri] = true;
            resolve(uri);
          })
          .catch(err => {
            console.warn('Image preloading failed:', uri, err);
            reject(err);
          });
      });
    }
  };

  // FlatList için performans optimizasyonları
  const getItemLayout = (data, index) => ({
    length: 200, // Her öğenin yaklaşık yüksekliği
    offset: 200 * index,
    index,
  });

  const keyExtractor = (item) => item._id.toString();

  // Render edilecek öğe bileşeni - performans için memo ile sarmalayalım
  const IssueItem = React.memo(({ item, onPress }) => {
    // Görüntüleri düzgün şekilde al
    let imageSource = null;
    
    if (item.images && Array.isArray(item.images) && item.images.length > 0) {
      // Standart dizi formatı
      imageSource = item.images[0];
    } else if (item.images && typeof item.images === 'string') {
      // Tek string olarak gelme durumu
      imageSource = item.images;
    } else if (item.image) {
      // Alternatif alan adı
      imageSource = item.image;
    } else if (item.photos && Array.isArray(item.photos) && item.photos.length > 0) {
      // Alternatif alan adı
      imageSource = item.photos[0];
    } else if (item.photo) {
      // Alternatif alan adı
      imageSource = item.photo;
    }
    
    // Optimize edilmiş görüntü URL'si al
    const thumbnailUrl = imageSource ? getOptimizedImageUrl(imageSource, 150) : null;
    
    // Görüntüyü arka planda önyükle
    React.useEffect(() => {
      if (thumbnailUrl) {
        imageCache.preloadImage(thumbnailUrl);
      }
    }, [thumbnailUrl]);
    
    return (
      <TouchableOpacity 
        style={styles.issueItem} 
        onPress={() => onPress(item)}
        activeOpacity={0.7}
      >
        {thumbnailUrl ? (
          <Image 
            source={{ uri: thumbnailUrl }} 
            style={styles.issueImage}
            resizeMode="cover"
            onError={(error) => console.error(`Görüntü yükleme hatası: ${error.nativeEvent.error}`, thumbnailUrl)}
          />
        ) : (
          <View style={[styles.issueImage, styles.noImage]}>
            <Icon name="image-not-supported" size={30} color="#ccc" />
          </View>
        )}
        
        <View style={styles.issueContent}>
          <Text style={styles.issueTitle} numberOfLines={2}>{item.title}</Text>
          
          <View style={styles.issueMetadata}>
            <View style={styles.metadataItem}>
              <Icon name="category" size={14} color="#666" />
              <Text style={styles.metadataText}>
                {getCategoryLabel(item.category)}
              </Text>
            </View>
            
            <View style={styles.metadataItem}>
              <Icon name="access-time" size={14} color="#666" />
              <Text style={styles.metadataText}>
                {moment(item.createdAt).fromNow()}
              </Text>
            </View>
          </View>
          
          <View style={styles.issueFooter}>
            <View style={styles.locationContainer}>
              <Icon name="location-on" size={14} color="#666" />
              <Text style={styles.locationText} numberOfLines={1}>
                {item.location && item.location.district ? item.location.district : 'Konum belirtilmemiş'}
                {item.location && item.location.city ? `, ${item.location.city}` : ''}
              </Text>
            </View>
            
            <View style={[styles.statusBadge, {backgroundColor: getStatusColor(item.status)}]}>
              <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  });

  // Boş liste durumu bileşeni
  const EmptyListComponent = React.memo(({ isLoading, error, onRetry }) => {
    if (isLoading) return null;
    
    return (
      <View style={styles.emptyContainer}>
        {error ? (
          <>
            <Icon name="error-outline" size={60} color="#F44336" />
            <Text style={styles.emptyText}>Sorunlar yüklenirken bir hata oluştu.</Text>
            <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
              <Text style={styles.retryButtonText}>Tekrar Dene</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Icon name="inbox" size={60} color="#ccc" />
            <Text style={styles.emptyText}>Henüz bildirilmiş sorun bulunmuyor.</Text>
          </>
        )}
      </View>
    );
  });

  // Liste ayırıcı bileşeni
  const ItemSeparator = React.memo(() => (
    <View style={styles.separator} />
  ));

  // Sorunları getir
  const fetchIssues = useCallback(async (shouldRefresh = false, forceShowAllCities = null) => {
    try {
      if (shouldRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      console.log('Sorunlar getiriliyor...');
      
      // API'den sorunları al
      const params = {};
      
      // forceShowAllCities parametresi varsa onu kullan, yoksa state'i kullan
      const shouldShowAllCities = forceShowAllCities !== null ? forceShowAllCities : showAllCities;
      
      // Varsayılan olarak kullanıcının şehrine ait sorunları getir
      // showAllCities false ise ve kullanıcının şehri varsa
      if (!shouldShowAllCities && user?.city) {
        params.city = user.city;
        console.log(`Sadece ${user.city} şehrine ait sorunlar getiriliyor...`);
      } else {
        console.log('Tüm şehirlere ait sorunlar getiriliyor...');
      }
      
      const response = await api.issues.getAll(params);
      
      if (response.success) {
        console.log(`${response.data.data?.length || 0} sorun bulundu`);
        
        // API yanıt yapısı kontrol et
        if (response.data && response.data.data) {
          setIssues(response.data.data);
        } else {
          setIssues(response.data);
        }
        
        if (response.isDemoMode) {
          setIsDemoMode(true);
        } else {
          setIsDemoMode(false);
        }
      } else {
        console.error('API hata döndürdü:', response.message);
        setIssues([]);
        setIsDemoMode(true);
      }
    } catch (error) {
      console.error('Sorunlar getirilirken hata oluştu:', error);
      setIsDemoMode(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.city]);

  // Ekran odaklandığında çalışır
  useFocusEffect(
    useCallback(() => {
      console.log('IssuesScreen odaklandı, sorunlar yenileniyor...');
      fetchIssues();
      
      return () => {
        // Ekran odaktan çıktığında yapılacak temizlik işlemleri
        console.log('IssuesScreen odaktan çıktı');
      };
    }, [fetchIssues])
  );

  // Sayfa yüklendiğinde sorunları getir
  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  // Kullanıcı bilgisi değiştiğinde şehir filtresi varsayılanını ayarla
  useEffect(() => {
    if (user?.city) {
      // Kullanıcının şehri tespit edildiğinde, varsayılan olarak sadece kendi şehrini göster
      console.log(`Kullanıcının şehri tespit edildi (${user.city}), kendi şehri varsayılan olarak seçildi`);
      // showAllCities zaten false olarak başlatıldı, bu yüzden bir değişiklik yapmaya gerek yok
    }
  }, [user?.city]);

  // Şehir filtresi değiştiğinde sorunları yeniden getir
  useEffect(() => {
    console.log('Şehir filtresi değişti, sorunlar yeniden yükleniyor...');
    fetchIssues(false, showAllCities);
  }, [showAllCities, fetchIssues]);

  // Sayfa yüklendiğinde konum izni iste
  useEffect(() => {
    if (viewMode === 'map') {
      getUserLocation();
    }
  }, [viewMode]);

  // Filtreleri uygula
  useEffect(() => {
    let result = [...issues];
    
    // Arama filtresini uygula
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(issue => 
        issue.title?.toLowerCase().includes(searchLower) ||
        issue.description?.toLowerCase().includes(searchLower) ||
        (issue.location?.address && issue.location.address.toLowerCase().includes(searchLower))
      );
    }
    
    // Kategori filtresini uygula
    if (filters.category !== 'Tümü') {
      result = result.filter(issue => {
        const category = issue.category || '';
        return category.toLowerCase() === filters.category.toLowerCase();
      });
    }
    
    // Durum filtresini uygula
    if (filters.status !== 'Tümü') {
      result = result.filter(issue => {
        const status = issue.status || '';
        const translatedStatus = statusTranslation[status] || status;
        return translatedStatus === filters.status;
      });
    }
    
    // İlçe filtresini uygula
    if (filters.district) {
      result = result.filter(issue => 
        issue.location?.district && 
        issue.location.district.toLowerCase().includes(filters.district.toLowerCase())
      );
    }
    
    // Sıralamayı uygula
    result = sortIssues(result, sortBy);
    
    setFilteredIssues(result);
  }, [issues, filters, sortBy]);

  // Sorunları sırala
  const sortIssues = (issues, criteria) => {
    const sorted = [...issues];
    
    switch (criteria) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      case 'upvotes':
        return sorted.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
      default:
        return sorted;
    }
  };

  // Durum rengi
  const getStatusColor = (status) => {
    switch (status) {
      case 'Çözüldü':
      case 'resolved':
        return '#4CAF50';
      case 'İnceleniyor':
      case 'in_progress':
        return '#2196F3';
      case 'Yeni':
      case 'pending':
        return '#FFC107';
      case 'Reddedildi':
      case 'rejected':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  // Durum metni
  const getStatusText = (status) => {
    return statusTranslation[status] || status;
  };

  // Kategori metni - Eksik fonksiyonu ekliyoruz
  const getCategoryLabel = (category) => {
    if (!category) return 'Belirtilmemiş';
    
    // Standart kategori adlarını gönderen fonksiyon
    return category || 'Belirtilmemiş';
  };

  // Durum etiketi - Türkçe metni döndürür
  const getStatusLabel = (status) => {
    if (!status) return 'Belirtilmemiş';
    return statusTranslation[status] || status;
  };

  // Tarih formatı
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR');
  };

  // Yenile
  const onRefresh = () => {
    fetchIssues(true);
  };

  // Sorun detayına git
  const navigateToDetail = (issue) => {
    console.log(`Sorun detayına gidiliyor, ID: ${issue._id}`, {
      title: issue.title,
      status: issue.status
    });
    
    // Sorun ID kontrol et
    if (!issue._id) {
      console.error('Sorun ID bulunamadı, detay sayfası açılamıyor.');
      return;
    }
    
    // Detay sayfasına git
    navigation.navigate('IssueDetail', { 
      issueId: issue._id,
      // Başlık ve durum bilgisini yedek olarak gönder
      // Bu sayede API'den veri gelmese bile ekranda bir şey gösterebiliriz
      issueTitle: issue.title || 'İsimsiz Sorun',
      issueStatus: issue.status || 'pending'
    });
  };

  // Yeni bildirim oluşturma sayfasına git
  const navigateToCreateIssue = () => {
    navigation.navigate('CreateIssue');
  };

  // Custom renderTouchable fonksiyonu - RNPickerSelect için dokunma alanını özelleştirir
  const renderPickerButton = (text, onPress) => (
    <TouchableOpacity onPress={onPress} style={styles.customPickerButton}>
      <Text style={styles.customPickerButtonText}>{text}</Text>
      <Icon name="arrow-drop-down" size={24} color="#3b82f6" />
    </TouchableOpacity>
  );

  // Bağlantı durumunu kontrol eden işlev
  const handleConnectionCheck = async () => {
    const connected = await checkConnection();
    if (connected) {
      fetchIssues(); // Bağlantı başarılıysa bildirimleri yeniden getir
    }
  };

  // Kullanıcının konumunu alma işlevi
  const getUserLocation = async () => {
    try {
      // Konum izinlerini kontrol et
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setLocationPermission(false);
        Alert.alert(
          'Konum İzni Gerekli',
          'Haritada konumunuzu gösterebilmek için konum izni vermeniz gerekiyor.',
          [{ text: 'Tamam' }]
        );
        return;
      }
      
      setLocationPermission(true);
      
      // Kullanıcının mevcut konumunu al - iyileştirilmiş doğruluk parametreleri ile
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation, // En yüksek doğruluk
        mayShowUserSettingsDialog: true, // Gerekirse kullanıcıya ayarlar diyaloğu göster
        timeInterval: 1000, // Daha sık konum güncellemesi
        distanceInterval: 10, // 10 metrelik değişiklikte güncelle
      });
      
      // Koordinat hassasiyetini artırmak için 6 ondalık basamak kullanalım
      const preciseLat = parseFloat(location.coords.latitude.toFixed(6));
      const preciseLng = parseFloat(location.coords.longitude.toFixed(6));
      
      // Kullanıcı konumunu ayarla
      setUserLocation({
        latitude: preciseLat,
        longitude: preciseLng,
      });
      
      // Harita bölgesini kullanıcının konumuna göre güncelle
      setMapRegion({
        latitude: preciseLat,
        longitude: preciseLng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
      
      console.log('Kullanıcı konumu alındı:', preciseLat, preciseLng);
      console.log('Konum doğruluğu (metre):', location.coords.accuracy);
      
    } catch (error) {
      console.error('Konum alınırken hata oluştu:', error);
      Alert.alert(
        'Konum Hatası',
        'Konumunuz alınırken bir hata oluştu. Lütfen konum servislerinizin açık olduğundan emin olun.'
      );
    }
  };

  // Custom dropdown gösterme fonksiyonu
  const showDropdown = (title, options, onSelect) => {
    if (Platform.OS === 'ios') {
      // iOS için ActionSheet kullan
      const optionTexts = options.map(opt => opt.label);
      optionTexts.push('İptal');
      
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: optionTexts,
          cancelButtonIndex: optionTexts.length - 1,
          title: title,
        },
        (buttonIndex) => {
          if (buttonIndex < options.length) {
            onSelect(options[buttonIndex].value);
          }
        }
      );
    } else {
      // Android için custom modal
      setDropdownTitle(title);
      setDropdownOptions(options);
      setDropdownCallback(() => onSelect);
      setDropdownVisible(true);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Connection Status Bar */}
      {isOffline && (
        <TouchableOpacity
          style={styles.connectionStatusBar}
          onPress={handleConnectionCheck}
          activeOpacity={0.7}
        >
          <Icon name="wifi-off" size={18} color="#fff" />
          <Text style={styles.connectionStatusText}>
            Sunucu bağlantısı kurulamadı. Yenilemek için dokunun.
          </Text>
        </TouchableOpacity>
      )}
      
      {/* Filtre Bölümü */}
      <View style={styles.filterContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Sorun ara..."
          value={filters.search}
          onChangeText={(text) => setFilters(prev => ({ ...prev, search: text }))}
        />
        
        {/* Şehir Bilgisi */}
        <View style={styles.cityInfoContainer}>
          <Icon name="location-city" size={18} color="#3b82f6" />
          <Text style={styles.cityInfoText}>
            {showAllCities ? 
              'Tüm şehirlerdeki sorunlar gösteriliyor' : 
              (user?.city ? 
                `${user.city} şehrindeki sorunlar gösteriliyor` : 
                'Şehir bilgisi bulunamadı'
              )
            }
          </Text>
        </View>
        
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {/* Tüm Şehirler Göster/Gizle Toggle */}
          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>Şehir Filtresi:</Text>
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[
                  styles.toggleButton, 
                  showAllCities ? styles.toggleActive : styles.toggleInactive
                ]}
                onPress={() => {
                  console.log('Şehir filtresi toggle:', !showAllCities ? 'Tüm şehirler' : (user?.city ? user.city : 'Kendi şehir'));
                  setShowAllCities(!showAllCities);
                  // fetchIssues useEffect ile otomatik çalışacak
                }}
              >
                <View style={[
                  styles.toggleIndicator,
                  showAllCities ? styles.toggleIndicatorRight : styles.toggleIndicatorLeft
                ]} />
              </TouchableOpacity>
              <Text style={[
                styles.toggleText, 
                showAllCities ? styles.toggleTextActive : styles.toggleTextInactive
              ]}>
                {showAllCities ? 'Tüm Şehirler' : (user?.city ? user.city : 'Kendi Şehir')}
              </Text>
            </View>
          </View>
          
          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>Kategori:</Text>
            <TouchableOpacity 
              style={styles.customPickerWrapper}
              onPress={() => {
                showDropdown(
                  'Kategori Seçin',
                  categoryItems,
                  (value) => setFilters(prev => ({ ...prev, category: value }))
                );
              }}
            >
              <Text style={styles.customPickerText}>{
                categoryItems.find(item => item.value === filters.category)?.label || 'Tümü'
              }</Text>
              <Icon name="arrow-drop-down" size={24} color="#3b82f6" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>Durum:</Text>
            <TouchableOpacity 
              style={styles.customPickerWrapper}
              onPress={() => {
                showDropdown(
                  'Durum Seçin',
                  statusItems,
                  (value) => setFilters(prev => ({ ...prev, status: value }))
                );
              }}
            >
              <Text style={styles.customPickerText}>{
                statusItems.find(item => item.value === filters.status)?.label || 'Tümü'
              }</Text>
              <Icon name="arrow-drop-down" size={24} color="#3b82f6" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>İlçe:</Text>
            <TextInput
              style={styles.districtInput}
              placeholder="İlçe adı girin"
              value={filters.district}
              onChangeText={(text) => setFilters(prev => ({ ...prev, district: text }))}
            />
          </View>
          
          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>Sırala:</Text>
              <TouchableOpacity 
                style={styles.customPickerWrapper}
                onPress={() => {
                  showDropdown(
                    'Sıralama Seçin',
                    sortByItems,
                    (value) => setSortBy(value)
                  );
                }}
              >
                <Text style={styles.customPickerText}>{
                  sortByItems.find(item => item.value === sortBy)?.label || 'En Yeni'
                }</Text>
                <Icon name="arrow-drop-down" size={24} color="#3b82f6" />
              </TouchableOpacity>
          </View>
        </ScrollView>
        
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.viewToggleButton, viewMode === 'list' ? styles.activeViewToggleButton : {}]}
            onPress={() => setViewMode('list')}
          >
            <Icon name="view-list" size={24} color={viewMode === 'list' ? "#fff" : "#666"} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewToggleButton, viewMode === 'map' ? styles.activeViewToggleButton : {}]}
            onPress={() => setViewMode('map')}
          >
            <Icon name="map" size={24} color={viewMode === 'map' ? "#fff" : "#666"} />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Sonuç Sayısı */}
      <View style={styles.resultCountContainer}>
        <Text style={styles.resultCountText}>
          {filteredIssues.length} sonuç bulundu
        </Text>
      </View>
      
      {/* Liste Görünümü */}
      {viewMode === 'list' && (
        loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Sorunlar yükleniyor...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredIssues}
            renderItem={({ item }) => (
              <IssueItem 
                item={item} 
                onPress={navigateToDetail} 
              />
            )}
            keyExtractor={keyExtractor}
            getItemLayout={getItemLayout}
            ItemSeparatorComponent={ItemSeparator}
            ListEmptyComponent={
              <EmptyListComponent 
                isLoading={loading} 
                error={isDemoMode} 
                onRetry={fetchIssues} 
              />
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#3b82f6']}
              />
            }
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews={true}
            onEndReached={fetchIssues}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              loading ? (
                <View style={styles.loadMoreContainer}>
                  <ActivityIndicator size="small" color="#2196F3" />
                  <Text style={styles.loadMoreText}>Daha fazla yükleniyor...</Text>
              </View>
              ) : null
            }
          />
        )
      )}
      
      {/* Harita Görünümü */}
      {viewMode === 'map' && (
        loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Harita yükleniyor...</Text>
          </View>
        ) : (
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              initialRegion={mapRegion}
              region={mapRegion}
              provider={PROVIDER_GOOGLE}
            >
              {/* Kullanıcı konumu marker'ı */}
              {userLocation && locationPermission && (
                <Marker
                  coordinate={userLocation}
                  title="Konumunuz"
                  pinColor="#4285F4"
                >
                  <View style={styles.userLocationMarker}>
                    <View style={styles.userLocationDot} />
                  </View>
                </Marker>
              )}
              
              {/* Sorun marker'ları */}
              {filteredIssues.map((issue) => {
                // Koordinatları kontrol et
                if (issue.location && issue.location.coordinates && 
                    Array.isArray(issue.location.coordinates) && 
                    issue.location.coordinates.length === 2) {
                  
                  // [lng, lat] -> { latitude, longitude }
                  const coordinate = {
                    latitude: issue.location.coordinates[1],
                    longitude: issue.location.coordinates[0],
                  };
                  
                  return (
                    <Marker 
                      key={issue._id} 
                      coordinate={coordinate}
                      pinColor={getStatusColor(issue.status)}
                    >
                      <Callout onPress={() => navigateToDetail(issue)}>
                        <View style={styles.callout}>
                          <Text style={styles.calloutTitle} numberOfLines={1}>{issue.title}</Text>
                          <Text style={styles.calloutCategory}>{issue.category}</Text>
                          <Text style={styles.calloutStatus}>
                            Durum: <Text style={{ color: getStatusColor(issue.status) }}>{getStatusText(issue.status)}</Text>
                          </Text>
                          <Text style={styles.calloutAddress} numberOfLines={2}>
                            {issue.location?.address || 'Adres belirtilmemiş'}
                          </Text>
                        </View>
                      </Callout>
                    </Marker>
                  );
                }
                return null;
              })}
            </MapView>
            
            {/* Konumum Butonu */}
            <TouchableOpacity 
              style={styles.myLocationButton}
              onPress={getUserLocation}
            >
              <Icon name="my-location" size={24} color="#3b82f6" />
            </TouchableOpacity>
          </View>
        )
      )}

      {/* Yeni Sorun Ekleme Butonu */}
      <TouchableOpacity
        style={styles.fab}
        onPress={navigateToCreateIssue}
      >
        <Icon name="add" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Custom Dropdown Modal for Android */}
      <Modal
        visible={dropdownVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDropdownVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDropdownVisible(false)}
        >
          <View style={styles.dropdownContainer}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>{dropdownTitle}</Text>
              <TouchableOpacity 
                onPress={() => setDropdownVisible(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.dropdownList}>
              {dropdownOptions.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.dropdownOption}
                  onPress={() => {
                    if (dropdownCallback) {
                      dropdownCallback(option.value);
                    }
                    setDropdownVisible(false);
                  }}
                >
                  <Text style={styles.dropdownOptionText}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  filterContainer: {
    backgroundColor: '#fff',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 10,
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  filterScroll: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  filterItem: {
    marginRight: 16,
    width: 160,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  districtInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    height: 45,
    color: '#333',
  },
  viewToggle: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  viewToggleButton: {
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  activeViewToggleButton: {
    backgroundColor: '#3b82f6',
  },
  resultCountContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  resultCountText: {
    color: '#666',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  listContent: {
    padding: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardImage: {
    width: '100%',
    height: 150,
  },
  cardDetails: {
    padding: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    fontWeight: 'bold',
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  callout: {
    width: width * 0.6,
    padding: 8,
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  calloutCategory: {
    color: '#666',
    fontSize: 12,
    marginBottom: 2,
  },
  calloutStatus: {
    fontSize: 12,
    marginBottom: 2,
  },
  calloutAddress: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b82f6',
    right: 20,
    bottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 100,
  },
  connectionStatusBar: {
    backgroundColor: '#ef4444',
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderRadius: 4,
    marginHorizontal: 8,
  },
  connectionStatusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleButton: {
    width: 50,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: '#3b82f6',
  },
  toggleInactive: {
    backgroundColor: '#ccc',
  },
  toggleIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  toggleIndicatorRight: {
    alignSelf: 'flex-end',
  },
  toggleIndicatorLeft: {
    alignSelf: 'flex-start',
  },
  toggleText: {
    color: '#666',
    fontSize: 12,
    marginLeft: 8,
  },
  toggleTextActive: {
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  toggleTextInactive: {
    color: '#666',
    fontWeight: 'normal',
  },
  customPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  customPickerButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  customPickerWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 6,
    padding: 12,
    height: 45,
    width: 160,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  customPickerText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  userLocationMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(66, 133, 244, 0.2)',
    borderWidth: 1,
    borderColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userLocationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4285F4',
    borderWidth: 2,
    borderColor: '#fff',
  },
  myLocationButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  issueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  issueImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 12,
  },
  issueContent: {
    flex: 1,
  },
  issueTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  issueMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  metadataText: {
    fontSize: 14,
    color: '#666',
  },
  issueFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 14,
    color: '#666',
  },
  separator: {
    height: 1,
    backgroundColor: '#eee',
  },
  loadMoreContainer: {
    padding: 12,
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: 14,
    color: '#2196F3',
    marginTop: 4,
  },
  cityInfoContainer: {
    padding: 12,
    backgroundColor: '#edf5ff',
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
  },
  cityInfoText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
    flex: 1,
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '80%',
    maxHeight: '80%',
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  dropdownList: {
    flex: 1,
  },
  dropdownOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dropdownOptionText: {
    fontSize: 14,
    color: '#333',
  },
});

export default IssuesScreen; 