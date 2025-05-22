import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  RefreshControl,
  TextInput
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AdminIssuesListScreen = ({ route, navigation }) => {
  const { user } = useAuth();
  const { filter = 'all' } = route.params || {};
  
  const [issues, setIssues] = useState([]);
  const [filteredIssues, setFilteredIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [cities, setCities] = useState([]);

  // Kullanıcı profilini yükle ve şehir bilgisi kontrolü yap
  const loadUserProfile = async () => {
    try {
      console.log("Kullanıcı profili güncelleniyor...");
      const profileResponse = await api.auth.getUserProfile();
      
      if (profileResponse.success && profileResponse.data) {
        const userData = profileResponse.data.data || profileResponse.data;
        console.log("Alınan profil bilgileri:", JSON.stringify(userData, null, 2));
        
        // Kullanıcı verilerini AsyncStorage'a kaydet
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        console.log("Kullanıcı bilgileri AsyncStorage'a kaydedildi");
        
        // Şehir bilgisi kontrolü
        if (userData.role === 'municipal_worker') {
          if (!userData.city || userData.city === "undefined" || userData.city === "") {
            console.warn("Belediye çalışanı için şehir bilgisi eksik!");
            Alert.alert(
              "Eksik Bilgi",
              "Belediye çalışanı olarak şehir bilginiz eksik. Lütfen profil sayfasından şehir bilginizi güncelleyin.",
              [{ text: "Tamam", onPress: () => navigation.navigate('Profile') }]
            );
          } else {
            console.log("Şehir bilgisi doğrulandı:", userData.city);
          }
        }
        
        return userData;
      } else {
        console.error("Profil bilgileri alınamadı:", profileResponse.message);
      }
    } catch (error) {
      console.error("Profil yükleme hatası:", error);
    }
  };

  // Sorunları yükle
  const loadIssues = async () => {
    try {
      setLoading(true);
      
      let response;
      
      // Worker rolü için worker API'sini kullan
      if (user?.role === 'worker') {
        console.log('Worker rolü için görevler getiriliyor...');
        response = await api.worker.getAssignedIssues();
        
        if (response.success && response.data) {
          // Worker API'sinden dönen veri formatını doğru şekilde işle
          let workerIssues = Array.isArray(response.data) ? response.data : 
                            (response.data.data && Array.isArray(response.data.data)) ? response.data.data : [];
          
          console.log(`Worker için ${workerIssues.length} görev bulundu`);
          setIssues(workerIssues);
          setFilteredIssues(workerIssues);
          setLoading(false);
          setRefreshing(false);
          return;
        }
      } else {
        // Admin ve municipal_worker için admin API'sini kullan
        response = await api.admin.getAdminIssues();
      }
      
      if (response.success && response.data) {
        let allIssues = response.data.issues || response.data || [];
        
        // Şehir listesini oluştur (sadece admin için)
        if (user?.role === 'admin') {
          const uniqueCities = [...new Set(allIssues.map(issue => issue.location.city))].sort();
          setCities(uniqueCities);
        }
        
        // İlk açılışta gelen filtre parametresine göre filtrele
        if (filter === 'pending') {
          setStatusFilter('Yeni');
        } else if (filter === 'assigned') {
          // Atanmış sorunları filtrele
          const assignedIssues = allIssues.filter(issue => issue.assignedTo);
          setIssues(assignedIssues);
          setFilteredIssues(assignedIssues);
          setLoading(false);
          setRefreshing(false);
          return;
        }
        
        setIssues(allIssues);
        setFilteredIssues(allIssues);
      } else {
        Alert.alert('Hata', 'Sorunlar yüklenirken bir hata oluştu.');
      }
    } catch (error) {
      console.error('Sorunlar yüklenirken hata:', error);
      Alert.alert('Hata', 'Sorunlar yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Sayfa yüklendiğinde ilk verileri getir
  useEffect(() => {
    loadUserProfile().then(() => {
      loadIssues();
    });
  }, []);

  // Sorunları filtrele
  useEffect(() => {
    let result = [...issues];
    
    // Arama sorgusuna göre filtrele
    if (searchQuery) {
      const lowercasedQuery = searchQuery.toLowerCase();
      result = result.filter(
        issue => 
          issue.title.toLowerCase().includes(lowercasedQuery) || 
          issue.description.toLowerCase().includes(lowercasedQuery) ||
          issue.location.address.toLowerCase().includes(lowercasedQuery) ||
          issue.location.district.toLowerCase().includes(lowercasedQuery) ||
          issue.location.city.toLowerCase().includes(lowercasedQuery)
      );
    }
    
    // Durum filtresine göre filtrele
    if (statusFilter !== 'all') {
      result = result.filter(issue => {
        const statusText = getStatusText(issue.status);
        return statusText === statusFilter;
      });
    }
    
    // Kategori filtresine göre filtrele
    if (categoryFilter !== 'all') {
      result = result.filter(issue => issue.category === categoryFilter);
    }
    
    // Şehir filtresine göre filtrele (sadece admin için)
    if (user?.role === 'admin' && cityFilter !== 'all') {
      result = result.filter(issue => issue.location.city === cityFilter);
    }
    
    // Sıralama
    if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortBy === 'oldest') {
      result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (sortBy === 'priority') {
      const priorityOrder = { 'Kritik': 0, 'Yüksek': 1, 'Orta': 2, 'Düşük': 3 };
      result.sort((a, b) => priorityOrder[a.severity] - priorityOrder[b.severity]);
    }
    
    setFilteredIssues(result);
  }, [issues, searchQuery, statusFilter, categoryFilter, cityFilter, sortBy, user]);

  // Yenileme işlemi
  const onRefresh = () => {
    setRefreshing(true);
    loadIssues();
  };

  // Sorun detayına git
  const handleIssuePress = (issue) => {
    // Worker rolü için WorkerIssueDetailScreen'e yönlendir
    if (user?.role === 'worker') {
      navigation.navigate('WorkerIssueDetail', { id: issue._id });
    } else {
      navigation.navigate('AdminIssueDetail', { issueId: issue._id });
    }
  };

  // Durum rengini belirle
  const getStatusColor = (status) => {
    switch (status) {
      case 'Yeni':
      case 'pending':
        return '#3498db'; // Mavi
      case 'İnceleniyor':
      case 'in_progress':
        return '#f39c12'; // Turuncu
      case 'Çözüldü':
      case 'resolved':
        return '#2ecc71'; // Yeşil
      case 'Reddedildi':
      case 'rejected':
        return '#e74c3c'; // Kırmızı
      default:
        return '#95a5a6'; // Gri
    }
  };

  // Türkçe durum metni
  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'Yeni';
      case 'in_progress':
        return 'İnceleniyor';
      case 'resolved':
        return 'Çözüldü';
      case 'rejected':
        return 'Reddedildi';
      default:
        return status;
    }
  };

  // Sorun kartı bileşeni
  const renderIssueItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.issueCard} 
      onPress={() => handleIssuePress(item)}
    >
      <View style={styles.issueHeader}>
        <Text style={styles.issueTitle} numberOfLines={1}>{item.title}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>
      
      <Text style={styles.issueDescription} numberOfLines={2}>{item.description}</Text>
      
      <View style={styles.issueFooter}>
        <View style={styles.locationContainer}>
          <Icon name="location-on" size={16} color="#666" />
          <Text style={styles.locationText} numberOfLines={1}>
            {item.location.district}, {item.location.city}
          </Text>
        </View>
        
        <View style={styles.issueMetaContainer}>
          {item.assignedTo ? (
            <View style={styles.assignedContainer}>
              <Icon name="person" size={14} color="#7f8c8d" />
              <Text style={styles.assignedText}>
                {item.assignedTo.name?.split(' ')[0] || 'Atandı'}
              </Text>
            </View>
          ) : null}
          
          <Text style={styles.dateText}>
            {new Date(item.createdAt).toLocaleDateString('tr-TR')}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.filtersContainer}>
      {/* Arama Kutusu */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#95a5a6" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Ara: Başlık, açıklama, konum..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="clear" size={20} color="#95a5a6" />
          </TouchableOpacity>
        ) : null}
      </View>
      
      {/* Filtreler - Sadece admin ve municipal_worker için göster */}
      {user?.role !== 'worker' && (
        <>
          <View style={styles.filterRow}>
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Durum</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={statusFilter}
                  onValueChange={(itemValue) => setStatusFilter(itemValue)}
                  style={styles.picker}
                  mode="dropdown"
                >
                  <Picker.Item label="Tümü" value="all" />
                  <Picker.Item label="Yeni" value="Yeni" />
                  <Picker.Item label="İnceleniyor" value="İnceleniyor" />
                  <Picker.Item label="Çözüldü" value="Çözüldü" />
                  <Picker.Item label="Reddedildi" value="Reddedildi" />
                </Picker>
              </View>
            </View>
            
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Kategori</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={categoryFilter}
                  onValueChange={(itemValue) => setCategoryFilter(itemValue)}
                  style={styles.picker}
                  mode="dropdown"
                >
                  <Picker.Item label="Tümü" value="all" />
                  <Picker.Item label="Altyapı" value="Altyapı" />
                  <Picker.Item label="Üstyapı" value="Üstyapı" />
                  <Picker.Item label="Çevre" value="Çevre" />
                  <Picker.Item label="Ulaşım" value="Ulaşım" />
                  <Picker.Item label="Güvenlik" value="Güvenlik" />
                  <Picker.Item label="Temizlik" value="Temizlik" />
                  <Picker.Item label="Diğer" value="Diğer" />
                </Picker>
              </View>
            </View>
          </View>
        </>
      )}
      
      {/* Şehir Filtresi - Sadece admin için göster */}
      {user?.role === 'admin' && cities.length > 0 && (
        <View style={styles.filterRow}>
          <View style={[styles.filterItem, { flex: 1 }]}>
            <Text style={styles.filterLabel}>Şehir</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={cityFilter}
                onValueChange={(itemValue) => setCityFilter(itemValue)}
                style={styles.picker}
                mode="dropdown"
              >
                <Picker.Item label="Tüm Şehirler" value="all" />
                {cities.map((city, index) => (
                  <Picker.Item key={index} label={city} value={city} />
                ))}
              </Picker>
            </View>
          </View>
        </View>
      )}
      
      {/* Sıralama */}
      <View style={styles.sortContainer}>
        <Text style={styles.filterLabel}>Sıralama</Text>
        <View style={styles.sortButtons}>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'newest' && styles.sortButtonActive]}
            onPress={() => setSortBy('newest')}
          >
            <Text style={[styles.sortButtonText, sortBy === 'newest' && styles.sortButtonTextActive]}>
              En Yeni
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'oldest' && styles.sortButtonActive]}
            onPress={() => setSortBy('oldest')}
          >
            <Text style={[styles.sortButtonText, sortBy === 'oldest' && styles.sortButtonTextActive]}>
              En Eski
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'priority' && styles.sortButtonActive]}
            onPress={() => setSortBy('priority')}
          >
            <Text style={[styles.sortButtonText, sortBy === 'priority' && styles.sortButtonTextActive]}>
              Öncelik
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Sonuç Sayısı */}
      <Text style={styles.resultCount}>
        {filteredIssues.length} sonuç bulundu
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#2c3e50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sorunlar</Text>
        {user?.role === 'municipal_worker' && user?.city && (
          <Text style={styles.headerCity}>{user.city}</Text>
        )}
        {user?.role === 'worker' && (
          <Text style={styles.headerCity}>Atanan Görevler</Text>
        )}
      </View>
      
      <FlatList
        data={filteredIssues}
        renderItem={renderIssueItem}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={styles.loader} size="large" color="#3498db" />
          ) : (
            <View style={styles.emptyContainer}>
              <Icon name="inbox" size={64} color="#95a5a6" />
              <Text style={styles.emptyText}>Sonuç bulunamadı</Text>
            </View>
          )
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  headerCity: {
    fontSize: 14,
    color: '#3498db',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  listContainer: {
    paddingBottom: 16,
  },
  filtersContainer: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: '#2c3e50',
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  filterItem: {
    flex: 0.48,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  picker: {
    height: 40,
  },
  sortContainer: {
    marginBottom: 16,
  },
  sortButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sortButton: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: '#f2f2f2',
    borderRadius: 4,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  sortButtonActive: {
    backgroundColor: '#3498db',
  },
  sortButtonText: {
    fontSize: 14,
    color: '#34495e',
  },
  sortButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  resultCount: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 8,
  },
  issueCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    elevation: 2,
  },
  issueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  issueTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  issueDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 12,
  },
  issueFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2,
  },
  locationText: {
    fontSize: 12,
    color: '#34495e',
    marginLeft: 4,
  },
  issueMetaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
  },
  assignedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  assignedText: {
    fontSize: 10,
    color: '#34495e',
    marginLeft: 2,
  },
  dateText: {
    fontSize: 12,
    color: '#95a5a6',
  },
  loader: {
    marginTop: 32,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#95a5a6',
    marginTop: 8,
  },
});

export default AdminIssuesListScreen; 