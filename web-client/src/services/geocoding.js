// Geocoding servisi - Çeşitli servisler kullanarak koordinatlardan adres bilgisi getirir
import { GOOGLE_MAPS_API_KEY, HERE_MAPS_API_KEY, isGoogleMapsEnabled } from './api-keys';

/**
 * Koordinatlardan adres bilgisini getir (çeşitli servisler denenerek)
 * @param {number} lat - Enlem
 * @param {number} lng - Boylam
 * @returns {Promise<object>} - Adres bilgisi
 */
export const getAddressFromCoordinates = async (lat, lng) => {
  // Konum doğruluğunu iyileştirmek için önce en iyi servisi kullan
  const results = [];
  let bestResult = null;
  
  // Tüm API'leri paralel olarak çağırarak hızı artır
  try {
    const promises = [];
    
    // Google Maps API (en doğru sonuçlar genellikle buradan gelir)
    if (isGoogleMapsEnabled && GOOGLE_MAPS_API_KEY && GOOGLE_MAPS_API_KEY !== 'YOUR_GOOGLE_MAPS_API_KEY') {
      promises.push(
        getAddressFromGoogleMaps(lat, lng)
          .then(result => {
            console.log('Google API sonucu alındı:', result.fullAddress);
            results.push({...result, confidence: 0.9});
            return result;
          })
          .catch(err => {
            console.warn('Google geocoding hatası:', err);
            return null;
          })
      );
    }
    
    // HERE Maps API
    if (HERE_MAPS_API_KEY !== 'YOUR_HERE_API_KEY') {
      promises.push(
        getAddressFromHEREMaps(lat, lng)
          .then(result => {
            console.log('HERE API sonucu alındı:', result.fullAddress);
            results.push({...result, confidence: 0.8});
            return result;
          })
          .catch(err => {
            console.warn('HERE geocoding hatası:', err);
            return null;
          })
      );
    }
    
    // OpenStreetMap (en yaygın ücretsiz API)
    promises.push(
      getAddressFromOpenStreetMap(lat, lng)
        .then(result => {
          console.log('OpenStreetMap API sonucu alındı:', result.fullAddress);
          // Google Maps API devre dışıysa OpenStreetMap'e daha yüksek güven ver
          results.push({...result, confidence: isGoogleMapsEnabled ? 0.7 : 0.9});
          return result;
        })
        .catch(err => {
          console.warn('OpenStreetMap geocoding hatası:', err);
          return null;
        })
    );
    
    // Tüm API çağrılarının tamamlanmasını bekle
    await Promise.allSettled(promises);
    
    console.log(`${results.length} API'den sonuç alındı.`);
    
    // Sonuçları güven değerine göre sırala
    results.sort((a, b) => b.confidence - a.confidence);
    
    // Eğer herhangi bir sonuç varsa, en iyi sonucu seç
    if (results.length > 0) {
      bestResult = results[0];
      console.log('En iyi sonuç seçildi:', bestResult.source, bestResult.fullAddress);
      
      // Eğer birden fazla sonuç varsa, sonuçları birleştir
      if (results.length > 1) {
        console.log('Sonuçları birleştirme işlemi başlatılıyor...');
        bestResult = mergeResults(results, bestResult);
        console.log('Sonuçlar birleştirildi:', bestResult.fullAddress);
      }
      
      return bestResult;
    }
    
    // Hiçbir sonuç alınamadıysa, yine de OpenStreetMap ile dene (fallback)
    throw new Error('Hiçbir API sonuç vermedi.');
  } catch (error) {
    console.error('Adres çözümleme hatası:', error);
    
    // Son çare olarak OpenStreetMap'i dene
    try {
      return await getAddressFromOpenStreetMap(lat, lng);
    } catch (osmError) {
      console.error('OpenStreetMap son çare hatası:', osmError);
      throw new Error('Tüm adres çözümleme servisleri başarısız oldu.');
    }
  }
};

/**
 * Google Maps Geocoding API kullanarak adres bilgisi getir
 * @param {number} lat - Enlem
 * @param {number} lng - Boylam
 * @returns {Promise<object>} - Adres bilgisi
 */
async function getAddressFromGoogleMaps(lat, lng) {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}&language=tr`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Google Maps API yanıt vermedi');
    }
    
    const data = await response.json();
    
    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      throw new Error('Google Maps adres bulunamadı: ' + data.status);
    }
    
    console.log('Google Maps ham veri:', data);
    
    const result = data.results[0];
    const components = result.address_components;
    
    // Adres bileşenlerini ayrıştır
    const street = components.find(comp => 
      comp.types.includes('route') || 
      comp.types.includes('street_address'))?.long_name || '';
      
    const houseNumber = components.find(comp => 
      comp.types.includes('street_number'))?.long_name || '';
      
    const buildingName = components.find(comp => 
      comp.types.includes('premise') || 
      comp.types.includes('establishment'))?.long_name || '';
      
    const neighbourhood = components.find(comp => 
      comp.types.includes('neighborhood') || 
      comp.types.includes('sublocality') || 
      comp.types.includes('sublocality_level_1'))?.long_name || '';
      
    const district = components.find(comp => 
      comp.types.includes('administrative_area_level_2') || 
      comp.types.includes('locality') ||
      comp.types.includes('sublocality_level_2') ||
      comp.types.includes('postal_town'))?.long_name || '';
      
    const city = components.find(comp => 
      comp.types.includes('administrative_area_level_1'))?.long_name || '';
      
    const postalCode = components.find(comp => 
      comp.types.includes('postal_code'))?.long_name || '';
      
    // POI (Point of Interest) bilgisi 
    let pointOfInterest = '';
    if (components.find(comp => comp.types.includes('point_of_interest'))) {
      pointOfInterest = result.formatted_address.split(',')[0] || '';
    }
    
    return {
      source: 'google',
      fullAddress: result.formatted_address || '',
      street: street,
      houseNumber: houseNumber,
      building: buildingName || '',
      pointOfInterest: pointOfInterest,
      neighbourhood: neighbourhood,
      district: district,
      city: city,
      postalCode: postalCode,
      rawData: result
    };
  } catch (error) {
    console.error('Google Maps adres getirme hatası:', error);
    throw error;
  }
}

/**
 * HERE Maps API kullanarak adres bilgisini getir
 * @param {number} lat - Enlem
 * @param {number} lng - Boylam
 * @returns {Promise<object>} - Adres bilgisi
 */
async function getAddressFromHEREMaps(lat, lng) {
  try {
    const url = `https://reverse.geocoder.ls.hereapi.com/6.2/reversegeocode.json?prox=${lat},${lng},250&mode=retrieveAddresses&maxresults=1&gen=9&apiKey=${HERE_MAPS_API_KEY}&language=tr`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('HERE Maps API yanıt vermedi');
    }
    
    const data = await response.json();
    
    if (!data.Response || !data.Response.View || data.Response.View.length === 0 || 
        !data.Response.View[0].Result || data.Response.View[0].Result.length === 0) {
      throw new Error('HERE Maps adres bulunamadı');
    }
    
    const result = data.Response.View[0].Result[0];
    const address = result.Location.Address;
    
    return {
      source: 'here',
      fullAddress: address.Label || '',
      street: address.Street || '',
      houseNumber: address.HouseNumber || '',
      neighbourhood: address.District || '',
      district: address.City || '',
      city: address.State || address.County || '',
      postalCode: address.PostalCode || '',
      rawData: result
    };
  } catch (error) {
    console.error('HERE Maps adres getirme hatası:', error);
    throw error;
  }
}

/**
 * OpenStreetMap (Nominatim) API kullanarak adres bilgisini getir
 * @param {number} lat - Enlem
 * @param {number} lng - Boylam
 * @returns {Promise<object>} - Adres bilgisi
 */
async function getAddressFromOpenStreetMap(lat, lng) {
  try {
    console.log('OpenStreetMap API ile adres sorgulanıyor...');
    // Daha detaylı sonuçlar için zoom parametresi ve daha fazla ayar ekleyelim
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=tr&zoom=18&namedetails=1&extratags=1&polygon_geojson=0&email=info@yerelhizmet.org`,
      {
        headers: {
          'Accept-Language': 'tr',
          'User-Agent': 'YerelHizmetApp/1.0'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error('Nominatim API yanıt vermedi');
    }
    
    const data = await response.json();
    
    if (!data || !data.address) {
      throw new Error('Adres bilgisi bulunamadı');
    }

    console.log('OpenStreetMap ham veri:', data);
    
    // Daha fazla bilgi çıkartmak için ham veriyi analiz edelim
    let streetName = data.address.road || 
                     data.address.pedestrian || 
                     data.address.footway || 
                     data.address.street ||
                     data.address.path ||
                     data.address.track ||
                     data.address.avenue ||
                     data.address.boulevard ||
                     '';
                     
    // Eğer yakınlarda bir POI (ilgi noktası) varsa onu da ekleyelim
    let pointOfInterest = '';
    if (data.namedetails && data.namedetails.name) {
      pointOfInterest = data.namedetails.name;
    } else if (data.name) {
      pointOfInterest = data.name;
    }
    
    // Extratags'ten bina bilgisi var mı kontrol edelim
    let buildingInfo = '';
    if (data.extratags) {
      if (data.extratags.building) buildingInfo = data.extratags.building;
      if (data.extratags['addr:housename']) buildingInfo = data.extratags['addr:housename'];
    }
    
    // Sokak isminde veri yoksa ve POI varsa, onu sokak olarak kullan
    if (!streetName && pointOfInterest) {
      streetName = pointOfInterest;
    }
    
    // İlçe ve şehir bilgisi için daha fazla alanı kontrol edelim
    let district = data.address.city_district || 
                   data.address.district || 
                   data.address.town || 
                   data.address.municipality || 
                   data.address.county || 
                   data.address.village || 
                   data.address.suburb ||
                   data.address.city || 
                   '';
                   
    let city = data.address.city || 
               data.address.state || 
               data.address.county || 
               data.address.region || 
               '';
               
    // İlçe ve şehir isimleri aynıysa ilçeyi temizle
    if (district === city) {
      district = data.address.suburb || data.address.neighbourhood || '';
    }
    
    return {
      source: 'nominatim',
      fullAddress: data.display_name,
      street: streetName,
      houseNumber: data.address.house_number || '',
      building: buildingInfo || '',
      pointOfInterest: pointOfInterest || '',
      neighbourhood: data.address.neighbourhood || data.address.suburb || '',
      district: district,
      city: city,
      postalCode: data.address.postcode || '',
      rawData: data
    };
  } catch (error) {
    console.error('OpenStreetMap adres getirme hatası:', error);
    throw error;
  }
}

/**
 * Adres bilgisini formatla
 * @param {object} addressData - Adres verileri
 * @returns {string} - Formatlanmış adres
 */
export const formatAddress = (addressData) => {
  if (!addressData) return '';
  
  const { street, houseNumber, building, pointOfInterest, neighbourhood, district, city } = addressData;
  
  // Eğer Google Maps ise ve tam adres varsa, onu kullan (en güvenilir)
  if (addressData.source === 'google' && addressData.fullAddress) {
    return addressData.fullAddress;
  }
  
  // Tekrarlanan mahalle ifadelerini temizle
  let cleanNeighbourhood = neighbourhood || '';
  if (cleanNeighbourhood) {
    // "Mah." ifadesini temizle, tam adı kullanacağız
    cleanNeighbourhood = cleanNeighbourhood.replace(/ Mah\.?/gi, '');
    
    // Eğer mahalle isminde zaten "Mahallesi" ifadesi varsa, ekleme
    if (!cleanNeighbourhood.includes('Mahalle')) {
      cleanNeighbourhood += ' Mahallesi';
    }
  }
  
  // Parçaları birleştir
  let formattedAddress = '';
  
  // İlgi noktası veya bina adı
  if (pointOfInterest && pointOfInterest !== street) {
    formattedAddress += pointOfInterest;
    if (street || building || houseNumber || cleanNeighbourhood) {
      formattedAddress += ', ';
    }
  } else if (building && building !== street) {
    formattedAddress += building;
    if (street || houseNumber || cleanNeighbourhood) {
      formattedAddress += ', ';
    }
  }
  
  // Sokak ve bina numarası
  if (street) {
    formattedAddress += street;
    if (houseNumber) {
      formattedAddress += ' No:' + houseNumber;
    }
    
    // Eğer başka bilgiler gelecekse virgül ekle
    if (cleanNeighbourhood || district || city) {
      formattedAddress += ', ';
    }
  }
  
  // Mahalle (eğer aynı isimde tekrarlama yoksa)
  if (cleanNeighbourhood) {
    // Adrese ekle
    formattedAddress += cleanNeighbourhood;
    
    // Eğer başka bilgiler gelecekse virgül ekle
    if (district || city) {
      formattedAddress += ', ';
    }
  }
  
  // İlçe
  if (district) {
    // İlçe adı mahalle adında geçiyorsa, atla (örneğin "Merkez" ilçesi "Merkez Mahallesi" içinde)
    if (cleanNeighbourhood && !cleanNeighbourhood.includes(district)) {
      formattedAddress += district;
      
      // Eğer şehir eklenecekse ve ilçeden farklıysa virgül ekle
      if (city && city !== district) {
        formattedAddress += ', ';
      }
    }
  }
  
  // Şehir (eğer ilçeden farklıysa ve zaten adreste yoksa)
  if (city && city !== district && !formattedAddress.includes(city)) {
    formattedAddress += city;
  }
  
  // Gereksiz çift virgülleri temizle
  formattedAddress = formattedAddress.replace(/,\s*,/g, ',').trim();
  // Adres virgülle bitiyorsa, sondaki virgülü kaldır
  if (formattedAddress.endsWith(',')) {
    formattedAddress = formattedAddress.slice(0, -1).trim();
  }
  
  // Eğer hiçbir şey yoksa ve fullAddress varsa, orijinal adresi kullan 
  // ama "Mah. Mahallesi" gibi tekrarları temizle
  if (!formattedAddress && addressData.fullAddress) {
    let cleanFullAddress = addressData.fullAddress;
    cleanFullAddress = cleanFullAddress.replace(/(Mah\.|Mahalle)\s+Mahallesi/gi, 'Mahallesi');
    cleanFullAddress = cleanFullAddress.replace(/\s*,\s*,\s*/g, ', ');
    return cleanFullAddress;
  }
  
  return formattedAddress || 'Adres bilgisi bulunamadı';
};

/**
 * Daha spesifik adreslerden sokak bilgisi almak için yardımcı fonksiyon
 * @param {object} addressData - Adres verileri
 * @returns {object} - Geliştirilmiş adres verileri
 */
export const improveStreetInfo = (addressData) => {
  if (!addressData || !addressData.rawData) return addressData;
  
  const improvedData = {...addressData};
  
  // Google Maps verileri zaten oldukça detaylı, ek işleme genellikle gerekmez
  if (addressData.source === 'google') {
    // Bazı durumlarda Google Maps district'i yanlış algılayabilir
    // İlçe ve şehir aynıysa, ilçe alanını temizle
    if (improvedData.district === improvedData.city) {
      improvedData.district = '';
    }
    return improvedData;
  }
  
  // HERE Maps verileri zaten oldukça detaylı, ek işleme genellikle gerekmez
  if (addressData.source === 'here') {
    return improvedData;
  }
  
  // OpenStreetMap için
  if (addressData.source === 'nominatim') {
    const rawData = addressData.rawData;
    
    // OSM bazen sokak bilgisini farklı alanlarda saklayabilir
    if (!improvedData.street) {
      // Alternatif alanları kontrol et
      improvedData.street = 
        rawData.address.road || 
        rawData.address.pedestrian || 
        rawData.address.footway || 
        rawData.address.path ||
        rawData.address.street ||
        rawData.address.avenue || 
        rawData.address.boulevard ||
        '';
    }
    
    // Eğer hala sokak bilgisi yoksa ve POI adı varsa, onu kullan
    if (!improvedData.street && rawData.name) {
      improvedData.street = rawData.name;
    }
    
    // İl ve ilçe bilgilerini kesinleştir
    // İlçe (district) bilgisi
    if (rawData.address) {
      const addr = rawData.address;
      
      // İlçe bilgisini iyileştir - birden fazla kaynaktan kontrol et
      let possibleDistrict = 
        addr.city_district || 
        addr.district || 
        addr.town || 
        addr.municipality || 
        addr.suburb || 
        addr.village ||
        '';
      
      // İl (city) bilgisini iyileştir
      let possibleCity = 
        addr.city || 
        addr.province || 
        addr.state || 
        addr.county || 
        '';
        
      // Türkiye'de ilçe ve il birbirinden farklı olmalı
      // Eğer aynıysa ilçe bilgisini temizle
      if (possibleDistrict === possibleCity && possibleDistrict) {
        // İlçe ve il aynıysa, mahalle bilgisini ilçe olarak kullan
        possibleDistrict = addr.neighbourhood || addr.suburb || '';
      }
      
      // Eğer bulunduysa, verileri güncelle
      if (possibleDistrict) {
        improvedData.district = possibleDistrict;
      }
      
      if (possibleCity) {
        improvedData.city = possibleCity;
      }
    }
  }
  
  return improvedData;
};

/**
 * API sonuçlarını birleştirerek en iyi sonucu oluştur
 * @param {Array} results - Tüm API sonuçları
 * @param {Object} bestResult - En iyi sonuç (en yüksek güven değerine sahip)
 * @returns {Object} - Birleştirilmiş sonuç
 */
function mergeResults(results, bestResult) {
  // Eğer sadece bir sonuç varsa, o sonucu döndür
  if (results.length <= 1) return bestResult;
  
  // Birleştirilmiş sonucu oluştur
  const merged = {...bestResult};
  
  // Eksik alanları doldurmak için diğer sonuçları kullan
  for (const field of ['street', 'district', 'city', 'neighbourhood', 'pointOfInterest']) {
    if (!merged[field] || merged[field].trim() === '') {
      console.log(`${field} alanı boş, diğer sonuçlardan dolduruluyor...`);
      
      // Diğer sonuçlardan bu alanı bul
      for (const result of results) {
        if (result !== bestResult && result[field] && result[field].trim() !== '') {
          merged[field] = result[field];
          console.log(`${field} alanı şuradan dolduruldu:`, result.source);
          break;
        }
      }
    }
  }
  
  // Özel durumlar için mantık ekle
  
  // Eğer bir sokak adı bulunamadıysa ve bir POI varsa, sokak adını POI olarak ayarla
  if ((!merged.street || merged.street.trim() === '') && merged.pointOfInterest) {
    merged.street = merged.pointOfInterest;
    console.log('Sokak adı POI ile değiştirildi');
  }
  
  // İlçe ve şehir aynıysa, neighborhood'u ilçe olarak ata
  if (merged.district === merged.city && merged.neighbourhood) {
    merged.district = merged.neighbourhood;
    console.log('İlçe ve şehir aynı olduğu için mahalle ilçe olarak atandı');
  }
  
  return merged;
} 