import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Image,
  Alert,
  StatusBar,
  Modal,
  Dimensions,
  TextInput,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import MapView, { Marker } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialIcons';
import api from '../utils/api';

const StatusBadge = ({ status }) => {
  let backgroundColor = '#E5E7EB'; // default grey
  let textColor = '#374151';
  let statusText = status;

  switch (status) {
    case 'pending':
      backgroundColor = '#FEF3C7';
      textColor = '#92400E';
      statusText = 'Yeni';
      break;
    case 'in_progress':
      backgroundColor = '#DBEAFE';
      textColor = '#1E40AF';
      statusText = 'İnceleniyor';
      break;
    case 'resolved':
      backgroundColor = '#D1FAE5';
      textColor = '#065F46';
      statusText = 'Çözüldü';
      break;
    case 'rejected':
      backgroundColor = '#FEE2E2';
      textColor = '#B91C1C';
      statusText = 'Reddedildi';
      break;
    default:
      break;
  }

  return (
    <View style={[styles.badge, { backgroundColor }]}>
      <Text style={[styles.badgeText, { color: textColor }]}>{statusText}</Text>
    </View>
  );
};

const WorkerIssueDetailScreen = ({ route, navigation }) => {
  const { id } = route.params;
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusUpdate, setStatusUpdate] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  
  // Fotoğraf yükleme için state'ler
  const [photoDescription, setPhotoDescription] = useState('');
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  
  // Harita için state
  const [mapRegion, setMapRegion] = useState(null);

  useEffect(() => {
    fetchIssueDetails();
    
    // İzinleri kontrol et
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('İzin Gerekli', 'Fotoğraf yüklemek için galeri erişim izni gerekiyor.');
        }
      }
    })();
  }, []);

  const fetchIssueDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.worker.getIssueById(id);
      
      if (response && response.data) {
        // Resim verilerini kontrol et
        if (response.data.images) {
          console.log(`Ekranda gösterilecek ${response.data.images.length} adet resim var`);
        } else {
          console.log('Görevde resim bulunamadı');
        }
        
        setIssue(response.data);
        
        // Harita bölgesini ayarla
        if (response.data.location && response.data.location.coordinates && 
            response.data.location.coordinates.length === 2) {
          const [longitude, latitude] = response.data.location.coordinates;
          setMapRegion({
            latitude,
            longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
        }
      } else {
        setError('Sorun detayları alınamadı');
      }
    } catch (err) {
      console.error('Sorun detayları getirilirken hata oluştu:', err);
      setError('Sorun detayları yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!statusUpdate) return;
    
    try {
      setUpdatingStatus(true);
      const response = await api.worker.updateIssueStatus(id, statusUpdate);
      
      if (response && response.data) {
        // Güncellenmiş veriyi getir
        await fetchIssueDetails();
        setStatusUpdate('');
        Alert.alert('Başarılı', 'Durum başarıyla güncellendi.');
      }
    } catch (err) {
      console.error('Durum güncellenirken hata oluştu:', err);
      Alert.alert('Hata', 'Durum güncellenirken bir hata oluştu: ' + (err.message || 'Bilinmeyen hata'));
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Resim URL'sini düzeltme fonksiyonu
  const getFullImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    
    // Hata ayıklama için resim URL'sini konsola yazdır - Base64 verilerini kısalt
    if (typeof imageUrl === 'string' && imageUrl.startsWith('data:image')) {
      // Base64 formatında ise konsola yazdırmayı sınırla
      console.log('Base64 formatında resim işleniyor');
      return imageUrl;
    }
    
    // Eğer URL http ile başlıyorsa, tam URL'dir
    if (imageUrl.startsWith('http')) {
      // HTTP URL formatında ise URL'nin başlangıcını göster
      console.log('HTTP URL formatında resim işleniyor:', imageUrl.substring(0, 30) + '...');
      return imageUrl;
    }
    
    // API URL'si ekle
    const apiBaseUrl = api.getBaseUrl();
    
    // URL'deki çift slash'ları önlemek için kontrol et
    let fullUrl;
    if (imageUrl.startsWith('/') && apiBaseUrl.endsWith('/')) {
      fullUrl = `${apiBaseUrl.slice(0, -1)}${imageUrl}`;
    } else if (!imageUrl.startsWith('/') && !apiBaseUrl.endsWith('/')) {
      fullUrl = `${apiBaseUrl}/${imageUrl}`;
    } else {
      fullUrl = `${apiBaseUrl}${imageUrl}`;
    }
    
    // Oluşturulan URL'nin başlangıcını göster
    console.log('Oluşturulan resim URL formatı:', fullUrl.substring(0, 30) + '...');
    return fullUrl;
  };
  
  const openImageModal = (image) => {
    setSelectedImage(image);
    setModalVisible(true);
  };

  // Fotoğraf seçme fonksiyonu
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        aspect: [4, 3],
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: 3,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        if (result.assets.length > 3) {
          Alert.alert('Uyarı', 'En fazla 3 fotoğraf seçebilirsiniz.');
          // İlk 3 fotoğrafı al
          setSelectedPhotos(result.assets.slice(0, 3).map(asset => asset.uri));
        } else {
          setSelectedPhotos(result.assets.map(asset => asset.uri));
        }
        setPhotoModalVisible(true);
      }
    } catch (error) {
      console.error('Fotoğraf seçme hatası:', error);
      Alert.alert('Hata', 'Fotoğraf seçilirken bir hata oluştu.');
    }
  };
  
  // Kamera ile fotoğraf çekme fonksiyonu
  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Fotoğraf çekmek için kamera erişim izni gerekiyor.');
        return;
      }
      
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Kamera ile çekilen fotoğrafı mevcut seçili fotoğraflara ekle
        const newPhotos = [...selectedPhotos, result.assets[0].uri];
        
        // En fazla 3 fotoğraf kontrolü
        if (newPhotos.length > 3) {
          Alert.alert('Uyarı', 'En fazla 3 fotoğraf ekleyebilirsiniz.');
          // İlk 3 fotoğrafı al
          setSelectedPhotos(newPhotos.slice(0, 3));
        } else {
          setSelectedPhotos(newPhotos);
        }
        setPhotoModalVisible(true);
      }
    } catch (error) {
      console.error('Kamera hatası:', error);
      Alert.alert('Hata', 'Fotoğraf çekilirken bir hata oluştu.');
    }
  };
  
  // Fotoğraf yükleme fonksiyonu
  const uploadPhoto = async () => {
    if (selectedPhotos.length === 0) return;
    
    try {
      setUploadingPhoto(true);
      const response = await api.worker.addProgressPhotos(id, selectedPhotos, photoDescription);
      
      if (response && response.success) {
        Alert.alert('Başarılı', response.message || 'Çözüm fotoğrafları başarıyla yüklendi.');
        setPhotoModalVisible(false);
        setSelectedPhotos([]);
        setPhotoDescription('');
        // Güncel verileri yeniden yükle
        await fetchIssueDetails();
      } else {
        Alert.alert('Hata', response.message || 'Fotoğraf yüklenirken bir hata oluştu.');
      }
    } catch (error) {
      console.error('Fotoğraf yükleme hatası:', error);
      Alert.alert('Hata', 
        'Fotoğraf yüklenirken bir hata oluştu. Sunucu hatası (500) alındı. ' +
        'Lütfen daha küçük boyutlu fotoğraflar seçmeyi deneyin veya internet bağlantınızı kontrol edin.'
      );
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Seçili fotoğrafı kaldır
  const removeSelectedPhoto = (index) => {
    const updatedPhotos = [...selectedPhotos];
    updatedPhotos.splice(index, 1);
    setSelectedPhotos(updatedPhotos);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Sorun detayları yükleniyor...</Text>
      </SafeAreaView>
    );
  }

  if (error || !issue) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || 'Sorun detayları alınamadı'}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={fetchIssueDetails}
        >
          <Text style={styles.retryButtonText}>Tekrar Dene</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.retryButton, { marginTop: 12, backgroundColor: '#6B7280' }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryButtonText}>Geri Dön</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>{'< Geri'}</Text>
        </TouchableOpacity>
        <StatusBadge status={issue.status} />
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{issue.title}</Text>
        
        {/* Açıklama Bölümü */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Açıklama</Text>
          <Text style={styles.description}>{issue.description}</Text>
        </View>
        
        {/* Sorun Bilgileri */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sorun Bilgileri</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Kategori:</Text>
            <Text style={styles.infoValue}>{issue.category || 'Genel'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Şehir:</Text>
            <Text style={styles.infoValue}>{issue.location?.city || 'Belirtilmemiş'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>İlçe:</Text>
            <Text style={styles.infoValue}>{issue.location?.district || 'Belirtilmemiş'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Atanan:</Text>
            <Text style={styles.infoValue}>{issue.assignedWorker?.name || 'Atanmamış'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tarih:</Text>
            <Text style={styles.infoValue}>{new Date(issue.createdAt).toLocaleDateString('tr-TR')}</Text>
          </View>
        </View>
        
        {/* Konum Haritası */}
        {mapRegion && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Konum</Text>
            <View style={styles.mapContainer}>
              <MapView 
                style={styles.map}
                region={mapRegion}
                scrollEnabled={true}
                zoomEnabled={true}
              >
                <Marker
                  coordinate={{
                    latitude: mapRegion.latitude,
                    longitude: mapRegion.longitude
                  }}
                  title={issue.title}
                  description={issue.location?.address || ''}
                />
              </MapView>
            </View>
          </View>
        )}
        
        {/* Fotoğraflar Bölümü */}
        {issue.images && issue.images.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fotoğraflar</Text>
            <ScrollView horizontal={true} showsHorizontalScrollIndicator={false}>
              {issue.images.map((image, index) => {
                // Resim URL'si kontrolü
                const imageUrl = getFullImageUrl(image);
                console.log(`Resim ${index} URL:`, imageUrl);
                
                return (
                <TouchableOpacity 
                  key={`image-${index}`} 
                  style={styles.imageContainer}
                  onPress={() => openImageModal(image)}
                >
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.image}
                    resizeMode="cover"
                    onError={(e) => {
                      console.warn(`Resim yükleme hatası (${index})`);
                    }}
                  />
                </TouchableOpacity>
              )})}
            </ScrollView>
          </View>
        )}
        
        {/* Durum Güncelleme */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Durum Güncelle</Text>
          <View style={styles.statusButtonsContainer}>
            <TouchableOpacity
              style={[
                styles.statusButton,
                statusUpdate === 'in_progress' && styles.statusButtonActive,
                { backgroundColor: statusUpdate === 'in_progress' ? '#DBEAFE' : '#F3F4F6' }
              ]}
              onPress={() => setStatusUpdate('in_progress')}
            >
              <Text style={[
                styles.statusButtonText,
                statusUpdate === 'in_progress' && { color: '#1E40AF' }
              ]}>İnceleniyor</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.statusButton,
                statusUpdate === 'resolved' && styles.statusButtonActive,
                { backgroundColor: statusUpdate === 'resolved' ? '#D1FAE5' : '#F3F4F6' }
              ]}
              onPress={() => setStatusUpdate('resolved')}
            >
              <Text style={[
                styles.statusButtonText,
                statusUpdate === 'resolved' && { color: '#065F46' }
              ]}>Çözüldü</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            style={[
              styles.updateButton,
              (!statusUpdate || updatingStatus) && { opacity: 0.5 }
            ]}
            onPress={handleStatusUpdate}
            disabled={!statusUpdate || updatingStatus}
          >
            <Text style={styles.updateButtonText}>
              {updatingStatus ? 'Güncelleniyor...' : 'Durumu Güncelle'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Çözüm Fotoğrafı Yükleme Bölümü */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Çözüm Fotoğrafı Ekle</Text>
          <Text style={styles.photoDescription}>
            Sorunun çözüm aşamasını veya çözüldüğünü gösteren fotoğraf ekleyebilirsiniz.
          </Text>
          
          <View style={styles.photoButtonsContainer}>
            <TouchableOpacity 
              style={styles.photoButton}
              onPress={pickImage}
            >
              <Icon name="photo-library" size={24} color="#3B82F6" />
              <Text style={styles.photoButtonText}>Galeriden Seç</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.photoButton}
              onPress={takePhoto}
            >
              <Icon name="camera-alt" size={24} color="#3B82F6" />
              <Text style={styles.photoButtonText}>Fotoğraf Çek</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* İlerleme Fotoğrafları Bölümü - Eğer varsa */}
        {(issue.progressPhotos && issue.progressPhotos.length > 0) || 
         (issue.progress_photos && issue.progress_photos.length > 0) ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>İlerleme Fotoğrafları</Text>
            <ScrollView horizontal={true} showsHorizontalScrollIndicator={false}>
              {(issue.progressPhotos || issue.progress_photos || []).map((photo, index) => {
                // Farklı veri formatlarını destekle
                const photoUrl = photo.url || photo.photo || photo;
                const photoDesc = photo.description || '';
                const imageUrl = getFullImageUrl(photoUrl);
                
                console.log(`İlerleme fotoğrafı ${index} URL:`, typeof photoUrl === 'string' ? 
                  (photoUrl.startsWith('data:image') ? 'Base64 formatında' : photoUrl.substring(0, 30) + '...') : 
                  'String değil');
                
                return (
                  <TouchableOpacity 
                    key={`progress-${index}`} 
                    style={styles.imageContainer}
                    onPress={() => openImageModal(photoUrl)}
                  >
                    <Image
                      source={{ uri: imageUrl }}
                      style={styles.image}
                      resizeMode="cover"
                      onError={(e) => {
                        console.warn(`İlerleme resmi yükleme hatası (${index})`);
                      }}
                    />
                    {photoDesc && (
                      <View style={styles.photoDescriptionOverlay}>
                        <Text style={styles.photoDescriptionText} numberOfLines={1}>
                          {photoDesc}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {/* Yorumlar Bölümü - Sadece okuma */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Yorumlar</Text>
          {issue.comments && issue.comments.length > 0 ? (
            issue.comments.map((comment, index) => (
              <View key={index} style={styles.commentItem}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentAuthor}>
                    {comment.user?.name || 'Anonim Kullanıcı'}
                  </Text>
                  <Text style={styles.commentDate}>
                    {new Date(comment.createdAt).toLocaleDateString('tr-TR')}
                  </Text>
                </View>
                <Text style={styles.commentContent}>{comment.content}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Henüz yorum yapılmamış.</Text>
          )}
        </View>
      </ScrollView>
      
      {/* Resim Görüntüleme Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={() => setModalVisible(false)}
          >
            <Text style={styles.closeButtonText}>X</Text>
          </TouchableOpacity>
          {selectedImage && (
            <Image 
              source={{ uri: getFullImageUrl(selectedImage) }} 
              style={styles.fullImage} 
              resizeMode="contain"
              onError={(e) => {
                console.warn(`Modal resim yükleme hatası`);
              }}
            />
          )}
        </View>
      </Modal>
      
      {/* Fotoğraf Yükleme Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={photoModalVisible}
        onRequestClose={() => {
          setPhotoModalVisible(false);
          setSelectedPhotos([]);
          setPhotoDescription('');
        }}
      >
        <View style={styles.photoModalOverlay}>
          <View style={styles.photoModalContent}>
            <View style={styles.photoModalHeader}>
              <Text style={styles.photoModalTitle}>Çözüm Fotoğrafı Yükle</Text>
              <TouchableOpacity 
                style={styles.photoModalCloseButton}
                onPress={() => {
                  setPhotoModalVisible(false);
                  setSelectedPhotos([]);
                  setPhotoDescription('');
                }}
              >
                <Icon name="close" size={24} color="#4B5563" />
              </TouchableOpacity>
            </View>
            
            {selectedPhotos.length > 0 && (
              <ScrollView horizontal={true} showsHorizontalScrollIndicator={false}>
                {selectedPhotos.map((photo, index) => (
                  <TouchableOpacity 
                    key={`selected-${index}`} 
                    style={styles.selectedPhotoContainer}
                    onPress={() => openImageModal(photo)}
                  >
                    <Image
                      source={{ uri: photo }}
                      style={styles.selectedPhoto}
                      resizeMode="cover"
                    />
                    <TouchableOpacity 
                      style={styles.removePhotoButton}
                      onPress={() => removeSelectedPhoto(index)}
                    >
                      <Icon name="close" size={20} color="#fff" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            
            <TextInput
              style={styles.photoDescriptionInput}
              placeholder="Fotoğraf açıklaması (isteğe bağlı)"
              value={photoDescription}
              onChangeText={setPhotoDescription}
              multiline={true}
              numberOfLines={3}
            />
            
            <TouchableOpacity
              style={[styles.uploadButton, uploadingPhoto && { opacity: 0.7 }]}
              onPress={uploadPhoto}
              disabled={uploadingPhoto || selectedPhotos.length === 0}
            >
              <Text style={styles.uploadButtonText}>
                {uploadingPhoto ? 'Yükleniyor...' : 'Fotoğrafları Yükle'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F3F4F6',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '500',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    width: 80,
    fontSize: 14,
    color: '#6B7280',
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  statusButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statusButtonActive: {
    borderColor: 'transparent',
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
  },
  updateButton: {
    backgroundColor: '#3B82F6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  commentItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  commentDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  commentContent: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
  },
  // Fotoğraf stilleri
  imageContainer: {
    width: 150,
    height: 100,
    marginRight: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height * 0.8,
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  mapContainer: {
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  photoDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  photoButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  photoButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
  },
  photoDescriptionOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 4,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  photoDescriptionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  photoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalContent: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    width: Dimensions.get('window').width * 0.9,
    maxHeight: Dimensions.get('window').height * 0.8,
  },
  photoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  photoModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  photoModalCloseButton: {
    padding: 8,
  },
  selectedPhotoContainer: {
    width: 100,
    height: 100,
    marginRight: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  selectedPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  photoDescriptionInput: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
  },
  uploadButton: {
    backgroundColor: '#3B82F6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default WorkerIssueDetailScreen; 