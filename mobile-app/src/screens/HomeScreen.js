import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import Icon from 'react-native-vector-icons/MaterialIcons';
import api from '../utils/api';

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Demo veriler
  const dummyData = [
    {
      id: 1,
      title: 'Kaldırım Sorunu',
      category: 'Altyapı',
      status: 'İnceleniyor',
      location: 'Atatürk Mahallesi',
      createdAt: '2023-06-15T10:30:00',
      imageUrl: 'https://via.placeholder.com/150',
    },
    {
      id: 2,
      title: 'Sokak Lambası Arızası',
      category: 'Aydınlatma',
      status: 'Çözüldü',
      location: 'Cumhuriyet Caddesi',
      createdAt: '2023-06-14T14:20:00',
      imageUrl: 'https://via.placeholder.com/150',
    },
    {
      id: 3,
      title: 'Çöp Konteyner Sorunu',
      category: 'Temizlik',
      status: 'Beklemede',
      location: 'İnönü Bulvarı',
      createdAt: '2023-06-13T09:45:00',
      imageUrl: 'https://via.placeholder.com/150',
    },
  ];

  // Bildirimleri getiren fonksiyon
  const fetchReports = async (pageNum = 1, shouldRefresh = false) => {
    try {
      if (shouldRefresh) {
        setRefreshing(true);
        setPage(1);
        pageNum = 1;
      } else if (pageNum > 1) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      // API'den bildirimleri al
      const { data } = await api.reports.getAll({ page: pageNum, limit: 10 });
      
      if (shouldRefresh || pageNum === 1) {
        setReports(data.reports);
      } else {
        setReports(prev => [...prev, ...data.reports]);
      }
      
      // Daha fazla bildirim var mı kontrol et
      setHasMore(data.reports.length === 10);
      
      if (pageNum > 1) {
        setPage(pageNum);
      }

      // Demo modunu kapat, çünkü API çağrısı başarılı oldu
      setIsDemoMode(false);
    } catch (error) {
      console.error('Bildirimler getirilirken hata oluştu:', error);
      
      // API bağlantısı yoksa veya hata varsa örnek veri göster
      if (pageNum === 1) {
        setReports(dummyData);
        setIsDemoMode(true);
        
        // Network hatası olduğunda sadece bir kere uyarı göster
        if (!isDemoMode && (error.message === 'Network Error' || error.isDemoMode)) {
          Alert.alert(
            'Bağlantı Hatası', 
            'API sunucusuna bağlanılamadı. Demo veriler gösteriliyor.',
            [{ text: 'Tamam', style: 'default' }]
          );
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  // Sayfa yüklendiğinde bildirimleri getir
  useEffect(() => {
    fetchReports();
  }, []);

  // Yenileme işlemi
  const onRefresh = () => {
    fetchReports(1, true);
  };

  // Daha fazla bildirim yükle
  const loadMoreReports = () => {
    // Demo modda pagination yok, daha fazla yükleme yapma
    if (isDemoMode) return;
    
    if (hasMore && !loadingMore) {
      fetchReports(page + 1);
    }
  };

  // Durum rengini belirle
  const getStatusColor = (status) => {
    switch (status) {
      case 'Çözüldü':
        return '#4CAF50'; // Yeşil
      case 'İnceleniyor':
        return '#2196F3'; // Mavi
      case 'Beklemede':
        return '#FFC107'; // Sarı
      default:
        return '#9E9E9E'; // Gri
    }
  };

  // Tarih formatını düzenle
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR');
  };

  // Bildirimin detayına git
  const navigateToReportDetail = (report) => {
    navigation.navigate('ReportDetail', { report, reportId: report.id });
  };

  // Yeni bildirim oluştur
  const navigateToCreateReport = () => {
    navigation.navigate('CreateReport');
  };

  // Her bir bildirim için kart bileşeni
  const renderReportCard = ({ item }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => navigateToReportDetail(item)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      
      <View style={styles.cardContent}>
        {item.imageUrl && (
          <Image 
            source={{ uri: item.imageUrl }} 
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
            <Text style={styles.detailText}>{item.location}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Icon name="event" size={16} color="#666" />
            <Text style={styles.detailText}>{formatDate(item.createdAt)}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Liste sonu göstergesi
  const renderFooter = () => {
    if (!loadingMore || isDemoMode) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#3b82f6" />
        <Text style={styles.footerText}>Daha fazla yükleniyor...</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Şehir Bildirimleri</Text>
        <Text style={styles.headerSubtitle}>
          Hoş geldiniz, {user?.name || 'Kullanıcı'}
        </Text>
        {isDemoMode && (
          <View style={styles.demoModeContainer}>
            <Icon name="info-outline" size={16} color="#fff" />
            <Text style={styles.demoModeText}>Demo Mod</Text>
          </View>
        )}
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Bildirimler yükleniyor...</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={reports}
            renderItem={renderReportCard}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon name="info" size={60} color="#ccc" />
                <Text style={styles.emptyText}>Henüz bildirim bulunmuyor</Text>
                <Text style={styles.emptySubtext}>
                  Yeni bir bildirim oluşturmak için aşağıdaki butona tıklayabilirsiniz.
                </Text>
              </View>
            }
            onEndReached={loadMoreReports}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
          />

          <TouchableOpacity 
            style={styles.addButton} 
            onPress={navigateToCreateReport}
          >
            <Icon name="add" size={30} color="#fff" />
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#3b82f6',
    padding: 20,
    paddingTop: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#e6effd',
    marginTop: 4,
  },
  demoModeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  demoModeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardContent: {
    flexDirection: 'row',
    padding: 16,
  },
  cardImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
  },
  cardDetails: {
    flex: 1,
    justifyContent: 'space-around',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#3b82f6',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  footerText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
});

export default HomeScreen; 