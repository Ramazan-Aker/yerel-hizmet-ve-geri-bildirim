import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  TextInput, 
  Alert, 
  ActivityIndicator, 
  Modal,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Dimensions,
  Linking,
  TouchableWithoutFeedback
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const AdminIssueDetailScreen = ({ route, navigation }) => {
  const { issueId } = route.params;
  const { user } = useAuth();
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [officialResponse, setOfficialResponse] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [assignedToName, setAssignedToName] = useState('');
  const [workers, setWorkers] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState('');
  const [mapRegion, setMapRegion] = useState(null);
  
  // Özel seçici modalleri için state'ler
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [workerModalVisible, setWorkerModalVisible] = useState(false);
  
  // Ref'ler picker'ları programmatik olarak açmak için
  const statusPickerRef = useRef(null);
  const workerPickerRef = useRef(null);
  
  // Municipal worker rolü kontrolü
  const isMunicipalWorker = user && user.role === 'municipal_worker';
  
  // Sorunu getir
  const fetchIssue = async () => {
    try {
      setLoading(true);
      const response = await api.issues.getIssueById(issueId);
      
      if (response.success && response.data) {
        setIssue(response.data);
        // Durumun backend değerini kullan
        setNewStatus(response.data.status);
        setOfficialResponse(response.data.officialResponse?.response || '');
        
        // Atanmış çalışan bilgisini doğru ayarla
        // Hem assignedTo hem de assignedWorker alanlarını kontrol et
        if (response.data.assignedWorker) {
          // Obje veya ID olarak gelebilir 
          if (typeof response.data.assignedWorker === 'string') {
            setSelectedWorker(response.data.assignedWorker);
            
            // Municipal worker rolü için API çağrısı yapmayı atla
            if (isMunicipalWorker) {
              setAssignedToName('Atanmış Çalışan');
            } else {
              // Sadece admin rolü için API çağrısı yap
              try {
                const workerResponse = await api.admin.getWorkerById(response.data.assignedWorker);
                if (workerResponse.success && workerResponse.data) {
                  setAssignedToName(workerResponse.data.name || 'Atanmış Çalışan');
                } else {
                  setAssignedToName('Atanmış Çalışan');
                }
              } catch (error) {
                console.error('Çalışan bilgisi alınamadı:', error);
                setAssignedToName('Atanmış Çalışan');
              }
            }
          } else {
            // Obje olarak geldi
            setSelectedWorker(response.data.assignedWorker._id || '');
            setAssignedToName(response.data.assignedWorker.name || 'Atanmış Çalışan');
          }
        } else if (response.data.assignedTo) {
          // Eski sürüm API uyumluluğu için assignedTo alanını da kontrol et
          if (typeof response.data.assignedTo === 'string') {
            setSelectedWorker(response.data.assignedTo);
            setAssignedToName('Atanmış Çalışan');
          } else {
            setSelectedWorker(response.data.assignedTo._id || '');
            setAssignedToName(response.data.assignedTo.name || 'Atanmış Çalışan');
          }
        } else {
          setAssignedToName('Atanmamış');
          setSelectedWorker('');
        }
        
        // Konum bilgisi varsa harita bölgesini ayarla
        if (response.data.location && response.data.location.coordinates && 
            response.data.location.coordinates.length === 2) {
          const [longitude, latitude] = response.data.location.coordinates;
          console.log('Konum koordinatları:', latitude, longitude);
          setMapRegion({
            latitude: latitude,
            longitude: longitude,
            latitudeDelta: 0.005,  // Yakın zoom seviyesi
            longitudeDelta: 0.005
          });
        }
        
        console.log('Sorun durumu:', response.data.status);
        console.log('Atanan çalışan ID:', response.data.assignedWorker?._id || response.data.assignedTo?._id);
      } else {
        Alert.alert('Hata', 'Sorun detayları yüklenirken bir hata oluştu.');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Sorun detayları yüklenirken hata:', error);
      Alert.alert('Hata', 'Sorun detayları yüklenirken bir hata oluştu.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  // Belediye çalışanlarını getir
  const fetchWorkers = async () => {
    try {
      // Municipal worker rolü için farklı endpoint kullan
      if (isMunicipalWorker) {
        try {
          const response = await api.municipal.getWorkers();
          if (response.success) {
            const workersList = response.workers || response.data?.workers || [];
            console.log('Municipal çalışan listesi alındı:', workersList.length);
            setWorkers(workersList);
          } else {
            console.warn('Municipal çalışanlar yüklenemedi:', response.message);
            // Hata durumunda en azından bilgilendirici bir mesaj göster
            setWorkers([
              { _id: '', name: 'Çalışanlar yüklenemedi, tekrar deneyiniz' }
            ]);
          }
        } catch (error) {
          console.error('Municipal çalışanları getirme hatası:', error);
          setWorkers([
            { _id: '', name: 'Çalışanlar yüklenemedi, tekrar deneyiniz' }
          ]);
        }
        return;
      }
      
      // Admin için normal API çağrısı
      const response = await api.admin.getWorkers();
      
      if (response.success) {
        const workersList = response.workers || response.data?.workers || [];
        console.log('Çalışan listesi alındı:', workersList.length);
        setWorkers(workersList);
      } else {
        console.warn('Çalışanlar yüklenemedi:', response.message);
      }
    } catch (error) {
      console.error('Çalışanları getirme hatası:', error);
    }
  };

  useEffect(() => {
    fetchIssue();
    fetchWorkers();
  }, [issueId]);

  // Picker'ları açmak için yardımcı fonksiyonlar
  const openStatusPicker = () => {
    console.log('Durum seçici açılıyor...');
    setStatusModalVisible(true);
  };
  
  const openWorkerPicker = () => {
    console.log('Çalışan seçici açılıyor...');
    setWorkerModalVisible(true);
  };

  // Sorunu güncelle
  const updateIssue = async () => {
    try {
      setUpdating(true);
      console.log('Güncellenecek durum:', newStatus);
      console.log('Atanacak çalışan ID:', selectedWorker || 'Atanmayacak');

      const updateData = {
        status: newStatus,
        officialResponse: officialResponse,
        assignedTo: selectedWorker || null
      };

      const response = await api.admin.updateIssue(issueId, updateData);

      if (response.success) {
        Alert.alert('Başarılı', 'Sorun başarıyla güncellendi.');
        fetchIssue(); // Güncel veriyi yeniden getir
      } else {
        Alert.alert('Hata', response.message || 'Sorun güncellenirken bir hata oluştu.');
      }
    } catch (error) {
      console.error('Sorun güncelleme hatası:', error);
      Alert.alert('Hata', 'Sorun güncellenirken bir hata oluştu.');
    } finally {
      setUpdating(false);
    }
  };

  // Sorunu ata
  const assignIssue = async () => {
    if (!selectedWorker) {
      Alert.alert('Uyarı', 'Lütfen bir çalışan seçin.');
      return;
    }

    try {
      setUpdating(true);
      
      // Municipal worker rolü için farklı endpoint kullan
      let response;
      if (isMunicipalWorker) {
        response = await api.municipal.assignIssue(issueId, selectedWorker);
      } else {
        response = await api.admin.assignIssue(issueId, selectedWorker);
      }

      if (response.success) {
        Alert.alert('Başarılı', 'Sorun başarıyla atandı.');
        await fetchIssue(); // Güncel veriyi yeniden getir
      } else {
        Alert.alert('Hata', response.message || 'Sorun atanırken bir hata oluştu.');
      }
    } catch (error) {
      console.error('Sorun atama hatası:', error);
      Alert.alert('Hata', 'Sorun atanırken bir hata oluştu.');
    } finally {
      setUpdating(false);
    }
  };

  // Resmi dönüş oluştur
  const createOfficialResponse = async () => {
    if (!officialResponse.trim()) {
      Alert.alert('Uyarı', 'Lütfen bir resmi dönüş metni girin.');
      return;
    }

    try {
      setUpdating(true);
      const response = await api.admin.addOfficialResponse(issueId, officialResponse);

      if (response.success) {
        Alert.alert('Başarılı', 'Resmi dönüş başarıyla kaydedildi.');
        fetchIssue(); // Güncel veriyi yeniden getir
      } else {
        Alert.alert('Hata', response.message || 'Resmi dönüş oluşturulurken bir hata oluştu.');
      }
    } catch (error) {
      console.error('Resmi dönüş oluşturma hatası:', error);
      Alert.alert('Hata', 'Resmi dönüş oluşturulurken bir hata oluştu.');
    } finally {
      setUpdating(false);
    }
  };

  const [failedImages, setFailedImages] = useState({});
  const [modalImageError, setModalImageError] = useState(false);
  const [progressFailedImages, setProgressFailedImages] = useState({});

  // Görsel modalını aç
  const openImageModal = (imageUrl) => {
    setSelectedImage(imageUrl);
    setModalVisible(true);
    setModalImageError(false); // Her modal açılışında hata durumunu sıfırla
  };

  // Resim URL'sini düzeltme fonksiyonu
  const getFullImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    
    // Base64 formatındaki görüntüler için doğrudan URL'yi döndür
    if (imageUrl.startsWith('data:image')) {
      return imageUrl;
    }
    
    // Eğer URL http ile başlıyorsa, tam URL'dir
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }
    
    // API URL'si ekle
    const apiBaseUrl = api.getBaseUrl();
    console.log('API Base URL:', apiBaseUrl);
    console.log('Orijinal resim URL:', imageUrl);
    
    // URL'deki çift slash'ları önlemek için kontrol et
    let fullUrl;
    if (imageUrl.startsWith('/') && apiBaseUrl.endsWith('/')) {
      fullUrl = `${apiBaseUrl.slice(0, -1)}${imageUrl}`;
    } else if (!imageUrl.startsWith('/') && !apiBaseUrl.endsWith('/')) {
      fullUrl = `${apiBaseUrl}/${imageUrl}`;
    } else {
      fullUrl = `${apiBaseUrl}${imageUrl}`;
    }
    
    console.log('Oluşturulan tam URL:', fullUrl);
    return fullUrl;
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

  // Status conversion for display
  const getBackendStatusValue = (displayStatus) => {
    switch (displayStatus) {
      case 'Yeni':
        return 'pending';
      case 'İnceleniyor':
        return 'in_progress';
      case 'Çözüldü':
        return 'resolved';
      case 'Reddedildi':
        return 'rejected';
      default:
        return displayStatus;
    }
  };

  // Durum modal kontrolü debug
  useEffect(() => {
    console.log('Status modal durumu:', statusModalVisible);
  }, [statusModalVisible]);

  // Çalışan modal kontrolü debug
  useEffect(() => {
    console.log('Worker modal durumu:', workerModalVisible);
  }, [workerModalVisible]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  if (!issue) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="error-outline" size={48} color="#e74c3c" />
        <Text style={styles.errorText}>Sorun bulunamadı</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : null}
    >
      <ScrollView style={styles.container}>
        {/* Başlık Bölümü */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#2c3e50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sorun Detayı</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(issue.status) }]}>
            <Text style={styles.statusText}>{getStatusText(issue.status)}</Text>
          </View>
        </View>

        {/* Temel Bilgiler */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{issue.title}</Text>
          <Text style={styles.description}>{issue.description}</Text>
          
          <View style={styles.infoRow}>
            <Icon name="person" size={16} color="#7f8c8d" />
            <Text style={styles.infoText}>Bildiren: {issue.user?.name || 'Anonim'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Icon name="access-time" size={16} color="#7f8c8d" />
            <Text style={styles.infoText}>
              Oluşturulma: {new Date(issue.createdAt).toLocaleDateString('tr-TR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Icon name="location-on" size={16} color="#7f8c8d" />
            <Text style={styles.infoText}>
              Konum: {issue.location.address}, {issue.location.district}, {issue.location.city}
            </Text>
          </View>
          
          {/* Konum haritası */}
          {mapRegion && (
            <View style={styles.mapContainer}>
              <Text style={styles.mapTitle}>Konum Haritası</Text>
              <MapView
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                region={mapRegion}
                scrollEnabled={false}
                zoomEnabled={false}
                rotateEnabled={false}
                pitchEnabled={false}
              >
                <Marker
                  coordinate={{
                    latitude: mapRegion.latitude,
                    longitude: mapRegion.longitude
                  }}
                  title="Sorun Konumu"
                  description={issue.location?.address || 'Belirtilmemiş adres'}
                />
              </MapView>
              <TouchableOpacity 
                style={styles.mapButton}
                onPress={() => {
                  // Konum linki oluştur
                  const url = `https://www.google.com/maps/search/?api=1&query=${mapRegion.latitude},${mapRegion.longitude}`;
                  Alert.alert(
                    'Haritada Göster',
                    'Konum harici harita uygulamasında açılsın mı?',
                    [
                      {
                        text: 'İptal',
                        style: 'cancel'
                      },
                      {
                        text: 'Aç',
                        onPress: () => {
                          console.log('Harita linki açılıyor:', url);
                          Linking.openURL(url);
                        }
                      }
                    ]
                  );
                }}
              >
                <Icon name="open-in-new" size={16} color="#fff" />
                <Text style={styles.mapButtonText}>Haritada Aç</Text>
              </TouchableOpacity>
            </View>
          )}
          
          <View style={styles.infoRow}>
            <Icon name="category" size={16} color="#7f8c8d" />
            <Text style={styles.infoText}>Kategori: {issue.category}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Icon name="announcement" size={16} color="#7f8c8d" />
            <Text style={styles.infoText}>Önem: {issue.severity}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Icon name="assignment-ind" size={16} color="#7f8c8d" />
            <Text style={styles.infoText}>Atanan: {assignedToName}</Text>
          </View>
        </View>

        {/* Fotoğraflar */}
        {issue.images && issue.images.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fotoğraflar</Text>
            <View style={styles.imagesContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {issue.images.map((image, index) => {
                  const fullImageUrl = getFullImageUrl(image);
                  console.log(`Görsel ${index + 1} URL:`, fullImageUrl);
                  const hasError = failedImages[index];
                  
                  return (
                    <TouchableOpacity 
                      key={index} 
                      style={[
                        styles.imagePreviewContainer,
                        hasError && styles.failedImageContainer
                      ]}
                      onPress={() => openImageModal(image)}
                    >
                      {!hasError ? (
                        <Image 
                          source={{ uri: fullImageUrl }} 
                          style={styles.imagePreview} 
                          resizeMode="cover"
                          onError={() => {
                            console.log(`Resim yüklenemedi: ${image}`);
                            console.log(`Tam URL: ${fullImageUrl}`);
                            setFailedImages(prev => ({...prev, [index]: true}));
                          }}
                        />
                      ) : (
                        <View style={styles.errorImageContainer}>
                          <Icon name="broken-image" size={24} color="#e74c3c" />
                          <Text style={styles.errorImageText}>Görsel yüklenemedi</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        )}

        {/* Çözüm Fotoğrafları - Hem admin hem de municipal_worker için göster */}
        {issue.progressPhotos && issue.progressPhotos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Çözüm Fotoğrafları</Text>
            <View style={styles.imagesContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {issue.progressPhotos.map((photo, index) => {
                  // URL'yi doğru şekilde oluştur
                  let imageUrl = '';
                  if (typeof photo === 'string') {
                    imageUrl = photo;
                  } else if (photo.url) {
                    imageUrl = photo.url;
                  } else {
                    return null; // Geçersiz fotoğraf verisi
                  }
                  
                  const fullImageUrl = getFullImageUrl(imageUrl);
                  console.log(`Çözüm fotoğrafı ${index + 1} URL:`, fullImageUrl);
                  const hasError = progressFailedImages[index];
                  
                  return (
                    <TouchableOpacity 
                      key={index} 
                      style={[
                        styles.imagePreviewContainer,
                        hasError && styles.failedImageContainer
                      ]}
                      onPress={() => openImageModal(imageUrl)}
                    >
                      {!hasError ? (
                        <Image 
                          source={{ uri: fullImageUrl }} 
                          style={styles.imagePreview} 
                          resizeMode="cover"
                          onError={() => {
                            console.log(`Çözüm fotoğrafı yüklenemedi: ${imageUrl}`);
                            console.log(`Tam URL: ${fullImageUrl}`);
                            setProgressFailedImages(prev => ({...prev, [index]: true}));
                          }}
                        />
                      ) : (
                        <View style={styles.errorImageContainer}>
                          <Icon name="broken-image" size={24} color="#e74c3c" />
                          <Text style={styles.errorImageText}>Görsel yüklenemedi</Text>
                        </View>
                      )}
                      
                      {photo.uploadedAt && (
                        <View style={styles.photoDateContainer}>
                          <Text style={styles.photoDateText}>
                            {new Date(photo.uploadedAt).toLocaleDateString('tr-TR')}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        )}

        {/* Çözüm Süreci Zaman Çizelgesi */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Çözüm Süreci</Text>
          <View style={styles.timelineContainer}>
            {/* Oluşturulma */}
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, { backgroundColor: "#3498db" }]}>
                <Icon name="schedule" size={16} color="#fff" />
              </View>
              {/* Çizgi */}
              <View style={styles.timelineLine} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>Sorun bildirildi</Text>
                <Text style={styles.timelineDate}>
                  {new Date(issue.createdAt).toLocaleDateString('tr-TR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>
            </View>
            
            {/* Durum Güncellemeleri */}
            {issue.updates && issue.updates.map((update, index) => (
              <View key={index} style={styles.timelineItem}>
                <View style={[styles.timelineDot, { backgroundColor: getStatusColor(update.status) }]}>
                  {update.status === 'in_progress' ? (
                    <Icon name="engineering" size={16} color="#fff" />
                  ) : update.status === 'resolved' ? (
                    <Icon name="check-circle" size={16} color="#fff" />
                  ) : update.status === 'rejected' ? (
                    <Icon name="cancel" size={16} color="#fff" />
                  ) : (
                    <Icon name="info" size={16} color="#fff" />
                  )}
                </View>
                {/* Çizgi - Son öğe değilse göster */}
                {(index < issue.updates.length - 1 || issue.officialResponse || true) && (
                  <View style={styles.timelineLine} />
                )}
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>{update.text}</Text>
                  <Text style={styles.timelineDate}>
                    {new Date(update.date).toLocaleDateString('tr-TR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                </View>
              </View>
            ))}
            
            {/* Resmi Yanıtlar */}
            {issue.officialResponse && issue.officialResponse.response && (
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, { backgroundColor: "#3498db" }]}>
                  <Icon name="comment" size={16} color="#fff" />
                </View>
                {/* Çizgi - Her zaman göster */}
                <View style={styles.timelineLine} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>Resmi Yanıt</Text>
                  <Text style={styles.timelineText}>{issue.officialResponse.response}</Text>
                  <Text style={styles.timelineDate}>
                    {new Date(issue.officialResponse.date).toLocaleDateString('tr-TR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                </View>
              </View>
            )}
            
            {/* Güncel Durum */}
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, { backgroundColor: getStatusColor(issue.status) }]}>
                <Icon name="flag" size={16} color="#fff" />
              </View>
              {/* Son öğede çizgi yok */}
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>Güncel Durum: {getStatusText(issue.status)}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(issue.status), alignSelf: 'flex-start', marginTop: 4 }]}>
                  <Text style={styles.statusText}>{getStatusText(issue.status)}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Yönetim Araçları */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Yönetim</Text>
          
          {/* Durum Güncelleme */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Durum</Text>
            
            <TouchableOpacity 
              style={styles.customPickerButton} 
              onPress={() => {
                console.log('Durum seçici butonuna tıklandı');
                setStatusModalVisible(true);
              }}
              activeOpacity={0.6}
            >
              <Text style={styles.customPickerText}>
                {getStatusText(newStatus)}
              </Text>
              <Icon name="arrow-drop-down" size={24} color="#3498db" />
            </TouchableOpacity>
            
            <Text style={styles.helperText}>Durumu değiştirdikten sonra "Değişiklikleri Kaydet" butonuna basın</Text>
          </View>
          
          {/* Çalışan Atama - Tüm roller için aktif */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Sorumlu Çalışan</Text>
            
            <TouchableOpacity 
              style={styles.customPickerButton} 
              onPress={() => {
                console.log('Çalışan seçici butonuna tıklandı');
                setWorkerModalVisible(true);
              }}
              activeOpacity={0.6}
            >
              <Text style={styles.customPickerText}>
                {selectedWorker ? 
                  (workers.find(w => w._id === selectedWorker)?.name || 'Seçiniz...') : 
                  'Seçiniz...'
                }
              </Text>
              <Icon name="arrow-drop-down" size={24} color="#3498db" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.separateButton, styles.assignButton]}
              onPress={assignIssue}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Icon name="person-add" size={18} color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.actionButtonText}>Çalışan Ata</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          
          {/* Resmi Yanıt */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Resmi Yanıt</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Resmi yanıt metni girin..."
              value={officialResponse}
              onChangeText={setOfficialResponse}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.separateButton, styles.responseButton]}
              onPress={createOfficialResponse}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Icon name="send" size={18} color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.actionButtonText}>Yanıt Gönder</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          
          {/* Kaydet Butonu */}
          <TouchableOpacity 
            style={styles.saveButton}
            onPress={updateIssue}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Icon name="save" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>Değişiklikleri Kaydet</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Yorumlar */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Yorumlar ({issue.comments?.length || 0})</Text>
          
          {issue.comments && issue.comments.length > 0 ? (
            issue.comments.map((comment, index) => (
              <View key={index} style={styles.commentItem}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentAuthor}>{comment.user?.name || 'Anonim'}</Text>
                  <Text style={styles.commentDate}>
                    {new Date(comment.createdAt).toLocaleDateString('tr-TR')}
                  </Text>
                </View>
                <Text style={styles.commentContent}>{comment.content}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Henüz yorum yapılmamış</Text>
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
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                {selectedImage && !modalImageError ? (
                  <Image 
                    source={{ uri: getFullImageUrl(selectedImage) }} 
                    style={styles.fullImage} 
                    resizeMode="contain"
                    onError={() => {
                      console.log(`Modal resim yüklenemedi: ${selectedImage}`);
                      console.log(`Modal tam URL: ${getFullImageUrl(selectedImage)}`);
                      setModalImageError(true);
                    }}
                  />
                ) : modalImageError && (
                  <View style={styles.modalErrorContainer}>
                    <Icon name="broken-image" size={48} color="#e74c3c" />
                    <Text style={styles.modalErrorText}>Görsel yüklenemedi</Text>
                    <Text style={styles.modalErrorUrl}>{getFullImageUrl(selectedImage)}</Text>
                  </View>
                )}
                <TouchableOpacity 
                  style={styles.closeButton} 
                  onPress={() => setModalVisible(false)}
                >
                  <Icon name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Durum Seçici Modal */}
      <Modal
        visible={statusModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.workerModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Durumu Seçin</Text>
              <TouchableOpacity 
                onPress={() => setStatusModalVisible(false)}
                style={styles.closeModalButton}
              >
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={[
                {label: 'Yeni', value: 'pending', color: '#3498db', icon: 'fiber-new'},
                {label: 'İnceleniyor', value: 'in_progress', color: '#f39c12', icon: 'hourglass-empty'},
                {label: 'Çözüldü', value: 'resolved', color: '#2ecc71', icon: 'check-circle'},
                {label: 'Reddedildi', value: 'rejected', color: '#e74c3c', icon: 'cancel'}
              ]}
              keyExtractor={(item) => item.value}
              renderItem={({item}) => (
                <TouchableOpacity
                  style={[
                    styles.workerItem,
                    newStatus === item.value && styles.workerItemSelected
                  ]}
                  onPress={() => {
                    console.log(`Durum seçildi: ${item.label} (${item.value})`);
                    setNewStatus(item.value);
                    setStatusModalVisible(false);
                  }}
                >
                  <View style={styles.workerItemContent}>
                    <View style={[styles.statusIconContainer, {backgroundColor: `${item.color}20`}]}>
                      <Icon name={item.icon} size={20} color={item.color} />
                    </View>
                    
                    <Text 
                      style={[
                        styles.workerItemText,
                        newStatus === item.value && styles.workerItemTextSelected
                      ]}
                    >
                      {item.label}
                    </Text>
                  </View>
                  
                  {newStatus === item.value && (
                    <View style={styles.checkmarkContainer}>
                      <Icon name="check-circle" size={22} color="#2ecc71" />
                    </View>
                  )}
                </TouchableOpacity>
              )}
              style={styles.workerList}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.workerListContent}
            />
            
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setStatusModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Çalışan Seçici Modal */}
      <Modal
        visible={workerModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setWorkerModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.workerModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Çalışan Seçin</Text>
              <TouchableOpacity 
                onPress={() => setWorkerModalVisible(false)}
                style={styles.closeModalButton}
              >
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={[
                {_id: 'empty_select', name: 'Seçiniz...'},
                ...workers
              ]}
              keyExtractor={(item) => item._id || `worker_${Math.random().toString(36).substring(7)}`}
              renderItem={({item}) => (
                <TouchableOpacity
                  style={[
                    styles.workerItem,
                    selectedWorker === item._id && styles.workerItemSelected
                  ]}
                  onPress={() => {
                    console.log(`Çalışan seçildi: ${item.name} (${item._id})`);
                    setSelectedWorker(item._id === 'empty_select' ? '' : item._id);
                    if (item._id && item._id !== 'empty_select') {
                      setAssignedToName(item.name);
                    }
                    setWorkerModalVisible(false);
                  }}
                >
                  <View style={styles.workerItemContent}>
                    {item._id !== 'empty_select' ? (
                      <View style={styles.workerIconContainer}>
                        <Icon name="person" size={20} color="#3498db" />
                      </View>
                    ) : (
                      <View style={styles.emptySelectIconContainer}>
                        <Icon name="person-outline" size={20} color="#95a5a6" />
                      </View>
                    )}
                    
                    <Text 
                      style={[
                        styles.workerItemText,
                        selectedWorker === item._id && styles.workerItemTextSelected,
                        item._id === 'empty_select' && styles.emptySelectText
                      ]}
                    >
                      {item.name}
                    </Text>
                  </View>
                  
                  {selectedWorker === item._id && (
                    <View style={styles.checkmarkContainer}>
                      <Icon name="check-circle" size={22} color="#2ecc71" />
                    </View>
                  )}
                </TouchableOpacity>
              )}
              style={styles.workerList}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.workerListContent}
            />
            
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setWorkerModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#34495e',
    marginBottom: 16,
    lineHeight: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginLeft: 8,
  },
  imagesContainer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  imagePreviewContainer: {
    width: 80,
    height: 80,
    borderRadius: 4,
    marginRight: 8,
    marginBottom: 8,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  pickerTouchable: {
    marginBottom: 8,
  },
  pickerButtonContainer: {
    borderWidth: 1,
    borderColor: '#dcdde1',
    borderRadius: 4,
    backgroundColor: '#f5f5f5',
    marginBottom: 8,
    overflow: 'hidden',
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 50,
    paddingHorizontal: 15,
  },
  picker: {
    height: 50,
    width: '100%',
  },
  pickerIcon: {
    position: 'absolute',
    right: 10,
    // Cihaz tipine göre ikon pozisyonunu ayarla
    ...Platform.select({
      android: {
        top: 13,
      },
      ios: {
        top: 15,
      },
    }),
    // Pikeri gizle ve kendi custom ikonumuzu göster
    zIndex: 2,
    pointerEvents: 'none',
  },
  pickerText: {
    fontSize: 16,
    color: '#2c3e50',
    flex: 1,
  },
  hiddenPicker: {
    position: 'absolute',
    top: 0,
    width: 1,
    height: 1,
    opacity: 0,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#dcdde1',
    borderRadius: 4,
    backgroundColor: '#f5f5f5',
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    marginBottom: 8,
  },
  actionButton: {
    backgroundColor: '#3498db',
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  separateButton: {
    marginTop: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#2ecc71',
    padding: 16,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 16,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  commentItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  commentDate: {
    fontSize: 12,
    color: '#95a5a6',
  },
  commentContent: {
    fontSize: 14,
    color: '#34495e',
    lineHeight: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#95a5a6',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeModalButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 8,
    borderRadius: 20,
  },
  fullImage: {
    width: '90%',
    height: '90%',
    borderRadius: 8,
  },
  helperText: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 4,
  },
  buttonIcon: {
    marginRight: 8,
  },
  assignButton: {
    backgroundColor: '#3498db',
  },
  responseButton: {
    backgroundColor: '#2ecc71',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    height: '80%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  modalList: {
    maxHeight: 300,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalItemSelected: {
    backgroundColor: '#f5f9ff',
  },
  modalItemText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  modalItemTextSelected: {
    fontWeight: 'bold',
    color: '#3498db',
  },
  customPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#3498db',
    borderRadius: 8,
    backgroundColor: '#f5f9ff',
    marginBottom: 12,
    padding: 15,
    height: 50,
    elevation: 1,
  },
  customPickerText: {
    fontSize: 16,
    color: '#2c3e50',
    flex: 1,
  },
  mapContainer: {
    marginTop: 10,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  mapTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 10,
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  map: {
    width: '100%',
    height: 200,
  },
  mapButton: {
    backgroundColor: '#3498db',
    padding: 10,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    margin: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  mapButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 8,
    borderRadius: 20,
  },
  disabledPicker: {
    backgroundColor: '#f1f1f1',
    borderColor: '#ccc',
    opacity: 0.8,
  },
  disabledPickerText: {
    fontSize: 16,
    color: '#666',
    flex: 1,
  },
  imageDebugText: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    color: '#fff',
    padding: 4,
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 4,
  },
  imageNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  failedImageContainer: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  errorImageContainer: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorImageText: {
    fontSize: 10,
    color: '#e74c3c',
    marginTop: 4,
    textAlign: 'center',
  },
  photoDateContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 2,
  },
  photoDateText: {
    fontSize: 8,
    color: '#fff',
    textAlign: 'center',
  },
  modalErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalErrorText: {
    fontSize: 16,
    color: '#e74c3c',
    marginBottom: 8,
  },
  modalErrorUrl: {
    fontSize: 12,
    color: '#95a5a6',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  workerModalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  closeModalButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  workerList: {
    maxHeight: 350,
  },
  workerListContent: {
    paddingHorizontal: 16,
  },
  workerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  workerItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  workerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e1f5fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  emptySelectIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  workerItemSelected: {
    backgroundColor: '#f5f9ff',
  },
  workerItemText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  workerItemTextSelected: {
    fontWeight: 'bold',
    color: '#3498db',
  },
  emptySelectText: {
    color: '#95a5a6',
    fontStyle: 'italic',
  },
  checkmarkContainer: {
    marginLeft: 8,
  },
  cancelButton: {
    marginTop: 16,
    marginHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#7f8c8d',
    fontWeight: 'bold',
  },
  statusIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  timelineContainer: {
    marginTop: 10,
    paddingVertical: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 20,
    position: 'relative',
  },
  timelineDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#95a5a6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    zIndex: 2,
  },
  timelineContent: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginLeft: 6,
    borderLeftWidth: 1,
    borderLeftColor: '#e0e0e0',
  },
  timelineLine: {
    position: 'absolute',
    left: 17, // half of dot width
    top: 36, // full dot height
    bottom: 0,
    width: 2,
    backgroundColor: '#e0e0e0',
    zIndex: 1,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  timelineDate: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 4,
  },
  timelineText: {
    fontSize: 14,
    color: '#34495e',
    marginTop: 6,
    marginBottom: 6,
  },
});

export default AdminIssueDetailScreen; 