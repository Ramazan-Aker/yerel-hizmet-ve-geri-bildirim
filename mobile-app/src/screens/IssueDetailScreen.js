import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert, Platform, Modal, TouchableWithoutFeedback } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import moment from 'moment';
import 'moment/locale/tr';

moment.locale('tr');

const IssueDetailScreen = ({ route, navigation }) => {
  // Route parametrelerini al (yedek verilerle birlikte)
  const { issueId, issueTitle, issueStatus } = route.params;
  const { user } = useAuth();
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [usingFallback, setUsingFallback] = useState(false);
  
  // Fotoğraf görüntüleme state'leri
  const [selectedImage, setSelectedImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Debug bilgisi
  useEffect(() => {
    console.log(`IssueDetailScreen: ${issueId} ID'li sorunu görüntülüyorum`);
    console.log('Oturum kullanıcısı:', user ? user.name : 'Giriş yapılmamış');
    console.log('Yedek başlık:', issueTitle);
    console.log('Yedek durum:', issueStatus);
  }, [issueId, user, issueTitle, issueStatus]);

  useEffect(() => {
    fetchIssueDetails();
  }, [issueId, retryAttempt]);

  const fetchIssueDetails = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Sorun detaylarını getiriyorum, ID: ${issueId}`);
      
      // API'den sorun detaylarını al
      const response = await api.issues.getById(issueId);
      
      console.log('API yanıtı:', JSON.stringify(response).substring(0, 200));
      
      if (response.success && response.data) {
        // Veriyi kullanmadan önce kontrol et
        const issueData = response.data;
        
        // Eksik veri kontrolü
        if (!issueData.title) {
          console.warn('API yanıtında title alanı eksik');
        }
        
        console.log('Sorun başlığı:', issueData.title);
        console.log('Sorun durumu:', issueData.status);
        
        // Sorun nesnesini ayarla
        setIssue(issueData);
        setUsingFallback(false);
      } else {
        console.error('API yanıtında veri bulunamadı veya başarısız', response);
        
        // Yedek veri kullan
        if (issueTitle) {
          console.log('Yedek veriler kullanılıyor');
          setIssue({
            _id: issueId,
            title: issueTitle,
            status: issueStatus,
            description: 'API verisi alınamadı. Daha sonra tekrar deneyiniz.',
            createdAt: new Date().toISOString()
          });
          setUsingFallback(true);
        } else {
          setError(response.message || 'Sorun detayları alınamadı. Sunucudan geçersiz yanıt.');
        }
      }
    } catch (error) {
      console.error('Sorun detayları alınırken hata:', error);
      
      // Yedek veri kullan
      if (issueTitle) {
        console.log('Hata nedeniyle yedek veriler kullanılıyor');
        setIssue({
          _id: issueId,
          title: issueTitle,
          status: issueStatus,
          description: 'Bağlantı hatası nedeniyle veriler alınamadı. Daha sonra tekrar deneyiniz.',
          createdAt: new Date().toISOString()
        });
        setUsingFallback(true);
      } else {
        setError(`Sorun detayları yüklenirken bir hata oluştu: ${error.message || error}`);
      }
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
      console.log(`Sorun durumu güncelleniyor, ID: ${issueId}, Yeni Durum: ${newStatus}`);
      const response = await api.issues.updateStatus(issueId, newStatus);
      
      if (response.success) {
        // Güncelleme başarılı olursa, verileri yeniden yükle
        const updatedIssue = await api.issues.getById(issueId);
        if (updatedIssue.success) {
          setIssue(updatedIssue.data);
          Alert.alert('Başarılı', 'Sorun durumu güncellendi.');
        } else {
          setIssue({...issue, status: newStatus});
          Alert.alert('Başarılı', 'Sorun durumu güncellendi ancak güncel veriler alınamadı.');
        }
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
    if (!category) return 'Belirtilmemiş';
    
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
    if (!status) return 'Belirtilmemiş';
    
    const statuses = {
      'reported': 'Bildirildi',
      'pending': 'Yeni',
      'in_progress': 'İnceleniyor',
      'solved': 'Çözüldü',
      'resolved': 'Çözüldü',
      'rejected': 'Reddedildi',
    };
    
    return statuses[status] || status;
  };

  const getStatusColor = (status) => {
    if (!status) return '#757575'; // Gri
    
    const colors = {
      'reported': '#FFC107',
      'pending': '#FFC107',
      'in_progress': '#2196F3',
      'solved': '#4CAF50',
      'resolved': '#4CAF50',
      'rejected': '#F44336',
    };
    
    return colors[status] || '#757575';
  };

  const handleRetry = () => {
    setRetryAttempt(prev => prev + 1);
  };

  // Yükleme durumu
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Sorun detayları yükleniyor...</Text>
      </View>
    );
  }

  // Hata durumu
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={64} color="#F44336" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Text style={styles.retryButtonText}>Tekrar Dene</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.retryButton, {backgroundColor: '#757575', marginTop: 10}]} 
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryButtonText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Veri bulunamadı durumu
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

  // Render edilecek bileşen
  return (
    <>
      <ScrollView style={styles.container}>
        <View style={styles.contentContainer}>
          {/* Başlık ve Durum */}
          <View style={styles.header}>
            <Text style={styles.title}>{issue.title || 'İsimsiz Sorun'}</Text>
            <View style={[styles.statusBadge, {backgroundColor: getStatusColor(issue.status)}]}>
              <Text style={styles.statusText}>{getStatusLabel(issue.status)}</Text>
            </View>
          </View>
          
          {/* Yedek veri uyarısı */}
          {usingFallback && (
            <View style={styles.fallbackWarning}>
              <MaterialIcons name="warning" size={24} color="#856404" />
              <Text style={styles.fallbackText}>
                Sunucudan güncel veriler alınamadı. Yedek veriler görüntüleniyor.
              </Text>
              <TouchableOpacity style={styles.retryButtonSmall} onPress={handleRetry}>
                <Text style={styles.retryButtonTextSmall}>Yenile</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* Metadata */}
          <View style={styles.metadataContainer}>
            <View style={styles.metadataItem}>
              <MaterialIcons name="calendar-today" size={16} color="#666" />
              <Text style={styles.metadataText}>
                {moment(issue.createdAt).format('D MMMM YYYY')}
              </Text>
            </View>
            
            <View style={styles.metadataItem}>
              <MaterialIcons name="category" size={16} color="#666" />
              <Text style={styles.metadataText}>
                {getCategoryLabel(issue.category)}
              </Text>
            </View>
          </View>
          
          {/* Açıklama */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Açıklama</Text>
            <Text style={styles.description}>
              {issue.description || 'Açıklama bulunamadı.'}
            </Text>
          </View>
          
          {/* Konum */}
          {issue.location && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Konum</Text>
              <View style={styles.locationContainer}>
                {issue.location.city && (
                  <View style={styles.locationItem}>
                    <MaterialIcons name="location-city" size={16} color="#666" />
                    <Text style={styles.locationText}>{issue.location.city}</Text>
                  </View>
                )}
                
                {issue.location.district && (
                  <View style={styles.locationItem}>
                    <FontAwesome5 name="map-marker-alt" size={16} color="#666" />
                    <Text style={styles.locationText}>{issue.location.district}</Text>
                  </View>
                )}
              </View>
              
              {issue.location.address && (
                <Text style={styles.address}>{issue.location.address}</Text>
              )}
            </View>
          )}
          
          {/* Fotoğraflar */}
          {issue.images && issue.images.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Fotoğraflar</Text>
              <ScrollView horizontal={true} showsHorizontalScrollIndicator={false}>
                {issue.images.map((image, index) => (
                  <TouchableOpacity 
                    key={`${issueId}-image-${index}`} 
                    style={styles.imageContainer}
                    onPress={() => {
                      setSelectedImage(image);
                      setModalVisible(true);
                    }}
                  >
                    <Image
                      source={{ uri: image }}
                      style={styles.image}
                      resizeMode="cover"
                      onError={(e) => {
                        console.warn(`Image loading error for index ${index}`);
                      }}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          
          {/* Kullanıcı Bilgileri */}
          {issue.user && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Bildirim Yapan</Text>
              <View style={styles.userContainer}>
                <View style={styles.userAvatar}>
                  <Text style={styles.userAvatarText}>
                    {issue.user.name ? issue.user.name.charAt(0).toUpperCase() : '?'}
                  </Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{issue.user.name || 'Bilinmeyen Kullanıcı'}</Text>
                  <Text style={styles.userRole}>Vatandaş</Text>
                </View>
              </View>
            </View>
          )}
          
          {/* Yönetici İşlemleri */}
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
                    {backgroundColor: getStatusColor('resolved')},
                    (issue.status === 'resolved' || issue.status === 'solved') && styles.activeStatusButton,
                    updatingStatus && styles.disabledButton
                  ]} 
                  onPress={() => handleStatusUpdate('resolved')}
                  disabled={updatingStatus || issue.status === 'resolved' || issue.status === 'solved'}
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
      
      {/* Fotoğraf Görüntüleme Modalı */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalBackground}>
            <TouchableWithoutFeedback>
              <View style={styles.modalImageContainer}>
                {selectedImage && (
                  <Image
                    source={{ uri: selectedImage }}
                    style={styles.modalImage}
                    resizeMode="contain"
                  />
                )}
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setModalVisible(false)}
                >
                  <MaterialIcons name="close" size={30} color="#fff" />
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
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
  userContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  userAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#757575',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  userRole: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
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
  fallbackWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    padding: 10,
    borderRadius: 6,
    marginBottom: 15,
    flexWrap: 'wrap',
  },
  fallbackText: {
    color: '#856404',
    marginLeft: 8,
    flex: 1,
  },
  retryButtonSmall: {
    backgroundColor: '#f39c12',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 4,
    marginLeft: 8,
  },
  retryButtonTextSmall: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Modal stilleri
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImageContainer: {
    backgroundColor: 'transparent',
    width: '90%',
    height: '70%',
    overflow: 'hidden',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 5,
  }
});

export default IssueDetailScreen; 