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
  SafeAreaView
} from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import { useAuth } from '../hooks/useAuth';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MapView, { Marker, Callout } from 'react-native-maps';
import api from '../utils/api';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const IssuesScreen = ({ navigation }) => {
  const { user, isOffline, checkConnection } = useAuth();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' veya 'map'
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Filtre durumları
  const [filters, setFilters] = useState({
    search: '',
    category: 'Tümü',
    status: 'Tümü',
    district: ''
  });

  // Sıralama seçeneği
  const [sortBy, setSortBy] = useState('newest');

  // Filtrelenmiş sorunlar
  const [filteredIssues, setFilteredIssues] = useState([]);

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

  // API'den sorunları getir
  const fetchIssues = useCallback(async (shouldRefresh = false) => {
    try {
      if (shouldRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      console.log("Tüm sorunlar getiriliyor...");
      // API'den sorunları al
      const response = await api.issues.getAll();
      
      if (response.success) {
        console.log(`${response.data.data.length} sorun bulundu`);
        // Sorunları formatlayıp uygula
        const formattedIssues = response.data.data.map(issue => {
          // Koordinatları düzelt
          let formattedIssue = {
            ...issue,
            // images: issue.images && issue.images.length > 0 ? issue.images : null
          };
          
          // Koordinatlar yoksa varsayılan değer ata
          if (!formattedIssue.location || !formattedIssue.location.coordinates) {
            console.warn(`Sorun ID: ${issue._id} - Koordinatlar eksik. Varsayılan koordinatlar atanıyor.`);
            
            if (!formattedIssue.location) {
              formattedIssue.location = {};
            }
            
            formattedIssue.location.coordinates = [28.9784, 41.0082]; // İstanbul koordinatları
          }
          
          return formattedIssue;
        });

        setIssues(formattedIssues);
        setIsDemoMode(false);
      } else {
        console.error('API hata döndürdü:', response.message);
        setIsDemoMode(true);
      }
    } catch (error) {
      console.error('Sorunlar getirilirken hata oluştu:', error);
      setIsDemoMode(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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

  // Her bir sorun kartını render et
  const renderIssueItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => navigateToDetail(item)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>
      
      {item.images && item.images.length > 0 && (
        <Image 
          source={{ uri: item.images[0] }} 
          style={styles.cardImage} 
          resizeMode="cover"
        />
      )}
      
      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
          <Icon name="category" size={16} color="#666" />
          <Text style={styles.detailText}>{item.category}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Icon name="location-on" size={16} color="#666" />
          <Text style={styles.detailText} numberOfLines={1}>
            {item.location?.district || 'Belirtilmemiş'}, {item.location?.city || 'Belirtilmemiş'}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Icon name="event" size={16} color="#666" />
          <Text style={styles.detailText}>{formatDate(item.createdAt)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Bağlantı durumunu kontrol eden işlev
  const handleConnectionCheck = async () => {
    const connected = await checkConnection();
    if (connected) {
      fetchIssues(); // Bağlantı başarılıysa bildirimleri yeniden getir
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
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>Kategori:</Text>
            <View style={styles.pickerWrapper}>
              <RNPickerSelect
                placeholder={{}}
                items={categoryItems}
                onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
                value={filters.category}
                style={pickerSelectStyles}
                useNativeAndroidPickerStyle={false}
                Icon={() => <Icon name="arrow-drop-down" size={24} color="#3b82f6" />}
                touchableWrapperProps={{ activeOpacity: 0.5 }}
                pickerProps={{
                  dropdownIconColor: '#3b82f6',
                  mode: 'dropdown',
                  style: { 
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    fontWeight: 'bold'
                  }
                }}
              />
            </View>
          </View>
          
          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>Durum:</Text>
            <View style={styles.pickerWrapper}>
              <RNPickerSelect
                placeholder={{}}
                items={statusItems}
                onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                value={filters.status}
                style={pickerSelectStyles}
                useNativeAndroidPickerStyle={false}
                Icon={() => <Icon name="arrow-drop-down" size={24} color="#3b82f6" />}
                touchableWrapperProps={{ activeOpacity: 0.5 }}
                pickerProps={{
                  dropdownIconColor: '#3b82f6',
                  mode: 'dropdown',
                  style: { 
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    fontWeight: 'bold'
                  }
                }}
              />
            </View>
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
            <View style={styles.pickerWrapper}>
              <RNPickerSelect
                placeholder={{}}
                items={sortByItems}
                onValueChange={(value) => setSortBy(value)}
                value={sortBy}
                style={pickerSelectStyles}
                useNativeAndroidPickerStyle={false}
                Icon={() => <Icon name="arrow-drop-down" size={24} color="#3b82f6" />}
                touchableWrapperProps={{ activeOpacity: 0.5 }}
                pickerProps={{
                  dropdownIconColor: '#3b82f6',
                  mode: 'dropdown',
                  style: { 
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    fontWeight: 'bold'
                  }
                }}
              />
            </View>
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
            renderItem={renderIssueItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#3b82f6']}
              />
            }
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Icon name="search-off" size={60} color="#ccc" />
                <Text style={styles.emptyText}>
                  Sonuç bulunamadı
                </Text>
                <Text style={styles.emptySubText}>
                  Filtreleri değiştirmeyi deneyin
                </Text>
              </View>
            )}
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
              initialRegion={{
                latitude: 41.0082,
                longitude: 28.9784,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
              }}
            >
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
          </View>
        )
      )}

      {/* Yeni Sorun Bildirme Butonu */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => navigation.navigate('CreateReport')}
      >
        <Icon name="add" size={30} color="#fff" />
      </TouchableOpacity>
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
  filterScrollView: {
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
  pickerWrapper: {
    borderRadius: 8,
    marginTop: 5,
    marginBottom: 10,
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
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#3b82f6',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
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
});

export default IssuesScreen; 