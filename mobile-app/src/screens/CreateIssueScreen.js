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
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import NotificationManager from '../utils/notificationManager';

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
  const [showLocationConfirmation, setShowLocationConfirmation] = useState(false);
  const [locationAccuracy, setLocationAccuracy] = useState(null);
  const [mapRegion, setMapRegion] = useState(null);
  const [isProcessingLocation, setIsProcessingLocation] = useState(false); // Konum işleme durumunu takip etmek için yeni bayrak

  // Get districts based on selected city
  const districts = city ? allDistricts[city] || [] : [];

  // DEV: Debug için cities ve allDistricts içeriğini konsola yazdır
  useEffect(() => {
    console.log('DATA-DEBUG: cities dizisi ilk 5 eleman:', cities.slice(0, 5));
    console.log('DATA-DEBUG: allDistricts ilk 3 anahtar:', Object.keys(allDistricts).slice(0, 3));
    
    // İlk şehir için ilçeler
    if (cities.length > 0) {
      const firstCity = cities[0];
      console.log(`DATA-DEBUG: ${firstCity} için ilçeler:`, allDistricts[firstCity] || 'İlçe bulunamadı');
    }
  }, []);

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

  // Mini harita için region hesapla
  useEffect(() => {
    if (coordinates) {
      setMapRegion({
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01
      });
    }
  }, [coordinates]);

  // Function to normalize text for better comparison
  const normalizeText = (text) => {
    if (!text) return '';
    return text
      .toLowerCase()
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/â/g, 'a')
      .replace(/î/g, 'i')
      .replace(/û/g, 'u')
      .replace(/[^a-z0-9]/gi, '');  // Remove non-alphanumeric characters
  };

  // Haversine formula to calculate distance between two coordinates
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
  };

  // Şehir adını allDistricts içinde bulmaya yardımcı olan fonksiyon
  const findCityInAllDistricts = (cityName) => {
    if (!cityName) return null;
    
    console.log('ŞEHIR-DEBUG: findCityInAllDistricts fonksiyonu çağrıldı:', cityName);
    
    // Direkt eşleşme kontrolü
    if (allDistricts[cityName]) {
      console.log('ŞEHIR-DEBUG: Direkt eşleşme bulundu:', cityName);
      return cityName;
    }
    
    // cities dizisinde bu isimde bir şehir var mı kontrol et
    if (cities.includes(cityName)) {
      console.log('ŞEHIR-DEBUG: Cities listesinde direkt eşleşme bulundu:', cityName);
      return cityName;
    }
    
    // Case insensitive kontrolü
    const lowerCityName = cityName.toLowerCase();
    const normalizedCityName = normalizeText(cityName);
    
    console.log('ŞEHIR-DEBUG: Normalize edilmiş şehir adı:', normalizedCityName);
    
    // 1. allDistricts içinde aramaya başla
    // Türkçe karakter uyumu için tüm şehirleri kontrol et
    for (const city in allDistricts) {
      if (city.toLowerCase() === lowerCityName ||
          normalizeText(city) === normalizedCityName) {
        console.log('ŞEHIR-DEBUG: allDistricts içinde eşleşme bulundu:', city);
        return city;
      }
    }
    
    // 2. İsim içindeki özel karakterleri kontrol et (örn. İstanbul > Istanbul)
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
    
    if (specialCaseMatches[lowerCityName]) {
      const specialMatch = specialCaseMatches[lowerCityName];
      // allDistricts içinde var mı kontrol et
      if (allDistricts[specialMatch]) {
        console.log('ŞEHIR-DEBUG: Özel durum eşleşmesi bulundu:', specialMatch);
        return specialMatch;
      }
    }
    
    // 3. Cities dizisinde kontrol et
    // Plaka kodundan şehir adını almaya çalış
    for (let i = 0; i < cities.length; i++) {
      const city = cities[i];
      if (city.toLowerCase() === lowerCityName || 
          normalizeText(city) === normalizedCityName) {
        console.log('ŞEHIR-DEBUG: Cities listesinde eşleşme bulundu:', city);
        
        // Şehir adı cities listesinde var ama allDistricts'te yok mu kontrol et
        if (allDistricts[city]) {
          return city;
        }
      }
    }
    
    // 4. cities içinde partial eşleşme ara
    const matchingCities = cities.filter(city => 
      city.toLowerCase().includes(lowerCityName) || 
      lowerCityName.includes(city.toLowerCase()) ||
      normalizeText(city).includes(normalizedCityName) ||
      normalizedCityName.includes(normalizeText(city))
    );
    
    if (matchingCities.length > 0) {
      console.log('ŞEHIR-DEBUG: Kısmi eşleşme bulundu, olasılıklar:', matchingCities);
      // En uygun eşleşmeyi bul (en kısa olanı seç)
      matchingCities.sort((a, b) => a.length - b.length);
      const bestMatch = matchingCities[0];
      console.log('ŞEHIR-DEBUG: En iyi kısmi eşleşme:', bestMatch);
      return bestMatch;
    }
    
    // 5. Kısaltmalar ve varyasyonlar için özel kontrol
    const cityVariants = {
      'ist': 'İstanbul',
      'ank': 'Ankara',
      'izm': 'İzmir',
      'antalya': 'Antalya',
      'adana': 'Adana',
      'konya': 'Konya',
      'gaziantep': 'Gaziantep',
      'mersin': 'Mersin',
      'diyarbakır': 'Diyarbakır',
      'hatay': 'Hatay',
      // Öğrendiklerimizi ekleyelim
    };
    
    for (const variant in cityVariants) {
      if (lowerCityName.includes(variant) || variant.includes(lowerCityName)) {
        const matchedCity = cityVariants[variant];
        console.log('ŞEHIR-DEBUG: Varyant eşleşmesi bulundu:', matchedCity);
        return matchedCity;
      }
    }
    
    console.log('ŞEHIR-DEBUG: Hiçbir eşleşme bulunamadı:', cityName);
    console.log('ŞEHIR-DEBUG: Elimizdeki ilk 5 şehir:', cities.slice(0, 5));
    console.log('ŞEHIR-DEBUG: allDistricts ilk 2 anahtar:', Object.keys(allDistricts).slice(0, 2));
    
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
        NotificationManager.showAlert(
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

  // getCurrentLocation fonksiyonunu güncelleyelim
  const getCurrentLocation = async () => {
    // Eğer lokasyon zaten işleniyorsa, işlemi tekrarlama
    if (locationLoading || isProcessingLocation) {
      console.log('Konum zaten alınıyor veya işleniyor, işlem iptal edildi.');
      return;
    }
    
    setLocationLoading(true);
    setLocationError(null);
    
    try {
      const hasPermission = await requestLocationPermission();
      
      if (!hasPermission) {
        setLocationLoading(false);
        return;
      }
      
      // İlk bildirim - Toast kullanılarak gösterilecek
      NotificationManager.info('Bilgi', 'Konumunuz alınıyor, lütfen bekleyin...');
      
      // Çoklu konum ölçümü yaparak daha doğru sonuçlar elde et
      let measurements = [];
      let locationWatchId = null;
      let timeoutId = null;
      
      // Promise olarak konum alma işlemini yönet
      await new Promise((resolve, reject) => {
        // Konum izlemeye başla ve 5 ölçüm topla
        Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            distanceInterval: 0,
            timeInterval: 1000,
          },
          (location) => {
            // Ölçümü kaydet
            console.log(`Konum ölçümü #${measurements.length + 1}: `, 
                        location.coords.latitude, 
                        location.coords.longitude, 
                        `Doğruluk: ${location.coords.accuracy} metre`);
            
            measurements.push(location);
            
            // 5 ölçüm tamamlandığında işlemi bitir
            if (measurements.length >= 5) {
              if (locationWatchId) {
                locationWatchId.remove();
              }
              clearTimeout(timeoutId);
              resolve();
            }
          }
        ).then(watchId => {
          locationWatchId = watchId;
        }).catch(error => {
          reject(error);
        });
        
        // 10 saniye içinde 5 ölçüm alınamazsa, mevcut ölçümlerle devam et
        timeoutId = setTimeout(() => {
          if (measurements.length > 0) {
            if (locationWatchId) {
              locationWatchId.remove();
            }
            resolve();
          } else {
            if (locationWatchId) {
              locationWatchId.remove();
            }
            reject(new Error('Konum alınamadı. Lütfen tekrar deneyin.'));
          }
        }, 10000);
      });
      
      // Konum işleme durumunu işaretle
      setIsProcessingLocation(true);
      
      // Ölçümleri doğruluk değerine göre sırala
      measurements.sort((a, b) => a.coords.accuracy - b.coords.accuracy);
      
      // En iyi ölçümü al (en düşük doğruluk değeri = en iyi doğruluk)
      const bestMeasurement = measurements[0];
      console.log('En iyi ölçüm seçildi, doğruluk:', bestMeasurement.coords.accuracy, 'metre');
      
      // Koordinat hassasiyetini artırmak için 6 ondalık basamak kullanalım
      const preciseLat = parseFloat(bestMeasurement.coords.latitude.toFixed(6));
      const preciseLng = parseFloat(bestMeasurement.coords.longitude.toFixed(6));
      
      // Konum doğruluğunu kaydet
      setLocationAccuracy(Math.round(bestMeasurement.coords.accuracy));
      
      // Konum bilgilerini güncelle
      setCoordinates({
        latitude: preciseLat,
        longitude: preciseLng
      });
      
      // Adres bilgisini almaya çalış
      try {
        // Koordinatlardan adres bilgisini getir
        console.log('KONUM-DEBUG: Koordinatlardan adres bilgisi alınıyor...', {
          latitude: preciseLat,
          longitude: preciseLng
        });
        
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: preciseLat,
          longitude: preciseLng
        });
        
        console.log('KONUM-DEBUG: reverseGeocode sonucu:', JSON.stringify(reverseGeocode, null, 2));
        
        if (reverseGeocode && reverseGeocode.length > 0) {
          const addressData = reverseGeocode[0];
          console.log('KONUM-DEBUG: Tüm adres verileri:', JSON.stringify(addressData, null, 2));
          
          // Adres bilgisini doldur
          let fullAddress = '';
          if (addressData.street) fullAddress += addressData.street;
          if (addressData.name) fullAddress += addressData.name ? (fullAddress ? ' ' + addressData.name : addressData.name) : '';
          if (addressData.district) fullAddress += addressData.district ? (fullAddress ? ', ' + addressData.district : addressData.district) : '';
          if (addressData.postalCode) fullAddress += addressData.postalCode ? (fullAddress ? ', ' + addressData.postalCode : addressData.postalCode) : '';
          
          console.log('KONUM-DEBUG: Oluşturulan adres:', fullAddress);
          setAddress(fullAddress || 'Adres bilgisi alınamadı');
          
          // Şehir ve ilçe bilgilerini API'den gelen verilerden ayarla
          if (addressData.city || addressData.region) {
            const cityName = addressData.city || addressData.region;
            console.log('KONUM-DEBUG: API\'den gelen şehir:', cityName);
            
            // API'den gelen şehir adını mevcut şehir listesi ile karşılaştır
            const normalizedCityName = findCityInAllDistricts(cityName);
            if (normalizedCityName) {
              console.log('KONUM-DEBUG: Eşleşen şehir bulundu:', normalizedCityName);
              setCity(normalizedCityName);
              
              // İlçe bilgisini ayarla
              if (addressData.district || addressData.subregion) {
                const districtName = addressData.district || addressData.subregion;
                console.log('KONUM-DEBUG: API\'den gelen ilçe:', districtName);
                
                // İlçeyi ilgili şehrin ilçeleri ile eşleştir
                if (allDistricts[normalizedCityName]) {
                  const foundDistrict = matchDistrictName(districtName, allDistricts[normalizedCityName], {
                    latitude: preciseLat,
                    longitude: preciseLng
                  }, normalizedCityName);
                  
                  if (foundDistrict) {
                    console.log('KONUM-DEBUG: Eşleşen ilçe bulundu:', foundDistrict);
                    setDistrict(foundDistrict);
                    setTempDistrict(foundDistrict);
                  } else if (allDistricts[normalizedCityName].length > 0) {
                    // Eşleşme bulunamadıysa ilk ilçeyi seç
                    const defaultDistrict = allDistricts[normalizedCityName][0];
                    console.log('KONUM-DEBUG: İlçe eşleşmesi bulunamadı, varsayılan seçildi:', defaultDistrict);
                    setDistrict(defaultDistrict);
                    setTempDistrict(defaultDistrict);
                  }
                }
              } else if (allDistricts[normalizedCityName] && allDistricts[normalizedCityName].length > 0) {
                // İlçe bilgisi yoksa, şehrin ilk ilçesini seç
                const defaultDistrict = allDistricts[normalizedCityName][0];
                console.log('KONUM-DEBUG: API\'den ilçe bilgisi gelmedi, varsayılan seçildi:', defaultDistrict);
                setDistrict(defaultDistrict);
                setTempDistrict(defaultDistrict);
              }
        } else {
              // Şehir eşleşmesi bulunamadıysa, varsayılan İstanbul'u kullan
              console.log('KONUM-DEBUG: Şehir eşleşmesi bulunamadı, varsayılan İstanbul seçiliyor');
              setCity('İstanbul');
              
              if (allDistricts['İstanbul'] && allDistricts['İstanbul'].length > 0) {
                const defaultDistrict = allDistricts['İstanbul'][0];
                setDistrict(defaultDistrict);
                setTempDistrict(defaultDistrict);
              }
            }
          } else {
            // Şehir bilgisi yoksa varsayılan olarak İstanbul'u kullan
            console.log('KONUM-DEBUG: API\'den şehir bilgisi gelmedi, varsayılan İstanbul seçiliyor');
            setCity('İstanbul');
            
            if (allDistricts['İstanbul'] && allDistricts['İstanbul'].length > 0) {
              const defaultDistrict = allDistricts['İstanbul'][0];
              setDistrict(defaultDistrict);
              setTempDistrict(defaultDistrict);
            }
          }
        } else {
          console.log('KONUM-DEBUG: reverseGeocode bilgisi boş geldi, varsayılan değerler kullanılıyor');
          setAddress('Adres bilgisi alınamadı');
          setCity('İstanbul');
          
          if (allDistricts['İstanbul'] && allDistricts['İstanbul'].length > 0) {
            const defaultDistrict = allDistricts['İstanbul'][0];
            setDistrict(defaultDistrict);
            setTempDistrict(defaultDistrict);
          }
        }
      } catch (error) {
        console.error('Adres getirme hatası:', error);
        setAddress('Adres bilgisi alınamadı');
        
        // Hata durumunda varsayılan değerleri kullan
        console.log('KONUM-DEBUG: Adres getirme hatası, varsayılan değerler kullanılıyor');
        setCity('İstanbul');
        
        if (allDistricts['İstanbul'] && allDistricts['İstanbul'].length > 0) {
          const defaultDistrict = allDistricts['İstanbul'][0];
          setDistrict(defaultDistrict);
          setTempDistrict(defaultDistrict);
        }
      }
      
      // Konum doğrulama modalını göster
      setShowLocationConfirmation(true);
      
      // Yükleme durumunu sıfırla
      setLocationLoading(false);
      
    } catch (error) {
      console.error('Konum alma hatası:', error);
      setLocationError('Konum alınamadı: ' + error.message);
      setLocationLoading(false);
      
      NotificationManager.error('Hata', 'Konum alınamadı: ' + error.message);
    } finally {
      // İşlem tamamlandı
      setIsProcessingLocation(false);
      setLocationLoading(false);
    }
  };
  
  // Konum onaylama fonksiyonu
  const confirmLocation = () => {
    setShowLocationConfirmation(false);
    
    // Eğer şehir otomatik ayarlanamadıysa, İstanbul'u varsayılan olarak seç
    if (!city) {
      console.log('KONUM-FIX: Şehir otomatik olarak ayarlanamadı, İstanbul seçiliyor');
      
      // İstanbul'u ve ilk ilçesini otomatik olarak seç
      setCity('İstanbul');
      if (allDistricts['İstanbul'] && allDistricts['İstanbul'].length > 0) {
        setDistrict(allDistricts['İstanbul'][0]);
        setTempDistrict(allDistricts['İstanbul'][0]);
      }
      
      // Kullanıcıya bildir
      NotificationManager.info(
        'Konum Bilgisi',
        'Şehir bilgisi tespit edilemediğinden varsayılan olarak İstanbul seçildi. İsterseniz değiştirebilirsiniz.'
      );
    }
    
    // Başarılı bildirimi göster (sadece bir kez)
    NotificationManager.success('Başarılı', 'Konum bilgileriniz kaydedildi');
  };
  
  // Konum reddetme fonksiyonu
  const rejectLocation = () => {
    setShowLocationConfirmation(false);
    setCoordinates(null);
    setLocationAccuracy(null);
    setAddress('');
    
    NotificationManager.info('Bilgi', 'Konumu tekrar almak için "Konumumu Kullan" butonuna tıklayın');
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
      NotificationManager.error('Form Hatası', `Lütfen aşağıdaki alanları doldurun:\n\n• ${errorMessages}`);
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
        NotificationManager.error('Konum Hatası', 'Lütfen konum seçiniz');
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
              // Base64 formatına "data:image/jpeg;base64," öneki ekle
              const base64WithPrefix = img.base64.startsWith('data:image/') 
                ? img.base64 
                : `data:image/jpeg;base64,${img.base64}`;
                
              processedImages.push(base64WithPrefix);
              console.log(`Resim base64 formatında hazırlandı, uzunluk: ${base64WithPrefix.length.toString().substring(0, 6)}...`);
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
        NotificationManager.showAlert('Başarılı', 'Sorun başarıyla bildirildi!', [
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
          
          NotificationManager.showAlert('Başarılı', 'Sorun başarıyla bildirildi!', [
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
          NotificationManager.showAlert(
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
      NotificationManager.error('Hata', 'Sorun gönderme işlemi başarısız oldu.');
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

  // Resim seçme fonksiyonu - galeriden
  const pickImageFromGallery = async () => {
    if (images.length >= 3 || imageLoading) return;
    
    try {
      setImageLoading(true);
      
      // İzinleri kontrol et
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        NotificationManager.error('İzin Gerekli', 'Galeriye erişim izni vermeniz gerekiyor.');
        setImageLoading(false);
        return;
      }
      
      // Resim seçiciyi aç
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        allowsMultipleSelection: false,
        base64: true,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        
        // Resim boyutunu kontrol et (max 10MB)
        const fileInfo = await FileSystem.getInfoAsync(selectedAsset.uri);
        if (fileInfo.exists && fileInfo.size > 10 * 1024 * 1024) {
          NotificationManager.warning('Uyarı', 'Resim boyutu çok büyük. Lütfen daha küçük bir resim seçin (maksimum 10MB).');
          setImageLoading(false);
          return;
        }
        
        // Resmi sıkıştır ve base64'e çevir
        const manipResult = await manipulateAsync(
          selectedAsset.uri,
          [{ resize: { width: 1200 } }],
          { compress: 0.8, format: SaveFormat.JPEG, base64: true }
        );
        
        // Base64 formatına "data:image/jpeg;base64," öneki ekle
        let base64Data = manipResult.base64;
        if (base64Data && !base64Data.startsWith('data:image/')) {
          base64Data = `data:image/jpeg;base64,${base64Data}`;
        }
        
        // İşlenmiş resmi state'e ekle
        const newImage = {
          uri: manipResult.uri,
          base64: base64Data,
          id: `img-${Date.now()}`
        };
        
        setImages([...images, newImage]);
      }
    } catch (error) {
      console.error('Resim seçme hatası:', error);
      NotificationManager.error('Hata', 'Resim seçilirken bir hata oluştu.');
    } finally {
      setImageLoading(false);
    }
  };
  
  // Resim çekme fonksiyonu - kamera
  const takePictureWithCamera = async () => {
    if (images.length >= 3 || imageLoading) return;
    
    try {
      setImageLoading(true);
      
      // İzinleri kontrol et
      const { status } = await Camera.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        NotificationManager.error('İzin Gerekli', 'Kamera erişim izni vermeniz gerekiyor.');
        setImageLoading(false);
        return;
      }
      
      // Kamerayı aç
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        
        // Resmi sıkıştır ve base64'e çevir
        const manipResult = await manipulateAsync(
          selectedAsset.uri,
          [{ resize: { width: 1200 } }],
          { compress: 0.8, format: SaveFormat.JPEG, base64: true }
        );
        
        // Base64 formatına "data:image/jpeg;base64," öneki ekle
        let base64Data = manipResult.base64;
        if (base64Data && !base64Data.startsWith('data:image/')) {
          base64Data = `data:image/jpeg;base64,${base64Data}`;
        }
        
        // İşlenmiş resmi state'e ekle
        const newImage = {
          uri: manipResult.uri,
          base64: base64Data,
          id: `img-${Date.now()}`
        };
        
        setImages([...images, newImage]);
      }
    } catch (error) {
      console.error('Fotoğraf çekme hatası:', error);
      NotificationManager.error('Hata', 'Fotoğraf çekilirken bir hata oluştu.');
    } finally {
      setImageLoading(false);
    }
  };
  
  // Resmi kaldırma fonksiyonu
  const removeImage = (index) => {
    if (index < 0 || index >= images.length) return;
    
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
  };
  
  // "Resim Ekle" butonu için dinamik etiket
  const getAddPhotoLabel = () => {
    if (images.length === 0) return "Resim Ekle";
    if (images.length < 3) return "Başka Ekle";
    return "Limit Doldu";
  };
  
  // "Fotoğraf Çek" butonu için dinamik etiket
  const getTakePhotoLabel = () => {
    if (images.length === 0) return "Fotoğraf Çek";
    if (images.length < 3) return "Yeni Çek";
    return "Limit Doldu";
  };

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

  // Mini harita bileşeni
  const MapPreview = () => {
    if (!coordinates) return null;
    
    return (
      <View style={styles.mapPreviewContainer}>
        <Text style={styles.mapTitle}>Konum Önizlemesi</Text>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.mapPreview}
          region={mapRegion}
          pitchEnabled={false}
          rotateEnabled={false}
          zoomEnabled={true}
          scrollEnabled={true}
        >
          <Marker
            coordinate={{
              latitude: coordinates.latitude,
              longitude: coordinates.longitude
            }}
          />
          {locationAccuracy && (
            <Circle
              center={{
                latitude: coordinates.latitude,
                longitude: coordinates.longitude
              }}
              radius={locationAccuracy}
              fillColor="rgba(51, 136, 255, 0.2)"
              strokeColor="rgba(51, 136, 255, 0.5)"
              strokeWidth={1}
            />
          )}
        </MapView>
        <View style={styles.mapActions}>
          <Text style={styles.mapInfoText}>
            Doğruluk: {locationAccuracy ? `${locationAccuracy} metre` : 'Bilinmiyor'}
          </Text>
          <TouchableOpacity 
            style={styles.changeLocationButton}
            onPress={() => {
              NotificationManager.showAlert(
                'Konum Seçimi',
                'Ne yapmak istiyorsunuz?',
                [
                  {
                    text: 'Konumu Tekrar Al',
                    onPress: getCurrentLocation
                  },
                  {
                    text: 'Manuel Seç (Yakında)',
                    onPress: () => {
                      NotificationManager.info('Bilgi', 'Bu özellik yakında eklenecek');
                    }
                  },
                  {
                    text: 'İptal',
                    style: 'cancel'
                  }
                ]
              );
            }}
          >
            <Text style={styles.changeLocationButtonText}>Konumu Değiştir</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
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
        
        {/* Mini harita */}
        <MapPreview />
        
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
      
      {/* Konum Doğrulama Modal */}
      <Modal
        visible={showLocationConfirmation}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContent}>
            <Text style={styles.confirmModalTitle}>Konum Doğrulama</Text>
            
            <View style={styles.confirmMapContainer}>
              {mapRegion && (
                <MapView
                  provider={PROVIDER_GOOGLE}
                  style={styles.confirmMap}
                  region={mapRegion}
                  pitchEnabled={false}
                  rotateEnabled={false}
                  zoomEnabled={false}
                  scrollEnabled={false}
                >
                  <Marker
                    coordinate={{
                      latitude: coordinates ? coordinates.latitude : 0,
                      longitude: coordinates ? coordinates.longitude : 0
                    }}
                  />
                  {locationAccuracy && (
                    <Circle
                      center={{
                        latitude: coordinates ? coordinates.latitude : 0,
                        longitude: coordinates ? coordinates.longitude : 0
                      }}
                      radius={locationAccuracy}
                      fillColor="rgba(51, 136, 255, 0.2)"
                      strokeColor="rgba(51, 136, 255, 0.5)"
                      strokeWidth={1}
                    />
                  )}
                </MapView>
              )}
            </View>
            
            <Text style={styles.confirmModalText}>
              Alınan konum bu civarda görünüyor. Doğruluk: {locationAccuracy} metre.
            </Text>
            
            <Text style={styles.confirmModalAddress}>
              {address || 'Adres bilgisi alınamadı'}
            </Text>
            
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity
                style={styles.rejectButton}
                onPress={rejectLocation}
              >
                <Text style={styles.rejectButtonText}>Doğru Değil</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={confirmLocation}
              >
                <Text style={styles.confirmButtonText}>Doğru</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  // Mini harita ile ilgili stiller
  mapPreviewContainer: {
    marginVertical: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  mapTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  mapPreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  mapActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  mapInfoText: {
    fontSize: 14,
    color: '#666',
  },
  changeLocationButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  changeLocationButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Konum doğrulama modal stilleri
  confirmModalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  confirmModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  confirmMapContainer: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 15,
  },
  confirmMap: {
    width: '100%',
    height: '100%',
  },
  confirmModalText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
    color: '#444',
  },
  confirmModalAddress: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
    fontStyle: 'italic',
  },
  confirmModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  rejectButton: {
    backgroundColor: '#f44336',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  rejectButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default CreateIssueScreen; 