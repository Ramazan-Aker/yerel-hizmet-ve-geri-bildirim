import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import MapView, { Marker } from 'react-native-maps';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';
import * as FileSystem from 'expo-file-system';
import * as Location from 'expo-location';
import { cityCoordinates } from '../data/cityCoordinates';
import { cities } from '../data/cities';
import { allDistricts } from '../data/allDistricts';
import Geocoder from 'react-native-geocoder';

// Resmi base64 formatına dönüştüren yardımcı fonksiyon
const imageToBase64 = async (uri) => {
  try {
    if (!uri) {
      console.warn('Image URI is empty or invalid');
      return null;
    }

    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      console.error('Resim dosyası bulunamadı:', uri);
      return null;
    }
    
    // Dosya boyutu kontrolü (10MB limiti)
    if (fileInfo.size > 10 * 1024 * 1024) {
      console.warn('Resim boyutu çok büyük (>10MB):', fileInfo.size);
      Alert.alert('Uyarı', 'Resim boyutu çok büyük. Lütfen daha küçük bir resim seçin (maksimum 10MB).');
      return null;
    }
    
    console.log('Resim dosya bilgisi:', { uri, size: fileInfo.size, exists: fileInfo.exists });
    
    // Dosyayı base64 formatında oku
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    if (!base64 || base64.length === 0) {
      console.warn('Base64 dönüştürme sonucu boş');
      return null;
    }
    
    console.log('Base64 dönüştürme başarılı, uzunluk:', base64.length);
    return base64;
  } catch (error) {
    console.error('Base64 dönüştürme hatası:', error);
    return null;
  }
};

const CreateReportScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [severity, setSeverity] = useState('Orta');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');
  const [availableDistricts, setAvailableDistricts] = useState([]);
  const [image, setImage] = useState(null);
  
  // Konum için
  const [mapVisible, setMapVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [errors, setErrors] = useState({});
  const [initialRegion, setInitialRegion] = useState({
    latitude: 41.0082,
    longitude: 28.9784,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  // Kullanıcı bilgisi değiştiğinde şehir bilgisini güncelle
  useEffect(() => {
    if (user && user.city) {
      setCity(user.city);
      console.log('Kullanıcı profil şehri ayarlandı:', user.city);
    }
  }, [user]);

  // Şehir değiştiğinde mevcut ilçeleri güncelle ve haritayı merkeze al
  useEffect(() => {
    if (city) {
      // İlçeleri güncelle
      setAvailableDistricts(allDistricts[city] || []);
      setDistrict('');
      
      // Şehir koordinatlarını al ve haritayı güncelle
      if (cityCoordinates[city]) {
        let longitude, latitude;
        
        // Veri formatını kontrol et
        if (Array.isArray(cityCoordinates[city])) {
          [longitude, latitude] = cityCoordinates[city];
        } 
        // Obje formatında ise
        else if (typeof cityCoordinates[city] === 'object') {
          longitude = cityCoordinates[city].longitude || 0;
          latitude = cityCoordinates[city].latitude || 0;
        }
        // Varsayılan değerler
        else {
          console.warn(`${city} için geçersiz koordinat formatı`);
          longitude = 28.9784; // İstanbul için varsayılan değer
          latitude = 41.0082;  // İstanbul için varsayılan değer
        }
        
        const newRegion = {
          latitude,
          longitude,
          latitudeDelta: 0.2,
          longitudeDelta: 0.2,
        };
        setInitialRegion(newRegion);
        
        // Harita açıksa seçilen konumu da güncelle
        if (mapVisible) {
          setSelectedLocation({
            latitude,
            longitude,
          });
        }
      }
    }
  }, [city]);

  // Kategori listesi
  const categories = [
    { label: 'Kategori Seçin', value: '' },
    { label: 'Altyapı', value: 'Altyapı' },
    { label: 'Çevre', value: 'Çevre' },
    { label: 'Ulaşım', value: 'Ulaşım' },
    { label: 'Güvenlik', value: 'Güvenlik' },
    { label: 'Temizlik', value: 'Temizlik' },
    { label: 'Park ve Bahçeler', value: 'Diğer' },
    { label: 'Diğer', value: 'Diğer' },
  ];
  
  // Önem seviyesi listesi
  const severityLevels = [
    { label: 'Düşük', value: 'Düşük' },
    { label: 'Orta', value: 'Orta' },
    { label: 'Yüksek', value: 'Yüksek' },
    { label: 'Kritik', value: 'Kritik' },
  ];

  // İzin kontrolü ve galeriden resim seçme
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Galeriye erişim izni vermeniz gerekiyor.');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Resim seçme hatası:', error);
      Alert.alert('Hata', 'Resim seçilirken bir hata oluştu.');
    }
  };

  // Kamera ile resim çekme
  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Kamera erişim izni vermeniz gerekiyor.');
        return;
      }
      
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Fotoğraf çekme hatası:', error);
      Alert.alert('Hata', 'Fotoğraf çekilirken bir hata oluştu.');
    }
  };

  // Form doğrulama ve gönderme
  const handleSubmit = async () => {
    try {
      setErrors({});
      setLoading(true);

      console.log('Submitting form with values:', {
        title,
        category,
        description,
        address,
        district,
        city,
        selectedLocation: selectedLocation ? `${selectedLocation.latitude}, ${selectedLocation.longitude}` : 'Not selected'
      });

      // Validate required fields
      const newErrors = {};
      if (!title) newErrors.title = 'Başlık gerekli';
      if (!category) newErrors.category = 'Kategori gerekli';
      if (!description) newErrors.description = 'Açıklama gerekli';
      if (!address) newErrors.address = 'Adres gerekli';
      if (!district) newErrors.district = 'İlçe gerekli';
      if (!city) newErrors.city = 'Şehir gerekli';
      
      // Only validate location if map is visible
      if (mapVisible && !selectedLocation) {
        newErrors.location = 'Lütfen haritadan bir konum seçin';
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        Alert.alert('Hata', 'Lütfen tüm gerekli alanları doldurun');
        setLoading(false);
        return;
      }

      // Format location data
      let locationData = {
        address: address || '',
        district: district || '',
        city: city || '',
        type: 'Point',
        coordinates: []
      };

      // Koordinatları belirleme
      if (selectedLocation) {
        locationData.coordinates = [selectedLocation.longitude, selectedLocation.latitude];
      } 
      // Koordinat yoksa şehrin varsayılan koordinatlarını kullan
      else if (cityCoordinates[city]) {
        let longitude, latitude;
        
        // Veri formatını kontrol et
        if (Array.isArray(cityCoordinates[city])) {
          [longitude, latitude] = cityCoordinates[city];
        } 
        // Obje formatında ise
        else if (typeof cityCoordinates[city] === 'object') {
          longitude = cityCoordinates[city].longitude || 0;
          latitude = cityCoordinates[city].latitude || 0;
        }
        // Varsayılan değerler
        else {
          console.warn(`${city} için geçersiz koordinat formatı`);
          longitude = 28.9784; // İstanbul için varsayılan değer
          latitude = 41.0082;  // İstanbul için varsayılan değer
        }
        
        locationData.coordinates = [longitude, latitude];
        console.log('Şehir koordinatları kullanıldı:', locationData.coordinates);
      } else {
        // Hiçbir şehir seçilmemişse İstanbul koordinatlarını kullan
        locationData.coordinates = [28.9784, 41.0082]; // İstanbul koordinatları
        console.log('Varsayılan koordinatlar kullanıldı (İstanbul)');
      }

      console.log('Location data:', JSON.stringify(locationData, null, 2));
      
      // Final validation of coordinates
      if (!Array.isArray(locationData.coordinates) || 
          locationData.coordinates.length !== 2 || 
          !isFinite(locationData.coordinates[0]) || 
          !isFinite(locationData.coordinates[1])) {
        console.warn('Koordinatlar geçersiz, varsayılan değerler kullanılıyor.');
        locationData.coordinates = [28.9784, 41.0082]; // İstanbul için varsayılan koordinatlar
      }

      // Process image if present
      let processedImage = null;
      if (image) {
        try {
          console.log('Processing image...', image);
          // Use the imageToBase64 function to convert the image
          const base64Image = await imageToBase64(image);
          if (base64Image) {
            processedImage = `data:image/jpeg;base64,${base64Image}`;
            console.log('Image processed successfully, size:', base64Image.length);
          } else {
            console.warn('Image conversion returned null, skipping image');
          }
        } catch (error) {
          console.error('Error processing image:', error);
          Alert.alert('Uyarı', 'Resim işlenirken bir hata oluştu, ancak bildirimi gönderebilirsiniz.');
          // Proceed without the image
        }
      } else {
        console.log('No image to process');
      }

      // Prepare issue data
      const issueData = {
        title,
        description,
        category,
        severity: severity || 'Orta',
        status: 'Yeni',
        location: locationData
      };

      // Add image if processed successfully
      if (processedImage) {
        issueData.images = [processedImage];
      }

      console.log('Sending issue data:', JSON.stringify({
        ...issueData,
        images: processedImage ? ['Base64 image data (truncated)'] : []
      }, null, 2));

      try {
        // Submit the issue
        const response = await api.issues.create(issueData);
        
        if (response.success) {
          console.log('Issue created successfully:', response.data);
          Alert.alert(
            'Başarılı', 
            'Bildiriminiz başarıyla oluşturuldu. Durumunu "Bildirimlerim" sayfasından takip edebilirsiniz.',
            [
              { 
                text: 'Tamam', 
                onPress: () => navigation.navigate('Home') 
              }
            ]
          );
        } else {
          console.error('Error creating issue:', response.message);
          // Hata detaylarını göster
          let errorMessage = 'Bildirim oluşturulurken bir hata oluştu';
          if (response.message) {
            errorMessage += `: ${response.message}`;
          }
          if (response.error && response.error.message) {
            errorMessage += `\n\nSunucu Hatası: ${response.error.message}`;
          }
          Alert.alert('Hata', errorMessage);
        }
      } catch (error) {
        console.error('Unexpected error during submission:', error);
        Alert.alert('Hata', 'Bildirim gönderilirken beklenmeyen bir hata oluştu');
      } finally {
        setLoading(false);
      }
    } catch (error) {
      console.error('Unexpected error during submission:', error);
      Alert.alert('Hata', 'Bildirim gönderilirken beklenmeyen bir hata oluştu');
    }
  };

  // Haritayı göster/gizle
  const toggleMap = () => {
    setMapVisible(!mapVisible);
  };

  // Haritadan konum seçme
  const handleLocationSelect = (event) => {
    try {
      const { coordinate } = event.nativeEvent;
      console.log('Selected location:', coordinate);
      
      if (!coordinate || typeof coordinate !== 'object' || !coordinate.latitude || !coordinate.longitude) {
        console.error('Invalid coordinate format:', coordinate);
        return;
      }

      setSelectedLocation(coordinate);
      
      // Reverse geocode to get address details
      Geocoder.from(coordinate.latitude, coordinate.longitude)
        .then(response => {
          if (!response || !response.results || response.results.length === 0) {
            console.error('No geocoding results found');
            return;
          }
          
          console.log('Geocoding response:', response.results[0]);
          const addressComponents = response.results[0].address_components;

          let streetName = '';
          let districtName = '';
          let cityName = '';

          for (let component of addressComponents) {
            const types = component.types;
            if (types.includes('route')) {
              streetName = component.long_name;
            } else if (types.includes('administrative_area_level_2')) {
              districtName = component.long_name;
            } else if (types.includes('administrative_area_level_1')) {
              cityName = component.long_name;
            }
          }

          // Combine street name with full address
          const fullAddress = response.results[0].formatted_address;
          const newAddress = streetName ? `${streetName}, ${fullAddress}` : fullAddress;

          setAddress(newAddress || '');
          setDistrict(districtName || '');
          setCity(cityName || '');
        })
        .catch(error => {
          console.error('Error during reverse geocoding:', error);
          Alert.alert('Uyarı', 'Konum bilgileri alınırken bir hata oluştu. Lütfen adresi manuel olarak girin.');
        });
    } catch (error) {
      console.error('Error in handleLocationSelect:', error);
      Alert.alert('Hata', 'Konum seçilirken bir hata oluştu.');
    }
  };

  // Kullanıcının konumunu al
  const getCurrentLocation = useCallback(async () => {
    try {
      setLoading(true);
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Konum izni verilmedi. Lütfen konumunuzu manuel olarak seçin.');
        setLoading(false);
        return;
      }
      
      const location = await Location.getCurrentPositionAsync({});
      console.log('Current location:', location);
      
      if (!location || !location.coords) {
        console.error('Invalid location data:', location);
        Alert.alert('Hata', 'Konum bilgisi alınamadı. Lütfen konumunuzu manuel olarak seçin.');
        setLoading(false);
        return;
      }

      const { latitude, longitude } = location.coords;
      
      const coordinate = {
        latitude,
        longitude
      };
      
      setSelectedLocation(coordinate);
      setMapVisible(true);
      
      // Reverse geocode the location
      Geocoder.from(latitude, longitude)
        .then(response => {
          if (!response || !response.results || response.results.length === 0) {
            throw new Error('No geocoding results found');
          }
          
          console.log('Geocoding response:', response.results[0]);
          const addressComponents = response.results[0].address_components;

          let streetName = '';
          let districtName = '';
          let cityName = '';

          for (let component of addressComponents) {
            const types = component.types;
            if (types.includes('route')) {
              streetName = component.long_name;
            } else if (types.includes('administrative_area_level_2')) {
              districtName = component.long_name;
            } else if (types.includes('administrative_area_level_1')) {
              cityName = component.long_name;
            }
          }

          // Combine street name with full address
          const fullAddress = response.results[0].formatted_address;
          const newAddress = streetName ? `${streetName}, ${fullAddress}` : fullAddress;

          setAddress(newAddress || '');
          setDistrict(districtName || '');
          setCity(cityName || '');
        })
        .catch(error => {
          console.error('Error during reverse geocoding:', error);
          Alert.alert('Uyarı', 'Adres bilgileri alınamadı. Lütfen adres bilgilerini manuel olarak girin.');
        })
        .finally(() => {
          setLoading(false);
        });
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Hata', 'Konum alınırken bir hata oluştu. Lütfen konumunuzu manuel olarak seçin.');
      setLoading(false);
    }
  }, []);

  const useSelectedCityLocation = () => {
    if (city && cityCoordinates[city]) {
      let longitude, latitude;
      
      // Veri formatını kontrol et
      if (Array.isArray(cityCoordinates[city])) {
        [longitude, latitude] = cityCoordinates[city];
      } 
      // Obje formatında ise
      else if (typeof cityCoordinates[city] === 'object') {
        longitude = cityCoordinates[city].longitude || 0;
        latitude = cityCoordinates[city].latitude || 0;
      }
      // Varsayılan değerler
      else {
        console.warn(`${city} için geçersiz koordinat formatı`);
        longitude = 28.9784; // İstanbul için varsayılan değer
        latitude = 41.0082;  // İstanbul için varsayılan değer
      }
      
      setCoordinates({
        latitude,
        longitude
      });
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView style={styles.container}>
        <View style={styles.formContainer}>
          {/* Başlık */}
          <Text style={styles.label}>Başlık <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, errors.title && styles.inputError]}
            placeholder="Sorun başlığını girin"
            value={title}
            onChangeText={setTitle}
          />
          {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}

          {/* Kategori */}
          <Text style={styles.label}>Kategori <Text style={styles.required}>*</Text></Text>
          <View style={[styles.pickerContainer, errors.category && styles.inputError]}>
            <Picker
              selectedValue={category}
              onValueChange={(itemValue) => setCategory(itemValue)}
              style={styles.picker}
            >
              {categories.map(item => (
                <Picker.Item key={item.value} label={item.label} value={item.value} />
              ))}
            </Picker>
          </View>
          {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}

          {/* Önem Seviyesi */}
          <Text style={styles.label}>Önem Seviyesi</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={severity}
              onValueChange={(itemValue) => setSeverity(itemValue)}
              style={styles.picker}
            >
              {severityLevels.map(item => (
                <Picker.Item key={item.value} label={item.label} value={item.value} />
              ))}
            </Picker>
          </View>

          {/* Şehir Seçimi */}
          <Text style={styles.label}>İl <Text style={styles.required}>*</Text></Text>
          <View style={[styles.pickerContainer, errors.city && styles.inputError]}>
            <Picker
              selectedValue={city}
              onValueChange={(itemValue) => setCity(itemValue)}
              style={styles.picker}
              enabled={false} // Şehri değiştirmeye izin verme
            >
              {cities.map((cityName, index) => (
                <Picker.Item key={index} label={cityName} value={cityName} />
              ))}
            </Picker>
          </View>
          {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
          <Text style={styles.infoText}>Şehir bilgisi profilinizden otomatik olarak alınmaktadır.</Text>

          {/* İlçe Seçimi */}
          <Text style={styles.label}>İlçe <Text style={styles.required}>*</Text></Text>
          <View style={[styles.pickerContainer, errors.district && styles.inputError]}>
            <Picker
              selectedValue={district}
              onValueChange={(itemValue) => setDistrict(itemValue)}
              style={styles.picker}
              enabled={availableDistricts.length > 0}
            >
              <Picker.Item label="İlçe Seçin" value="" />
              {availableDistricts.map((districtName, index) => (
                <Picker.Item key={index} label={districtName} value={districtName} />
              ))}
            </Picker>
          </View>
          {errors.district && <Text style={styles.errorText}>{errors.district}</Text>}

          {/* Adres */}
          <Text style={styles.label}>Adres <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, errors.address && styles.inputError]}
            placeholder="Adres bilgisi girin"
            value={address}
            onChangeText={setAddress}
          />
          {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}

          {/* Konum - Harita */}
          <View style={styles.mapContainer}>
            <View style={styles.mapHeader}>
              <Text style={styles.label}>Konum <Text style={styles.required}>*</Text></Text>
              <View style={styles.mapButtons}>
                <TouchableOpacity onPress={getCurrentLocation} style={styles.locationButton}>
                  <Icon name="my-location" size={18} color="#3b82f6" />
                  <Text style={styles.locationButtonText}>Konumumu Kullan</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={toggleMap} style={styles.toggleButton}>
                  <Text style={styles.toggleButtonText}>
                    {mapVisible ? 'Haritayı Gizle' : 'Haritayı Göster'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {mapVisible && (
              <View style={styles.mapWrapper}>
                <MapView
                  style={styles.map}
                  initialRegion={initialRegion}
                  region={initialRegion}
                  onPress={handleLocationSelect}
                >
                  {selectedLocation && (
                    <Marker coordinate={selectedLocation} />
                  )}
                </MapView>
                
                {selectedLocation && (
                  <View style={styles.locationInfo}>
                    <Text style={styles.locationInfoText}>
                      Konum seçildi: {selectedLocation.latitude.toFixed(4)}, {selectedLocation.longitude.toFixed(4)}
                    </Text>
                  </View>
                )}
              </View>
            )}
            {errors.location && <Text style={styles.errorText}>{errors.location}</Text>}
          </View>

          {/* Açıklama */}
          <Text style={styles.label}>Açıklama <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.textArea, errors.description && styles.inputError]}
            placeholder="Sorun hakkında detaylı açıklama yazın"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
          {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}

          {/* Görsel Ekleme */}
          <Text style={styles.sectionTitle}>Görsel Ekle</Text>
          <View style={styles.imageButtonsContainer}>
            <TouchableOpacity 
              style={[styles.imageButton, styles.galleryButton]} 
              onPress={pickImage}
              disabled={loading}
            >
              <Icon name="photo-library" size={24} color="#fff" />
              <Text style={styles.buttonText}>Galeriden Seç</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.imageButton, styles.cameraButton]} 
              onPress={takePhoto}
              disabled={loading}
            >
              <Icon name="camera-alt" size={24} color="#fff" />
              <Text style={styles.buttonText}>Fotoğraf Çek</Text>
            </TouchableOpacity>
          </View>
          
          {/* Görsel Önizleme */}
          {image && (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: image }} style={styles.imagePreview} />
              <TouchableOpacity 
                style={styles.removeImageButton}
                onPress={() => setImage(null)}
              >
                <Icon name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
          
          {/* Görsel Hata Mesajı */}
          {errors.image && (
            <Text style={styles.errorText}>{errors.image}</Text>
          )}

          {/* Gönder Butonu */}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Icon name="send" size={20} color="#fff" style={styles.submitIcon} />
                <Text style={styles.submitButtonText}>Bildirimi Gönder</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    backgroundColor: '#3b82f6',
    paddingVertical: 15,
    paddingHorizontal: 10,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  formContainer: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 6,
    color: '#333',
  },
  required: {
    color: 'red',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  inputError: {
    borderColor: 'red',
  },
  errorText: {
    color: 'red',
    fontSize: 14,
    marginTop: 4,
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 5,
  },
  picker: {
    height: 50,
  },
  textArea: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
  },
  mapContainer: {
    marginTop: 12,
    marginBottom: 12,
  },
  mapHeader: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  mapButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  toggleButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  toggleButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f0ff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  locationButtonText: {
    color: '#3b82f6',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  mapWrapper: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
  },
  map: {
    height: 250,
    width: '100%',
  },
  locationInfo: {
    backgroundColor: '#e6f7ff',
    padding: 10,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  locationInfoText: {
    fontSize: 14,
    color: '#333',
  },
  imageButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    flex: 0.48,
  },
  imageButtonText: {
    color: '#3b82f6',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: 10,
  },
  imagePreviewContainer: {
    position: 'relative',
    marginTop: 10,
  },
  removeImageButton: {
    position: 'absolute',
    top: 15,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 30,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitIcon: {
    marginRight: 8,
  },
  infoText: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 6,
    color: '#333',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  galleryButton: {
    backgroundColor: '#3b82f6',
  },
  cameraButton: {
    backgroundColor: '#3b82f6',
  },
});

export default CreateReportScreen;