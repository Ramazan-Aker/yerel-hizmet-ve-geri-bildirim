import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import moment from 'moment';
import 'moment/locale/tr';

moment.locale('tr');

const IssueDetailScreen = ({ route, navigation }) => {
  const { issueId } = route.params;
  const { user } = useAuth();
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    fetchIssueDetails();
  }, [issueId]);

  const fetchIssueDetails = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.issues.getById(issueId);
      
      if (response.success) {
        setIssue(response.data);
      } else {
        setError(response.message || 'Sorun detayları alınamadı.');
      }
    } catch (error) {
      console.error('Sorun detayları alınırken hata:', error);
      setError('Sorun detayları yüklenemedi. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    if (!user || !user.isAdmin) {
      Alert.alert('Yetki Hatası', 'Bu işlem için yönetici yetkisi gerekiyor.');
      return;
    }
    
    setUpdatingStatus(true);
    
    try {
      const response = await api.issues.updateStatus(issueId, newStatus);
      
      if (response.success) {
        setIssue({...issue, status: newStatus});
        Alert.alert('Başarılı', 'Sorun durumu güncellendi.');
      } else {
        Alert.alert('Hata', response.message || 'Durum güncellenemedi.');
      }
    } catch (error) {
      console.error('Durum güncellenirken hata:', error);
      Alert.alert('Hata', 'Durum güncellenirken bir hata oluştu.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getCategoryLabel = (category) => {
    const categories = {
      'infrastructure': 'Altyapı',
      'environmental': 'Çevre',
      'transportation': 'Ulaşım',
      'safety': 'Güvenlik',
      'education': 'Eğitim',
      'health': 'Sağlık',
      'other': 'Diğer'
    };
    
    return categories[category] || category;
  };

  const getStatusLabel = (status) => {
    const statuses = {
      'reported': 'Bildirildi',
      'in_progress': 'İnceleniyor',
      'solved': 'Çözüldü',
      'rejected': 'Reddedildi',
    };
    
    return statuses[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      'reported': '#FFC107',
      'in_progress': '#2196F3',
      'solved': '#4CAF50',
      'rejected': '#F44336',
    };
    
    return colors[status] || '#757575';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Sorun detayları yükleniyor...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={64} color="#F44336" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchIssueDetails}>
          <Text style={styles.retryButtonText}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!issue) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Sorun bulunamadı.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.retryButtonText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>{issue.title}</Text>
          <View style={[styles.statusBadge, {backgroundColor: getStatusColor(issue.status)}]}>
            <Text style={styles.statusText}>{getStatusLabel(issue.status)}</Text>
          </View>
        </View>
        
        <View style={styles.metadataContainer}>
          <View style={styles.metadataItem}>
            <MaterialIcons name="category" size={18} color="#666" />
            <Text style={styles.metadataText}>{getCategoryLabel(issue.category)}</Text>
          </View>
          
          <View style={styles.metadataItem}>
            <MaterialIcons name="access-time" size={18} color="#666" />
            <Text style={styles.metadataText}>{moment(issue.createdAt).format('LL')}</Text>
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Açıklama</Text>
          <Text style={styles.description}>{issue.description}</Text>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Konum</Text>
          <View style={styles.locationContainer}>
            <View style={styles.locationItem}>
              <FontAwesome5 name="city" size={16} color="#666" />
              <Text style={styles.locationText}>{issue.location?.city || 'Belirtilmemiş'}</Text>
            </View>
            
            <View style={styles.locationItem}>
              <FontAwesome5 name="map-marker-alt" size={16} color="#666" />
              <Text style={styles.locationText}>{issue.location?.district || 'Belirtilmemiş'}</Text>
            </View>
          </View>
          <Text style={styles.address}>{issue.location?.address || 'Adres belirtilmemiş'}</Text>
        </View>
        
        {issue.images && issue.images.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fotoğraflar</Text>
            <ScrollView horizontal={true} showsHorizontalScrollIndicator={false}>
              {issue.images.map((image, index) => (
                <View key={index} style={styles.imageContainer}>
                  <Image
                    source={{ uri: image }}
                    style={styles.image}
                    resizeMode="cover"
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        )}
        
        {user && user.isAdmin && (
          <View style={styles.adminSection}>
            <Text style={styles.sectionTitle}>Yönetici İşlemleri</Text>
            <View style={styles.statusButtons}>
              <TouchableOpacity 
                style={[
                  styles.statusButton, 
                  {backgroundColor: getStatusColor('in_progress')},
                  issue.status === 'in_progress' && styles.activeStatusButton,
                  updatingStatus && styles.disabledButton
                ]} 
                onPress={() => handleStatusUpdate('in_progress')}
                disabled={updatingStatus || issue.status === 'in_progress'}
              >
                <Text style={styles.statusButtonText}>İnceleniyor</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.statusButton, 
                  {backgroundColor: getStatusColor('solved')},
                  issue.status === 'solved' && styles.activeStatusButton,
                  updatingStatus && styles.disabledButton
                ]} 
                onPress={() => handleStatusUpdate('solved')}
                disabled={updatingStatus || issue.status === 'solved'}
              >
                <Text style={styles.statusButtonText}>Çözüldü</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.statusButton, 
                  {backgroundColor: getStatusColor('rejected')},
                  issue.status === 'rejected' && styles.activeStatusButton,
                  updatingStatus && styles.disabledButton
                ]} 
                onPress={() => handleStatusUpdate('rejected')}
                disabled={updatingStatus || issue.status === 'rejected'}
              >
                <Text style={styles.statusButtonText}>Reddedildi</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 16,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#2196F3',
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  metadataContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  metadataText: {
    marginLeft: 5,
    color: '#666',
    fontSize: 14,
  },
  section: {
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  locationContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  locationText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#333',
  },
  address: {
    fontSize: 14,
    color: '#555',
    marginTop: 5,
  },
  photoInfo: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  imageContainer: {
    marginRight: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  image: {
    width: 200,
    height: 150,
    borderRadius: 8,
  },
  adminSection: {
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  statusButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  statusButton: {
    flex: 1,
    marginHorizontal: 5,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 5,
  },
  activeStatusButton: {
    opacity: 0.6,
  },
  disabledButton: {
    opacity: 0.4,
  },
  statusButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
});

export default IssueDetailScreen; 