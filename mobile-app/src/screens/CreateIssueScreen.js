import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';
import { cities } from '../data/cities';
import { allDistricts } from '../data/allDistricts';
import { cityCoordinates } from '../data/cityCoordinates';

const CreateIssueScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('infrastructure');
  const [images, setImages] = useState([]);
  const [city, setCity] = useState(user?.city || '');
  const [district, setDistrict] = useState(user?.district || '');
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

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Izin gerekli', 'Galeriye erişim izni vermeniz gerekiyor.');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImages([...images, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Resim seçme hatası:', error);
      Alert.alert('Hata', 'Resim seçilirken bir hata oluştu.');
    }
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
        images
      };

      console.log('Gönderilen veri:', JSON.stringify(formData, null, 2));
      
      const response = await api.issues.create(formData);
      
      if (response.success) {
        Alert.alert('Başarılı', 'Sorun başarıyla bildirildi!', [
          { text: 'Tamam', onPress: () => navigation.navigate('Issues') }
        ]);
        
        // Reset form
        setTitle('');
        setDescription('');
        setCategory('infrastructure');
        setImages([]);
        setAddress('');
        setCoordinates(null);
        
      } else {
        Alert.alert('Hata', response.message || 'Bir hata oluştu.');
      }
    } catch (error) {
      console.error('Sorun gönderme hatası:', error);
      Alert.alert('Hata', error.message || 'Sorun bildirilirken bir hata oluştu.');
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

  return (
    <ScrollView style={styles.container}>
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
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Kategori</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={category}
              onValueChange={(itemValue) => setCategory(itemValue)}
              style={styles.picker}
            >
              {categories.map((cat) => (
                <Picker.Item key={cat.value} label={cat.label} value={cat.value} />
              ))}
            </Picker>
          </View>
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Şehir</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={city}
              onValueChange={(itemValue) => setCity(itemValue)}
              style={styles.picker}
            >
              <Picker.Item label="Şehir seçin" value="" />
              {cities.map((cityName) => (
                <Picker.Item key={cityName} label={cityName} value={cityName} />
              ))}
            </Picker>
          </View>
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>İlçe</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={district}
              onValueChange={(itemValue) => setDistrict(itemValue)}
              style={styles.picker}
              enabled={districts.length > 0}
            >
              <Picker.Item label={districts.length > 0 ? "İlçe seçin" : "Önce şehir seçin"} value="" />
              {districts.map((districtName) => (
                <Picker.Item key={districtName} label={districtName} value={districtName} />
              ))}
            </Picker>
          </View>
        </View>
        
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
          <Text style={styles.label}>Fotoğraflar</Text>
          <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
            <Text style={styles.buttonText}>Fotoğraf Ekle</Text>
          </TouchableOpacity>
          
          <View style={styles.imagePreviewContainer}>
            {images.length > 0 ? (
              <Text style={styles.imageCount}>{images.length} fotoğraf seçildi</Text>
            ) : (
              <Text style={styles.noImageText}>Fotoğraf eklenmedi</Text>
            )}
          </View>
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
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
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
  addImageButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  imagePreviewContainer: {
    padding: 10,
    backgroundColor: '#eee',
    borderRadius: 8,
    alignItems: 'center',
  },
  imageCount: {
    color: '#555',
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
});

export default CreateIssueScreen; 