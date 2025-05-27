import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// App config'den IP adresini al
const LOCAL_IP = Constants.expoConfig.extra?.hostIp || '192.168.1.54';
const API_BASE_URL = Constants.expoConfig.extra?.apiBaseUrl || `http://${LOCAL_IP}:5001/api`;

// API URL yapılandırması
// - Android emülatörü: 10.0.2.2:5001
// - iOS simülatörü: localhost:5001
// - Gerçek cihaz: Bilgisayarın Wi-Fi IP adresi (LOCAL_IP:5001)
const isAndroid = Platform.OS === 'android';
const isIOS = Platform.OS === 'ios';

// Android Studio emülatörünü otomatik tespit etmeye çalışalım
// NOT: Bu %100 doğru olmayabilir, gerekirse manuel ayarlayın
let isEmulator = false;

// Android için emülatör tespiti
if (isAndroid && 
    (Platform.constants.Brand === 'google' || 
     Platform.constants.Brand === 'Android' || 
     ['google_sdk', 'sdk', 'sdk_gphone'].includes(Platform.constants.Model))) {
  isEmulator = true;
}

// iOS için emülatör tespiti (tam kesin değildir)
if (isIOS && ['iPhone Simulator', 'iPad Simulator'].includes(Platform.constants.systemName)) {
  isEmulator = true;
}

// API Base URL'ini belirleme
let BASE_URL;
if (isEmulator) {
  // Emülatörde çalışıyorsa
  BASE_URL = isAndroid
    ? `http://10.0.2.2:5001/api`  // Android Emülatör
    : `http://localhost:5001/api`; // iOS Simülatör
} else {
  // Gerçek cihazda çalışıyorsa (aynı Wi-Fi ağında)
  BASE_URL = API_BASE_URL; // Bilgisayarın güncel Wi-Fi IP adresi
  
  // iOS cihazı için alternatif IP dene
  if (isIOS) {
    // iOS için ek ayar
    console.log('iOS cihazı için özel ayarlar kullanılıyor...');
    
    // iOS'ta localhost olmayan HTTP bağlantıları için güvenlik kontrolü
    const iosURL = API_BASE_URL;
    console.log('iOS için URL:', iosURL);
    
    // IP tabanlı URL kullan (mobil Safari için açık izin gerekir)
    BASE_URL = iosURL;
  }
}

// Ek URL seçenekleri - gerekirse kullanılabilir
const API_URL_OPTIONS = {
  EMULATOR_ANDROID: `http://10.0.2.2:5001/api`,
  EMULATOR_IOS: `http://localhost:5001/api`,
  REAL_DEVICE: API_BASE_URL,
  ANDROID_STUDIO: `http://10.0.2.2:5001/api`,        // Android Studio Emülatör
  GENYMOTION: `http://10.0.3.2:5001/api`,            // Genymotion Emülatör
  EXPO_ANDROID: API_BASE_URL,      // Expo ile Android cihaz
  EXPO_IOS: API_BASE_URL,          // Expo ile iOS cihaz
  // Alternatif IP'ler - gerçek cihazda deneyin
  ALT_IP_1: `http://192.168.1.46:5001/api`,          // Alternatif IP 1
  ALT_IP_2: `http://192.168.56.1:5001/api`,          // Alternatif IP 2 (VirtualBox/VMware)
  // iOS özel IP adresleri
  IOS_IP_1: `http://localhost:5001/api`,             // iOS özelinde localhost denemesi
  IOS_IP_2: `http://127.0.0.1:5001/api`,             // iOS özelinde loopback IP
  IOS_NETWORK_IP: API_BASE_URL,    // Bilgisayarın Wi-Fi IP'si
  IOS_HOTSPOT: `http://172.20.10.1:5001/api`         // iPhone hotspot IP örneği
};

// Demo mod aktif mi? API bağlantısı kurulamazsa otomatik olarak demo moduna geçecek
let isDemoMode = false;

// Demo verileri
const demoData = {
  issues: [
    {
      _id: "demo1",
      title: "Sokak Lambası Arızası",
      description: "Merkez Mahallesi 123 sokak no: 45 önündeki sokak lambası yanmıyor.",
      category: "Altyapı",
      status: "pending",
      severity: "Orta",
      upvotes: 5,
      location: {
        address: "Merkez Mahallesi 123 sokak no: 45",
        district: "Merkez",
        city: "Niğde",
        coordinates: [28.9784, 41.0082],
        type: "Point"
      },
      images: ["https://picsum.photos/id/1/500/300"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "demo-user"
    },
    {
      _id: "demo2",
      title: "Çöp Konteyneri Sorunu",
      description: "Atatürk Caddesi üzerinde çöp konteynerlerinin yetersiz olması sebebiyle çöpler yola taşıyor.",
      category: "Temizlik",
      status: "in_progress",
      severity: "Yüksek",
      upvotes: 12,
      location: {
        address: "Atatürk Caddesi",
        district: "Merkez",
        city: "Niğde",
        coordinates: [28.9684, 41.0182],
        type: "Point"
      },
      images: ["https://picsum.photos/id/2/500/300"],
      createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 gün önce
      updatedAt: new Date(Date.now() - 43200000).toISOString(), // 12 saat önce
      createdBy: "demo-user"
    },
    {
      _id: "demo3",
      title: "Park Ekipmanları Hasarlı",
      description: "Çocuk parkındaki salıncaklar kırık ve tehlike arz ediyor.",
      category: "Park ve Bahçeler",
      status: "resolved",
      severity: "Kritik",
      upvotes: 8,
      location: {
        address: "Hürriyet Parkı",
        district: "Bor",
        city: "Niğde",
        coordinates: [28.9884, 41.0282],
        type: "Point"
      },
      images: ["https://picsum.photos/id/3/500/300"],
      createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 gün önce
      updatedAt: new Date(Date.now() - 86400000).toISOString(), // 1 gün önce
      createdBy: "demo-user"
    }
  ]
};

console.log(`API URL: ${BASE_URL}`);

// Durum bilgisini dışarıdan takip edebilmek için
const apiStatus = {
  isConnected: false,
  isDemoMode: false,
  currentUrl: BASE_URL,
  lastChecked: null
};

// API bağlantı testi için yardımcı fonksiyon
const testApiConnection = async (testUrl = BASE_URL) => {
  try {
    console.log('API bağlantısı test ediliyor...');
    console.log('Kullanılan API URL:', testUrl);
    
    apiStatus.lastChecked = new Date();
    
    // Uzun timeout ile HTTP HEAD isteği - sadece header'ları çekecek şekilde (daha hızlı)
    const response = await axios({
      method: 'head', // Sadece header'ları almak için HEAD isteği
      url: `${testUrl.replace('/api', '')}/`,
      timeout: 30000, // 30 saniye bekle
      validateStatus: function (status) {
        // Herhangi bir durum kodu başarılı sayılır (sunucu yanıt verdiği sürece)
        return status >= 200 && status < 600;
      }
    });
    
    console.log('API sunucusu yanıt verdi:', response.status);
    
    // Durum güncelle
    apiStatus.isConnected = true;
    apiStatus.currentUrl = testUrl;
    
    return { success: true, status: response.status, url: testUrl };
  } catch (error) {
    console.error('API bağlantı testi başarısız:', error.message);
    console.error('Hata detayları:', error.code || 'Bilinmeyen hata kodu');
    console.error('İnternet bağlantınızı kontrol edin - düşük bağlantı hızı bu hataya neden olabilir.');
    
    // Durum güncelle (başarısız)
    apiStatus.isConnected = false;
    
    return { success: false, error: error.message, url: testUrl };
  }
};

// API Base URL'ini almak için yardımcı fonksiyon
const getBaseUrl = () => {
  // API URL'den '/api' kısmını çıkar
  return BASE_URL.replace('/api', '');
};

// Tüm alternatif IP adreslerini test eden fonksiyon
const tryAllApiUrls = async () => {
  console.log('Tüm alternatif IP adreslerini deniyorum...');
  
  // iOS için özel URLs
  let urlsToTry = [];
  
  if (isIOS) {
    // iOS cihazlarda önce bu URL'leri dene
    console.log('iPhone için özel URL listesi kullanılıyor...');
    urlsToTry = [
      BASE_URL,
      API_URL_OPTIONS.EXPO_IOS,
      API_URL_OPTIONS.IOS_NETWORK_IP,
      API_URL_OPTIONS.IOS_IP_1,
      API_URL_OPTIONS.IOS_IP_2,
      API_URL_OPTIONS.IOS_HOTSPOT,
      API_URL_OPTIONS.REAL_DEVICE,
      API_URL_OPTIONS.ALT_IP_1,
      API_URL_OPTIONS.ALT_IP_2
    ];
  } else {
    // Android veya diğer cihazlar için
    urlsToTry = [
      BASE_URL,  // Mevcut URL'i önce dene
      API_URL_OPTIONS.REAL_DEVICE,
      API_URL_OPTIONS.ALT_IP_1,
      API_URL_OPTIONS.ALT_IP_2,
      // Emülatörde çalışıyorsa bu URL'leri de dene
      ...(isEmulator ? [API_URL_OPTIONS.EMULATOR_ANDROID, API_URL_OPTIONS.EMULATOR_IOS] : []),
      // Son çare olarak diğer tüm URL'leri dene
      ...Object.values(API_URL_OPTIONS).filter(url => 
        url !== BASE_URL && 
        url !== API_URL_OPTIONS.REAL_DEVICE && 
        url !== API_URL_OPTIONS.ALT_IP_1 && 
        url !== API_URL_OPTIONS.ALT_IP_2 &&
        (!isEmulator || (url !== API_URL_OPTIONS.EMULATOR_ANDROID && url !== API_URL_OPTIONS.EMULATOR_IOS))
      )
    ];
  }
  
  // URL'lerin benzersiz olduğundan emin ol
  const uniqueUrls = [...new Set(urlsToTry)];
  
  console.log(`${uniqueUrls.length} farklı URL test edilecek...`);
  
  // Her URL için bağlantı testini sırayla dene
  for (const url of uniqueUrls) {
    console.log(`URL test ediliyor: ${url}`);
    const testResult = await testApiConnection(url);
    
    if (testResult.success) {
      console.log(`Başarılı bağlantı: ${url}`);
      
      // Başarılı olan URL'i ayarla
      BASE_URL = url;
      
      // Axios client'ı güncelle
      client.defaults.baseURL = url;
      
      // API durum bilgisini güncelle
      apiStatus.isConnected = true;
      apiStatus.currentUrl = url;
      apiStatus.isDemoMode = false;
      
      return { success: true, url };
    }
    
    console.log(`Başarısız bağlantı: ${url}`);
  }
  
  console.error('Hiçbir API URL ile bağlantı kurulamadı');
  
  // Demo moduna geçiş yapılabilir
  enableDemoMode();
  
  return { success: false };
};

// Demo modunu etkinleştir
const enableDemoMode = () => {
  console.log('DEMO MODU ETKİNLEŞTİRİLİYOR...');
  isDemoMode = true;
  
  // API durum bilgisini güncelle
  apiStatus.isDemoMode = true;
  apiStatus.isConnected = false;
  
  // iOS cihazlar için özel hata mesajı
  if (isIOS) {
    console.warn('=== iOS BAĞLANTI UYARISI ===');
    console.warn('iPhone cihazında API sunucusuna bağlanılamadı.');
    console.warn('iOS, güvenlik nedeniyle HTTP bağlantılarına izin vermeyebilir.');
    console.warn('Çözüm için app.json dosyasına aşağıdaki ayarı ekleyin:');
    console.warn(`
    "ios": {
      "supportsTablet": true,
      "infoPlist": {
        "NSAppTransportSecurity": {
          "NSAllowsArbitraryLoads": true
        }
      }
    }
    `);
    console.warn('Veya API sunucusunu HTTPS kullanacak şekilde yapılandırın.');
    console.warn('=== iOS BAĞLANTI UYARISI ===');
  }
  
  return true;
};

// Android Studio için özel kontrolcü
const checkAndPingApi = async () => {
  const connectionTest = await testApiConnection();
  
  if (!connectionTest.success) {
    console.warn('API bağlantısı başarısız. Alternatif URL\'ler deneniyor...');
    
    // Tüm alternatif URL'leri dene
    const altUrlTest = await tryAllApiUrls();
    
    if (altUrlTest.success) {
      console.log(`Alternatif API URL ile bağlantı başarılı: ${altUrlTest.url}`);
      return true;
    } else {
      console.error('Hiçbir API URL ile bağlantı kurulamadı.');
      
      // Demo modu aktif
      return false;
    }
  }
  
  return connectionTest.success;
};

// Network sorunu yaşanan durumlarda kontrol stratejileri
const handleNetworkIssues = async () => {
  console.log('Ağ sorunları kontrol ediliyor...');
  
  // Bağlantı hızını test et
  let slowConnection = false;
  let startTime = Date.now();
  
  try {
    // 1KB veriyi almaya çalış - bağlantı hızını ölçmek için
    const speedTest = await axios.get(`${BASE_URL.replace('/api', '')}/`, { 
      timeout: 8000,
      headers: { 'Cache-Control': 'no-cache' }
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`Bağlantı hızı testi: ${duration}ms`);
    
    // 2 saniyeden uzun sürüyorsa, bağlantı yavaş sayılır
    if (duration > 2000) {
      slowConnection = true;
      console.warn('Yavaş internet bağlantısı tespit edildi!');
    }
    
  } catch (error) {
    console.error('Bağlantı hız testi başarısız:', error.message);
    slowConnection = true;
  }
  
  // Sonuç döndür
  return {
    slowConnection,
    // Bağlantı sorunlarıyla ilgili ek durum bilgileri eklenebilir
    status: {
      isOnline: navigator.onLine,
      testDuration: Date.now() - startTime,
      timestamp: new Date().toISOString()
    }
  };
};

// Uygulamanın başlatılmasında API bağlantısını test etmek için çağrılabilir
checkAndPingApi().then(success => {
  console.log('API bağlantı kontrolü sonucu:', success ? 'Başarılı' : 'Başarısız');
  
  // Bağlantı başarısızsa, ağ sorunlarını kontrol et
  if (!success) {
    handleNetworkIssues().then(result => {
      if (result.slowConnection) {
        console.warn('=== YAVAŞ BAĞLANTI UYARISI ===');
        console.warn('İnternet bağlantınız yavaş görünüyor. Bu, API bağlantı sorunlarına neden olabilir.');
        console.warn('Öneriler:');
        console.warn('1. Wi-Fi sinyali güçlü bir konuma geçin');
        console.warn('2. Mobil veri kullanıyorsanız, Wi-Fi\'a geçmeyi deneyin');
        console.warn('3. Router/modemi yeniden başlatın');
        console.warn('4. Diğer cihazlardaki veri yoğun uygulamaları kapatın');
        console.warn('=== YAVAŞ BAĞLANTI UYARISI ===');
      }
    });
  }
});

// Axios client instance oluştur
const client = axios.create({
  baseURL: BASE_URL,
  timeout: 60000, // 30 saniye timeout (30 sn -> 60 sn olarak artırıldı)
  headers: {
    'Content-Type': 'application/json',
  },
  // Retry mekanizması için yapılandırma
  retry: 3, // Daha fazla yeniden deneme (2 -> 3)
  retryDelay: 1500, // Daha kısa bekleme süresi (3 sn -> 1.5 sn)
  withCredentials: true,
});

// Debug modu - geliştirme aşamasında true, production'da false olmalı
const DEBUG_MODE = false;

// Önbellek için yardımcı fonksiyonlar
const cache = {
  data: {},
  
  // Önbellek anahtarı oluştur
  createKey: (endpoint, params = {}) => {
    const queryString = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    return `${endpoint}${queryString ? `?${queryString}` : ''}`;
  },
  
  // Önbelleğe veri ekle
  set: (key, data, ttl = 5 * 60 * 1000) => { // Varsayılan 5 dakika
    cache.data[key] = {
      data,
      expiry: Date.now() + ttl,
      timestamp: Date.now()
    };
    console.log(`API Cache: '${key}' önbelleğe kaydedildi (${ttl/1000}s)`);
  },
  
  // Önbellekten veri al
  get: (key) => {
    const item = cache.data[key];
    if (!item) return null;
    
    // Süresi dolmuş mu kontrol et
    if (Date.now() > item.expiry) {
      console.log(`API Cache: '${key}' süresi dolmuş`);
      delete cache.data[key];
      return null;
    }
    
    console.log(`API Cache: '${key}' önbellekten alındı (${Math.round((Date.now() - item.timestamp)/1000)}s önce)`);
    return item.data;
  },
  
  // Önbelleği temizle
  clear: () => {
    cache.data = {};
    console.log('API Cache: Tüm önbellek temizlendi');
  },
  
  // Belirli bir anahtarı temizle
  invalidate: (key) => {
    if (cache.data[key]) {
      delete cache.data[key];
      console.log(`API Cache: '${key}' önbellekten silindi`);
      return true;
    }
    return false;
  },
  
  // Endpoint ile eşleşen tüm önbellek girdilerini temizle
  invalidateByEndpoint: (endpoint) => {
    let count = 0;
    Object.keys(cache.data).forEach(key => {
      if (key.startsWith(endpoint)) {
        delete cache.data[key];
        count++;
      }
    });
    if (count > 0) {
      console.log(`API Cache: '${endpoint}' ile eşleşen ${count} önbellek girdisi silindi`);
    }
    return count;
  }
};

// HTTP istemcisini önbellek desteği ile güncelle
client.cachedGet = async (url, config = {}) => {
  // Önbellek kullanımını kontrol et
  const useCache = config.useCache !== false;
  const cacheTTL = config.cacheTTL || 5 * 60 * 1000; // Varsayılan 5 dakika
  
  // Önbellek anahtarı oluştur
  const cacheKey = cache.createKey(url, config.params);
    
  // Önbellekten veri almayı dene
  if (useCache) {
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }
  }
  
  // Önbellekte yoksa API isteği yap
  try {
    const response = await client.get(url, config);
    
    // Başarılı yanıtı önbelleğe kaydet
    if (useCache && response.status === 200) {
      cache.set(cacheKey, response, cacheTTL);
    }
    
    return response;
  } catch (error) {
    throw error;
  }
};

// İstek interceptor'ı - her istekte token ekle
client.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Yanıt alındıktan sonra çalışacak interceptor
client.interceptors.response.use(
  (response) => {
    if (DEBUG_MODE) {
    console.log(`API Yanıtı: ${response.status} ${response.config.url}`);
    
    // Response içeriğini analiz et (hata ayıklama için)
    try {
      if (response.data) {
        // Veri büyükse özet bilgi göster
        if (typeof response.data === 'object') {
          const dataType = Array.isArray(response.data) ? 'array' : 'object';
          const dataSize = JSON.stringify(response.data).length;
          console.log(`Yanıt tipi: ${dataType}, boyut: ${dataSize} bytes`);
          
          // Sayfa bilgisi veya başarı durumu varsa göster
          if (response.data.success !== undefined) {
            console.log(`Yanıt başarılı: ${response.data.success}`);
          }
          
          // Data array içeriyorsa uzunluğunu göster
          if (response.data.data && Array.isArray(response.data.data)) {
            console.log(`Veri sayısı: ${response.data.data.length}`);
          }
        }
      }
    } catch (e) {
      console.warn('Yanıt verisi analiz edilemedi:', e.message);
      }
    }
    
    // /issues endpoint'i için özel loglama
    if (response.config.url?.includes('/issues')) {
      console.log(`------- ISSUES API YANITI -------`);
      console.log(`URL: ${response.config.url}`);
      console.log(`Status: ${response.status}`);
      
      // Veri analizini yap
      const data = response.data;
      console.log(`Başarı durumu: ${data.success ? 'Başarılı' : 'Başarısız'}`);
      
      // Pagination bilgisi
      if (data.pagination) {
        console.log(`Sayfalama: Sayfa ${data.pagination.current}/${data.pagination.total}, Toplam: ${data.pagination.count} kayıt`);
      }
      
      // API'den dönen sorunların şehirlerini kontrol et
      if (data.data && Array.isArray(data.data)) {
        console.log(`Dönen sorun sayısı: ${data.data.length}`);
        
        // Sorunların şehirlerini say
        const cityCounts = {};
        data.data.forEach(issue => {
          const city = issue.location?.city || 'Belirtilmemiş';
          cityCounts[city] = (cityCounts[city] || 0) + 1;
        });
        
        console.log('Şehirlere göre sorun dağılımı:');
        Object.entries(cityCounts).forEach(([city, count]) => {
          console.log(`  - ${city}: ${count} sorun`);
        });
      }
      
      console.log(`--------------------------------`);
    }
    
    return response;
  },
  async (error) => {
    // Timeout hatası kontrolü
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      if (DEBUG_MODE) console.warn('API isteği zaman aşımına uğradı. Yeniden deneniyor...');
      
      const config = error.config;
      
      // Retry mekanizması
      if (!config || !config.retry) {
        return Promise.reject(error);
      }
      
      // Retry sayısı kontrolü
      config.__retryCount = config.__retryCount || 0;
      if (config.__retryCount >= config.retry) {
        if (DEBUG_MODE) console.error('Maksimum yeniden deneme sayısına ulaşıldı:', config.retry);
        return Promise.reject(error);
      }
      
      // Retry sayacını artır
      config.__retryCount += 1;
      if (DEBUG_MODE) console.log(`İstek yeniden deneniyor (${config.__retryCount}/${config.retry})...`);
      
      // Daha kısa sabit bekleme süresi
      const delayTime = 1000; // Sabit 1 saniye bekleme
      
      if (DEBUG_MODE) console.log(`Yeniden denemeden önce ${delayTime}ms bekleniyor...`);
      
      // Retry delay
      const backoff = new Promise((resolve) => {
        setTimeout(() => {
          resolve();
        }, delayTime);
      });
      
      // Retry işlemi
      return backoff.then(() => {
        return client(config);
      });
    }
    
    // Network hatası kontrolü
    if (error.message === 'Network Error') {
      if (DEBUG_MODE) console.warn('API sunucusuna bağlanılamadı. Bağlantı tekrar denenecek...');
      
      const config = error.config;
      
      // Retry mekanizması network hatası için
      if (!config || !config.retry) {
        return Promise.reject(error);
      }
      
      // Retry sayısı kontrolü
      config.__retryCount = config.__retryCount || 0;
      if (config.__retryCount >= config.retry) {
        if (DEBUG_MODE) console.error('Maksimum yeniden deneme sayısına ulaşıldı:', config.retry);
        
        // Network Error sonrası custom error
      const customError = new Error('API bağlantısı kurulamadı');
      customError.originalError = error;
      
      return Promise.reject(customError);
      }
      
      // Retry sayacını artır
      config.__retryCount += 1;
      if (DEBUG_MODE) console.log(`Network hatası - İstek yeniden deneniyor (${config.__retryCount}/${config.retry})...`);
      
      // Sabit bekleme süresi
      const delayTime = 1000; // Sabit 1 saniye
      
      if (DEBUG_MODE) console.log(`Yeniden denemeden önce ${delayTime}ms bekleniyor...`);
      
      // Retry delay
      const backoff = new Promise((resolve) => {
        setTimeout(() => {
          resolve();
        }, delayTime);
      });
      
      return backoff.then(() => {
        if (DEBUG_MODE) console.log(`${config.baseURL} adresine yeniden bağlanmayı deniyorum...`);
        return client(config);
      });
    }
    
    // API yanıt hatası
    if (error.response) {
      if (DEBUG_MODE) console.error(`API Hata: ${error.response.status}`, error.response.data);
      
      // 500 hatası için daha detaylı log
      if (error.response.status === 500 && DEBUG_MODE) {
        console.error('500 SUNUCU HATASI DETAYLARI:');
        console.error('Request URL:', error.config.url);
        console.error('Request Method:', error.config.method);
        console.error('Request Headers:', error.config.headers);
        if (error.config.data) {
          try {
            console.error('Request Data:', JSON.parse(error.config.data));
          } catch (e) {
            console.error('Request Data (raw):', error.config.data);
          }
        }
        console.error('Response:', error.response.data);
      }
      
      // 401 Unauthorized hatası - token süresi dolmuş veya geçersiz
      if (error.response.status === 401) {
        // Token'ı kaldır ve giriş sayfasına yönlendir
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
      }
    } else if (error.request && DEBUG_MODE) {
      // İstek gönderildi ama yanıt alınamadı
      console.error('Sunucudan yanıt alınamadı:', error.request);
    }
    
    return Promise.reject(error);
  }
);

// API endpoints
const api = {
  // Önbelleği temizle
  clearCache: () => {
    cache.clear();
  },
  
  // API kesilme durumunda yeniden bağlantı için base URL'i güncelle
  updateBaseUrl: (newBaseUrl) => {
    client.defaults.baseURL = newBaseUrl;
    console.log(`API Base URL güncellendi: ${newBaseUrl}`);
  },

  // Base URL'i al
  getBaseUrl: () => {
    return BASE_URL;
  },

  // Auth işlemleri
  auth: {
    // Login ve register fonksiyonlarını düzenliyoruz
    login: async (data) => {
      console.log('Login isteği gönderiliyor:', data);
      try {
        const response = await client.post('/auth/login', data);
        console.log('Login yanıtı:', response.data);
        
        // Yanıtı kontrol et
        if (!response.data) {
          console.error('API yanıtında veri yok!');
          throw new Error('API yanıtında veri yok');
        }
        
        // Token kontrolü
        if (response.data.data && !response.data.data.token) {
          console.error('API yanıtında token bulunamadı!', response.data);
          throw new Error('Token bulunamadı');
        }
        
        // Kullanıcı rolünü kontrol et
        if (response.data.data && response.data.data.role) {
          console.log('Kullanıcı rolü:', response.data.data.role);
        } else {
          console.warn('Kullanıcı rolü bulunamadı!');
        }
        
        return response;
      } catch (error) {
        console.error('Login hatası:', error);
        throw error;
      }
    },
    
    register: async (data) => {
      console.log('Register isteği gönderiliyor:', data);
      try {
        const response = await client.post('/auth/register', data);
        console.log('Register yanıtı:', response.data);
        return response;
      } catch (error) {
        console.error('Register hatası:', error);
        throw error;
      }
    },
    
    getUserProfile: async () => {
      try {
        await checkAndPingApi();
        const token = await AsyncStorage.getItem('token');
        
        if (!token) {
          console.error('Token bulunamadı. Kullanıcı oturum açmamış.');
          return { 
            success: false, 
            message: 'Oturum açık değil' 
          };
        }
        
        console.log('Kullanıcı profil bilgileri getiriliyor...');
        const response = await client.get('/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('Kullanıcı profil yanıtı:', JSON.stringify(response.data, null, 2));
        
        // Yanıt formatını kontrol et
        const userData = response.data.data || response.data;
        
        if (!userData) {
          console.error('Kullanıcı verisi boş veya formatı hatalı:', response.data);
          return { 
            success: false, 
            message: 'API yanıtında kullanıcı verisi bulunamadı' 
          };
        }
        
        // Belediye çalışanı rolü varsa şehir bilgisini kontrol et
        if (userData.role === 'municipal_worker') {
          console.log('Belediye çalışanı rolü tespit edildi');
          
          if (!userData.city || userData.city === "undefined" || userData.city === "") {
            console.warn('Belediye çalışanı için şehir bilgisi eksik!');
          } else {
            console.log(`Şehir bilgisi mevcut: ${userData.city}`);
          }
        }
        
        // Verileri AsyncStorage'a kaydet
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        console.log('Güncel kullanıcı bilgileri kaydedildi:', userData.name);
        
        return { 
          success: true, 
          data: userData
        };
      } catch (error) {
        console.error('Kullanıcı profili getirme hatası:', error);
        
        // Daha detaylı hata bilgisi
        if (error.response) {
          console.error('API Hata Kodu:', error.response.status);
          console.error('API Hata Detayı:', error.response.data);
        } else if (error.request) {
          console.error('API yanıt vermedi:', error.request);
        } else {
          console.error('Hata oluştu:', error.message);
        }
        
        return { 
          success: false, 
          message: error.response?.data?.message || 'Kullanıcı bilgileri alınamadı',
          error: error.toString()
        };
      }
    },
    
    checkUserRole: async () => {
      try {
        console.log('Kullanıcı rolü kontrol ediliyor...');
        const response = await client.get('/auth/check-role');
        console.log('Rol kontrolü yanıtı:', response.data);
        
        if (response.data && response.data.success && response.data.data) {
          // Kullanıcı bilgilerini AsyncStorage'a kaydet
          const userData = response.data.data;
          await AsyncStorage.setItem('user', JSON.stringify(userData));
          
          console.log('Güncel kullanıcı rolü:', userData.role);
          return { 
            success: true, 
            data: userData,
            role: userData.role
          };
        }
        
        return { success: false, message: 'Rol bilgisi alınamadı' };
      } catch (error) {
        console.error('Rol kontrolü hatası:', error);
        return { 
          success: false, 
          message: error.response?.data?.message || 'Kullanıcı rolü kontrol edilemedi' 
        };
      }
    },
    updateProfile: async (userData) => {
      try {
        console.log('Profile update request:', userData);
        const response = await client.put('/auth/profile', userData);
        console.log('Profile update response:', response.data);
        return response;
      } catch (error) {
        console.error('Profile update error:', error);
        throw error;
      }
    },
    changePassword: (passwordData) => client.put('/auth/updatepassword', passwordData),
  },
  
  // Bildirim işlemleri - reports yerine issues kullanıyoruz
  issues: {
    // Tüm sorunları getir
    getAll: async (params = {}) => {
      try {
        console.log('Tüm sorunlar getiriliyor...');
        console.log('Filtreler:', params);
        
        // API isteği için parametreleri hazırla
        const queryParams = new URLSearchParams();
        Object.keys(params).forEach(key => {
          if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
            queryParams.append(key, params[key]);
          }
        });
        
        // Özel olarak şehir parametresi kontrolü
        if (params.city && params.city !== '') {
          console.log(`Şehir filtresi uygulanıyor: ${params.city}`);
          // Backend API endpoint şehir parametresini bu formatta bekliyor olabilir
          queryParams.set('city', params.city);
        }
        
        console.log('API isteği parametreleri:', queryParams.toString());
        
        // API'den tüm sorunları getir
        const response = await client.get(`/issues?${queryParams.toString()}`);
        
        console.log(`${response.data.data.length} sorun başarıyla getirildi`);
        
        return { 
          success: true,
          data: response.data
        };
      } catch (error) {
        console.error('Sorunlar getirilirken hata:', error);
        
        // Demo modunda ise demo verileri döndür
        if (isDemoMode) {
          console.log('Demo modunda sorunlar getiriliyor...');
          
          // Demo verilerinden filtreleme yap
          let demoIssues = [...demoData.issues];
          
          // Demo için basit filtreleme
          if (params.category && params.category !== 'Tümü') {
            demoIssues = demoIssues.filter(issue => issue.category === params.category);
          }
          
          if (params.status && params.status !== 'Tümü') {
            demoIssues = demoIssues.filter(issue => issue.status === params.status);
          }
          
          // Şehir filtresi
          if (params.city && params.city !== '') {
            demoIssues = demoIssues.filter(issue => 
              issue.location && 
              issue.location.city && 
              issue.location.city.toLowerCase() === params.city.toLowerCase()
            );
          }
          
          // Demo sayfalama
          const page = params.page || 1;
          const limit = params.limit || 10;
          const startIndex = (page - 1) * limit;
          const endIndex = page * limit;
          
          const paginatedIssues = demoIssues.slice(startIndex, endIndex);
          
        return { 
            success: true, 
            data: {
              data: paginatedIssues,
              pagination: {
                total: demoIssues.length,
                page,
                limit,
                pages: Math.ceil(demoIssues.length / limit)
              }
            },
            isDemoMode: true 
          };
        }
        
        return handleApiError(error, 'Sorunlar getirilirken bir hata oluştu');
      }
    },
    
    // Genel istatistikleri getir
    getPublicStats: async () => {
      try {
        console.log('Genel istatistikler getiriliyor...');
        
        // API'den genel istatistikleri getir
        const response = await client.get('/issues/stats');
        
        console.log('İstatistikler başarıyla alındı');
        
          return { 
            success: true,
            data: response.data.data
          };
      } catch (error) {
        console.error('İstatistikler getirilirken hata:', error);
        
        // Demo modunda ise demo istatistikleri döndür
        if (isDemoMode) {
          console.log('Demo modunda istatistikler getiriliyor...');
          
          // Demo verilerinden hesapla
          const totalIssues = demoData.issues.length;
          const resolvedIssues = demoData.issues.filter(issue => issue.status === 'resolved').length;
          
          return { 
            success: true, 
            data: {
              totalIssues,
              resolvedIssues,
              totalUsers: 157,
              activeUsers: 82,
              averageResolveTime: 3
            },
            isDemoMode: true
          };
        }
        
        return handleApiError(error, 'İstatistikler getirilirken bir hata oluştu');
      }
    },
    
    // Kullanıcının kendi sorunlarını getir
    getMyIssues: async () => {
      try {
        await checkAndPingApi();
          const token = await AsyncStorage.getItem('token');
        
        if (!token) {
            return { 
              success: false, 
            message: 'Oturum açmanız gerekiyor'
          };
        }

        // Kullanıcı bilgisini kontrol et
        const userStr = await AsyncStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;
        
        // Worker rolü kontrolü
        if (user && user.role === 'worker') {
          console.log('Worker rolü için getMyIssues fonksiyonu kullanılamaz');
          return { 
            success: true, 
            data: [],       // Boş liste döndür
            workerRole: true // Worker rolü olduğunu belirt
          };
        }
        
        console.log('Kullanıcının kendi sorunları getiriliyor...');
        console.log('Token başlangıcı:', token ? token.substring(0, 20) + '...' : 'yok');
        console.log('Kullanıcı bilgisi:', user ? { id: user.id, role: user.role } : 'yok');
        
        // Önbellekli GET isteği kullan - Doğru endpoint: /issues/myissues
        const response = await client.cachedGet('/issues/myissues', {
          headers: { Authorization: `Bearer ${token}` },
          useCache: false, // Profil sayfası için cache kullanma
          timeout: 10000 // 10 saniye timeout
        });
        
        let myIssuesData = response.data.data || [];
        console.log(`API yanıtı: ${myIssuesData.length} sorun bulundu`);
        
          return { 
            success: true, 
          data: myIssuesData
        };
      } catch (error) {
        console.error('getMyIssues API Error:', error);
        
        // Hata detaylarını daha detaylı logla
        if (error.response) {
          console.error('API Response Error:', {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data
          });
        } else if (error.request) {
          console.error('API Request Error:', error.request);
        }
        
        return handleApiError(error, 'Bildirimler getirilirken hata oluştu');
      }
    },
    
    // Sorun detaylarını getir
    getById: async (id) => {
      try {
        await checkAndPingApi();
        const token = await AsyncStorage.getItem('token');
        
        console.log(`Sorun detayları alınıyor, ID: ${id}`);
        
        // Önbellekli GET isteği kullan
        const response = await client.cachedGet(`/issues/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
          useCache: true,
          cacheTTL: 3 * 60 * 1000 // 3 dakika
        });
        
        console.log('Sorun detayları başarıyla alındı');
        
          return {
            success: true,
          data: response.data.data
        };
      } catch (error) {
        return handleApiError(error, 'Sorun detayları alınırken bir hata oluştu');
      }
    },

    // Sorun detaylarını getir (getById ile aynı işlevi görür - geriye uyumluluk için)
    getIssueById: async (id) => {
      try {
        await checkAndPingApi();
        const token = await AsyncStorage.getItem('token');
        
        console.log(`Sorun detayları alınıyor (getIssueById), ID: ${id}`);
        
        // Önbellekli GET isteği kullan
        const response = await client.cachedGet(`/issues/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
          useCache: true,
          cacheTTL: 3 * 60 * 1000 // 3 dakika
        });
        
        console.log('Sorun detayları başarıyla alındı');
        
          return {
            success: true,
            data: response.data.data
          };
      } catch (error) {
        return handleApiError(error, 'Sorun detayları alınırken bir hata oluştu');
      }
    },
    
    // Yeni sorun ekle
    create: async (issueData) => {
      try {
        await checkAndPingApi();
        const token = await AsyncStorage.getItem('token');
        
        if (!token) {
          return {
            success: false,
            message: 'Oturum açmanız gerekiyor'
          };
        }
        
        console.log('Yeni sorun oluşturuluyor:', issueData.title);
        
        const response = await client.post('/issues', issueData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Sorunlar listesi önbelleğini temizle
        cache.invalidateByEndpoint('/issues');
        
        console.log('Sorun başarıyla oluşturuldu:', response.data);
        
          return {
            success: true,
          data: response.data.data,
          message: 'Sorun başarıyla bildirildi'
        };
      } catch (error) {
        return handleApiError(error, 'Sorun oluşturulurken bir hata oluştu');
      }
    },
    
    // Sorun durumunu güncelle
    updateStatus: async (id, status) => {
      try {
        await checkAndPingApi();
        const token = await AsyncStorage.getItem('token');
        
        if (!token) {
        return { 
          success: false, 
            message: 'Oturum açmanız gerekiyor'
          };
        }
        
        console.log(`Sorun durumu güncelleniyor, ID: ${id}, Yeni durum: ${status}`);
        
        const response = await client.patch(`/issues/${id}/status`, { status }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // İlgili sorun önbelleğini temizle
        cache.invalidate(cache.createKey(`/issues/${id}`));
        cache.invalidateByEndpoint('/issues');
        
        console.log('Sorun durumu başarıyla güncellendi');
        
          return {
          success: true,
          data: response.data.data,
          message: 'Sorun durumu güncellendi'
        };
      } catch (error) {
        return handleApiError(error, 'Sorun durumu güncellenirken bir hata oluştu');
      }
    },
    
    // Yorumlar
    addComment: async (issueId, content) => {
      try {
        await checkAndPingApi();
        const token = await AsyncStorage.getItem('token');
        
        if (!token) {
          return {
            success: false,
            message: 'Oturum açmanız gerekiyor'
          };
        }
        
        console.log(`Yorum ekleniyor, Sorun ID: ${issueId}`);
        
        const response = await client.post(`/issues/${issueId}/comments`, { content }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // İlgili sorun önbelleğini temizle
        cache.invalidate(cache.createKey(`/issues/${issueId}`));
        
        console.log('Yorum başarıyla eklendi');
        
        return {
          success: true,
          data: response.data.data,
          message: 'Yorum eklendi'
        };
      } catch (error) {
        return handleApiError(error, 'Yorum eklenirken bir hata oluştu');
      }
    },
    
    // ... diğer issue fonksiyonları için de benzer şekilde önbellek temizleme eklenebilir ...
  },
  
  // ... diğer API endpointleri ...

  // Bağlantı durumunu kontrol et
  checkConnection: async () => {
    try {
      // /health endpoint'i yerine /issues endpoint'ini kullanıyoruz (var olduğunu biliyoruz)
      const response = await client.get('/issues', { 
        timeout: 15000, // 5000ms'den 15000ms'ye çıkardık
        params: { limit: 1 } // Sadece 1 kayıt isteyelim, performans için
      });
      return { success: true, data: { status: 'online' } };
    } catch (error) {
      console.error('API bağlantı kontrolü başarısız:', error);
      return { success: false, message: 'API sunucusuna bağlanılamadı' };
    }
  },

  // Admin işlemleri
  admin: {
    // Admin için tüm sorunları getir
    getAdminIssues: async (filters = {}) => {
      try {
        console.log('Admin sorunları getiriliyor...');
        const token = await AsyncStorage.getItem('token');
        
        if (!token) {
          return {
            success: false,
            message: 'Oturum açmanız gerekiyor'
          };
        }

        // API parametrelerini hazırla
        const queryParams = new URLSearchParams();
        Object.keys(filters).forEach(key => {
          if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
            queryParams.append(key, filters[key]);
          }
        });

        const response = await client.get(`/admin/issues?${queryParams.toString()}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Admin sorunları başarıyla alındı');
        
        return {
          success: true,
          data: {
            issues: response.data.data || response.data,
            total: response.data.total
          }
        };
      } catch (error) {
        console.error('Admin sorunları alınırken hata:', error);
        
        // Demo modunda ise demo verileri döndür
        if (isDemoMode) {
          console.log('Demo modunda admin sorunları getiriliyor...');
          return { 
            success: true, 
            data: {
              issues: demoData.issues,
              total: demoData.issues.length
            },
            isDemoMode: true 
          };
        }
        
        return handleApiError(error, 'Admin sorunları alınırken bir hata oluştu');
      }
    },

    // Sorunu çalışana ata
    assignIssue: async (issueId, workerId) => {
      try {
        console.log(`Sorun ${issueId} çalışan ${workerId}'ye atanıyor...`);
        const token = await AsyncStorage.getItem('token');
        
        if (!token) {
          return {
            success: false,
            message: 'Oturum açmanız gerekiyor'
          };
        }
        
        const response = await client.put(`/admin/issues/${issueId}/assign`, 
          { workerId }, 
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        console.log('Sorun başarıyla atandı');
        
        return {
          success: true,
          data: response.data.data || response.data
        };
      } catch (error) {
        console.error('Sorun atanırken hata:', error);
        return handleApiError(error, 'Sorun atama işlemi başarısız');
      }
    },

    // Sorun durumunu güncelle
    updateIssueStatus: async (issueId, status) => {
      try {
        console.log(`Sorun ${issueId} durumu güncelleniyor: ${status}`);
        const token = await AsyncStorage.getItem('token');
        
        if (!token) {
          return {
            success: false,
            message: 'Oturum açmanız gerekiyor'
          };
        }

        const response = await client.put(`/admin/issues/${issueId}/status`, 
          { status }, 
          { headers: { Authorization: `Bearer ${token}` } }
        );

        console.log('Sorun durumu başarıyla güncellendi');
        
        return {
          success: true,
          data: response.data.data || response.data
        };
      } catch (error) {
        console.error('Sorun durumu güncellenirken hata:', error);
        return handleApiError(error, 'Durum güncellenemedi');
      }
    },
    
    // Çalışanları getir
    getWorkers: async () => {
      try {
        console.log('Çalışanlar getiriliyor...');
        const token = await AsyncStorage.getItem('token');
        
        if (!token) {
          return {
            success: false,
            message: 'Oturum açmanız gerekiyor'
          };
        }
        
        const response = await client.get('/admin/workers', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('Çalışanlar başarıyla alındı');
        
        return {
          success: true,
          data: response.data.data || response.data
        };
      } catch (error) {
        console.error('Çalışanlar alınırken hata:', error);
        return handleApiError(error, 'Çalışanlar alınamadı');
      }
    },

    // Resmi yanıt ekle
    addOfficialResponse: async (issueId, responseText) => {
      try {
        console.log(`Sorun ${issueId} için resmi yanıt ekleniyor...`);
        const token = await AsyncStorage.getItem('token');
        
        if (!token) {
          return {
            success: false,
            message: 'Oturum açmanız gerekiyor'
          };
        }

        const response = await client.post(`/admin/issues/${issueId}/response`, 
          { response: responseText }, 
          { headers: { Authorization: `Bearer ${token}` } }
        );

        console.log('Resmi yanıt başarıyla eklendi');
        
        return {
          success: true,
          data: response.data.data || response.data
        };
      } catch (error) {
        console.error('Resmi yanıt eklenirken hata:', error);
        return handleApiError(error, 'Resmi yanıt eklenemedi');
      }
    },

    // Sorun detayını getir
    getIssueById: async (id) => {
      try {
        console.log(`Admin sorun detayı getiriliyor, ID: ${id}`);
        const token = await AsyncStorage.getItem('token');
        
        if (!token) {
          return {
            success: false,
            message: 'Oturum açmanız gerekiyor'
          };
        }

        const response = await client.get(`/admin/issues/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Admin sorun detayı başarıyla alındı');
        
        return {
          success: true,
          data: response.data.data || response.data
        };
      } catch (error) {
        console.error('Admin sorun detayı alınırken hata:', error);
        return handleApiError(error, 'Sorun detayları alınamadı');
      }
    },
    
    // Admin istatistikleri getir
    getStats: async (timeRange = 'last30days') => {
      try {
        console.log(`Admin istatistikleri getiriliyor... Zaman aralığı: ${timeRange}`);
        const token = await AsyncStorage.getItem('token');
        
        if (!token) {
          return {
            success: false,
            message: 'Oturum açmanız gerekiyor'
          };
        }

        const response = await client.get(`/admin/reports?timeRange=${timeRange}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Admin istatistikleri başarıyla alındı');

        // Backend'ten gelen veriyi frontend'in beklediği formata dönüştür
        const data = response.data.data;
        
        // Durum verilerini dönüştür (status alanını ekle)
        const byStatus = data.byStatus?.map(item => ({
          ...item,
          status: item._id,
          _id: item._id
        })) || [];

        // Kategori verilerini dönüştür (category alanını ekle)
        const byCategory = data.byCategory?.map(item => ({
          ...item,
          category: item._id,
          _id: item._id
        })) || [];

        // İlçe verilerini dönüştür (district alanını ekle)
        const byDistrict = data.byDistrict?.map(item => ({
          ...item,
          district: item._id,
          _id: item._id
        })) || [];

        // Şehir verilerini dönüştür (city alanını ekle)
        const byCity = data.byCity?.map(item => ({
          ...item,
          city: item._id,
          _id: item._id
        })) || [];

        // Toplam sayısını hesapla
        const total = byStatus.reduce((sum, item) => sum + item.count, 0);
        
        return {
          success: true,
          data: {
            total,
            byStatus,
            byCategory,
            byDistrict,
            byCity,
            byMonth: data.byMonth || []
          }
        };
      } catch (error) {
        console.error('Admin istatistikleri alınırken hata:', error);
        return handleApiError(error, 'İstatistikler alınamadı');
      }
    },
    
    // Sorun güncelle (kapsamlı güncelleme)
    updateIssue: async (issueId, updateData) => {
      try {
        console.log(`Sorun ${issueId} güncelleniyor...`, updateData);
        const token = await AsyncStorage.getItem('token');
        
        if (!token) {
          return {
            success: false,
            message: 'Oturum açmanız gerekiyor'
          };
        }

        // Farklı güncelleme işlemleri için ayrı API çağrıları yapıyoruz
        let response;
        
        // Eğer sadece durum güncelleme ise
        if (updateData.status && Object.keys(updateData).length === 1) {
          response = await client.put(`/admin/issues/${issueId}/status`, 
            { status: updateData.status }, 
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }
        // Eğer çalışan atama ise
        else if (updateData.assignedTo && Object.keys(updateData).length === 1) {
          response = await client.put(`/admin/issues/${issueId}/assign`, 
            { workerId: updateData.assignedTo }, 
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }
        // Eğer resmi yanıt ise
        else if (updateData.officialResponse && Object.keys(updateData).length === 1) {
          response = await client.post(`/admin/issues/${issueId}/response`, 
            { response: updateData.officialResponse }, 
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }
        // Karma güncelleme (birden fazla alan)
        else {
          // Önce durum güncelle
          if (updateData.status) {
            await client.put(`/admin/issues/${issueId}/status`, 
              { status: updateData.status }, 
              { headers: { Authorization: `Bearer ${token}` } }
            );
          }
          
          // Sonra çalışan ata
          if (updateData.assignedTo) {
            await client.put(`/admin/issues/${issueId}/assign`, 
              { workerId: updateData.assignedTo }, 
              { headers: { Authorization: `Bearer ${token}` } }
            );
          }
          
          // Son olarak resmi yanıt ekle
          if (updateData.officialResponse) {
            response = await client.post(`/admin/issues/${issueId}/response`, 
              { response: updateData.officialResponse }, 
              { headers: { Authorization: `Bearer ${token}` } }
            );
          } else {
            // Güncel veriyi al
            response = await client.get(`/admin/issues/${issueId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
          }
        }

        console.log('Sorun başarıyla güncellendi');
        
        return {
          success: true,
          data: response.data.data || response.data
        };
      } catch (error) {
        console.error('Sorun güncellenirken hata:', error);
        return handleApiError(error, 'Sorun güncellenemedi');
      }
    }
  },

  // Municipal worker (belediye çalışanı) işlemleri
  municipal: {
    // Belediye çalışanına ait şehirdeki sorunları getir
    getIssuesByCity: async (filters = {}) => {
      try {
        const response = await client.get('/municipal/issues', { params: filters });
        return response.data;
      } catch (error) {
        return handleApiError(error, 'Şehirdeki sorunlar alınamadı');
      }
    },
    
    // Sorun detayı getir
    getIssueById: async (id) => {
      try {
        const response = await client.get(`/municipal/issues/${id}`);
        return response.data;
      } catch (error) {
        return handleApiError(error, 'Sorun detayları alınamadı');
      }
    },
    
    // Belediye çalışanlarını getir
    getWorkers: async () => {
      try {
        const response = await client.get('/municipal/workers');
        return response.data;
      } catch (error) {
        return handleApiError(error, 'Çalışanlar alınamadı');
      }
    },
    
    // Sorunu çalışana ata
    assignIssue: async (issueId, workerId) => {
      try {
        const response = await client.put(`/admin/issues/${issueId}/assign`, { workerId });
        return response.data;
      } catch (error) {
        return handleApiError(error, 'Sorun atama işlemi başarısız');
      }
    },
    
    // Sorun durumunu güncelle
    updateIssueStatus: async (issueId, status) => {
      try {
        const response = await client.put(`/municipal/issues/${issueId}/status`, { status });
        return response.data;
      } catch (error) {
        return handleApiError(error, 'Durum güncellenemedi');
      }
    },
    
    // Resmi yanıt ekle
    addOfficialResponse: async (issueId, responseText) => {
      try {
        const response = await client.post(`/municipal/issues/${issueId}/response`, { 
          response: responseText 
        });
        return response.data;
      } catch (error) {
        return handleApiError(error, 'Resmi yanıt eklenemedi');
      }
    }
  },
  
  // Worker (çalışan) işlemleri
  worker: {
    // Çalışana atanan görevleri getir
    getAssignedIssues: async () => {
      try {
        console.log('Çalışana atanan görevler getiriliyor...');
        const token = await AsyncStorage.getItem('token');
        
        if (!token) {
          console.error('Token bulunamadı');
          return {
            success: false,
            message: 'Oturum açık değil'
          };
        }
        
        const response = await client.get('/worker/issues', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('Görevler başarıyla alındı:', response.status);
        
        return {
          success: true,
          data: response.data.data || response.data
        };
      } catch (error) {
        console.error('Görevler alınırken hata:', error);
        
        // Demo modunda ise demo verileri döndür
        if (isDemoMode) {
          console.log('Demo modunda görevler getiriliyor...');
          return { 
            success: true, 
            data: demoData.issues.filter(issue => issue.status === 'in_progress'),
            isDemoMode: true 
          };
        }
        
        return handleApiError(error, 'Görevler alınırken bir hata oluştu');
      }
    },
    
    // Görev detayını getir
    getIssueById: async (id) => {
      try {
        console.log(`${id} ID'li görev detayı getiriliyor...`);
        const token = await AsyncStorage.getItem('token');
        
        if (!token) {
          console.error('Token bulunamadı');
          return {
            success: false,
            message: 'Oturum açık değil'
          };
        }
        
        const response = await client.get(`/worker/issues/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('Görev detayı başarıyla alındı:', response.status);
        
        // Yanıt içeriğini detaylı logla
        const responseData = response.data.data || response.data;
        console.log('Görev yanıt içeriği:', JSON.stringify({
          ...responseData,
          images: responseData.images ? `[${responseData.images.length} adet resim]` : null,
          progressPhotos: responseData.progressPhotos ? `[${responseData.progressPhotos.length} adet ilerleme fotoğrafı]` : null
        }, null, 2));
        
        // Resim verilerini kontrol et
        if (responseData && responseData.images) {
          console.log(`${responseData.images.length} adet resim bulundu`);
          responseData.images.forEach((img, idx) => {
            const isBase64 = typeof img === 'string' && img.startsWith('data:image');
            console.log(`Resim ${idx}: ${isBase64 ? 'Base64 formatında' : (typeof img === 'string' ? img.substring(0, 30) + '...' : 'String değil')}`);
          });
        } else {
          console.log('Görevde resim bulunamadı veya images alanı yok');
        }
        
        return {
          success: true,
          data: responseData
        };
      } catch (error) {
        console.error(`Görev (${id}) detayı alınırken hata:`, error);
        
        // Demo modunda ise demo verileri döndür
        if (isDemoMode) {
          console.log('Demo modunda görev detayı getiriliyor...');
          const demoIssue = demoData.issues.find(issue => issue._id === id);
          if (demoIssue) {
            return { 
              success: true, 
              data: demoIssue,
              isDemoMode: true 
            };
          }
        }
        
        return handleApiError(error, 'Görev detayı alınırken bir hata oluştu');
      }
    },
    
    // Çalışan istatistiklerini getir
    getWorkerStats: async () => {
      try {
        console.log('Çalışan istatistikleri getiriliyor...');
        const token = await AsyncStorage.getItem('token');
        
        if (!token) {
          console.error('Token bulunamadı');
          return {
            success: false,
            message: 'Oturum açık değil'
          };
        }
        
        const response = await client.get('/worker/stats', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('İstatistikler başarıyla alındı:', response.status);
        
        return {
          success: true,
          data: response.data.data || response.data
        };
      } catch (error) {
        console.error('Çalışan istatistikleri alınırken hata:', error);
        
        // Demo modunda ise demo verileri döndür
        if (isDemoMode) {
          console.log('Demo modunda istatistikler getiriliyor...');
          return { 
            success: true, 
            data: {
              assignedIssues: 5,
              resolvedIssues: 3
            },
            isDemoMode: true 
          };
        }
        
        return handleApiError(error, 'İstatistikler alınırken bir hata oluştu');
      }
    },
    
    // Görev durumunu güncelle
    updateIssueStatus: async (id, status) => {
      try {
        console.log(`${id} ID'li görevin durumu güncelleniyor: ${status}`);
        const token = await AsyncStorage.getItem('token');
        
        if (!token) {
          console.error('Token bulunamadı');
          return {
            success: false,
            message: 'Oturum açık değil'
          };
        }
        
        const response = await client.put(`/worker/issues/${id}/status`, 
          { status }, 
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        console.log('Görev durumu başarıyla güncellendi:', response.status);
        
        return {
          success: true,
          data: response.data.data || response.data
        };
      } catch (error) {
        console.error(`Görev (${id}) durumu güncellenirken hata:`, error);
        return handleApiError(error, 'Görev durumu güncellenirken bir hata oluştu');
      }
    },
    
    // Görev için yorum ekle
    addComment: async (issueId, commentText) => {
      try {
        console.log(`${issueId} ID'li göreve yorum ekleniyor...`);
        const token = await AsyncStorage.getItem('token');
        
        if (!token) {
          console.error('Token bulunamadı');
          return {
            success: false,
            message: 'Oturum açık değil'
          };
        }
        
        const response = await client.post(`/worker/issues/${issueId}/comments`, 
          { content: commentText }, 
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        console.log('Yorum başarıyla eklendi:', response.status);
        
        return {
          success: true,
          data: response.data.data || response.data
        };
      } catch (error) {
        console.error(`Göreve (${issueId}) yorum eklenirken hata:`, error);
        return handleApiError(error, 'Yorum eklenirken bir hata oluştu');
      }
    },
    
    // İlerleme fotoğrafı ekle - Web uygulamasındaki gibi basitleştirilmiş
    addProgressPhoto: async (issueId, photoUri, description = '') => {
      try {
        console.log(`${issueId} ID'li göreve ilerleme fotoğrafı ekleniyor...`);
        const token = await AsyncStorage.getItem('token');
        
        if (!token) {
          console.error('Token bulunamadı');
          return {
            success: false,
            message: 'Oturum açık değil'
          };
        }
        
        // FormData kullanarak fotoğrafı yükle
        try {
          console.log('FormData ile fotoğraf yükleniyor...');
          
          // Fotoğraf URI'sini kontrol et
          if (!photoUri) {
            console.error('Fotoğraf URI boş');
            return {
              success: false,
              message: 'Geçersiz fotoğraf'
            };
          }
          
          // FormData oluştur
          const formData = new FormData();
          
          // Dosya adı ve türünü belirle
          const fileType = photoUri.split('.').pop() || 'jpeg';
          const fileName = `photo_${Date.now()}.${fileType}`;
          
          // Fotoğrafı ekle
          formData.append('photos', {
            uri: photoUri,
            type: `image/${fileType}`,
            name: fileName
          });
          
          // Açıklama varsa ekle
          if (description) {
            formData.append('description', description);
          }
          
          console.log('FormData oluşturuldu, API isteği gönderiliyor...');
          console.log('Endpoint:', `/worker/issues/${issueId}/photos`);
          
          // API isteği gönder - doğru endpoint: /photos (çoğul)
          const response = await client.post(`/worker/issues/${issueId}/photos`, 
            formData, 
            { 
              headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'multipart/form-data'
              },
              timeout: 60000 // 60 saniye timeout
            }
          );
          
          console.log('İlerleme fotoğrafı başarıyla eklendi:', response.status);
          
          return {
            success: true,
            data: response.data.data || response.data
          };
        } catch (uploadError) {
          console.error('FormData ile yükleme hatası:', uploadError);
          throw uploadError; // Üst catch bloğunda yakalanacak
        }
      } catch (error) {
        console.error(`Göreve (${issueId}) ilerleme fotoğrafı eklenirken hata:`, error);
        
        // Özel hata mesajı
        if (error.response) {
          console.error('Sunucu yanıtı:', error.response.status, error.response.data);
          return {
            success: false,
            message: `Sunucu hatası: ${error.response.status}`,
            error: error.response.data
          };
        }
        
        return handleApiError(error, 'İlerleme fotoğrafı eklenirken bir hata oluştu');
      }
    },
    
    // Birden fazla ilerleme fotoğrafı ekle - Web uygulamasındaki gibi basitleştirilmiş
    addProgressPhotos: async (issueId, photoUris, description = '') => {
      try {
        console.log(`${issueId} ID'li göreve ${photoUris.length} adet ilerleme fotoğrafı ekleniyor...`);
        
        // Her fotoğrafı tek tek yükle
        const results = [];
        let successCount = 0;
        
        for (const photoUri of photoUris) {
          console.log(`Fotoğraf yükleniyor: ${photoUri.substring(0, 30)}...`);
          const result = await api.worker.addProgressPhoto(issueId, photoUri, description);
          
          if (result.success) {
            console.log('Fotoğraf başarıyla yüklendi');
            successCount++;
            results.push(result);
          } else {
            console.error('Fotoğraf yüklenemedi:', result.message);
          }
        }
        
        console.log(`${successCount}/${photoUris.length} fotoğraf başarıyla yüklendi`);
        
        return {
          success: successCount > 0,
          message: `${successCount}/${photoUris.length} fotoğraf başarıyla yüklendi`,
          data: results
        };
      } catch (error) {
        console.error(`Göreve (${issueId}) ilerleme fotoğrafları eklenirken hata:`, error);
        return handleApiError(error, 'İlerleme fotoğrafları eklenirken bir hata oluştu');
      }
    }
  },
  
  // Yorumlar
  comments: {
    // ... existing code ...
  },

  // AI işlemleri
  ai: {
    // Chatbot ile sohbet
    chat: async (message, conversationHistory = []) => {
      try {
        console.log('AI Chat isteği gönderiliyor:', message.substring(0, 50) + '...');
        
        const response = await client.post('/ai/chat', {
          message,
          conversationHistory
        });
        
        console.log('AI Chat yanıtı alındı');
        return {
          success: true,
          data: response.data.data
        };
      } catch (error) {
        console.error('AI Chat hatası:', error);
        return handleApiError(error, 'Chatbot ile iletişim kurulamadı');
      }
    },

    // Kategori önerisi
    suggestCategory: async (description) => {
      try {
        console.log('Kategori önerisi isteniyor...');
        const token = await AsyncStorage.getItem('token');
        
        const response = await client.post('/ai/suggest-category', 
          { description },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        
        console.log('Kategori önerisi alındı:', response.data.data.suggestedCategory);
        return {
          success: true,
          data: response.data.data
        };
      } catch (error) {
        console.error('Kategori önerisi hatası:', error);
        return handleApiError(error, 'Kategori önerisi alınamadı');
      }
    },

    // Öncelik önerisi
    suggestPriority: async (description, category) => {
      try {
        console.log('Öncelik önerisi isteniyor...');
        const token = await AsyncStorage.getItem('token');
        
        const response = await client.post('/ai/suggest-priority', 
          { description, category },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        
        console.log('Öncelik önerisi alındı:', response.data.data.suggestedPriority);
        return {
          success: true,
          data: response.data.data
        };
      } catch (error) {
        console.error('Öncelik önerisi hatası:', error);
        return handleApiError(error, 'Öncelik önerisi alınamadı');
      }
    },

    // AI sistem durumu
    getStatus: async () => {
      try {
        console.log('AI sistem durumu kontrol ediliyor...');
        
        const response = await client.get('/ai/status');
        
        console.log('AI sistem durumu alındı:', response.data.data.chatbotStatus);
        return {
          success: true,
          data: response.data.data
        };
      } catch (error) {
        console.error('AI sistem durumu hatası:', error);
        return handleApiError(error, 'AI sistem durumu alınamadı');
      }
    }
  }
};

// Yardımcı fonksiyonlar
const handleApiError = (error, defaultMessage) => {
  console.error('API Error:', error);
  
  if (error.response && error.response.data) {
    return {
      success: false,
      message: error.response.data.message || defaultMessage,
      error: error.response.data
    };
  } else if (error.isDemoMode) {
    return {
      success: false,
      message: 'Demo modunda bazı özellikler kısıtlıdır',
      isDemoMode: true
    };
  } else {
    return {
      success: false,
      message: error.message || defaultMessage
    };
  }
};

// URI'yi Base64'e dönüştürme fonksiyonu
const uriToBase64 = async (uri) => {
  try {
    // Local file URI ise
    if (uri.startsWith('file://')) {
      // Fetch API ile dosyayı oku
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Dosya boyutunu kontrol et (1MB üzeri ise uyarı ver)
      if (blob.size > 1024 * 1024) {
        console.warn(`Büyük görsel tespit edildi: ${Math.round(blob.size / 1024)} KB. Performans için görsel sıkıştırma önerilir.`);
      }
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve(reader.result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } 
    // Zaten base64 ise
    else if (uri.startsWith('data:image')) {
      // Base64 veri uzunluğu kontrolü
      if (uri.length > 200000) { // Yaklaşık 150KB
        console.warn(`Büyük base64 görsel tespit edildi: ~${Math.round(uri.length / 1365)} KB. Performans için görsel sıkıştırma önerilir.`);
      }
      return uri;
    } 
    // Diğer URI türleri için (http, https)
    else {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Dosya boyutunu kontrol et
      if (blob.size > 1024 * 1024) {
        console.warn(`Büyük görsel tespit edildi: ${Math.round(blob.size / 1024)} KB. Performans için görsel sıkıştırma önerilir.`);
      }
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve(reader.result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
  } catch (error) {
    console.error('URI to Base64 conversion error:', error);
    throw new Error('Fotoğraf dönüştürülemedi: ' + error.message);
  }
};

export default api; 

// Durum bilgisini dışarıya aç
export { apiStatus, tryAllApiUrls, enableDemoMode, isDemoMode, getBaseUrl, testApiConnection }; 