import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  ScrollView,
  Alert
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../hooks/useAuth';
import Icon from 'react-native-vector-icons/MaterialIcons';
import api from '../utils/api';
import { useFocusEffect } from '@react-navigation/native';

const MyIssuesScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [issues, setIssues] = useState([]);
  const [filteredIssues, setFilteredIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'pending', 'solved'
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [error, setError] = useState('');

  // Worker rolü kontrolü - ekran yüklendiğinde
  useEffect(() => {
    if (user?.role === 'worker') {
      console.log('Worker rolü için bildirimlerim özelliği kullanılamaz, geri yönlendiriliyor...');
      navigation.goBack();
    }
  }, [user, navigation]);

  // Sorunları getir
  const fetchMyIssues = useCallback(async (shouldRefresh = false) => {
    try {
      // Worker rolü kontrolü
      if (user?.role === 'worker') {
        console.log('Worker rolü için bildirimlerim özelliği kullanılamaz');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (shouldRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      console.log('Kullanıcı bildirimleri getiriliyor (MyIssuesScreen)...');
      // API'den kendi sorunlarını al
      const response = await api.issues.getMyIssues();
      
      if (response.success) {
        console.log(`${response.data.length} bildirim bulundu`);
        setIssues(response.data);
        setIsDemoMode(false);
        setError('');
      } else {
        console.error('API hata döndürdü:', response.message);
        setIssues([]);
        setIsDemoMode(true);
        setError(response.message || 'Bildirimler yüklenirken bir hata oluştu.');
      }
    } catch (error) {
      console.error('Sorunlar getirilirken hata oluştu:', error);
      setIssues([]);
      setIsDemoMode(true);
      setError('Bildirimler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  // Ekran odaklandığında çalışır
  useFocusEffect(
    useCallback(() => {
      // Worker rolü kontrolü
      if (user?.role === 'worker') {
        console.log('Worker rolü için bildirimlerim özelliği kullanılamaz, geri yönlendiriliyor...');
        navigation.goBack();
        return;
      }

      console.log('MyIssuesScreen odaklandı, bildirimler yenileniyor...');
      fetchMyIssues();
      
      return () => {
        // Ekran odaktan çıktığında yapılacak temizlik işlemleri
        console.log('MyIssuesScreen odaktan çıktı');
      };
    }, [fetchMyIssues, user, navigation])
  );

  // Sayfa yüklendiğinde sorunları getir
  useEffect(() => {
    if (user?.role !== 'worker') {
      fetchMyIssues();
    }
  }, [fetchMyIssues, user]);

  // Worker rolü kontrolü - ana render öncesi
  if (user?.role === 'worker') {
    return null; // Worker rolü için hiçbir şey gösterme, zaten useEffect ile geri yönlendirilecek
  }

  // Sekmeye göre sorunları filtrele
  useEffect(() => {
    const filterByTab = () => {
      if (activeTab === 'all') {
        setFilteredIssues(issues);
        return;
      }
      
      if (activeTab === 'pending') {
        setFilteredIssues(issues.filter(issue => 
          issue.status === 'pending' || issue.status === 'in_progress'
        ));
        return;
      }
      
      if (activeTab === 'solved') {
        setFilteredIssues(issues.filter(issue => 
          issue.status === 'resolved'
        ));
        return;
      }
    };
    
    filterByTab();
  }, [issues, activeTab]);

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
    const statusMap = {
      'pending': 'Yeni',
      'in_progress': 'İnceleniyor',
      'resolved': 'Çözüldü',
      'rejected': 'Reddedildi'
    };
    
    return statusMap[status] || status;
  };

  // Tarih formatı
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR');
  };

  // Yenile
  const onRefresh = () => {
    fetchMyIssues(true);
  };

  // Sorun detayına git
  const navigateToDetail = (issue) => {
    navigation.navigate('IssueDetail', { issueId: issue._id });
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
        
        {item.officialResponse && (
          <View style={styles.responseContainer}>
            <Text style={styles.responseLabel}>Resmi Yanıt:</Text>
            <Text style={styles.responseText}>{item.officialResponse.response}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Bildirdiğim Sorunlar</Text>
      </View>
      
      {/* Sekmeler */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.activeTab]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
            Tümü ({issues.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
            İşlemdekiler
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'solved' && styles.activeTab]}
          onPress={() => setActiveTab('solved')}
        >
          <Text style={[styles.tabText, activeTab === 'solved' && styles.activeTabText]}>
            Çözülenler
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Sorun Listesi */}
      {loading ? (
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
              <Icon name="inbox" size={60} color="#ccc" />
              <Text style={styles.emptyText}>
                {isDemoMode 
                  ? 'Bağlantı hatası nedeniyle sorunlar gösterilemiyor'
                  : 'Henüz bildirim yapmadınız'}
              </Text>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => navigation.navigate('CreateIssue')}
              >
                <Text style={styles.createButtonText}>Sorun Bildir</Text>
              </TouchableOpacity>
            </View>
          )}
        />
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
    paddingVertical: 16,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#3b82f6',
    fontWeight: 'bold',
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
    padding: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 16,
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
  responseContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  responseLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  responseText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#F44336',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  errorSubText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 20,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default MyIssuesScreen; 