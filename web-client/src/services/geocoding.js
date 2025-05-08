// Geocoding servisi - Çeşitli servisler kullanarak koordinatlardan adres bilgisi getirir
import { GOOGLE_MAPS_API_KEY, HERE_MAPS_API_KEY } from './api-keys';

/**
 * Koordinatlardan adres bilgisini getir (çeşitli servisler denenerek)
 * @param {number} lat - Enlem
 * @param {number} lng - Boylam
 * @returns {Promise<object>} - Adres bilgisi
 */
export const getAddressFromCoordinates = async (lat, lng) => {
  // Öncelikle Google Maps API'yi dene (en detaylı sonuçlar için)
  try {
    console.log('Google Maps API ile adres sorgulanıyor...');
    const googleAddress = await getAddressFromGoogleMaps(lat, lng);
    console.log('Google Maps adres sonucu:', googleAddress);
    return googleAddress;
  } catch (googleError) {
    console.warn('Google Maps adres getirme hatası:', googleError);
    
    // Google Maps başarısız olursa HERE Maps ile dene
    if (HERE_MAPS_API_KEY !== 'YOUR_HERE_API_KEY') {
      try {
        console.log('HERE Maps API ile adres sorgulanıyor...');
        const hereAddress = await getAddressFromHEREMaps(lat, lng);
        console.log('HERE Maps adres sonucu:', hereAddress);
        return hereAddress;
      } catch (hereError) {
        console.warn('HERE Maps adres getirme hatası:', hereError);
      }
    }
    
    // Diğer servisler başarısız olursa OpenStreetMap ile devam et
    try {
      console.log('OpenStreetMap API ile adres sorgulanıyor...');
      // OpenStreetMap Nominatim API'sini kullan (ücretsiz)
      // Daha detaylı sonuçlar için zoom parametresi ve daha fazla ayar ekleyelim
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=tr&zoom=18&namedetails=1&extratags=1`,
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
      
      return {
        source: 'nominatim',
        fullAddress: data.display_name,
        street: streetName,
        houseNumber: data.address.house_number || '',
        building: buildingInfo || '',
        pointOfInterest: pointOfInterest || '',
        neighbourhood: data.address.neighbourhood || data.address.suburb || '',
        district: data.address.city_district || data.address.district || data.address.town || data.address.municipality || data.address.county || data.address.village || data.address.city || '',
        city: data.address.city || data.address.state || data.address.county || data.address.region || '',
        postalCode: data.address.postcode || '',
        rawData: data
      };
    } catch (osmError) {
      console.error('OpenStreetMap adres getirme hatası:', osmError);
      throw new Error('Adres bilgisi alınamadı: Tüm servisler başarısız oldu');
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

// Daha spesifik adreslerden sokak bilgisi almak için yardımcı fonksiyon
export const improveStreetInfo = (addressData) => {
  if (!addressData || !addressData.rawData) return addressData;
  
  // Google Maps verileri zaten oldukça detaylı, ek işleme genellikle gerekmez
  if (addressData.source === 'google') {
    return addressData;
  }
  
  // HERE Maps verileri zaten oldukça detaylı, ek işleme genellikle gerekmez
  if (addressData.source === 'here') {
    return addressData;
  }
  
  // OpenStreetMap için
  if (addressData.source === 'nominatim') {
    const rawData = addressData.rawData;
    
    // OSM bazen sokak bilgisini farklı alanlarda saklayabilir
    if (!addressData.street) {
      // Alternatif alanları kontrol et
      addressData.street = 
        rawData.address.road || 
        rawData.address.pedestrian || 
        rawData.address.footway || 
        rawData.address.path ||
        rawData.address.street ||
        '';
    }
    
    // Eğer hala sokak bilgisi yoksa ve POI adı varsa, onu kullan
    if (!addressData.street && rawData.name) {
      addressData.street = rawData.name;
    }
  }
  
  return addressData;
}; 