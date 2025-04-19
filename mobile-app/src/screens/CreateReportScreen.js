import React, { useState, useEffect } from 'react';
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

const CreateReportScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [severity, setSeverity] = useState('medium');
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
        const [longitude, latitude] = cityCoordinates[city];
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
    { label: 'Altyapı', value: 'altyapi' },
    { label: 'Çevre', value: 'cevre' },
    { label: 'Ulaşım', value: 'ulasim' },
    { label: 'Güvenlik', value: 'guvenlik' },
    { label: 'Temizlik', value: 'temizlik' },
    { label: 'Park ve Bahçeler', value: 'park_bahce' },
    { label: 'Diğer', value: 'diger' },
  ];
  
  // Önem seviyesi listesi
  const severityLevels = [
    { label: 'Düşük', value: 'low' },
    { label: 'Orta', value: 'medium' },
    { label: 'Yüksek', value: 'high' },
    { label: 'Kritik', value: 'critical' },
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
      // Clear previous errors
      setErrors({});
      
      // Validate required fields
      if (!title.trim()) {
        setErrors(prev => ({ ...prev, title: 'Başlık alanı zorunludur' }));
        return;
      }
      if (!category) {
        setErrors(prev => ({ ...prev, category: 'Kategori seçimi zorunludur' }));
        return;
      }
      if (!description.trim()) {
        setErrors(prev => ({ ...prev, description: 'Açıklama alanı zorunludur' }));
        return;
      }
      if (!address.trim()) {
        setErrors(prev => ({ ...prev, address: 'Adres alanı zorunludur' }));
        return;
      }
      if (!district) {
        setErrors(prev => ({ ...prev, district: 'İlçe alanı zorunludur' }));
        return;
      }
      if (!city) {
        setErrors(prev => ({ ...prev, city: 'İl alanı zorunludur' }));
        return;
      }
      if (!selectedLocation) {
        setErrors(prev => ({ ...prev, location: 'Lütfen haritadan konum seçiniz' }));
        return;
      }

      setLoading(true);

      // Format location data properly
      const locationData = {
        address: address.trim(),
        district: district,
        city: city,
        coordinates: [selectedLocation.longitude, selectedLocation.latitude]
      };

      console.log('Prepared location data:', JSON.stringify(locationData, null, 2));

      // Process image if present
      let processedImage = null;
      if (image) {
        try {
          console.log('Processing image:', image);
          const imageInfo = await FileSystem.getInfoAsync(image);
          
          if (imageInfo.exists) {
            console.log('Image exists, converting to base64');
            const base64 = await FileSystem.readAsStringAsync(image, {
              encoding: FileSystem.EncodingType.Base64,
            });
            processedImage = `data:image/jpeg;base64,${base64}`;
            console.log('Image successfully converted to base64');
          } else {
            console.warn('Image file not found:', image);
          }
        } catch (imageError) {
          console.error('Error processing image:', imageError);
          // Continue without image rather than failing the whole submission
        }
      }

      // Prepare the issue data
      const issueData = {
        title: title.trim(),
        description: description.trim(),
        category,
        severity,
        location: locationData,
        images: processedImage ? [processedImage] : []
      };

      console.log('Submitting issue data:', { 
        ...issueData, 
        images: issueData.images.length > 0 ? ['[Image data present but not logged]'] : [] 
      });

      // Submit the issue
      const result = await api.issues.create(issueData);

      if (result.success) {
        console.log('Issue created successfully:', result.data);
        Alert.alert(
          'Başarılı',
          'Sorununuz başarıyla kaydedildi. İlgili birimler tarafından incelenecektir.',
          [{ text: 'Tamam', onPress: () => navigation.navigate('Home') }]
        );
      } else {
        console.error('API error response:', result);
        Alert.alert(
          'Hata',
          result.message || 'Bildirim gönderilirken bir hata oluştu. Lütfen tekrar deneyin.'
        );
      }
    } catch (error) {
      console.error('Error submitting issue:', error);
      Alert.alert(
        'Hata',
        'Bildirim gönderilirken beklenmeyen bir hata oluştu. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Haritayı göster/gizle
  const toggleMap = () => {
    setMapVisible(!mapVisible);
  };

  // Haritadan konum seçme
  const handleLocationSelect = async (event) => {
    const coordinate = event.nativeEvent.coordinate;
    setSelectedLocation(coordinate);
    
    try {
      // Reverse geocoding to get address details
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: coordinate.latitude,
        longitude: coordinate.longitude
      });
      
      if (reverseGeocode && reverseGeocode.length > 0) {
        const addressData = reverseGeocode[0];
        
        // Build address string
        const addressParts = [
          addressData.name,
          addressData.street,
          addressData.district,
          addressData.city,
          addressData.region,
          addressData.postalCode
        ].filter(Boolean);
        
        // Update address field
        setAddress(addressParts.join(' '));
        
        // Update city if available in our list
        if (addressData.city && cities.includes(addressData.city)) {
          setCity(addressData.city);
        }
        
        // Update district if available in our list for the selected city
        if (addressData.city && addressData.district && 
            allDistricts[addressData.city] && 
            allDistricts[addressData.city].includes(addressData.district)) {
          setDistrict(addressData.district);
        }
        
        console.log('Address found via reverse geocoding:', addressData);
      }
    } catch (error) {
      console.error('Adres getirme hatası:', error);
      // Continue without address data rather than showing an error
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Konum izni vermeniz gerekiyor.');
        return;
      }
      
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      const { latitude, longitude } = location.coords;
      
      setSelectedLocation({ latitude, longitude });
      setInitialRegion({
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      
      setMapVisible(true);
      
      // Reverse geocoding to get address details
      try {
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude,
          longitude
        });
        
        if (reverseGeocode && reverseGeocode.length > 0) {
          const addressData = reverseGeocode[0];
          
          // Build address string
          const addressParts = [
            addressData.name,
            addressData.street,
            addressData.district,
            addressData.city,
            addressData.region,
            addressData.postalCode
          ].filter(Boolean);
          
          // Update address field
          setAddress(addressParts.join(' '));
          
          // Update city if available in our list
          if (addressData.city && cities.includes(addressData.city)) {
            setCity(addressData.city);
          }
          
          // Update district if available in our list for the selected city
          if (addressData.city && addressData.district && 
              allDistricts[addressData.city] && 
              allDistricts[addressData.city].includes(addressData.district)) {
            setDistrict(addressData.district);
          }
          
          console.log('Address found via reverse geocoding:', addressData);
        }
      } catch (geocodeError) {
        console.error('Adres getirme hatası:', geocodeError);
        // Continue without address data rather than showing an error
      }
    } catch (error) {
      console.error('Konum alma hatası:', error);
      Alert.alert('Hata', 'Mevcut konumunuz alınamadı.');
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

          {/* Resim Ekleme */}
          <Text style={styles.label}>Resim Ekle</Text>
          
          <View style={styles.imageButtonsContainer}>
            <TouchableOpacity style={styles.imageButton} onPress={takePhoto}>
              <Icon name="camera-alt" size={24} color="#3b82f6" />
              <Text style={styles.imageButtonText}>Kamera</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
              <Icon name="photo-library" size={24} color="#3b82f6" />
              <Text style={styles.imageButtonText}>Galeri</Text>
            </TouchableOpacity>
          </View>

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
    marginTop: 8,
    marginBottom: 16,
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f0ff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  imageButtonText: {
    color: '#3b82f6',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  imagePreviewContainer: {
    position: 'relative',
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: 10,
    right: 10,
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
});

export default CreateReportScreen;