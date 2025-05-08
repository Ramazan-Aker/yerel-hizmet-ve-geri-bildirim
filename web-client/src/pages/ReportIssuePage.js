import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { issueService } from '../services/api';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { toast } from 'react-hot-toast';
import { cityCoordinates } from '../data/cityCoordinates';
import { cities } from '../data/cities';
import { allDistricts } from '../data/allDistricts';
import { getAddressFromCoordinates, formatAddress, improveStreetInfo } from '../services/geocoding';

// Leaflet default icon fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon,
  shadowUrl: markerShadow,
});

const categories = [
  'Altyapı',
  'Üstyapı',
  'Çevre',
  'Ulaşım',
  'Güvenlik',
  'Temizlik',
  'Diğer'
];

const severities = [
  'Düşük',
  'Orta',
  'Yüksek',
  'Kritik'
];

// Haritanın merkez konumunu ayarlayan bileşen
const MapCenter = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 13);
    }
  }, [center, map]);
  return null;
};

const LocationMarker = ({ position, setPosition, setFormData, setIsLocationManuallySet }) => {
  const map = useMapEvents({
    click(e) {
      const newPosition = [e.latlng.lat, e.latlng.lng];
      setPosition(newPosition);
      
      // Konum manuel olarak seçildi
      if (typeof setIsLocationManuallySet === 'function') {
        setIsLocationManuallySet(true);
      }
      
      // Yeni geocoding servisi ile adres bilgisini al
      fetchAddressInfo(newPosition[0], newPosition[1]);
    },
  });

  // Koordinatlardan adres bilgisini getir
  const fetchAddressInfo = async (lat, lng) => {
    try {
      console.log(`Koordinatlardan adres bilgisi getiriliyor: ${lat}, ${lng}`);
      toast.loading('Adres bilgisi alınıyor...', { id: 'geocoding' });
      
      // Gelişmiş geocoding servisi kullan
      const addressData = await getAddressFromCoordinates(lat, lng);
      console.log('Adres bilgisi alındı:', addressData);
      
      // DEBUGGİNG: Gelen tüm adres bilgilerini göster
      console.log('-- ADDRESSData DEBUGGING --');
      console.log('addressData:', JSON.stringify(addressData, null, 2));
      console.log('addressData.city:', addressData.city);
      console.log('addressData.district:', addressData.district);
      console.log('cities içinde var mı?', addressData.city ? cities.includes(addressData.city) : false);
      
      // Sokak bilgilerini geliştir
      const improvedAddressData = improveStreetInfo(addressData);
      
      // DEBUGGİNG: Geliştirilmiş adres bilgilerini göster
      console.log('-- IMPROVED ADRESSS DEBUGGING --');
      console.log('improvedAddressData:', JSON.stringify(improvedAddressData, null, 2));
      console.log('improvedAddressData.city:', improvedAddressData.city);
      console.log('improvedAddressData.district:', improvedAddressData.district);
      console.log('cities içinde var mı?', improvedAddressData.city ? cities.includes(improvedAddressData.city) : false);
      
      // Adres bilgisini formatla
      const formattedAddress = formatAddress(improvedAddressData);
      console.log('Formatlanmış adres:', formattedAddress);
      
      // İlçe adaylarını topla - ham adres verilerinin tüm alanlarından ilçe olabilecekleri bulalım
      const districtCandidates = [];
      
      if (improvedAddressData.district) {
        districtCandidates.push(improvedAddressData.district);
      }
      
      if (improvedAddressData.rawData && improvedAddressData.rawData.address) {
        const addressFields = improvedAddressData.rawData.address;
        // OpenStreetMap'in tüm alanlarını kontrol edelim
        for (const key in addressFields) {
          // İlçe ismi olabilecek alanlar
          if (['city_district', 'district', 'town', 'municipality', 'county', 'village', 'suburb'].includes(key)) {
            const value = addressFields[key];
            if (value && !districtCandidates.includes(value)) {
              districtCandidates.push(value);
            }
          }
        }
      }
      
      console.log('İlçe adayları:', districtCandidates);
      
      // Form verilerini güncelleyecek nesneyi hazırla
      let updatedData = {
        address: formattedAddress || 'Konum belirlendi'
      };
      
      // Şehir bilgisini güncelle (eğer varsa)
      if (improvedAddressData.city) {
        const cityName = improvedAddressData.city.trim();
        
        // Şehir ismi kontrolü - tam eşleşme kontrolü
        if (cities.includes(cityName)) {
          console.log(`Şehir bilgisi güncelleniyor: ${cityName}`);
          updatedData.city = cityName;
          
          // Şehir bulunduktan sonra ilçe adaylarından ilk uygun olanı seçelim
          if (districtCandidates.length > 0 && allDistricts[cityName]) {
            const districtList = allDistricts[cityName];
            
            // İlçe adayları arasında tam eşleşme var mı?
            for (const candidate of districtCandidates) {
              if (districtList.includes(candidate)) {
                console.log(`İlçe adayı '${candidate}' listede bulundu, seçiliyor.`);
                updatedData.district = candidate;
                break;
              }
            }
            
            // Tam eşleşme yoksa benzerlik kontrolü yapalım
            if (!updatedData.district) {
              for (const candidate of districtCandidates) {
                const possibleDistrict = districtList.find(d => 
                  candidate.includes(d) || d.includes(candidate)
                );
                
                if (possibleDistrict) {
                  console.log(`Benzerlik ile ilçe adayı '${candidate}' -> '${possibleDistrict}' olarak düzeltildi.`);
                  updatedData.district = possibleDistrict;
                  break;
                }
              }
            }
          }
        } else {
          // Şehir ismini bulamadık, benzerlik kontrolü yapalım
          console.log(`Bulunan şehir adı (${cityName}) desteklenen şehirler listesinde yok.`);
          
          // Şehir ismini tam olarak bulamadık, içinde geçen bir il var mı diye kontrol edelim
          const possibleCity = cities.find(city => 
            cityName.includes(city) || city.includes(cityName)
          );
          
          if (possibleCity) {
            console.log(`Şehir adı benzerliğine göre ${possibleCity} olarak düzeltildi`);
            updatedData.city = possibleCity;
          } else {
            // Hala bulunamadıysa, rawData içinde daha fazla bilgi arayalım
            if (improvedAddressData.rawData && improvedAddressData.rawData.address) {
              const rawAddress = improvedAddressData.rawData.address;
              // Alternatif alanlar
              const alternativeCity = 
                rawAddress.province || 
                rawAddress.state || 
                rawAddress.county ||
                rawAddress.region ||
                '';
                
              if (alternativeCity) {
                const altCityName = alternativeCity.trim();
                if (cities.includes(altCityName)) {
                  console.log(`Alternatif alandan şehir bilgisi bulundu: ${altCityName}`);
                  updatedData.city = altCityName;
                } else {
                  console.log(`Alternatif bulunan şehir (${altCityName}) listede yok`);
                }
              }
            }
          }
        }
      } else {
        // city bilgisi yoksa rawData içindeki adres bilgilerini kontrol edelim
        if (improvedAddressData.rawData && improvedAddressData.rawData.address) {
          const rawAddress = improvedAddressData.rawData.address;
          for (const key in rawAddress) {
            // İl olabilecek tüm anahtar isimleri kontrol edelim
            const value = rawAddress[key];
            if (value && cities.includes(value)) {
              console.log(`rawData içinde şehir bulundu: ${value} (${key} alanında)`);
              updatedData.city = value;
              break;
            }
          }
        }
      }
      
      // 3. İlçe bilgisini ekle (eğer bulunduysa)
      if (improvedAddressData.district) {
        const districtName = improvedAddressData.district.trim();
        
        // İlçe adının doğru olduğunu varsayalım, ancak format düzenlemesi yapalım
        console.log(`İlçe bilgisi güncelleniyor: ${districtName}`);
        updatedData.district = districtName;
        
        // Eğer şehir seçilmiş ve allDistricts listesi mevcutsa, ilçenin listede olup olmadığını kontrol edelim
        if (updatedData.city && allDistricts[updatedData.city]) {
          const districtList = allDistricts[updatedData.city];
          
          // İlçe listede mi?
          if (districtList.includes(districtName)) {
            console.log(`İlçe (${districtName}) ${updatedData.city} ilinin ilçe listesinde mevcut`);
          } else {
            // İlçe ismini tam olarak bulamadık, benzerlik kontrolü
            console.log(`İlçe (${districtName}) ${updatedData.city} ilinin ilçe listesinde bulunamadı`);
            
            // Benzerlik kontrolü - içinde geçen bir ilçe var mı?
            const possibleDistrict = districtList.find(d => 
              districtName.includes(d) || d.includes(districtName)
            );
            
            if (possibleDistrict) {
              console.log(`İlçe adı benzerliğine göre ${possibleDistrict} olarak düzeltildi`);
              updatedData.district = possibleDistrict;
            }
          }
        } else {
          console.log(`Şehir seçilmediği veya ilçe listesi bulunamadığı için ilçe kontrolü yapılamıyor`);
        }
      } else {
        // district bilgisi yoksa rawData içindeki adres bilgilerini kontrol edelim
        if (improvedAddressData.rawData && improvedAddressData.rawData.address && updatedData.city) {
          const rawAddress = improvedAddressData.rawData.address;
          
          // İlçe olabilecek alternatif alanlar
          const alternativeDistrict = 
            rawAddress.town || 
            rawAddress.city_district || 
            rawAddress.district ||
            rawAddress.municipality ||
            rawAddress.county ||
            '';
            
          if (alternativeDistrict && allDistricts[updatedData.city]) {
            const districtList = allDistricts[updatedData.city];
            
            if (districtList.includes(alternativeDistrict)) {
              console.log(`Alternatif alandan ilçe bilgisi bulundu: ${alternativeDistrict}`);
              updatedData.district = alternativeDistrict;
            } else {
              // Benzerlik kontrolü
              const possibleDistrict = districtList.find(d => 
                alternativeDistrict.includes(d) || d.includes(alternativeDistrict)
              );
              
              if (possibleDistrict) {
                console.log(`Alternatif ilçe adı benzerliğine göre ${possibleDistrict} olarak düzeltildi`);
                updatedData.district = possibleDistrict;
              }
            }
          }
        }
      }
      
      // DEBUGGİNG: Güncellenecek form verilerini göster
      console.log('-- FORM UPDATE DEBUGGING --');
      console.log('Orijinal formData:', setFormData);
      console.log('Güncellenecek formData:', updatedData);
      
      // İlçe listesini kontrol edelim
      if (updatedData.city) {
        console.log(`Seçilen şehir (${updatedData.city}) için ilçe listesi:`, allDistricts[updatedData.city] || 'İlçe listesi bulunamadı');
        if (updatedData.district) {
          console.log(`Bulunan ilçe (${updatedData.district}) listede var mı:`, 
            allDistricts[updatedData.city] ? 
            allDistricts[updatedData.city].includes(updatedData.district) : 
            false
          );
        }
      }
      
      // Ham adres verilerini de inceleyelim
      if (improvedAddressData.rawData && improvedAddressData.rawData.address) {
        console.log('Ham adres verileri:', improvedAddressData.rawData.address);
      }
      
      // Form verilerini güncelle - önceki değerden bağımsız olarak güncelle
      setFormData(prev => {
        const newFormData = { ...prev, ...updatedData };
        console.log('Yeni form verileri:', newFormData);
        return newFormData;
      });
      
      console.log('Form verileri güncellendi!');
      toast.success('Adres bilgileri alındı', { id: 'geocoding' });
    } catch (error) {
      console.error('Adres bilgisi getirme hatası:', error);
      toast.error('Adres bilgisi alınamadı. Lütfen manuel olarak girin.', { id: 'geocoding' });
    }
  };

  return position ? <Marker position={position} /> : null;
};

const ReportIssuePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [mapCenter, setMapCenter] = useState([41.0082, 28.9784]); // Varsayılan: İstanbul

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    severity: 'Orta',
    address: '',
    district: '',
    city: '',
    locationDescription: '',
    images: []
  });

  // Seçilen şehir için geçerli ilçeler
  const [availableDistricts, setAvailableDistricts] = useState([]);

  const [position, setPosition] = useState(null);
  const [previewImages, setPreviewImages] = useState([]);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false); // Konum bulma durumu
  const [isLocationManuallySet, setIsLocationManuallySet] = useState(false); // Konum manuel olarak belirlendi mi?

  // Kullanıcının konumunu al
  const getUserLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Tarayıcınız konum hizmetini desteklemiyor.');
      return;
    }
    
    setIsLocating(true);
    toast.loading('Konumunuz alınıyor...', { id: 'userLocation' });
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        // Konumu ayarla
        setPosition([lat, lng]);
        
        // Harita merkezini güncelle
        setMapCenter([lat, lng]);
        
        // Konum manuel olarak ayarlandı
        setIsLocationManuallySet(true);
        
        // Adres bilgisini al
        try {
          console.log(`Koordinatlardan adres bilgisi getiriliyor: ${lat}, ${lng}`);
          
          // Gelişmiş geocoding servisi kullan
          const addressData = await getAddressFromCoordinates(lat, lng);
          console.log('Adres bilgisi alındı:', addressData);
          
          // DEBUGGİNG: Gelen tüm adres bilgilerini göster
          console.log('-- ADDRESSData DEBUGGING --');
          console.log('addressData:', JSON.stringify(addressData, null, 2));
          console.log('addressData.city:', addressData.city);
          console.log('addressData.district:', addressData.district);
          console.log('cities içinde var mı?', addressData.city ? cities.includes(addressData.city) : false);
          
          // Sokak bilgilerini geliştir
          const improvedAddressData = improveStreetInfo(addressData);
          
          // DEBUGGİNG: Geliştirilmiş adres bilgilerini göster
          console.log('-- IMPROVED ADRESSS DEBUGGING --');
          console.log('improvedAddressData:', JSON.stringify(improvedAddressData, null, 2));
          console.log('improvedAddressData.city:', improvedAddressData.city);
          console.log('improvedAddressData.district:', improvedAddressData.district);
          console.log('cities içinde var mı?', improvedAddressData.city ? cities.includes(improvedAddressData.city) : false);
          
          // Adres bilgisini formatla
          const formattedAddress = formatAddress(improvedAddressData);
          console.log('Formatlanmış adres:', formattedAddress);
          
          // İlçe adaylarını topla - ham adres verilerinin tüm alanlarından ilçe olabilecekleri bulalım
          const districtCandidates = [];
          
          if (improvedAddressData.district) {
            districtCandidates.push(improvedAddressData.district);
          }
          
          if (improvedAddressData.rawData && improvedAddressData.rawData.address) {
            const addressFields = improvedAddressData.rawData.address;
            // OpenStreetMap'in tüm alanlarını kontrol edelim
            for (const key in addressFields) {
              // İlçe ismi olabilecek alanlar
              if (['city_district', 'district', 'town', 'municipality', 'county', 'village', 'suburb'].includes(key)) {
                const value = addressFields[key];
                if (value && !districtCandidates.includes(value)) {
                  districtCandidates.push(value);
                }
              }
            }
          }
          
          console.log('İlçe adayları:', districtCandidates);
          
          // Şehir ve ilçe bilgisini güncelle
          let updatedFormData = {
            ...formData,
            address: formattedAddress || 'Konum belirlendi'
          };
          
          // Şehir bilgisini güncelle (eğer varsa)
          if (improvedAddressData.city) {
            const cityName = improvedAddressData.city.trim();
            
            // Şehir ismi kontrolü - tam eşleşme kontrolü
            if (cities.includes(cityName)) {
              console.log(`Şehir bilgisi güncelleniyor: ${cityName}`);
              updatedFormData.city = cityName;
              
              // Şehir bulunduktan sonra ilçe adaylarından ilk uygun olanı seçelim
              if (districtCandidates.length > 0 && allDistricts[cityName]) {
                const districtList = allDistricts[cityName];
                
                // İlçe adayları arasında tam eşleşme var mı?
                for (const candidate of districtCandidates) {
                  if (districtList.includes(candidate)) {
                    console.log(`İlçe adayı '${candidate}' listede bulundu, seçiliyor.`);
                    updatedFormData.district = candidate;
                    break;
                  }
                }
                
                // Tam eşleşme yoksa benzerlik kontrolü yapalım
                if (!updatedFormData.district) {
                  for (const candidate of districtCandidates) {
                    const possibleDistrict = districtList.find(d => 
                      candidate.includes(d) || d.includes(candidate)
                    );
                    
                    if (possibleDistrict) {
                      console.log(`Benzerlik ile ilçe adayı '${candidate}' -> '${possibleDistrict}' olarak düzeltildi.`);
                      updatedFormData.district = possibleDistrict;
                      break;
                    }
                  }
                }
              }
            } else {
              // Şehir ismini bulamadık, benzerlik kontrolü yapalım
              console.log(`Bulunan şehir adı (${cityName}) desteklenen şehirler listesinde yok.`);
              
              // Şehir ismini tam olarak bulamadık, içinde geçen bir il var mı diye kontrol edelim
              const possibleCity = cities.find(city => 
                cityName.includes(city) || city.includes(cityName)
              );
              
              if (possibleCity) {
                console.log(`Şehir adı benzerliğine göre ${possibleCity} olarak düzeltildi`);
                updatedFormData.city = possibleCity;
              } else {
                // Hala bulunamadıysa, rawData içinde daha fazla bilgi arayalım
                if (improvedAddressData.rawData && improvedAddressData.rawData.address) {
                  const rawAddress = improvedAddressData.rawData.address;
                  // Alternatif alanlar
                  const alternativeCity = 
                    rawAddress.province || 
                    rawAddress.state || 
                    rawAddress.county ||
                    rawAddress.region ||
                    '';
                    
                  if (alternativeCity) {
                    const altCityName = alternativeCity.trim();
                    if (cities.includes(altCityName)) {
                      console.log(`Alternatif alandan şehir bilgisi bulundu: ${altCityName}`);
                      updatedFormData.city = altCityName;
                    } else {
                      console.log(`Alternatif bulunan şehir (${altCityName}) listede yok`);
                    }
                  }
                }
              }
            }
          } else {
            // city bilgisi yoksa rawData içindeki adres bilgilerini kontrol edelim
            if (improvedAddressData.rawData && improvedAddressData.rawData.address) {
              const rawAddress = improvedAddressData.rawData.address;
              for (const key in rawAddress) {
                // İl olabilecek tüm anahtar isimleri kontrol edelim
                const value = rawAddress[key];
                if (value && cities.includes(value)) {
                  console.log(`rawData içinde şehir bulundu: ${value} (${key} alanında)`);
                  updatedFormData.city = value;
                  break;
                }
              }
            }
          }
          
          // İlçe bilgisini güncelle (eğer varsa)
          if (updatedFormData.district) {
            const districtName = updatedFormData.district.trim();
            
            // İlçe adının doğru olduğunu varsayalım, ancak format düzenlemesi yapalım
            console.log(`İlçe bilgisi güncelleniyor: ${districtName}`);
            updatedFormData.district = districtName;
            
            // Eğer şehir seçilmiş ve allDistricts listesi mevcutsa, ilçenin listede olup olmadığını kontrol edelim
            if (updatedFormData.city && allDistricts[updatedFormData.city]) {
              const districtList = allDistricts[updatedFormData.city];
              
              // İlçe listede mi?
              if (districtList.includes(districtName)) {
                console.log(`İlçe (${districtName}) ${updatedFormData.city} ilinin ilçe listesinde mevcut`);
              } else {
                // İlçe ismini tam olarak bulamadık, benzerlik kontrolü
                console.log(`İlçe (${districtName}) ${updatedFormData.city} ilinin ilçe listesinde bulunamadı`);
                
                // Benzerlik kontrolü - içinde geçen bir ilçe var mı?
                const possibleDistrict = districtList.find(d => 
                  districtName.includes(d) || d.includes(districtName)
                );
                
                if (possibleDistrict) {
                  console.log(`İlçe adı benzerliğine göre ${possibleDistrict} olarak düzeltildi`);
                  updatedFormData.district = possibleDistrict;
                }
              }
            } else {
              console.log(`Şehir seçilmediği veya ilçe listesi bulunamadığı için ilçe kontrolü yapılamıyor`);
            }
          } else {
            // district bilgisi yoksa rawData içindeki adres bilgilerini kontrol edelim
            if (improvedAddressData.rawData && improvedAddressData.rawData.address && updatedFormData.city) {
              const rawAddress = improvedAddressData.rawData.address;
              
              // İlçe olabilecek alternatif alanlar
              const alternativeDistrict = 
                rawAddress.town || 
                rawAddress.city_district || 
                rawAddress.district ||
                rawAddress.municipality ||
                rawAddress.county ||
                '';
                
              if (alternativeDistrict && allDistricts[updatedFormData.city]) {
                const districtList = allDistricts[updatedFormData.city];
                
                if (districtList.includes(alternativeDistrict)) {
                  console.log(`Alternatif alandan ilçe bilgisi bulundu: ${alternativeDistrict}`);
                  updatedFormData.district = alternativeDistrict;
                } else {
                  // Benzerlik kontrolü
                  const possibleDistrict = districtList.find(d => 
                    alternativeDistrict.includes(d) || d.includes(alternativeDistrict)
                  );
                  
                  if (possibleDistrict) {
                    console.log(`Alternatif ilçe adı benzerliğine göre ${possibleDistrict} olarak düzeltildi`);
                    updatedFormData.district = possibleDistrict;
                  }
                }
              }
            }
          }
          
          // DEBUGGİNG: Güncellenecek form verilerini göster
          console.log('-- FORM UPDATE DEBUGGING --');
          console.log('Orijinal formData:', formData);
          console.log('Güncellenecek formData:', updatedFormData);
          
          // İlçe listesini kontrol edelim
          if (updatedFormData.city) {
            console.log(`Seçilen şehir (${updatedFormData.city}) için ilçe listesi:`, allDistricts[updatedFormData.city] || 'İlçe listesi bulunamadı');
            if (updatedFormData.district) {
              console.log(`Bulunan ilçe (${updatedFormData.district}) listede var mı:`, 
                allDistricts[updatedFormData.city] ? 
                allDistricts[updatedFormData.city].includes(updatedFormData.district) : 
                false
              );
            }
          }
          
          // Ham adres verilerini de inceleyelim
          if (improvedAddressData.rawData && improvedAddressData.rawData.address) {
            console.log('Ham adres verileri:', improvedAddressData.rawData.address);
          }
          
          // Form verilerini güncelle - önceki değerden bağımsız olarak güncelle
          setFormData(prev => {
            const newFormData = { ...prev, ...updatedFormData };
            console.log('Yeni form verileri:', newFormData);
            return newFormData;
          });
          
          console.log('Form verileri güncellendi!');
          toast.success('Konumunuz ve adres bilgileriniz alındı', { id: 'userLocation' });
        } catch (error) {
          console.error('Adres bilgisi getirme hatası:', error);
          toast.error('Adres bilgisi alınamadı. Lütfen manuel olarak girin.', { id: 'userLocation' });
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.error('Konum alınamadı:', error);
        let errorMessage = 'Konumunuz alınamadı.';
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Konum izni reddedildi. Lütfen konum izinlerinizi kontrol edin.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Konum bilgisi kullanılamıyor.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Konum isteği zaman aşımına uğradı.';
            break;
        }
        
        toast.error(errorMessage, { id: 'userLocation' });
        setIsLocating(false);
      },
      { 
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Şehir değiştiğinde harita merkezini güncelle ve ilçe listesini güncelle
  useEffect(() => {
    if (formData.city && cityCoordinates[formData.city]) {
      const coords = cityCoordinates[formData.city];
        setMapCenter([coords[1], coords[0]]);
      console.log(`Harita merkezi ${formData.city} olarak güncellendi:`, [coords[1], coords[0]]);
      
      // Seçilen şehir için ilçeleri ayarla
      if (allDistricts[formData.city]) {
        setAvailableDistricts(allDistricts[formData.city]);
        console.log(`${formData.city} için ${allDistricts[formData.city].length} ilçe bulundu`);
      } else {
        setAvailableDistricts([]);
        console.log(`${formData.city} için ilçe verisi bulunamadı`);
      }
    } else {
      setAvailableDistricts([]);
    }
  }, [formData.city]);

  // İlçe seçildiğinde, haritada o ilçenin merkez konumunu yaklaşık olarak işaretle
  useEffect(() => {
    const updatePositionBasedOnDistrict = async () => {
      // Eğer konum zaten manuel olarak belirlendiyse (konum butonu ya da harita tıklaması ile), 
      // ilçe değişikliğine göre haritayı güncelleme
      if (isLocationManuallySet) {
        console.log('Konum manuel olarak belirlendiği için ilçe değişikliğine göre harita güncellenmeyecek');
        return;
      }

      if (formData.city && formData.district) {
        try {
          // Geocoding API ile ilçe konumunu bulmaya çalışalım
          const searchQuery = `${formData.district}, ${formData.city}, Türkiye`;
          console.log(`İlçe konumu aranıyor: ${searchQuery}`);
          
          // Basit bir yaklaşım: OpenStreetMap Nominatim API kullanımı (gerçek projede daha gelişmiş API kullanılabilir)
          const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
          const data = await response.json();
          
          if (data && data.length > 0) {
            const firstResult = data[0];
            const newPosition = [parseFloat(firstResult.lat), parseFloat(firstResult.lon)];
            console.log(`İlçe konumu bulundu: ${newPosition}`);
            
            // Harita merkezini ve konumu güncelle
            setMapCenter(newPosition);
            setPosition(newPosition);
          } else {
            console.log(`İlçe için konum bulunamadı: ${searchQuery}`);
            // Konum bulunamadığında şehir merkezini kullan
            if (cityCoordinates[formData.city]) {
              const coords = cityCoordinates[formData.city];
              // Sadece harita merkezini güncelle, konumu işaretleme
              setMapCenter([coords[1], coords[0]]);
            }
          }
        } catch (error) {
          console.error('İlçe konumu ararken hata:', error);
        }
      }
    };
    
    updatePositionBasedOnDistrict();
  }, [formData.district, formData.city, isLocationManuallySet]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Şehir değişirse ilçeyi sıfırla ve konum manuel belirleme bayrağını sıfırla
    if (name === 'city') {
      setFormData(prev => ({ ...prev, district: '' }));
      setIsLocationManuallySet(false); // Şehir değiştiğinde konum manuel seçimini sıfırla
    }
  };

  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    
    // Mevcut görüntü sayısını kontrol et
    const totalImages = previewImages.length + files.length;
    if (totalImages > 3) {
      toast.error(`En fazla 3 fotoğraf yükleyebilirsiniz (şu anda ${previewImages.length} fotoğraf seçili)`);
      return;
    }
    
    // Dosya boyutu kontrolü
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error(`'${file.name}' dosyası çok büyük (${Math.round(file.size/1024/1024)}MB). Lütfen 5MB'dan küçük dosyalar seçin.`);
        return;
      }
    }
    
    // Yükleme bildirimi
    toast.loading('Fotoğraflar yükleniyor...', { id: 'image-processing' });
    
    try {
      const processedImages = [];
      
      for (const file of files) {
        try {
          // Dosyayı base64'e dönüştür - hiçbir işlem yapmadan
        const reader = new FileReader();
          const base64Promise = new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error(`Dosya okunamadı: ${file.name}`));
        reader.readAsDataURL(file);
      });
          
          const base64 = await base64Promise;
          processedImages.push(base64);
          
        } catch (fileError) {
          console.error(`Dosya işleme hatası (${file.name}):`, fileError);
          // Hata durumunda devam et, diğer dosyaları işlemeye çalış
        }
      }
      
      if (processedImages.length > 0) {
        // Başarılı görüntüleri ekle
        setPreviewImages(prev => [...prev, ...processedImages]);
        
        // Form verilerini güncelle
      setFormData(prev => ({
        ...prev,
          images: [...prev.images, ...processedImages]
      }));
        
        toast.success(`${processedImages.length} fotoğraf başarıyla yüklendi`, { id: 'image-processing' });
      } else {
        toast.error('Hiçbir fotoğraf yüklenemedi', { id: 'image-processing' });
      }
      
    } catch (error) {
      console.error('Fotoğraf işleme hatası:', error);
      toast.error('Fotoğraflar işlenirken hata oluştu');
    }
  };

  const removeImage = (index) => {
    setPreviewImages(prev => prev.filter((_, i) => i !== index));
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('Form gönderiliyor, veriler:', {
      formData,
      position
    });

    // Form doğrulama
    setErrors({});
    
    if (!formData.title.trim()) {
      setErrors(prev => ({ ...prev, title: 'Başlık gereklidir' }));
      return;
    }
    
    if (!formData.description.trim()) {
      setErrors(prev => ({ ...prev, description: 'Açıklama gereklidir' }));
      return;
    }
    
    if (!formData.category) {
      setErrors(prev => ({ ...prev, category: 'Kategori seçilmelidir' }));
      return;
    }
    
    if (!formData.severity) {
      setErrors(prev => ({ ...prev, severity: 'Önem seviyesi seçilmelidir' }));
      return;
    }
    
    if (!formData.city) {
      setErrors(prev => ({ ...prev, city: 'Şehir seçilmelidir' }));
      return;
    }
    
    // İlçe kontrolünü genişletelim
    if (!formData.district.trim()) {
      setErrors(prev => ({ ...prev, district: 'İlçe seçilmelidir' }));
      return;
    }
    
    // İlçe değerinin mevcut listede olup olmadığını kontrol edelim
    if (formData.city && formData.district && availableDistricts.length > 0 && !availableDistricts.includes(formData.district)) {
      setErrors(prev => ({ ...prev, district: 'Lütfen geçerli bir ilçe seçin' }));
      return;
    }
    
    if (!formData.address?.trim()) {
      setErrors(prev => ({ ...prev, address: 'Adres bilgisi gereklidir' }));
      return;
    }
    
    if (!position) {
      setErrors(prev => ({ ...prev, location: 'Haritadan konum seçilmelidir' }));
      return;
    }

    // İstek verilerini hazırla
    try {
      setIsSubmitting(true);
      
      // Artık kullanıcı bilgisinden değil, formdan şehir alınıyor
      const userCity = formData.city;
      console.log('Seçilen şehir:', userCity);
      
      // Lokasyon nesnesini düzgün formatta oluştur
      const locationData = {
        type: 'Point',
        address: formData.address.trim(),
        district: formData.district.trim(),
        city: userCity, // Form verisi olarak şehir
        coordinates: position ? [position[1], position[0]] : [],
        directionInfo: formData.locationDescription.trim()
      };
      
      console.log('Gönderilecek location verisi:', locationData);
      
      // Form verilerini hazırla
      const issueData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        severity: formData.severity,
        location: locationData,
        images: formData.images || []
        // Status alanı belirtilmedi, backend varsayılanı kullanacak
      };
      
      console.log('Gönderilecek veri:', issueData);
      
      // API isteği gönder
      const response = await issueService.createIssue(issueData);
      console.log('Sorun bildirimi başarılı:', response);
      
      toast.success('Sorun başarıyla bildirildi');
      navigate('/');
    } catch (error) {
      console.error('Sorun bildirilirken hata:', error);
      toast.error(error || 'Sorun bildirilirken bir hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Yeni Sorun Bildir</h1>
      
      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Sol Kolon */}
          <div>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="title">
                Başlık*
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className={`shadow appearance-none border ${errors.title ? 'border-red-500' : 'border-gray-300'} rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline`}
                placeholder="Sorunun kısa başlığı"
              />
              {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="category">
                Kategori*
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className={`shadow appearance-none border ${errors.category ? 'border-red-500' : 'border-gray-300'} rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline`}
              >
                <option value="">Kategori Seçin</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="severity">
                Önem Derecesi
              </label>
              <select
                id="severity"
                name="severity"
                value={formData.severity}
                onChange={handleChange}
                className="shadow appearance-none border border-gray-300 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              >
                {severities.map(severity => (
                  <option key={severity} value={severity}>{severity}</option>
                ))}
              </select>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">
                Açıklama*
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className={`shadow appearance-none border ${errors.description ? 'border-red-500' : 'border-gray-300'} rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline`}
                placeholder="Sorunu detaylı açıklayın"
                rows="4"
              />
              {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="images">
                Fotoğraflar
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current.click()}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg text-sm transition"
                >
                  Fotoğraf Ekle
                </button>
                <input
                  type="file"
                  id="images"
                  name="images"
                  onChange={handleImageChange}
                  multiple
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                />
                <span className="text-xs text-gray-500">En fazla 3 fotoğraf, her biri max 5MB</span>
              </div>
              
              {/* Fotoğraf sayısı bilgisi */}
              {previewImages.length > 0 && (
                <div className="mt-2 flex items-center">
                  <span className="text-sm text-gray-600">
                    {previewImages.length} fotoğraf seçildi ({3 - previewImages.length} fotoğraf daha ekleyebilirsiniz)
                  </span>
                </div>
              )}
              
              {/* JPG uyarısı */}
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-xs text-yellow-700">
                  <strong>Not:</strong> JPG/JPEG formatındaki fotoğraflar yüklenirken sorun yaşanabilir. 
                  Mümkünse PNG formatında fotoğraflar kullanmanızı öneririz. JPG formatında sorun yaşarsanız, daha küçük boyutlu veya daha düşük çözünürlüklü fotoğraflar deneyin.
                </p>
              </div>
              
              {previewImages.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {previewImages.map((url, index) => (
                    <div key={index} className="relative">
                      <img 
                        src={url} 
                        alt={`Preview ${index + 1}`} 
                        className="w-16 h-16 object-cover rounded" 
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Sağ Kolon */}
          <div>
            {/* Önce şehir seçimi */}
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="city">
                Şehir*
              </label>
              <select
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className={`shadow appearance-none border ${errors.city ? 'border-red-500' : 'border-gray-300'} rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline`}
              >
                <option value="">Şehir Seçin</option>
                {cities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
              {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
            </div>
            
            {/* Sonra ilçe dropdown */}
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="district">
                İlçe*
              </label>
              <select
                id="district"
                name="district"
                value={formData.district && availableDistricts.includes(formData.district) ? formData.district : ''}
                onChange={handleChange}
                className={`shadow appearance-none border ${errors.district ? 'border-red-500' : 'border-gray-300'} rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline`}
                disabled={!formData.city} // Şehir seçilmediği sürece ilçe seçimi devre dışı
              >
                <option value="">İlçe Seçin</option>
                {availableDistricts.map(district => (
                  <option key={district} value={district}>{district}</option>
                ))}
              </select>
              {!formData.city && <p className="text-xs text-gray-500 mt-1">Önce şehir seçmelisiniz</p>}
              {formData.city && formData.district && !availableDistricts.includes(formData.district) && (
                <p className="text-xs text-orange-500 mt-1">
                  "{formData.district}" listede bulunamadı. Lütfen listeden bir ilçe seçin.
                </p>
              )}
              {errors.district && <p className="text-red-500 text-xs mt-1">{errors.district}</p>}
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="address">
                Adres*
              </label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className={`shadow appearance-none border ${errors.address ? 'border-red-500' : 'border-gray-300'} rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline`}
                placeholder="Sorunun tam adresi"
              />
              {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="locationDescription">
                Adres Tarifi
              </label>
              <textarea
                id="locationDescription"
                name="locationDescription"
                value={formData.locationDescription}
                onChange={handleChange}
                className={`shadow appearance-none border ${errors.locationDescription ? 'border-red-500' : 'border-gray-300'} rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline`}
                placeholder="Yetkililerin konumu daha kolay bulabilmesi için ekstra bilgiler yazabilirsiniz. Örn: Apartmanın arkasındaki yeşil alan, parkın doğu girişi, vb."
                rows="2"
              />
              {errors.locationDescription && <p className="text-red-500 text-xs mt-1">{errors.locationDescription}</p>}
              <p className="text-xs text-gray-500 mt-1">
                Konumun daha kolay bulunabilmesi için ek açıklama bilgisi giriniz.
              </p>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Haritadan Konum Seçin*
              </label>
              <p className="text-xs text-gray-600 mb-2">
                Not: Haritadan konum seçimi sadece adres bilgisini günceller. Şehir ve ilçe seçimleriniz korunacaktır.
              </p>
              {/* Konumumu Kullan butonu */}
              <div className="mb-2">
                <button
                  type="button"
                  onClick={getUserLocation}
                  disabled={isLocating}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg flex items-center text-sm transition disabled:opacity-50"
                >
                  {isLocating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Konumunuz Alınıyor...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Konumumu Kullan
                    </>
                  )}
                </button>
              </div>
              <div className="h-[300px] w-full rounded-lg overflow-hidden border border-gray-300">
                <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <LocationMarker position={position} setPosition={setPosition} setFormData={setFormData} setIsLocationManuallySet={setIsLocationManuallySet} />
                  <MapCenter center={mapCenter} />
                </MapContainer>
              </div>
              {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location}</p>}
              {position && (
                <p className="text-xs text-gray-500 mt-1">
                  Seçilen konum: {position[0].toFixed(6)}, {position[1].toFixed(6)}
                </p>
              )}
            </div>
          </div>
        </div>
        
        {errors.submit && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {errors.submit}
          </div>
        )}
        
        <div className="flex justify-end mt-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mr-4 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg transition"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg disabled:opacity-50 transition"
          >
            {isSubmitting ? 'Gönderiliyor...' : 'Sorun Bildir'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReportIssuePage; 