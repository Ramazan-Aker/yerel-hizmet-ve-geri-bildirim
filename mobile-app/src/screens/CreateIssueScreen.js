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
import httpClient from '../utils/httpClient';
import { cities } from '../data/cities';
import { allDistricts } from '../data/allDistricts';
import { cityCoordinates } from '../data/cityCoordinates';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const CreateIssueScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [images, setImages] = useState([]);
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [locationDescription, setLocationDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [coordinates, setCoordinates] = useState(null);
  const [locationError, setLocationError] = useState(null);

  // Get districts based on selected city
  const districts = city ? allDistricts[city] || [] : [];

  // İlçe listesini şehir değiştiğinde güncelle
  useEffect(() => {
    console.log('DEBUGv2 - useEffect[city] - City changed:', city);
    
    if (city) {
      // İlçe listesini al, güncellenmiş olabilir
      const cityDistricts = allDistricts[city] || [];
      console.log('DEBUGv2 - useEffect[city] - Districts for selected city:', cityDistricts);
      
      if (cityDistricts.length > 0) {
        if (!district || !cityDistricts.includes(district)) {
          console.log('DEBUGv2 - useEffect[city] - Current district not valid or empty, setting first district');
          // Önce birbirleriyle eşleşmesi için temp'i ayarla
          setTempDistrict(cityDistricts[0]);
          // Sonra ana değişkeni güncelle
          setDistrict(cityDistricts[0]);
          
          // İlçe Form değeri güncellendiğinde hep kontrol etmeyi sağla
          console.log(`DEBUGv2 - useEffect[city] - İlçe ${cityDistricts[0]} olarak ayarlandı`);
        } else {
          console.log('DEBUGv2 - useEffect[city] - Current district already valid:', district);
        }
      } else {
        console.log('DEBUGv2 - useEffect[city] - No districts available for city, creating default');
        createDefaultDistrictForCity(city);
        const newDistricts = allDistricts[city] || ['Merkez'];
        setTempDistrict(newDistricts[0]);
        setDistrict(newDistricts[0]);
      }
    } else {
      // Şehir seçilmediğinde ilçeyi sıfırla
      console.log('DEBUGv2 - useEffect[city] - No city selected, resetting district');
      setDistrict('');
      setTempDistrict('');
    }
  }, [city]); // Sadece şehir değiştiğinde çalışsın

  // Konum değişikliğini takip et
  useEffect(() => {
    // Koordinat değişikliğini kontrol et
    if (coordinates) {
      console.log('KONUM-EFFECT: Koordinatlar değişti, ilçe seçimini kontrol et');
      
      // İlçe doğru mu kontrol et
      if (city && district) {
        const currentCityDistricts = allDistricts[city] || [];
        
        // İlçenin geçerli olup olmadığını kontrol et
        if (!currentCityDistricts.includes(district)) {
          console.log('KONUM-EFFECT: İlçe geçerli değil, ilk ilçeyi ayarlıyorum');
          
          if (currentCityDistricts.length > 0) {
            setDistrict(currentCityDistricts[0]);
            setTempDistrict(currentCityDistricts[0]);
          }
        }
      }
    }
  }, [coordinates]);

  // Şehir adını allDistricts içinde bulmaya yardımcı olan fonksiyon
  const findCityInAllDistricts = (cityName) => {
    if (!cityName) return null;
    
    // Direkt eşleşme kontrolü
    if (allDistricts[cityName]) return cityName;
    
    console.log('DEBUG - Finding city in allDistricts:', cityName);
    
    // Case insensitive kontrolü
    const lowerCityName = cityName.toLowerCase();
    const normalizedCityName = normalizeText(cityName);
    
    // Türkçe karakter uyumu için tüm şehirleri kontrol et
    for (const city in allDistricts) {
      if (city.toLowerCase() === lowerCityName ||
          normalizeText(city) === normalizedCityName) {
        console.log('DEBUG - Found city match:', city);
        return city;
      }
    }
    
    // Özel Türkçe karakterler içeren şehir isimleri için kontrol
    const specialCaseMatches = {
      'istanbul': 'İstanbul',
      'izmir': 'İzmir',
      'canakkale': 'Çanakkale',
      'corum': 'Çorum',
      'eskisehir': 'Eskişehir',
      'kutahya': 'Kütahya',
      'mugla': 'Muğla',
      'nigde': 'Niğde',
      'sanliurfa': 'Şanlıurfa',
      'sirnak': 'Şırnak',
      'tekirdag': 'Tekirdağ',
      'usak': 'Uşak'
    };
    
    if (specialCaseMatches[lowerCityName] && allDistricts[specialCaseMatches[lowerCityName]]) {
      console.log('DEBUG - Found special case match:', specialCaseMatches[lowerCityName]);
      return specialCaseMatches[lowerCityName];
    }
    
    // Plaka kodundan şehir adını almaya çalış
    const cityIndex = cities.findIndex(c => 
      c.toLowerCase() === lowerCityName || 
      normalizeText(c) === normalizedCityName
    );
    
    if (cityIndex >= 0) {
      const cityFromList = cities[cityIndex];
      console.log('DEBUG - Found city in cities list:', cityFromList);
      
      // Şehir adı cities listesinde var ama allDistricts'te yok, aynı adla kontrol et
      if (allDistricts[cityFromList]) {
        return cityFromList;
      }
      
      // Case-insensitive kontrol
      for (const city in allDistricts) {
        if (normalizeText(city) === normalizeText(cityFromList)) {
          console.log('DEBUG - Normalized match in allDistricts:', city);
          return city;
        }
      }
    }
    
    console.log('DEBUG - Could not find city in allDistricts:', cityName);
    return null;
  };

  // Şehir için varsayılan ilçe oluştur
  const createDefaultDistrictForCity = (cityName) => {
    if (!cityName) return;
    
    console.log('DEBUG - Creating default district for city:', cityName);
    
    // Şehirin ilçelerini kontrol et
    if (!allDistricts[cityName] || allDistricts[cityName].length === 0) {
      // İlçe yoksa veya boşsa, Merkez ilçesini ekle
      allDistricts[cityName] = ['Merkez'];
      console.log(`DEBUG - Added default district 'Merkez' for city: ${cityName}`);
    }
    
    return allDistricts[cityName];
  };

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

  // Ayrı bir fonksiyon olarak ilçe seçme işlemini oluşturalım
  const setSelectedDistrict = (districtName, fromLocation = true) => {
    console.log('DEBUGv3 - setSelectedDistrict çağrıldı:', districtName, 'fromLocation:', fromLocation);
    
    // Önce state'i güncelle
    setDistrict(districtName);
    setTempDistrict(districtName);
    
    // Daha sonra doğrudan DOM manipülasyonu uygula (React olmayan bir yaklaşım ama çalışabilir)
    // Bunu bir timeout içinde yap ki React state güncellemesi tamamlansın
    setTimeout(() => {
      if (fromLocation) {
        Alert.alert(
          'Konum Bilgisi',
          `Konumunuz alındı.\n\nŞehir: ${city}\nİlçe: ${districtName}\n\nKonum bilginize göre ilçeniz belirlendi.`,
          [
            {
              text: 'Tamam',
              onPress: () => console.log('DEBUGv3 - Konum bilgisi onaylandı')
            }
          ]
        );
      }
    }, 100);
  };

  // İlçe adlarını karşılaştırma ve eşleştirme için özel fonksiyon
  const matchDistrictName = (apiDistrictName, districtsList, coords = null, cityName = null) => {
    if (!districtsList || districtsList.length === 0) return null;
    
    console.log('DEBUGv4 - matchDistrictName - Trying to match district for:', cityName);
    console.log('DEBUGv4 - matchDistrictName - API district/subregion:', apiDistrictName);
    console.log('DEBUGv4 - matchDistrictName - Coordinates:', coords);
    console.log('DEBUGv4 - matchDistrictName - Available districts:', districtsList);
    
    // 0. "Merkez" ilçesi varsa ve açıkça başka bir ilçe belirtilmemişse, Merkez'i döndür
    const hasCenter = districtsList.includes('Merkez');
    if (hasCenter && (!apiDistrictName || apiDistrictName.toLowerCase().includes('merkez'))) {
      console.log('DEBUGv4 - matchDistrictName - Using "Merkez" district as default');
      return 'Merkez';
    }
    
    // Eğer konum API'sinden gelen ilçe adı yoksa ama koordinatlar varsa
    if ((!apiDistrictName || apiDistrictName === '') && coords && coords.latitude && coords.longitude) {
      // Koordinat tabanlı ilçe belirlemesi - Özellikle büyük illerde çalışır
      console.log('DEBUGv4 - matchDistrictName - No district name, trying to determine by coordinates');
      
      // Merkez koordinatlar - yapay veri (gerçek koordinatlar eklenebilir)
      // Not: Gerçek uygulamada burada API'den data çekilebilir veya daha büyük bir veri seti kullanılabilir
      const districtCoordinates = {
        // İstanbul ilçeleri örnek
        'İstanbul': {
          'Kadıköy': { lat: 40.9830, lng: 29.0632 },
          'Üsküdar': { lat: 41.0235, lng: 29.0133 },
          'Beşiktaş': { lat: 41.0420, lng: 29.0064 },
          'Şişli': { lat: 41.0600, lng: 28.9900 },
          'Beyoğlu': { lat: 41.0370, lng: 28.9772 },
          'Fatih': { lat: 41.0170, lng: 28.9500 },
          // Diğer ilçeler...
        },
        // Ankara ilçeleri örnek
        'Ankara': {
          'Çankaya': { lat: 39.9208, lng: 32.8541 },
          'Keçiören': { lat: 39.9798, lng: 32.8641 },
          'Mamak': { lat: 39.9198, lng: 32.9161 },
          // Diğer ilçeler...
        },
        // Elazığ ilçeleri eklenmiş
        'Elazığ': {
          'Merkez': { lat: 38.6748, lng: 39.2225 },
          'Ağın': { lat: 38.9395, lng: 38.6734 },
          'Alacakaya': { lat: 38.4157, lng: 39.9724 },
          'Arıcak': { lat: 38.5652, lng: 40.0495 },
          'Baskil': { lat: 38.5704, lng: 38.8212 },
          'Karakoçan': { lat: 38.9524, lng: 40.0477 },
          'Keban': { lat: 38.7975, lng: 38.7480 },
          'Kovancılar': { lat: 38.7173, lng: 39.8492 },
          'Maden': { lat: 38.3927, lng: 39.6765 },
          'Palu': { lat: 38.6908, lng: 39.9377 },
          'Sivrice': { lat: 38.4420, lng: 39.3122 }
        }
        // Diğer şehirler eklenebilir...
      };
      
      // Eğer bu şehir için ilçe koordinatları varsa
      if (cityName && districtCoordinates[cityName]) {
        let nearestDistrict = null;
        let minDistance = Number.MAX_VALUE;
        
        // Her ilçe için mesafeyi hesapla
        for (const [district, distCoords] of Object.entries(districtCoordinates[cityName])) {
          // İlçe listeye dahil mi kontrol et
          if (!districtsList.includes(district)) continue;
          
          // Haversine formülü ile mesafe hesapla
          const distance = calculateDistance(
            coords.latitude, coords.longitude,
            distCoords.lat, distCoords.lng
          );
          
          console.log(`DEBUGv4 - matchDistrictName - Distance to ${district}: ${distance.toFixed(2)} km`);
          
          if (distance < minDistance) {
            minDistance = distance;
            nearestDistrict = district;
          }
        }
        
        if (nearestDistrict) {
          console.log(`DEBUGv4 - matchDistrictName - Nearest district by coordinates: ${nearestDistrict} (${minDistance.toFixed(2)} km)`);
          return nearestDistrict;
        }
      }
    }
    
    // API'den gelen district adı boşsa ve önceki yöntemlerle bulunamadıysa, Merkez'i veya ilk ilçeyi döndür
    if (!apiDistrictName || apiDistrictName.trim() === '') {
      // Merkez varsa Merkez'i, yoksa ilk ilçeyi seç
      if (hasCenter) {
        console.log('DEBUGv4 - matchDistrictName - No district info, defaulting to "Merkez"');
        return 'Merkez';
      } else {
        console.log('DEBUGv4 - matchDistrictName - No district info, defaulting to first district:', districtsList[0]);
        return districtsList[0];
      }
    }
    
    // 1. Tam eşleşme
    const exactMatch = districtsList.find(d => 
      d.toLowerCase() === apiDistrictName.toLowerCase()
    );
    
    if (exactMatch) {
      console.log('DEBUGv4 - matchDistrictName - Found exact match:', exactMatch);
      return exactMatch;
    }
    
    // 2. Türkçe karakterler normalize edilerek eşleşme
    const normalizedName = normalizeText(apiDistrictName);
    const normalizedMatch = districtsList.find(d => 
      normalizeText(d) === normalizedName
    );
    
    if (normalizedMatch) {
      console.log('DEBUGv4 - matchDistrictName - Found normalized match:', normalizedMatch);
      return normalizedMatch;
    }
    
    // 3. İlçe adı içerisinde geçen kelimeye göre eşleşme
    // Örn: "Bayrampaşa Mahalleleri" -> "Bayrampaşa"
    for (const district of districtsList) {
      if (apiDistrictName.toLowerCase().includes(district.toLowerCase()) ||
          normalizedName.includes(normalizeText(district))) {
        console.log('DEBUGv4 - matchDistrictName - Found partial match:', district);
        return district;
      }
    }
    
    // 4. İlçe kelimesi ilçe adının içerisinde geçiyorsa eşleşme
    // Örn: "Beşiktaş" -> "apiDistrictName içinde 'Beşiktaş' geçiyorsa"
    for (const district of districtsList) {
      const normalizedDistrict = normalizeText(district);
      if (district.length > 3 && ( // En az 4 karakter olmalı
        apiDistrictName.toLowerCase().includes(district.toLowerCase()) ||
        normalizedName.includes(normalizedDistrict)
      )) {
        console.log('DEBUGv4 - matchDistrictName - District name found in API response:', district);
        return district;
      }
    }
    
    // 5. Mahallelerin adreste geçmesini kontrol et
    // Eğer A mahallesindeyse ve A mahallesi B ilçesindeyse, B ilçesini seç
    const districtToNeighborhood = {
      'Ataşehir': ['Atatürk', 'Ferhatpaşa', 'İçerenköy'],
      'Kadıköy': ['Fikirtepe', 'Göztepe', 'Koşuyolu', 'Moda'],
      'Beşiktaş': ['Levent', 'Ortaköy', 'Bebek'],
      'Şişli': ['Mecidiyeköy', 'Nişantaşı', 'Fulya'],
      'Üsküdar': ['Kısıklı', 'Beylerbeyi', 'Bağlarbaşı']
      // Diğer ilçe-mahalle eşleşmeleri eklenebilir
    };
    
    for (const [district, neighborhoods] of Object.entries(districtToNeighborhood)) {
      for (const neighborhood of neighborhoods) {
        if (apiDistrictName.toLowerCase().includes(neighborhood.toLowerCase())) {
          if (districtsList.includes(district)) {
            console.log('DEBUGv4 - matchDistrictName - Matched by neighborhood mapping:', neighborhood, '->', district);
            return district;
          }
        }
      }
    }
    
    // Eğer şehir Elazığ ise ve hiçbir eşleşme bulunamazsa, Merkez'i döndür
    if (cityName === 'Elazığ' && hasCenter) {
      console.log('DEBUGv4 - matchDistrictName - Special case for Elazığ: defaulting to Merkez');
      return 'Merkez';
    }
    
    // Eşleşme bulunamazsa, Merkez varsa onu, yoksa ilk ilçeyi döndür
    if (hasCenter) {
      console.log('DEBUGv4 - matchDistrictName - No match found, using "Merkez" as fallback');
      return 'Merkez';
    }
    
    console.log('DEBUGv4 - matchDistrictName - No match found, returning first district:', districtsList[0]);
    return districtsList[0];
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
      
      console.log('DEBUGv4 - Konum alındı:', location.coords.latitude, location.coords.longitude);
      
      // Try to get address from coordinates
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
      
      if (reverseGeocode && reverseGeocode.length > 0) {
        const addressData = reverseGeocode[0];
        console.log('DEBUGv4 - Adres bilgileri:', JSON.stringify(addressData));
        
        // Adres bilgisini doldur
        let fullAddress = '';
        if (addressData.street) fullAddress += addressData.street;
        if (addressData.name) fullAddress += addressData.name ? (fullAddress ? ' ' + addressData.name : addressData.name) : '';
        if (addressData.district) fullAddress += addressData.district ? (fullAddress ? ', ' + addressData.district : addressData.district) : '';
        if (addressData.postalCode) fullAddress += addressData.postalCode ? (fullAddress ? ', ' + addressData.postalCode : addressData.postalCode) : '';
        
        setAddress(fullAddress || 'Adres bilgisi alınamadı');
        
        // Şehir bilgisini doldur
        let foundCity = null;
        
        // 1. Adım: Direkt şehir bilgisi varsa kullan
        if (addressData.city) {
          console.log('DEBUGv4 - Adres verisinden şehir bilgisi:', addressData.city);
          
          // Şehir adını cities listesinden bul
          foundCity = cities.find(cityName => 
            cityName.toLowerCase() === addressData.city.toLowerCase() ||
            normalizeText(cityName) === normalizeText(addressData.city)
          );
          
          if (foundCity) {
            console.log('DEBUGv4 - Şehir eşleştirildi:', foundCity);
          }
        }
        
        // 2. Adım: Şehir bulunamadıysa plaka kodundan bul
        if (!foundCity && addressData.region) {
          console.log('DEBUGv4 - Plaka kodundan şehir aranıyor. Region:', addressData.region);
          
          // Region içinde plaka kodu olabilir (örn: "01" Adana)
          const plateCode = addressData.region.match(/\d+/)?.[0];
          if (plateCode && parseInt(plateCode) > 0 && parseInt(plateCode) <= 81) {
            // Plaka kodundaki sıfırı kaldır (01 -> 1)
            const cityIndex = parseInt(plateCode) - 1;
            if (cityIndex >= 0 && cityIndex < cities.length) {
              foundCity = cities[cityIndex];
              console.log('DEBUGv4 - Plaka kodundan şehir bulundu:', foundCity);
            }
          }
        }
        
        // 3. Adım: Hala şehir bulunamadıysa, koordinatlara göre en yakın şehri bul
        if (!foundCity) {
          console.log('DEBUGv4 - Koordinatlara göre en yakın şehir aranıyor...');
          foundCity = findNearestCity(location.coords.latitude, location.coords.longitude);
          if (foundCity) {
            console.log('DEBUGv4 - En yakın şehir bulundu:', foundCity);
        }
        }
        
        // 4. Adım: Şehir bulunduysa doğru formata dönüştür ve ilçe bilgisini ayarla
        if (foundCity) {
          // allDistricts'te doğru şehir adını bul
          const formattedCityName = findCityInAllDistricts(foundCity) || foundCity;
          console.log('DEBUGv4 - Şehir adı formatlandı:', foundCity, '->', formattedCityName);
          
          // Önce şehri ayarla ve state'in güncellenmesini bekle
          setTempCity(formattedCityName);
          setCity(formattedCityName);
          
          // Şimdi ilçeleri ayarla - biraz gecikme ekleyelim şehir state'inin güncellenmesi için
          setTimeout(() => {
            // İlçe listesini al veya oluştur
            let cityDistricts = allDistricts[formattedCityName] || [];
            if (cityDistricts.length === 0) {
              console.log('DEBUGv4 - Şehir için ilçe bilgisi bulunamadı, varsayılan oluşturuluyor...');
              createDefaultDistrictForCity(formattedCityName);
              cityDistricts = allDistricts[formattedCityName] || ['Merkez'];
            }
            
            console.log('DEBUGv4 - Şehir için mevcut ilçeler:', cityDistricts);
            
            // İlçe seç - addressData'daki tüm bilgileri kullanarak
            let selectedDistrict = null;
            
            // Koordinatları da kullanarak ilçe belirleme - yeni parametre eklendi
            const apiDistrictName = addressData.district || addressData.subregion || '';
            console.log('DEBUGv4 - API\'den dönen district/subregion:', apiDistrictName);
            
            // Adres bilgilerinden ilçe bilgisi çıkarmaya çalış
            const addressParts = fullAddress.split(',').map(part => part.trim());
            console.log('DEBUGv4 - Adres parçaları:', addressParts);
            
            // Adres analizi için tüm bilgileri birleştir
            const addressInfo = {
              district: addressData.district || '',
              subregion: addressData.subregion || '',
              region: addressData.region || '',
              street: addressData.street || '',
              name: addressData.name || '',
              fullAddress: fullAddress
            };
            
            console.log('DEBUGv4 - Adres bilgileri analiz için:', addressInfo);
            
            // İlçe eşleştirmesini konumu ve şehir adını da kullanarak yap
            if (cityDistricts.length > 0) {
              selectedDistrict = matchDistrictName(
                apiDistrictName, 
                cityDistricts, 
                {latitude: location.coords.latitude, longitude: location.coords.longitude},
                formattedCityName
              );
              console.log('DEBUGv4 - İlçe eşleştirme sonucu:', selectedDistrict);
            }
            else {
              // Hiçbir ilçe bulunamazsa
              console.log('DEBUGv4 - İlçe bulunamadı, şehir ilçe listesinde ilçe yok');
              selectedDistrict = null;
            }
            
            // İlçeyi ayarla - özel fonksiyonu kullanarak
            if (selectedDistrict) {
              console.log('DEBUGv4 - İlçe seçiliyor:', selectedDistrict);
              // Özel fonksiyonu çağır
              setSelectedDistrict(selectedDistrict);
            }
          }, 500); // Şehir state'inin güncellenmesi için biraz bekleyelim
        } else {
          console.error('DEBUGv4 - Hiçbir şekilde şehir bulunamadı!');
          setLocationError('Şehir bilgisi alınamadı. Lütfen manuel seçim yapın.');
        }
      }
    } catch (error) {
      console.error('DEBUGv4 - Konum alma hatası:', error);
      setLocationError('Konum alınamadı: ' + error.message);
    } finally {
      setLocationLoading(false);
    }
  };

  // Türkçe karakter normalleştirme fonksiyonu
  const normalizeText = (text) => {
    if (!text) return '';
    
    return text.toLowerCase()
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/â/g, 'a')
      .replace(/î/g, 'i')
      .replace(/û/g, 'u');
  };
  
  // Koordinatlara göre en yakın şehri bulma fonksiyonu
  const findNearestCity = (latitude, longitude) => {
    if (!cityCoordinates || Object.keys(cityCoordinates).length === 0) {
      console.warn('Şehir koordinatları bulunamadı');
      return null;
    }
    
    let nearestCity = null;
    let minDistance = Number.MAX_VALUE;
    
    for (const city in cityCoordinates) {
      const cityCoord = cityCoordinates[city];
      // Bazı şehirler için koordinatlar farklı formatta olabilir
      let cityLat = 0, cityLon = 0;
      
      if (Array.isArray(cityCoord)) {
        // [longitude, latitude] formatı
        cityLon = cityCoord[0];
        cityLat = cityCoord[1];
      } else if (typeof cityCoord === 'object') {
        // {latitude, longitude} formatı
        cityLat = cityCoord.latitude;
        cityLon = cityCoord.longitude;
      } else {
        console.warn(`${city} için geçersiz koordinat formatı:`, cityCoord);
        continue;
      }
      
      const distance = calculateDistance(
        latitude, longitude,
        cityLat, cityLon
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        nearestCity = city;
      }
    }
    
    console.log('DEBUG - En yakın şehir hesaplandı:', nearestCity, 'mesafe:', minDistance.toFixed(2) + 'km');
    
    // Bulunan şehir allDistricts listesinde var mı kontrol et
    if (nearestCity && !allDistricts[nearestCity]) {
      // Doğru formatta şehir adını bul
      const formattedCity = findCityInAllDistricts(nearestCity);
      if (formattedCity) {
        console.log('DEBUG - Bulunan en yakın şehir formatlandı:', nearestCity, '->', formattedCity);
        return formattedCity;
    }
    }
    
    return nearestCity;
  };
  
  // İki koordinat arası mesafeyi hesaplama (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Dünya yarıçapı (km)
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c; // Kilometre cinsinden mesafe
    
    return distance;
  };
  
  // Derece -> Radyan dönüşümü
  const deg2rad = (deg) => {
    return deg * (Math.PI/180);
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

  // Fotoğrafları sıkıştırma ve yeniden boyutlandırma (sadece URI döndürür)
  const compressImage = async (uri) => {
    try {
      console.log('Resim sıkıştırılıyor:', uri.substring(0, 30) + '...');
      
      // URI kontrolü
      if (!uri || (typeof uri !== 'string') || uri.trim() === '') {
        console.error('Geçersiz URI:', uri);
        return null;
      }
      
      // Dosya mevcut mu kontrol et
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        console.error('Dosya bulunamadı:', uri);
        return null; // Dosya yoksa null döndür
      }
      
      // Orijinal boyutu kontrol et
      console.log('Orijinal dosya boyutu:', (fileInfo.size / 1024 / 1024).toFixed(2) + ' MB');
        
      // Boyut zaten küçükse (200KB'den az) sıkıştırmaya gerek yok
      let finalUri = uri;
      if (fileInfo.size > 200 * 1024) {
        // Sıkıştırma oranını dosya boyutuna göre belirle
        let compressionQuality = 0.7; // Varsayılan %70
        if (fileInfo.size > 5 * 1024 * 1024) { // 5MB'dan büyükse
          compressionQuality = 0.5; // Daha fazla sıkıştır (%50)
        } else if (fileInfo.size < 1 * 1024 * 1024) { // 1MB'dan küçükse
          compressionQuality = 0.8; // Daha az sıkıştır (%80)
        }
        
        // Resim sıkıştırma ve boyutlandırma işlemi
        const manipResult = await manipulateAsync(
          uri,
          [{ resize: { width: 800 } }], // 800 genişliğe yeniden boyutlandır (daha küçük)
          { compress: compressionQuality, format: SaveFormat.JPEG }
        );
        
        // Sıkıştırılmış dosya bilgisini al
        const compressedInfo = await FileSystem.getInfoAsync(manipResult.uri);
        console.log('Sıkıştırılmış dosya boyutu:', (compressedInfo.size / 1024 / 1024).toFixed(2) + ' MB');
        
        finalUri = manipResult.uri;
      } else {
        console.log('Dosya zaten küçük, sıkıştırma yapılmadı.');
      }
      
      return finalUri;
    } catch (error) {
      console.error('Resim sıkıştırma hatası:', error);
      return null; // Hata durumunda null döndür
        }
  };

  // URI'yi base64'e dönüştür
  const uriToBase64 = async (uri) => {
    try {
      if (!uri) return null;
      
      console.log('Resim base64 formatına dönüştürülüyor...');
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      if (!base64 || base64.length === 0) {
        console.warn('Base64 dönüştürme sonucu boş');
        return null;
      }
      
      console.log('Base64 dönüştürme başarılı, uzunluk:', base64.length);
      return `data:image/jpeg;base64,${base64}`;
    } catch (error) {
      console.error('Base64 dönüştürme hatası:', error);
      return null;
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
      
      setImageLoading(true);
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // Çoklu seçim için editing kapalı olmalı
        aspect: [4, 3],
        quality: 0.7, // Kalite düşürüldü
        allowsMultipleSelection: true, // Birden fazla resim seçmeye izin ver
        selectionLimit: remainingSlots, // En fazla kalan slot kadar seçilebilsin
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        try {
          console.log(`${result.assets.length} fotoğraf seçildi, işleniyor...`);
          
          // Her bir resmi tek tek işle
          const processedImages = [];
          
          for (const asset of result.assets) {
            // Önce resmi sıkıştır
            const compressedUri = await compressImage(asset.uri);
            
            if (compressedUri) {
              // Sonra base64'e dönüştür
              const base64Image = await uriToBase64(compressedUri);
              
              // Yeni resmi ekle - hem URI hem base64 içeriyor
              processedImages.push({
                uri: compressedUri, // Görsel gösterimi için URI
                base64: base64Image, // API'ye göndermek için base64
                id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` // Benzersiz ID oluştur
              });
            }
          }
          
          console.log(`${processedImages.length} fotoğraf başarıyla işlendi`);
          
          // State'i güncelle - mevcut images'ı kopyala ve yenilerini ekle
          const updatedImages = [...images, ...processedImages];
          setImages(updatedImages);
          
          console.log(`Toplam ${updatedImages.length} fotoğraf eklendi`);
        } catch (error) {
          console.error('Resim sıkıştırma işlemi başarısız:', error);
          Alert.alert('Hata', 'Resimler işlenirken bir hata oluştu.');
        }
      } else {
        console.log('Fotoğraf seçimi iptal edildi veya seçilen fotoğraf yok');
      }
    } catch (error) {
      console.error('Galeriden fotoğraf seçme hatası:', error);
      Alert.alert('Hata', 'Fotoğraf seçilirken bir hata oluştu.');
    } finally {
      setImageLoading(false);
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
      
      setImageLoading(true);
      
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7, // Kalite düşürüldü
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        try {
          // Resmi sıkıştır ve base64'e dönüştür
        const newUri = result.assets[0].uri;
          console.log('Fotoğraf çekildi, işleniyor:', newUri.substring(0, 30) + '...');
        
          // Önce resmi sıkıştır
          const compressedUri = await compressImage(newUri);
          
          if (compressedUri) {
            // Sonra base64'e dönüştür
            const base64Image = await uriToBase64(compressedUri);
            
            if (base64Image) {
              const newImageWithId = {
                uri: compressedUri, // Görsel gösterimi için URI
                base64: base64Image, // API'ye göndermek için base64
                id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` // Benzersiz ID oluştur
              };
              
              // Mevcut tüm fotoğrafları ve yeni eklenen fotoğrafı içeren yeni bir dizi oluştur
              const updatedImages = [...images, newImageWithId];
              
              // State'i güncelle
              setImages(updatedImages);
              
              console.log(`Fotoğraf başarıyla eklendi. Toplam: ${updatedImages.length}`);
            } else {
              Alert.alert('Hata', 'Resim işlenirken bir hata oluştu.');
            }
          } else {
            Alert.alert('Hata', 'Resim sıkıştırılırken bir hata oluştu.');
          }
        } catch (error) {
          console.error('Resim sıkıştırma işlemi başarısız:', error);
          Alert.alert('Hata', 'Resim işlenirken bir hata oluştu.');
        }
      } else {
        console.log('Fotoğraf çekimi iptal edildi veya çekilen fotoğraf yok');
      }
    } catch (error) {
      console.error('Kamera ile fotoğraf çekme hatası:', error);
      Alert.alert('Hata', 'Fotoğraf çekilirken bir hata oluştu.');
    } finally {
      setImageLoading(false);
    }
  };

  // Fotoğraf silme fonksiyonu
  const removeImage = (index) => {
    try {
      // Mevcut durumu kontrol et
      console.log(`${index}. fotoğraf siliniyor. Mevcut fotoğraf sayısı: ${images.length}`);
      
      // Yeni bir kopya oluştur ve seçilen fotoğrafı kaldır
      const updatedImages = [...images];
      updatedImages.splice(index, 1);
      
      // State'i güncelle
      setImages(updatedImages);
      
      console.log(`Fotoğraf silindi. Yeni fotoğraf sayısı: ${updatedImages.length}`);
    } catch (error) {
      console.error('Fotoğraf silme hatası:', error);
      Alert.alert('Hata', 'Fotoğraf silinirken bir hata oluştu.');
    }
  };

  const handleSubmit = async () => {
    // Validasyon hataları için boş bir obje oluştur
    const validationErrors = {};
    
    // Tüm alanları kontrol et
    if (!title) validationErrors.title = 'Başlık zorunludur';
    if (!description) validationErrors.description = 'Açıklama zorunludur';
    if (!category) validationErrors.category = 'Kategori zorunludur';
    if (!city) validationErrors.city = 'Şehir zorunludur';
    
    // İlçe kontrolü - şehir seçilmişse ve o şehrin ilçeleri varsa bir ilçe seçilmiş olmalı
    const availableDistricts = city ? allDistricts[city] || [] : [];
    if (availableDistricts.length > 0) {
      // Seçilen ilçe, mevcut ilçeler içinde var mı kontrolü
      if (!district || !availableDistricts.includes(district)) {
        console.log('DEBUG - İlçe validation - Current district:', district);
        console.log('DEBUG - İlçe validation - Available districts:', availableDistricts);
        validationErrors.district = 'Geçerli bir ilçe seçiniz';
        // İlçe geçersizse otomatik olarak ilk ilçeyi seç
        setDistrict(availableDistricts[0]);
      }
    }
    
    if (!address) validationErrors.address = 'Adres zorunludur';
    // Adres tarifi alanı opsiyoneldir
    if (!coordinates) validationErrors.coordinates = 'Konum bilgisi zorunludur';
    
    // Eğer validasyon hataları varsa, uyarı göster ve geri dön
    if (Object.keys(validationErrors).length > 0) {
      // Hata mesajlarını birleştir
      const errorMessages = Object.values(validationErrors).join('\n• ');
      Alert.alert('Form Hatası', `Lütfen aşağıdaki alanları doldurun:\n\n• ${errorMessages}`);
      return;
    }

    setLoading(true);

    try {
      // Kullanıcı token'ını al
      const userToken = await AsyncStorage.getItem('token');
      if (!userToken) {
        console.warn('Kullanıcı token\'ı bulunamadı!');
      } else {
        console.log('Token bulundu, uzunluk:', userToken.length);
      }
      
      // Basitleştirilmiş bir formData oluşturalım - sadece zorunlu alanları içeren
      const basicFormData = {
        title: title.trim(),
        description: description.trim(),
        category, // Kategori ID'si olarak gönder, etiketini değil
        status: "pending", // Varsayılan durum
        location: {
          address: address.trim(),
          district,
          city,
          directionInfo: locationDescription.trim(),
          type: "Point"
        }
      };

      // Koordinatları ekleyelim (varsa)
      if (coordinates) {
        basicFormData.location.coordinates = [coordinates.longitude, coordinates.latitude];
      } else {
        // Koordinat yoksa hata mesajı göster ve işlemi durdur
        Alert.alert('Konum Hatası', 'Lütfen konum seçiniz');
        setLoading(false);
        return;
      }

      console.log('Sorun verisi hazırlanıyor:', JSON.stringify(basicFormData, null, 2));
      
      // Resim işleme adımı
      let processedImages = [];
      
      if (images.length > 0) {
        try {
          console.log(`${images.length} fotoğraf işleniyor...`);
          
          // Base64 kodlu görüntüleri al (images artık hem URI hem base64 içeriyor)
          for (const img of images) {
            if (img.base64) {
              processedImages.push(img.base64);
              console.log(`Resim base64 formatında bulundu, uzunluk: ${img.base64.length.toString().substring(0, 6)}...`);
            }
          }
          
          console.log(`${processedImages.length} adet base64 formatlı resim hazırlandı`);
        } catch (err) {
          console.error('Resim işleme hatası:', err);
          processedImages = [];
        }
      }

      // Tüm işlenmiş resimleri formData'ya ekle
      if (processedImages.length > 0) {
        basicFormData.images = processedImages; // Tüm resimleri ekle
        console.log(`${processedImages.length} adet resim formData'ya eklendi`);
      }

      console.log('Sorun bildirimi gönderiliyor...');
      
      try {
        const response = await api.issues.create(basicFormData);
      
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
          setLocationDescription('');
        setCoordinates(null);
      } else {
          throw new Error(response.message || 'API başarılı yanıt vermedi');
      }
    } catch (error) {
        console.error('Sorun bildirimi hatası:', error);
        
        // Son çare olarak httpClient kullan
        try {
          console.log('Alternatif yöntem deneniyor...');
          
          // API endpoint'ini belirle
          const apiEndpoint = "/issues";
          
          // httpClient kullan - axios yerine
          const rawResponse = await httpClient.post(apiEndpoint, basicFormData);
          
          console.log('Alternatif yanıt:', rawResponse);
          
          Alert.alert('Başarılı', 'Sorun başarıyla bildirildi!', [
            { text: 'Tamam', onPress: () => navigation.navigate('Issues') }
          ]);
          
          // Reset form
          setTitle('');
          setDescription('');
          setCategory('');
          setImages([]);
          setAddress('');
          setLocationDescription('');
          setCoordinates(null);
        } catch (finalError) {
          console.error('Son çare hata:', finalError);
          
          if (finalError.response) {
            console.error('Yanıt detayları:', finalError.response.status, JSON.stringify(finalError.response.data));
          }
          
          // Kullanıcı oturumunu yenilemesini iste
          Alert.alert(
            'Yetki Hatası',
            'Sorun gönderilirken yetkilendirme hatası oluştu. Lütfen uygulamadan çıkıp tekrar giriş yapın.',
            [
              { text: 'Tamam' }
            ]
          );
        }
      }
    } catch (error) {
      console.error('ANA FONKSIYON HATASI:', error);
      Alert.alert('Hata', 'Sorun gönderme işlemi başarısız oldu.');
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { value: 'Altyapı', label: 'Altyapı' },
    { value: 'Çevre', label: 'Çevre' },
    { value: 'Ulaşım', label: 'Ulaşım' },
    { value: 'Güvenlik', label: 'Güvenlik' },
    { value: 'Temizlik', label: 'Temizlik' },
    { value: 'Diğer', label: 'Diğer' }
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
    console.log('DEBUG - Opening picker:', picker);
    console.log('DEBUG - Current city:', city);
    
    // Initialize temp values with current values
    if (picker === 'category') {
      setTempCategory(category || '');
      setCurrentPicker(picker);
      setPickerVisible(true);
    } 
    else if (picker === 'city') {
      setTempCity(city || '');
      setCurrentPicker(picker);
      setPickerVisible(true);
    } 
    else if (picker === 'district') {
      // İlçe picker'ı için hazırlık
      setTempDistrict(district || '');
      setCurrentPicker(picker);
      setPickerVisible(true);
    }
  };

  // Function to close the picker and apply the selected value
  const closePicker = (save) => {
    console.log('DEBUGv3 - closePicker - save:', save, 'currentPicker:', currentPicker);
    
    if (save) {
      if (currentPicker === 'category') {
        console.log('DEBUGv3 - closePicker - Setting category from', category, 'to', tempCategory);
        setCategory(tempCategory);
      } 
      else if (currentPicker === 'city') {
        // Şehir değişirse (mevcut şehirden farklıysa)
        if (tempCity !== city) {
          console.log('DEBUGv3 - closePicker - City changing from', city, 'to', tempCity);
          
          // Şehir değiştiğinde önce ilçeleri temizle sonra şehri ayarla
          // Bu sıralama önemli - useEffect sırası tahmin edilemez olabilir
          const newDistrictsList = getDistrictsForPicker(tempCity);
          
          // Eğer yeni şehrin ilçeleri varsa
          if (newDistrictsList.length > 0) {
            console.log('DEBUGv3 - closePicker - New city has districts, setting first one:', newDistrictsList[0]);
            
            // Şehir değiştiğinde otomatik olarak ilk ilçeyi seç
            setTempDistrict(newDistrictsList[0]);
            setDistrict(newDistrictsList[0]);
            
            // Önce varsayılan ilçeyi ayarlayıp sonra şehri güncelle
            // Bu şekilde React'ın yeniden render işleminde ilçe doğru olur
            console.log('DEBUGv3 - closePicker - Now updating city to:', tempCity);
            setCity(tempCity);
            
            // Kullanıcıya bilgi ver
            setTimeout(() => {
              console.log('DEBUGv3 - closePicker - Showing alert about district auto-selection');
              // Manuel seçim - konum bilgisinden gelmediğini belirt
              setSelectedDistrict(newDistrictsList[0], false);
            }, 300);
          }
          else {
            // Normal şehir güncelleme (useEffect ile ilçe güncellenecek)
            console.log('DEBUGv3 - closePicker - Setting city without districts:', tempCity);
            setCity(tempCity);
          }
        } else {
          console.log('DEBUGv3 - closePicker - City not changed, keeping as', city);
        }
      } 
      else if (currentPicker === 'district') {
        console.log('DEBUGv3 - closePicker - Setting district from', district, 'to', tempDistrict);
        setDistrict(tempDistrict);
      }
    } else {
      // İptal edildiğinde geçici değişkenleri sıfırla
      if (currentPicker === 'category') {
        console.log('DEBUGv3 - closePicker - Cancelled, resetting tempCategory to', category);
        setTempCategory(category || '');
      } 
      else if (currentPicker === 'city') {
        console.log('DEBUGv3 - closePicker - Cancelled, resetting tempCity to', city);
        setTempCity(city || '');
      } 
      else if (currentPicker === 'district') {
        console.log('DEBUGv3 - closePicker - Cancelled, resetting tempDistrict to', district);
        setTempDistrict(district || '');
      }
    }
    
    // Modalı kapat
    setPickerVisible(false);
    setCurrentPicker(null);
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
    // For displaying the selected value
    let displayValue = value;
    
    // Specific handling for category
    if (label === "Kategori" && value) {
      const foundCategory = categories.find(c => c.value === value);
      displayValue = foundCategory ? foundCategory.label : '';
    }
    
    // Log for debugging district display
    if (label === "İlçe") {
      console.log('DEBUG - District picker button rendering with value:', value);
      console.log('DEBUG - Available districts:', districts);
      
      // Ensure district value exists in current districts array
      if (value && districts.length > 0 && !districts.includes(value)) {
        console.log('DEBUG - Selected district not in current districts list');
      }
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

  // Picker'lar için manuel olarak ilçe oluştur
  const getDistrictsForPicker = (selectedCity) => {
    if (!selectedCity) return [];
    
    console.log('DEBUGv2 - getDistrictsForPicker - Getting districts for:', selectedCity);
    
    let districtsList = allDistricts[selectedCity] || [];
    
    // İlçe listesi boşsa, varsayılan oluştur
    if (districtsList.length === 0) {
      console.log('DEBUGv2 - getDistrictsForPicker - Creating default district');
      createDefaultDistrictForCity(selectedCity);
      districtsList = allDistricts[selectedCity] || ['Merkez'];
    }
    
    console.log('DEBUGv2 - getDistrictsForPicker - Found districts:', districtsList);
    return districtsList;
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.formContainer}>
        <Text style={styles.title}>Yeni Sorun Bildirimi</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Başlık <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Sorun başlığı"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Açıklama <Text style={styles.required}>*</Text></Text>
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
          <Text style={styles.label}>Kategori <Text style={styles.required}>*</Text></Text>
          <CustomPickerButton 
            label="Kategori" 
            value={category} 
            placeholder="Kategori Seçin"
            onPress={() => openPicker('category')} 
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Şehir <Text style={styles.required}>*</Text></Text>
          <CustomPickerButton 
            label="Şehir" 
            value={city} 
            placeholder="Şehir Seçin"
            onPress={() => openPicker('city')} 
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>İlçe <Text style={styles.required}>*</Text></Text>
          <CustomPickerButton 
            label="İlçe" 
            value={district} 
            placeholder={city ? "İlçe Seçin" : "Önce şehir seçin"}
            onPress={() => openPicker('district')} 
          />
        </View>
        
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
                        onValueChange={(value) => {
                          console.log('DEBUG - City picker changed to:', value);
                          setTempCity(value);
                          
                          // Şehir değiştiğinde hemen ilçeleri güncelle
                          if (value) {
                            // Şehir için doğru formatı bul
                            const formattedCityName = findCityInAllDistricts(value) || value;
                            if (formattedCityName !== value) {
                              console.log('DEBUG - Picker: formatted city name:', formattedCityName);
                              setTempCity(formattedCityName);
                              value = formattedCityName;
                            }
                            
                            // İlçeleri al, yoksa varsayılan oluştur
                            let cityDistricts = allDistricts[value] || [];
                            if (cityDistricts.length === 0) {
                              console.log('DEBUG - Picker: creating default district for city:', value);
                              createDefaultDistrictForCity(value);
                              cityDistricts = allDistricts[value] || ['Merkez'];
                            }
                            
                            console.log('DEBUG - City picker: found districts:', cityDistricts);
                            
                            // İlk ilçeyi seç
                            if (cityDistricts.length > 0) {
                              console.log('DEBUG - Setting temp district to first district:', cityDistricts[0]);
                              setTempDistrict(cityDistricts[0]);
                            }
                          }
                        }}
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
              onValueChange={(value) => {
                console.log('DEBUGv2 - District picker value changed to:', value);
                setTempDistrict(value);
              }}
              style={[styles.modalPicker, Platform.OS === 'android' ? styles.androidPicker : {}]}
              itemStyle={styles.pickerItem}
              mode={Platform.OS === 'android' ? 'dropdown' : 'dialog'}
              dropdownIconColor="#333"
            >
              <Picker.Item label="İlçe seçin" value="" color="#999" />
              {getDistrictsForPicker(tempCity || city).map((districtName, index) => (
                <Picker.Item 
                  key={`district-${districtName}-${index}`} 
                  label={districtName} 
                  value={districtName} 
                  color="#333" 
                />
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
          <Text style={styles.label}>Adres <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={address}
            onChangeText={setAddress}
            placeholder="Sorunun tam adresi"
            multiline
            numberOfLines={3}
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Adres Tarifi</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={locationDescription}
            onChangeText={setLocationDescription}
            placeholder="Yetkililerin konumu daha kolay bulabilmesi için ekstra bilgiler yazabilirsiniz. Örn: Apartmanın arkasındaki yeşil alan, parkın doğu girişi, vb."
            multiline
            numberOfLines={3}
          />
        </View>
        
        <View style={styles.sectionTitle}>
          <Text style={styles.sectionTitleText}>Konum Bilgileri</Text>
        </View>
        <View style={styles.locationSection}>
          <TouchableOpacity 
            style={styles.useMyLocationButton}
            onPress={getCurrentLocation}
            disabled={locationLoading}
          >
            {locationLoading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="location" size={20} color="#ffffff" />
                <Text style={styles.useMyLocationButtonText}>Konumumu Kullan</Text>
              </>
            )}
          </TouchableOpacity>
          
          <Text style={styles.locationInfoText}>
            <Ionicons name="information-circle-outline" size={16} color="#3b82f6" /> 
            "Konumumu Kullan" seçeneğine tıklayarak şehir ve ilçe bilgileriniz otomatik doldurulur.
          </Text>
        
        {locationError && (
          <Text style={styles.errorText}>{locationError}</Text>
        )}
        </View>
        
        {/* Konum koordinat alanı */}
        {coordinates ? (
          <Text style={styles.coordinatesText}>
            Konum: {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)}
          </Text>
        ) : (
          <Text style={styles.errorText}>Lütfen konum seçiniz</Text>
        )}
        
        <View style={styles.imageSection}>
          <Text style={styles.label}>Fotoğraflar (Maksimum 3) - Mevcut: {images.length}</Text>
          
          <View style={styles.photoButtonsContainer}>
            <TouchableOpacity 
              style={[
                styles.photoButton, 
                styles.galleryButton,
                (images.length >= 3 || imageLoading) && styles.disabledButton
              ]} 
              onPress={pickImageFromGallery}
              disabled={images.length >= 3 || imageLoading}
            >
              {imageLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
              <Ionicons name="images-outline" size={20} color="#fff" />
              <Text style={styles.buttonText}>
                {getAddPhotoLabel()}
              </Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.photoButton, 
                styles.cameraButton,
                (images.length >= 3 || imageLoading) && styles.disabledButton
              ]} 
              onPress={takePictureWithCamera}
              disabled={images.length >= 3 || imageLoading}
            >
              {imageLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
              <Ionicons name="camera-outline" size={20} color="#fff" />
              <Text style={styles.buttonText}>
                {getTakePhotoLabel()}
              </Text>
                </>
              )}
          </TouchableOpacity>
          </View>
          
          {/* Fotoğraf ön izleme bölümü */}
          <View style={styles.imagePreviewArea}>
            {imageLoading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text style={styles.loadingText}>Fotoğraflar işleniyor...</Text>
              </View>
            )}
            
            {images.length > 0 ? (
            <View style={styles.imagesContainer}>
              {images.map((image, index) => {
                // URI değerini çıkart
                const uri = image.uri || '';
                // Benzersiz key oluştur
                const key = image.id || `img-${index}-${Date.now()}`;
                
                return (
                  <View 
                    key={key}
                    style={styles.imagePreview}
                  >
                    <Image 
                      source={{ uri: uri }} 
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
                );
              })}
              
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
    marginBottom: 16,
  },
  locationButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    width: '100%',
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
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.8)',
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '500',
  },
  required: {
    color: 'red',
    fontWeight: 'bold',
  },
  buttonIcon: {
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  sectionTitleText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  locationSection: {
    marginBottom: 20,
  },
  useMyLocationButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  useMyLocationButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  locationInfoText: {
    color: '#666',
    marginTop: 5,
    marginBottom: 15,
    fontSize: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default CreateIssueScreen; 