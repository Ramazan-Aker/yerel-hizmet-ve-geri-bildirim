import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Image, Platform, Modal, TouchableWithoutFeedback } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import * as Camera from 'expo-camera';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';
import { cities } from '../data/cities';
import { allDistricts } from '../data/allDistricts';
import { cityCoordinates } from '../data/cityCoordinates';
import { Ionicons } from '@expo/vector-icons';

const CreateIssueScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [images, setImages] = useState([]);
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [coordinates, setCoordinates] = useState(null);
  const [locationError, setLocationError] = useState(null);

  // Get districts based on selected city
  const districts = city ? allDistricts[city] || [] : [];

  useEffect(() => {
    // Reset district when city changes
    if (city && districts.length > 0 && !districts.includes(district)) {
      setDistrict(districts[0]);
    }
  }, [city]);

  const requestLocationPermission = async () => {
    setLocationLoading(true);
    setLocationError(null);
    
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setLocationError('Konum izni reddedildi');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Konum izni hatası:', error);
      setLocationError('Konum izni alınamadı');
      return false;
    } finally {
      setLocationLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    setLocationError(null);
    
    try {
      const hasPermission = await requestLocationPermission();
      
      if (!hasPermission) {
        return;
      }
      
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      setCoordinates({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
      
      // Try to get address from coordinates
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
      
      if (reverseGeocode && reverseGeocode.length > 0) {
        const addressData = reverseGeocode[0];
        setAddress(`${addressData.street || ''} ${addressData.name || ''} ${addressData.district || ''}`);
        
        // Try to match city and district
        if (addressData.city && cities.includes(addressData.city)) {
          setCity(addressData.city);
        }
        
        if (addressData.city && addressData.district && 
            allDistricts[addressData.city] && 
            allDistricts[addressData.city].includes(addressData.district)) {
          setDistrict(addressData.district);
        }
      }
    } catch (error) {
      console.error('Konum alma hatası:', error);
      setLocationError('Konum alınamadı: ' + error.message);
    } finally {
      setLocationLoading(false);
    }
  };

  const useSelectedCityLocation = () => {
    if (city && cityCoordinates[city]) {
      setCoordinates(cityCoordinates[city]);
    }
  };

  // Fotoğraf ekleme butonlarının etiketleri
  const getAddPhotoLabel = () => {
    if (images.length >= 3) {
      return "Maksimum fotoğraf sayısına ulaşıldı";
    }
    return `Galeriden Ekle (${images.length}/3)`;
  };

  const getTakePhotoLabel = () => {
    if (images.length >= 3) {
      return "Maksimum fotoğraf sayısına ulaşıldı";
    }
    return `Kamera ile Çek (${images.length}/3)`;
  };

  // Fotoğrafları sıkıştırma ve yeniden boyutlandırma
  const compressImage = async (uri) => {
    try {
      console.log('Resim sıkıştırılıyor:', uri.substring(0, 30) + '...');
      
      // Önce dosya boyutunu kontrol et
      const fileInfo = await FileSystem.getInfoAsync(uri);
      console.log('Orijinal dosya boyutu:', (fileInfo.size / 1024 / 1024).toFixed(2) + ' MB');
      
      // Resim sıkıştırma ve boyutlandırma işlemi
      const manipResult = await manipulateAsync(
        uri,
        [{ resize: { width: 1080 } }], // 1080 genişliğe yeniden boyutlandır (yükseklik otomatik ayarlanır)
        { compress: 0.7, format: SaveFormat.JPEG } // %70 sıkıştırma oranı
      );
      
      // Yeni boyutu kontrol et
      const compressedInfo = await FileSystem.getInfoAsync(manipResult.uri);
      console.log('Sıkıştırılmış dosya boyutu:', (compressedInfo.size / 1024 / 1024).toFixed(2) + ' MB');
      
      return manipResult.uri;
    } catch (error) {
      console.error('Resim sıkıştırma hatası:', error);
      return uri; // Hata durumunda orijinal URI'yi döndür
    }
  };

  // Galeriden fotoğraf seçme
  const pickImageFromGallery = async () => {
    try {
      // Mevcut fotoğraf sayısını kontrol et
      if (images.length >= 3) {
        Alert.alert('Limit', 'En fazla 3 fotoğraf ekleyebilirsiniz.');
        return;
      }
      
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Galeriye erişim izni vermeniz gerekiyor.');
        return;
      }
      
      // Kaç fotoğraf daha seçilebileceğini hesapla
      const remainingSlots = 3 - images.length;
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // Çoklu seçim için editing kapalı olmalı
        aspect: [4, 3],
        quality: 0.7, // Kalite düşürüldü
        allowsMultipleSelection: true, // Birden fazla resim seçmeye izin ver
        selectionLimit: remainingSlots, // En fazla kalan slot kadar seçilebilsin
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Yükleme göstergesi
        setLoading(true);
        
        try {
          // Her resmi sıkıştır
          const compressedImages = await Promise.all(
            result.assets.map(async (asset) => {
              const compressedUri = await compressImage(asset.uri);
              return {
                uri: compressedUri,
                id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` // Benzersiz ID oluştur
              };
            })
          );
          
          console.log(`${compressedImages.length} YENİ FOTOĞRAF SEÇİLDİ VE SIKIŞTIRILDI`);
          
          // State'i güncelle - mevcut images'ı kopyala ve yenilerini ekle
          const updatedImages = [...images, ...compressedImages];
          console.log('GÜNCELLEME ÖNCESİ:', images.length, 'fotoğraf');
          console.log('GÜNCELLEME SONRASI:', updatedImages.length, 'fotoğraf');
          
          // Doğrudan set et
          setImages(updatedImages);
        } catch (error) {
          console.error('Resim sıkıştırma işlemi başarısız:', error);
          Alert.alert('Hata', 'Resimler işlenirken bir hata oluştu.');
        } finally {
          setLoading(false);
        }
      }
    } catch (error) {
      console.error('Galeriden fotoğraf seçme hatası:', error);
      Alert.alert('Hata', 'Fotoğraf seçilirken bir hata oluştu.');
      setLoading(false);
    }
  };

  // Kamera ile fotoğraf çekme
  const takePictureWithCamera = async () => {
    try {
      // Mevcut fotoğraf sayısını kontrol et
      if (images.length >= 3) {
        Alert.alert('Limit', 'En fazla 3 fotoğraf ekleyebilirsiniz.');
        return;
      }
      
      // Kamera izinlerini kontrol et - Güncel expo-camera API'si ile
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      
      if (cameraPermission.status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Kamera erişim izni vermeniz gerekiyor.');
        return;
      }
      
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7, // Kalite düşürüldü
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Yükleme göstergesi
        setLoading(true);
        
        try {
          // Resmi sıkıştır
          const newUri = result.assets[0].uri;
          const compressedUri = await compressImage(newUri);
          
          const newImageWithId = {
            uri: compressedUri,
            id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` // Benzersiz ID oluştur
          };
          
          console.log('YENİ FOTOĞRAF ÇEKİLDİ VE SIKIŞTIRILDI');
          
          // Mevcut tüm fotoğrafları ve yeni eklenen fotoğrafı içeren yeni bir dizi oluştur
          const updatedImages = [...images, newImageWithId];
          console.log('KAMERA - GÜNCELLEME ÖNCESİ:', images.length, 'fotoğraf');
          console.log('KAMERA - GÜNCELLEME SONRASI:', updatedImages.length, 'fotoğraf');
          
          // State'i güncelle
          setImages(updatedImages);
        } catch (error) {
          console.error('Resim sıkıştırma işlemi başarısız:', error);
          Alert.alert('Hata', 'Resim işlenirken bir hata oluştu.');
        } finally {
          setLoading(false);
        }
      }
    } catch (error) {
      console.error('Kamera ile fotoğraf çekme hatası:', error);
      Alert.alert('Hata', 'Fotoğraf çekilirken bir hata oluştu.');
      setLoading(false);
    }
  };

  // Fotoğraf silme fonksiyonu
  const removeImage = (index) => {
    // Yeni bir kopya oluştur ve seçilen fotoğrafı kaldır
    const updatedImages = [...images];
    updatedImages.splice(index, 1);
    setImages(updatedImages);
    console.log('FOTOĞRAF SİLİNDİ, YENİ SAYISI:', updatedImages.length);
  };

  const handleSubmit = async () => {
    if (!title || !description || !category || !city || !district || !address) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun.');
      return;
    }

    if (!coordinates) {
      // Use city coordinates if specific location not selected
      useSelectedCityLocation();
    }

    setLoading(true);

    try {
      // Resimleri tekrar sıkıştır (güvenlik için)
      let processedImages = [];
      
      if (images.length > 0) {
        try {
          for (const img of images) {
            const uri = typeof img === 'object' ? img.uri : img;
            const compressedUri = await compressImage(uri);
            processedImages.push(compressedUri);
          }
        } catch (err) {
          console.error('Son sıkıştırmada hata:', err);
          // Hataya rağmen orijinal resimleri kullan
          processedImages = images.map(img => typeof img === 'object' ? img.uri : img);
        }
      }

      const formData = {
        title,
        description,
        category,
        location: {
          address,
          district,
          city,
          coordinates: coordinates ? [coordinates.longitude, coordinates.latitude] : undefined,
          type: 'Point'
        },
        images: processedImages
      };

      console.log('Gönderilen veri:', JSON.stringify({
        ...formData, 
        images: `${formData.images.length} fotoğraf`
      }, null, 2));
      
      const response = await api.issues.create(formData);
      
      if (response.success) {
        Alert.alert('Başarılı', 'Sorun başarıyla bildirildi!', [
          { text: 'Tamam', onPress: () => navigation.navigate('Issues') }
        ]);
        
        // Reset form
        setTitle('');
        setDescription('');
        setCategory('');
        setImages([]);
        setAddress('');
        setCoordinates(null);
        
      } else {
        Alert.alert('Hata', response.message || 'Bir hata oluştu.');
      }
    } catch (error) {
      console.error('Sorun gönderme hatası:', error);
      Alert.alert('Hata', 'Sorun bildirilirken bir hata oluştu: ' + (error.message || 'Bilinmeyen hata'));
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { value: 'infrastructure', label: 'Altyapı' },
    { value: 'environmental', label: 'Çevre' },
    { value: 'transportation', label: 'Ulaşım' },
    { value: 'safety', label: 'Güvenlik' },
    { value: 'education', label: 'Eğitim' },
    { value: 'health', label: 'Sağlık' },
    { value: 'other', label: 'Diğer' }
  ];

  // Add state for picker modals
  const [pickerVisible, setPickerVisible] = useState(false);
  const [currentPicker, setCurrentPicker] = useState(null);
  
  // Add temporary states for picker values
  const [tempCategory, setTempCategory] = useState('');
  const [tempCity, setTempCity] = useState('');
  const [tempDistrict, setTempDistrict] = useState('');

  // Function to open the specific picker
  const openPicker = (picker) => {
    setCurrentPicker(picker);
    // Initialize temp values with current values
    if (picker === 'category') setTempCategory(category || '');
    else if (picker === 'city') setTempCity(city || '');
    else if (picker === 'district') setTempDistrict(district || '');
    setPickerVisible(true);
  };

  // Function to close the picker
  const closePicker = (saveValue = false) => {
    if (saveValue && currentPicker) {
      // Save the selected temp value based on picker type
      switch (currentPicker) {
        case 'category':
          if (tempCategory !== category) {
            setCategory(tempCategory);
          }
          break;
        case 'city':
          if (tempCity !== city) {
            setCity(tempCity);
            // Reset district if city changes
            setDistrict('');
          }
          break;
        case 'district':
          if (tempDistrict !== district) {
            setDistrict(tempDistrict);
          }
          break;
      }
    }
    setPickerVisible(false);
    setTimeout(() => {
      setCurrentPicker(null);
    }, 200); // Kısa bir gecikme ekleyerek animasyonun tamamlanmasını bekleyin
  };

  // Log images length after every render
  useEffect(() => {
    console.log('RENDER: images.length =', images.length);
    if (images.length > 0) {
      // Görüntünün URI'sini al (nesne veya dize olabilir)
      const firstImageUri = typeof images[0] === 'object' ? images[0].uri : images[0];
      console.log('RENDER: ilk resim URI =', firstImageUri.substring(0, 30) + '...');
    }
  }, [images]);

  // Custom Picker Button Component
  const CustomPickerButton = ({ label, value, onPress, placeholder }) => {
    // Kategori için görüntülenecek değeri bul
    let displayValue = value;
    if (label === "Kategori" && value) {
      const foundCategory = categories.find(c => c.value === value);
      displayValue = foundCategory ? foundCategory.label : '';
    }
    
    return (
      <TouchableOpacity
        style={[
          styles.customPickerButton,
          !displayValue && styles.customPickerButtonEmpty
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Text style={styles.pickerButtonLabel}>{label}</Text>
        <View style={styles.pickerValueContainer}>
          <Text style={displayValue ? styles.pickerValue : styles.pickerPlaceholder}>
            {displayValue || placeholder}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#666" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.formContainer}>
        <Text style={styles.title}>Yeni Sorun Bildirimi</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Başlık</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Sorun başlığı"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Açıklama</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Sorunu detaylı bir şekilde açıklayın"
            multiline
            numberOfLines={4}
          />
        </View>
        
        {/* Kategori - Özelleştirilmiş buton */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Kategori</Text>
          <CustomPickerButton 
            label="Kategori" 
            value={category} 
            placeholder="Kategori Seçin"
            onPress={() => openPicker('category')} 
          />
        </View>
        
        {/* Şehir - Özelleştirilmiş buton */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Şehir</Text>
          <CustomPickerButton 
            label="Şehir" 
            value={city} 
            placeholder="Şehir Seçin"
            onPress={() => openPicker('city')} 
          />
        </View>
        
        {/* İlçe - Özelleştirilmiş buton */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>İlçe</Text>
          <CustomPickerButton 
            label="İlçe" 
            value={district} 
            placeholder={districts.length > 0 ? "İlçe Seçin" : "Önce şehir seçin"}
            onPress={() => districts.length > 0 ? openPicker('district') : null} 
          />
        </View>
        
        {/* Picker Modal */}
        <Modal
          visible={pickerVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => closePicker(false)}
        >
          <TouchableWithoutFeedback onPress={() => closePicker(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <TouchableOpacity 
                      onPress={() => closePicker(false)} 
                      style={styles.modalCloseButton}
                    >
                      <Text style={styles.modalCloseText}>İptal</Text>
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>
                      {currentPicker === 'category' ? 'Kategori Seçin' : 
                       currentPicker === 'city' ? 'Şehir Seçin' : 
                       currentPicker === 'district' ? 'İlçe Seçin' : ''}
                    </Text>
                    <TouchableOpacity 
                      onPress={() => closePicker(true)} 
                      style={styles.modalSaveButton}
                    >
                      <Text style={styles.modalSaveText}>Tamam</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.pickerContainer}>
                    {currentPicker === 'category' && (
                      <Picker
                        selectedValue={tempCategory}
                        onValueChange={(value) => setTempCategory(value)}
                        style={[styles.modalPicker, Platform.OS === 'android' ? styles.androidPicker : {}]}
                        itemStyle={styles.pickerItem}
                        mode={Platform.OS === 'android' ? 'dropdown' : 'dialog'}
                        dropdownIconColor="#333"
                      >
                        <Picker.Item label="Kategori seçin" value="" color="#999" />
                        {categories.map((cat) => (
                          <Picker.Item key={cat.value} label={cat.label} value={cat.value} color="#333" />
                        ))}
                      </Picker>
                    )}
                    
                    {currentPicker === 'city' && (
                      <Picker
                        selectedValue={tempCity}
                        onValueChange={(value) => setTempCity(value)}
                        style={[styles.modalPicker, Platform.OS === 'android' ? styles.androidPicker : {}]}
                        itemStyle={styles.pickerItem}
                        mode={Platform.OS === 'android' ? 'dropdown' : 'dialog'}
                        dropdownIconColor="#333"
                      >
                        <Picker.Item label="Şehir seçin" value="" color="#999" />
                        {cities.map((cityName) => (
                          <Picker.Item key={cityName} label={cityName} value={cityName} color="#333" />
                        ))}
                      </Picker>
                    )}
                    
                    {currentPicker === 'district' && (
                      <Picker
                        selectedValue={tempDistrict}
                        onValueChange={(value) => setTempDistrict(value)}
                        style={[styles.modalPicker, Platform.OS === 'android' ? styles.androidPicker : {}]}
                        itemStyle={styles.pickerItem}
                        mode={Platform.OS === 'android' ? 'dropdown' : 'dialog'}
                        dropdownIconColor="#333"
                      >
                        <Picker.Item label="İlçe seçin" value="" color="#999" />
                        {districts.map((districtName) => (
                          <Picker.Item key={districtName} label={districtName} value={districtName} color="#333" />
                        ))}
                      </Picker>
                    )}
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Adres</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={address}
            onChangeText={setAddress}
            placeholder="Sorunun tam adresi"
            multiline
            numberOfLines={3}
          />
        </View>
        
        <View style={styles.locationButtons}>
          <TouchableOpacity 
            style={[styles.locationButton, locationLoading && styles.disabledButton]} 
            onPress={getCurrentLocation}
            disabled={locationLoading}
          >
            {locationLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Konumumu Kullan</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.locationButton, styles.secondaryButton, !city && styles.disabledButton]} 
            onPress={useSelectedCityLocation}
            disabled={!city}
          >
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>Şehir Merkezini Kullan</Text>
          </TouchableOpacity>
        </View>
        
        {locationError && (
          <Text style={styles.errorText}>{locationError}</Text>
        )}
        
        {coordinates && (
          <Text style={styles.coordinatesText}>
            Konum: {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)}
          </Text>
        )}
        
        <View style={styles.imageSection}>
          <Text style={styles.label}>Fotoğraflar (Maksimum 3) - Mevcut: {images.length}</Text>
          
          <View style={styles.photoButtonsContainer}>
            <TouchableOpacity 
              style={[
                styles.photoButton, 
                styles.galleryButton,
                images.length >= 3 && styles.disabledButton
              ]} 
              onPress={pickImageFromGallery}
              disabled={images.length >= 3}
            >
              <Ionicons name="images-outline" size={20} color="#fff" />
              <Text style={styles.buttonText}>
                {getAddPhotoLabel()}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.photoButton, 
                styles.cameraButton,
                images.length >= 3 && styles.disabledButton
              ]} 
              onPress={takePictureWithCamera}
              disabled={images.length >= 3}
            >
              <Ionicons name="camera-outline" size={20} color="#fff" />
              <Text style={styles.buttonText}>
                {getTakePhotoLabel()}
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Fotoğraf ön izleme bölümü */}
          <View style={styles.imagePreviewArea}>
            {images.length > 0 ? (
            <View style={styles.imagesContainer}>
              {images.map((image, index) => (
                <View 
                  key={typeof image === 'object' ? image.id : `img-${index}`} 
                  style={styles.imagePreview}
                >
                  <Image 
                    source={{ uri: typeof image === 'object' ? image.uri : image }} 
                    style={styles.previewImage} 
                    onError={(e) => console.error(`Resim yükleme hatası (${index}):`, e.nativeEvent.error)}
                  />
                  <TouchableOpacity 
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                  >
                    <Ionicons name="close-circle" size={24} color="red" />
                  </TouchableOpacity>
                  <View style={styles.imageIndexBadge}>
                    <Text style={styles.imageIndexText}>{index + 1}</Text>
                  </View>
                </View>
              ))}
              
              {/* Boş kare ekleme */}
              {images.length < 3 && Array(3 - images.length).fill(0).map((_, i) => (
                <View key={`empty-${i}`} style={[styles.imagePreview, styles.emptyImagePreview]}>
                  <Ionicons name="add-circle-outline" size={30} color="#ccc" />
                </View>
              ))}
            </View>
            ) : (
            <View style={styles.imagePreviewContainer}>
              <Text style={styles.noImageText}>Fotoğraf eklenmedi</Text>
            </View>
            )}
          </View>
          
          {images.length > 0 && (
            <Text style={styles.imageCount}>
              {images.length} / 3 fotoğraf seçildi
            </Text>
          )}
        </View>
        
        <TouchableOpacity 
          style={[styles.submitButton, loading && styles.disabledButton]} 
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Sorunu Bildir</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  formContainer: {
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 6,
    color: '#555',
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    width: '100%',
  },
  picker: {
    height: 50,
  },
  locationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  locationButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    flex: 0.48,
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  secondaryButtonText: {
    color: '#4CAF50',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  disabledButton: {
    opacity: 0.7,
  },
  errorText: {
    color: '#f44336',
    marginBottom: 16,
  },
  coordinatesText: {
    fontStyle: 'italic',
    color: '#666',
    marginBottom: 16,
    fontSize: 12,
  },
  imageSection: {
    marginBottom: 20,
  },
  photoButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    flex: 0.48
  },
  galleryButton: {
    backgroundColor: '#2196F3',
  },
  cameraButton: {
    backgroundColor: '#4CAF50',
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  imagePreview: {
    width: '31%',
    aspectRatio: 1,
    marginBottom: 10,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  imageCount: {
    textAlign: 'center',
    marginTop: 10,
    color: '#555',
    fontWeight: '500',
  },
  noImageText: {
    color: '#999',
    fontStyle: 'italic',
  },
  submitButton: {
    backgroundColor: '#FF5722',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  imagePreviewContainer: {
    padding: 10,
    backgroundColor: '#eee',
    borderRadius: 8,
    alignItems: 'center',
  },
  emptyImagePreview: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center'
  },
  imagePreviewArea: {
    marginBottom: 20,
  },
  imageIndexBadge: {
    position: 'absolute',
    top: -10,
    left: -10,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 2,
  },
  imageIndexText: {
    color: '#555',
    fontWeight: 'bold',
  },
  customPickerButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  customPickerButtonEmpty: {
    borderColor: '#ccc',
    borderStyle: 'dashed',
  },
  pickerButtonLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  pickerValueContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  pickerPlaceholder: {
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: Platform.OS === 'ios' ? 30 : 0,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalCloseButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    minWidth: 60,
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#ff3b30',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalSaveButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    minWidth: 60,
    alignItems: 'center',
  },
  modalSaveText: {
    color: '#007aff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
    flex: 1,
  },
  modalPicker: {
    height: 215,
    width: '100%',
  },
  androidPicker: {
    color: '#333',
    backgroundColor: '#f9f9f9',
    height: 50,
    marginTop: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  pickerItem: {
    fontSize: 16,
    color: '#333',
  },
});

export default CreateIssueScreen; 