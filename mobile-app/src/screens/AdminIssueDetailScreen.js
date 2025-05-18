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
  Linking
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

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
        setAssignedToName(response.data.assignedTo?.name || 'Atanmamış');
        setSelectedWorker(response.data.assignedTo?._id || '');
        
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
        console.log('Atanan çalışan ID:', response.data.assignedTo?._id);
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
      const response = await api.admin.assignIssue(issueId, selectedWorker);

      if (response.success) {
        Alert.alert('Başarılı', 'Sorun başarıyla atandı.');
        fetchIssue(); // Güncel veriyi yeniden getir
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

  const openImageModal = (imageUrl) => {
    setSelectedImage(imageUrl);
    setModalVisible(true);
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

        {/* Resimler */}
        {issue.images && issue.images.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resimler</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesContainer}>
              {issue.images.map((image, index) => (
                <TouchableOpacity key={index} onPress={() => openImageModal(image)}>
                  <Image source={{ uri: image }} style={styles.imagePreview} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

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
          
          {/* Çalışan Atama */}
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

      {/* Resim Modali */}
      <Modal
        visible={modalVisible}
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.closeModalButton}
            onPress={() => setModalVisible(false)}
          >
            <Icon name="close" size={30} color="#fff" />
          </TouchableOpacity>
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* Durum Seçici Modal */}
      <Modal
        visible={statusModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setStatusModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Durumu Seçin</Text>
              <TouchableOpacity onPress={() => setStatusModalVisible(false)}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={[
                {label: 'Yeni', value: 'pending'},
                {label: 'İnceleniyor', value: 'in_progress'},
                {label: 'Çözüldü', value: 'resolved'},
                {label: 'Reddedildi', value: 'rejected'}
              ]}
              keyExtractor={(item) => item.value}
              renderItem={({item}) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    newStatus === item.value && styles.modalItemSelected
                  ]}
                  onPress={() => {
                    console.log(`Durum seçildi: ${item.label} (${item.value})`);
                    setNewStatus(item.value);
                    setStatusModalVisible(false);
                  }}
                >
                  <Text 
                    style={[
                      styles.modalItemText,
                      newStatus === item.value && styles.modalItemTextSelected
                    ]}
                  >
                    {item.label}
                  </Text>
                  {newStatus === item.value && (
                    <Icon name="check" size={22} color="#3498db" />
                  )}
                </TouchableOpacity>
              )}
              style={styles.modalList}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Çalışan Seçici Modal */}
      <Modal
        visible={workerModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setWorkerModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setWorkerModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Çalışan Seçin</Text>
              <TouchableOpacity onPress={() => setWorkerModalVisible(false)}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={[
                {_id: '', name: 'Seçiniz...'},
                ...workers
              ]}
              keyExtractor={(item) => item._id || 'empty'}
              renderItem={({item}) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    selectedWorker === item._id && styles.modalItemSelected
                  ]}
                  onPress={() => {
                    console.log(`Çalışan seçildi: ${item.name} (${item._id})`);
                    setSelectedWorker(item._id);
                    if (item._id) {
                      setAssignedToName(item.name);
                    }
                    setWorkerModalVisible(false);
                  }}
                >
                  <Text 
                    style={[
                      styles.modalItemText,
                      selectedWorker === item._id && styles.modalItemTextSelected
                    ]}
                  >
                    {item.name}
                  </Text>
                  {selectedWorker === item._id && (
                    <Icon name="check" size={22} color="#3498db" />
                  )}
                </TouchableOpacity>
              )}
              style={styles.modalList}
            />
          </View>
        </TouchableOpacity>
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
  imagePreview: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginRight: 8,
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
    width: '100%',
    height: '80%',
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    width: '100%', 
    maxWidth: 350,
    maxHeight: '70%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
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
});

export default AdminIssueDetailScreen; 