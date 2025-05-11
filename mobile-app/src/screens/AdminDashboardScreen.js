import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';

const AdminDashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    inProgress: 0,
    resolved: 0,
    rejected: 0
  });

  // Sorunları yükle
  const loadIssues = async () => {
    try {
      setLoading(true);
      const response = await api.issues.getAdminIssues();
      
      if (response.success && response.data) {
        setIssues(response.data.issues || []);
        
        // İstatistikleri hesapla
        const total = response.data.issues.length;
        const newIssues = response.data.issues.filter(issue => issue.status === 'Yeni' || issue.status === 'pending').length;
        const inProgressIssues = response.data.issues.filter(issue => issue.status === 'İnceleniyor' || issue.status === 'in_progress').length;
        const resolvedIssues = response.data.issues.filter(issue => issue.status === 'Çözüldü' || issue.status === 'resolved').length;
        const rejectedIssues = response.data.issues.filter(issue => issue.status === 'Reddedildi' || issue.status === 'rejected').length;
        
        setStats({
          total,
          new: newIssues,
          inProgress: inProgressIssues,
          resolved: resolvedIssues,
          rejected: rejectedIssues
        });
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

  // Sayfa yüklendiğinde sorunları getir
  useEffect(() => {
    loadIssues();
  }, []);

  // Yenileme işlemi
  const onRefresh = () => {
    setRefreshing(true);
    loadIssues();
  };

  // Sorun detayına git
  const handleIssuePress = (issue) => {
    navigation.navigate('AdminIssueDetail', { issueId: issue._id });
  };

  // Sorun durumuna göre renk belirle
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
        
        <Text style={styles.dateText}>
          {new Date(item.createdAt).toLocaleDateString('tr-TR')}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Yönetim Paneli</Text>
        <Text style={styles.headerSubtitle}>Hoş geldiniz, {user?.name}</Text>
      </View>

      {/* İstatistik Kartları */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: '#3498db' }]}>
          <Text style={styles.statNumber}>{stats.new}</Text>
          <Text style={styles.statLabel}>Yeni</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#f39c12' }]}>
          <Text style={styles.statNumber}>{stats.inProgress}</Text>
          <Text style={styles.statLabel}>İnceleniyor</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#2ecc71' }]}>
          <Text style={styles.statNumber}>{stats.resolved}</Text>
          <Text style={styles.statLabel}>Çözüldü</Text>
        </View>
      </View>

      {/* Hızlı Erişim Butonları */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('AdminIssuesList', { filter: 'new' })}
        >
          <Icon name="assignment" size={24} color="#3498db" />
          <Text style={styles.actionText}>Yeni Sorunlar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('AdminIssuesList', { filter: 'assigned' })}
        >
          <Icon name="assignment-ind" size={24} color="#f39c12" />
          <Text style={styles.actionText}>Atanan Sorunlar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('AdminReports')}
        >
          <Icon name="assessment" size={24} color="#9b59b6" />
          <Text style={styles.actionText}>Raporlar</Text>
        </TouchableOpacity>
      </View>

      {/* Son Eklenen Sorunlar */}
      <View style={styles.recentContainer}>
        <Text style={styles.sectionTitle}>Son Eklenen Sorunlar</Text>
        
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#3498db" style={styles.loader} />
        ) : (
          <FlatList
            data={issues.slice(0, 5)} // Son 5 sorun
            renderItem={renderIssueItem}
            keyExtractor={item => item._id}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon name="info-outline" size={48} color="#95a5a6" />
                <Text style={styles.emptyText}>Henüz sorun bildirilmemiş</Text>
              </View>
            }
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#fff',
    marginTop: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  actionText: {
    fontSize: 12,
    color: '#34495e',
    marginTop: 4,
    textAlign: 'center',
  },
  recentContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  issueCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
    elevation: 1,
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
    marginLeft: 8,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  issueDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
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
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#95a5a6',
  },
  loader: {
    marginTop: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#95a5a6',
    marginTop: 8,
  },
});

export default AdminDashboardScreen; 