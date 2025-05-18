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
  timeout: 30000, // 30 saniye timeout (2 dakika -> 30 saniye olarak azaltıldı)
  headers: {
    'Content-Type': 'application/json',
  },
  // Retry mekanizması için yapılandırma
  retry: 2, // Daha az yeniden deneme (5 -> 2)
  retryDelay: 1500, // Daha kısa bekleme süresi (3 sn -> 1.5 sn)
  withCredentials: true,
});

// Debug modu - geliştirme aşamasında true, production'da false olmalı
const DEBUG_MODE = false;

// İstek gönderilmeden önce çalışacak interceptor
client.interceptors.request.use(
  async (config) => {
    if (DEBUG_MODE) {
    console.log(`API İsteği: ${config.method.toUpperCase()} ${config.url}`);
    
    // İstek verilerini logla
    if (config.data) {
      console.log('İstek verisi:', config.data);
      }
    }
    
    // /issues endpoint'i için özel loglama
    if (config.url?.includes('/issues')) {
      console.log(`------- ISSUES API İSTEĞİ -------`);
      console.log(`URL: ${config.url}`);
      console.log(`Metod: ${config.method.toUpperCase()}`);
      console.log(`Parametreler:`, config.params || 'Yok');
      console.log(`Headers:`, config.headers);
      console.log(`-----------------------------------`);
    }
    
    // Kullanıcı token'ı varsa, header'a ekle
    const userToken = await AsyncStorage.getItem('token');
    
    // Debug için token durumunu logla
    console.log('Token durumu:', userToken ? `Token mevcut (${userToken.substring(0, 10)}...)` : 'Token bulunamadı');
    
    if (userToken) {
      config.headers.Authorization = `Bearer ${userToken}`;
      console.log('Authorization header eklendi');
    } else {
      console.warn('Token bulunamadı, kullanıcı oturumu açık değil');
    }
    
    return config;
  },
  (error) => {
    if (DEBUG_MODE) console.error('İstek gönderilirken hata oluştu:', error);
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
    getAll: async (params = {}) => {
      try {
        // API bağlantısını kontrol et
        await checkAndPingApi();
        
        // Demo modunda ise demo verileri döndür
        if (isDemoMode) {
          console.log('Demo modunda sorunlar getiriliyor...');
          return { success: true, data: { data: demoData.issues }, isDemoMode: true };
        }
        
        const token = await AsyncStorage.getItem('token');
        
        // Kullanıcının şehri ile ilgili verileri al
        let user = null;
        try {
          const userJson = await AsyncStorage.getItem('user');
          if (userJson) {
            user = JSON.parse(userJson);
            console.log('Kullanıcı rolü:', user?.role);
            console.log('Kullanıcı şehri:', user?.city || 'Belirtilmemiş');
          }
        } catch (userError) {
          console.error('Kullanıcı bilgisi alınamadı:', userError);
        }
        
        // API isteği - eğer params içinde city parametresi varsa, onu kullan, yoksa ve userCity varsa userCity'yi kullan
        const requestParams = { ...params };
        
        // Belediye çalışanları için şehir filtresi zorunlu
        if (user?.role === 'municipal_worker' && user?.city) {
          requestParams.city = user.city;
          console.log('Belediye çalışanı için şehir filtresi eklendi:', user.city);
        }
        // Normal kullanıcı için opsiyonel şehir filtresi
        else if (!requestParams.city && user?.city && !requestParams.showAllCities) {
          requestParams.city = user.city;
          console.log('Kullanıcı şehrine göre filtreleniyor:', user.city);
        }
        
        // showAllCities parametresi API'ye gönderilmemeli
        if (requestParams.showAllCities) {
          delete requestParams.showAllCities;
        }
        
        console.log('Sorunlar için kullanılan parametreler:', requestParams);
        
        const response = await client.get('/issues', {
          headers: { Authorization: `Bearer ${token}` },
          params: requestParams
        });
        
        let issuesData = response.data.data || [];
        console.log(`API yanıtı: ${issuesData.length} sorun bulundu`);
        
        // Belediye çalışanı için client tarafında ikinci güvenlik kontrolü
        if (user?.role === 'municipal_worker' && user?.city) {
          console.log('Belediye çalışanı için client tarafında ikinci güvenlik kontrolü yapılıyor...');
          const beforeFilterCount = issuesData.length;
          
          issuesData = issuesData.filter(issue => {
            if (!issue.location || !issue.location.city) {
              console.log(`Sorun ID: ${issue._id} - şehir bilgisi eksik, filtreleniyor`);
              return false;
            }
            
            const matchesCity = issue.location.city.toLowerCase() === user.city.toLowerCase();
            if (!matchesCity) {
              console.log(`Sorun ID: ${issue._id} - şehir eşleşmiyor: ${issue.location.city}, filtreleniyor`);
            }
            return matchesCity;
        });
        
          console.log(`Şehir filtresi uygulandı: ${beforeFilterCount} sorundan ${issuesData.length} sorun kaldı`);
          
          if (beforeFilterCount !== issuesData.length) {
            console.warn(`DİKKAT: API'den gelen bazı sorunlar şehir filtresi tarafından kaldırıldı! Backend filtresinin doğru çalışmadığını gösterebilir.`);
          }
        }
        
        // Şehirlere göre dağılımı kontrol et
        const cityCounts = {};
        issuesData.forEach(issue => {
          const city = issue.location?.city || 'Belirtilmemiş';
          cityCounts[city] = (cityCounts[city] || 0) + 1;
        });
        
        console.log('Şehirlere göre sorun dağılımı:');
        Object.entries(cityCounts).forEach(([city, count]) => {
          console.log(`  - ${city}: ${count} sorun`);
        });
        
        return { success: true, data: { data: issuesData } };
      } catch (error) {
        console.error('Error fetching issues:', error);
        
        // Hata durumunda ve demo modu aktifse demo verileri döndür
        if (isDemoMode) {
          console.log('Demo modunda sorunlar getiriliyor (hata sonrası)...');
          return { success: true, data: { data: demoData.issues }, isDemoMode: true };
        }
        
        // Normal hata durumu
        return { 
          success: false, 
          message: error.response?.data?.message || 'Sorunlar alınamadı' 
        };
      }
    },
    
    getById: async (id) => {
      try {
        // Demo modunda ise ilgili demo verisini döndür
        if (isDemoMode) {
          console.log(`Demo modunda ${id} ID'li sorun detayları getiriliyor...`);
          
          // Demo verileri içinden ilgili ID'yi bul
          const demoIssue = demoData.issues.find(issue => issue._id === id);
          
          // Eğer varsa döndür, yoksa ilk veriyi döndür (boş olmaması için)
          if (demoIssue) {
            return { success: true, data: demoIssue, isDemoMode: true };
          } else {
            return { success: true, data: demoData.issues[0], isDemoMode: true };
          }
        }
        
        const token = await AsyncStorage.getItem('token');
        console.log(`${id} ID'li sorun detayları getiriliyor...`);
        
        // API çağrısı
        const response = await client.get(`/issues/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Yanıtı işle
        console.log('API yanıtı alındı:', response.status);
        
        if (response.data) {
          // Veri formatını kontrol et ve düzenle
          let issueData = response.data;
          
          // Eğer data içinde veri varsa onu kullan
          if (response.data.data) {
            issueData = response.data.data;
          }
          
          console.log('Sorun detayı:', JSON.stringify(issueData).substring(0, 200) + '...');
          
          // Cevap döndür
          return { success: true, data: issueData };
        } else {
          console.error('API yanıtında veri yok');
          return { 
            success: false, 
            message: 'Sorun detayları alınamadı: API veri dönmedi' 
          };
        }
      } catch (error) {
        console.error(`Error fetching issue ${id}:`, error);
        console.error('Hata detayları:', error.response?.data || error.message);
        
        // Hata durumunda ve demo modu aktifse demo verileri döndür
        if (isDemoMode) {
          console.log('Demo modunda sorun detayları getiriliyor (hata sonrası)...');
          return { 
            success: true, 
            data: demoData.issues.find(issue => issue._id === id) || demoData.issues[0],
            isDemoMode: true
          };
        }
        
        return { 
          success: false, 
          message: error.response?.data?.message || 'Sorun detayları alınamadı' 
        };
      }
    },
    
    // getIssueById fonksiyonu - getById için alias olarak ekleyelim
    getIssueById: function(id) {
      console.log('getIssueById çağrıldı, getById fonksiyonuna yönlendiriliyor...');
      return this.getById(id);
    },
    
    create: async (issueData) => {
      try {
        console.log('Creating issue with data:', JSON.stringify(issueData, null, 2));
        
        // JSON'ı basitleştirerek konsola yazdıralım (debugging için)
        console.log('Issue data details:');
        console.log('- title:', issueData.title);
        console.log('- description:', issueData.description ? issueData.description.substring(0, 20) + '...' : 'empty');
        console.log('- category:', issueData.category);
        console.log('- severity:', issueData.severity);
        console.log('- location.coordinates:', issueData.location?.coordinates);
        console.log('- location.city:', issueData.location?.city);
        console.log('- location.district:', issueData.location?.district);
        console.log('- location.type:', issueData.location?.type);
        console.log('- has images:', issueData.images && issueData.images.length > 0);
        
        // DENEME 1: Doğrudan axios ile
        try {
          console.log('DENEME 1: Doğrudan axios ile POST yapılıyor...');
          
          // Token al
          const token = await AsyncStorage.getItem('token');
          console.log('Token alındı, uzunluk:', token ? token.length : 0);
          
          // API URL'i oluştur
          const apiUrl = `${BASE_URL}/issues`;
          console.log('API URL:', apiUrl);
          
          // POST isteği yap
          const response = await axios.post(apiUrl, issueData, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': token ? `Bearer ${token}` : ''
            },
            timeout: 10000 // 10 saniye timeout
          });
          
          console.log('Issue created successfully, response:', response.status, response.data);
          return { success: true, data: response.data };
        } catch (axiosError) {
          console.error('DENEME 1 HATA:', axiosError.message);
          if (axiosError.response) {
            console.error('Yanıt detayları:', axiosError.response.status, JSON.stringify(axiosError.response.data));
        }
        
          // Hata durumunda client.post ile de deneyelim
          console.log('DENEME 2: Standart client ile deneniyor...');
          try {
            const clientResponse = await client.post('/issues', issueData);
            console.log('Issue created successfully with client, response:', clientResponse.status, clientResponse.data);
            return { success: true, data: clientResponse.data };
          } catch (clientError) {
            console.error('DENEME 2 HATA:', clientError.message);
            if (clientError.response) {
              console.error('Client yanıt detayları:', clientError.response.status, JSON.stringify(clientError.response.data));
            }
            
            // İki deneme de başarısız oldu, hata döndür
            throw clientError || axiosError;
          }
        }
      } catch (error) {
        console.error('Error creating issue:', error);
          
        // Detaylı hata bilgisi
        if (error.response) {
          console.error('HTTP status:', error.response.status);
          console.error('Response data:', error.response.data);
          
          // 401/403 hataları için özel mesaj
          if (error.response.status === 401 || error.response.status === 403) {
            return { 
              success: false, 
              message: 'Yetkilendirme hatası: Lütfen tekrar giriş yapın', 
              error: error.response.data,
              authError: true
            };
          }
          
          // 400 hatası için özel mesaj
          if (error.response.status === 400) {
            return { 
              success: false, 
              message: 'Gönderilen verilerde hata: ' + (error.response.data.message || 'Geçersiz veri'), 
              error: error.response.data,
              dataError: true
            };
          }
        }
        
        return handleApiError(error, 'Sorun oluşturulurken bir hata oluştu');
      }
    },
    update: (id, issueData) => client.put(`/issues/${id}`, issueData),
    delete: (id) => client.delete(`/issues/${id}`),
    getMyIssues: async () => {
      try {
        // Demo modunda ise demo verileri döndür
        if (isDemoMode) {
          console.log('Demo modunda kişisel sorunlar getiriliyor...');
          return { 
            success: true, 
            data: demoData.issues.filter(issue => issue.createdBy === "demo-user"),
            isDemoMode: true 
          };
        }
        
        const token = await AsyncStorage.getItem('token');
        const response = await client.get('/issues/myissues', {
          headers: { Authorization: `Bearer ${token}` }
        });
        return { success: true, data: response.data.data || response.data };
      } catch (error) {
        console.error('Error fetching my issues:', error);
        
        // Hata durumunda ve demo modu aktifse demo verileri döndür
        if (isDemoMode) {
          console.log('Demo modunda kişisel sorunlar getiriliyor (hata sonrası)...');
          return { 
            success: true, 
            data: demoData.issues.filter(issue => issue.createdBy === "demo-user"),
            isDemoMode: true 
          };
        }
        
        return { 
          success: false, 
          message: error.response?.data?.message || 'Sorunlarınız alınamadı' 
        };
      }
    },
    addComment: async (issueId, commentText) => {
      try {
        // API hazırlığı
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          return { success: false, message: 'Token bulunamadı. Lütfen tekrar giriş yapın.' };
        }
        
        const response = await axios.post(
          `${BASE_URL}/issues/${issueId}/comments`,
          { content: commentText },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          }
        );
        
        if (response.data && response.data.success) {
          return {
            success: true,
            data: response.data.data,
            issue: response.data.issue
          };
        } else {
          return {
            success: false,
            message: response.data?.message || 'Yorum eklenirken bir hata oluştu'
          };
        }
      } catch (error) {
        return handleApiError(error, 'Yorum eklenirken bir hata oluştu');
      }
    },
    addReply: async (issueId, commentId, replyText) => {
      try {
        // API hazırlığı
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          return { success: false, message: 'Token bulunamadı. Lütfen tekrar giriş yapın.' };
        }
        
        const response = await axios.post(
          `${BASE_URL}/issues/${issueId}/comments/${commentId}/replies`,
          { content: replyText },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          }
        );
        
        if (response.data && response.data.success) {
          return {
            success: true,
            data: response.data.data
          };
        } else {
          return {
            success: false,
            message: response.data?.message || 'Yanıt eklenirken bir hata oluştu'
          };
        }
      } catch (error) {
        return handleApiError(error, 'Yanıt eklenirken bir hata oluştu');
      }
    },
    likeComment: async (issueId, commentId, isReply = false) => {
      try {
        // API hazırlığı
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          return { success: false, message: 'Token bulunamadı. Lütfen tekrar giriş yapın.' };
        }
        
        // Endpoint belirleme
        const endpoint = isReply 
          ? `${BASE_URL}/issues/${issueId}/comments/replies/${commentId}/like`
          : `${BASE_URL}/issues/${issueId}/comments/${commentId}/like`;
        
        const response = await axios.put(
          endpoint,
          {},
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          }
        );
        
        if (response.data && response.data.success) {
          return {
            success: true,
            data: response.data.data
          };
        } else {
          return {
            success: false,
            message: response.data?.message || 'Beğeni işleminde bir hata oluştu'
          };
        }
      } catch (error) {
        return handleApiError(error, 'Beğeni işleminde bir hata oluştu');
      }
    },
    uploadImage: (issueId, formData) => client.post(`/issues/${issueId}/images`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
    updateStatus: async (issueId, newStatus) => {
      try {
        const token = await AsyncStorage.getItem('token');
        const response = await client.patch(
          `/issues/${issueId}/status`, 
          { status: newStatus },
          { headers: { Authorization: `Bearer ${token}` }}
        );
        return { success: true, data: response.data };
      } catch (error) {
        console.error(`Error updating status for issue ${issueId}:`, error);
        return { 
          success: false, 
          message: error.response?.data?.message || 'Sorun durumu güncellenemedi' 
        };
      }
    }
  },
  
  // Eski reports API'sini issues'a bağlayarak geriye dönük uyumluluk sağlayalım
  reports: {
    getAll: (params) => api.issues.getAll(params),
    getById: (id) => api.issues.getById(id),
    create: (reportData) => api.issues.create(reportData),
    update: (id, reportData) => api.issues.update(id, reportData),
    delete: (id) => api.issues.delete(id),
    addComment: (reportId, comment) => api.issues.addComment(reportId, comment),
    uploadImage: (reportId, formData) => api.issues.uploadImage(reportId, formData),
  },
  
  // Kategori işlemleri
  categories: {
    getAll: () => client.get('/categories'),
  },
  
  // İstatistik işlemleri
  statistics: {
    getReportStats: () => client.get('/statistics/reports'),
    getUserStats: () => client.get('/statistics/users'),
  },

  // Yetkili kullanıcılar için API fonksiyonları
  admin: {
    // Tüm sorunları yönetici için getir
    getAdminIssues: async (params = {}) => {
      try {
        await checkAndPingApi();
        
        // Kullanıcı bilgilerini hata ayıklama için detaylı logla
        console.log("--- KULLANICI BİLGİLERİ KONTROL EDİLİYOR ---");
        
        const token = await AsyncStorage.getItem('token');
        console.log("Token var mı:", token ? "Evet" : "Hayır");
        
        const userJson = await AsyncStorage.getItem('user');
        console.log("AsyncStorage'dan alınan user verisi:", userJson);
        
        if (!userJson) {
          console.error('Kullanıcı bilgisi bulunamadı. Oturum açık değil.');
          return {
            success: false,
            message: 'Oturum açık değil'
          };
        }
        
        let user;
        try {
          user = JSON.parse(userJson);
          console.log("JSON.parse sonrası user objesi:", JSON.stringify(user, null, 2));
        } catch (parseError) {
          console.error("User verisi JSON olarak parse edilemedi:", parseError);
          return {
            success: false,
            message: 'Kullanıcı bilgileri hatalı'
          };
        }
        
        console.log('Kullanıcı ID:', user?._id);
        console.log('Kullanıcı rolü:', user?.role);
        console.log('Kullanıcı adı:', user?.name);
        console.log('Kullanıcı emaili:', user?.email);
        console.log('Kullanıcı şehri:', user?.city);
        console.log('Kullanıcı ilçesi:', user?.district);
        
        // Belediye çalışanı için şehir filtresi kontrolü
        const isMunicipalWorker = user?.role === 'municipal_worker';
        console.log("Belediye çalışanı mı?", isMunicipalWorker ? "Evet" : "Hayır");
        
        if (isMunicipalWorker) {
          // JSON parse edince string olarak "undefined" veya boş string olabilir
          const hasCity = user?.city && user.city !== "undefined" && user.city !== "";
          console.log("Şehir bilgisi var mı?", hasCity ? `Evet (${user.city})` : "Hayır");
          
          if (!hasCity) {
            console.error("Belediye çalışanı için şehir bilgisi eksik veya geçersiz");
            
            // Şehir olmasa bile devam edelim ama uyarı gösterelim
            console.warn("UYARI: Şehir bilgisi olmadan tüm sorunlar görüntülenecek!");
          } else {
            // Şehir filtresini API parametrelerine ekle
            params.city = user.city;
            console.log(`Belediye çalışanı için şehir filtresi eklendi: ${user.city}`);
          }
        }
        
        console.log("API istekleri için kullanılacak parametreler:", params);
        console.log("--- KULLANICI BİLGİ KONTROLÜ TAMAMLANDI ---");
        
        const response = await client.get('/issues', {
          headers: { Authorization: `Bearer ${token}` },
          params
        });
        
        let issuesData = response.data.data || [];
        console.log(`API'den ${issuesData.length} sorun alındı`);
        
        // Client tarafında ikinci bir güvenlik kontrolü - belediye çalışanları için şehir filtresi
        if (isMunicipalWorker && user?.city && user.city !== "undefined" && user.city !== "") {
          const beforeFilterCount = issuesData.length;
          issuesData = issuesData.filter(issue => {
            // Sorunun location ve city bilgisi olmayabilir
            if (!issue.location || !issue.location.city) {
              console.log(`Sorun ID: ${issue._id} - şehir bilgisi eksik, filtreleniyor`);
              return false;
            }
            
            const matchesCity = issue.location.city.toLowerCase() === user.city.toLowerCase();
            if (!matchesCity) {
              console.log(`Sorun ID: ${issue._id} - şehir eşleşmiyor: ${issue.location.city}, filtreleniyor`);
            }
            return matchesCity;
          });
          
          console.log(`Şehir filtresi uygulandı: ${beforeFilterCount} sorundan ${issuesData.length} sorun kaldı`);
          
          if (beforeFilterCount !== issuesData.length) {
            console.warn(`DİKKAT: API'den gelen bazı sorunlar şehir filtresi tarafından kaldırıldı! Bu backend filtresinin doğru çalışmadığını gösterebilir.`);
          }
        }
        
        return {
          success: true,
          data: { issues: issuesData }
        };
      } catch (error) {
        console.error('Sorunlar getirilirken hata:', error);
        return handleApiError(error, 'Yönetici sorunları alınırken bir hata oluştu');
      }
    },
    
    // Sorunu güncelle
    updateIssue: async (issueId, updateData) => {
      try {
        console.log('Sorun güncelleme isteği gönderiliyor:', issueId, updateData);
        const token = await AsyncStorage.getItem('token');
        
        // Status değerini normalize et (Türkçe -> İngilizce)
        let normalizedStatus = updateData.status;
        
        // Eğer Türkçe durum metni geldiyse İngilizce karşılığına çevir
        switch (updateData.status) {
          case 'Yeni':
            normalizedStatus = 'pending';
            break;
          case 'İnceleniyor':
            normalizedStatus = 'in_progress';
            break;
          case 'Çözüldü':
            normalizedStatus = 'resolved';
            break;
          case 'Reddedildi':
            normalizedStatus = 'rejected';
            break;
          default:
            // Zaten İngilizce format ise değiştirme
            break;
        }
        
        console.log('Normalize edilmiş durum:', normalizedStatus);
        
        // API'nin endpoint'ini doğru şekilde kontrol et
        const response = await client.put(`/admin/issues/${issueId}/status`, 
          { status: normalizedStatus },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        console.log('Durum güncelleme yanıtı:', response.status);
        
        // Resmi yanıt varsa ayrıca gönder
        if (updateData.officialResponse && updateData.officialResponse.trim() !== '') {
          console.log('Resmi yanıt gönderiliyor');
          await client.post(`/admin/issues/${issueId}/response`, 
            { response: updateData.officialResponse }, 
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }
        
        // Atanacak çalışan varsa ayrıca gönder
        if (updateData.assignedTo && updateData.assignedTo !== '') {
          console.log('Çalışan atama isteği gönderiliyor');
          await client.put(`/admin/issues/${issueId}/assign`, 
            { workerId: updateData.assignedTo }, 
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }
        
        return {
          success: true,
          message: 'Sorun başarıyla güncellendi'
        };
      } catch (error) {
        console.error('Sorun güncelleme hatası:', error);
        
        // Daha detaylı hata bilgisi
        if (error.response) {
          console.error('API Hata Kodu:', error.response.status);
          console.error('API Hata Detayı:', error.response.data);
        }
        
        return handleApiError(error, 'Sorun güncellenirken bir hata oluştu');
      }
    },
    
    // Sorunu belediye çalışanına ata
    assignIssue: async (issueId, workerId) => {
      try {
        console.log(`Sorun ${issueId} çalışana atanıyor (Çalışan ID: ${workerId})`);
        const token = await AsyncStorage.getItem('token');
        
        if (!workerId) {
          console.error('Çalışan ID eksik!');
          return {
            success: false,
            message: 'Lütfen bir çalışan seçin'
          };
        }
        
        const response = await client.put(`/admin/issues/${issueId}/assign`, 
          { workerId }, 
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        console.log('Atama yanıtı:', response.status);
        console.log('Atama başarılı');
        
        return {
          success: true,
          message: 'Sorun çalışana başarıyla atandı',
          data: response.data.data
        };
      } catch (error) {
        console.error('Sorun atama hatası:', error);
        
        // Daha detaylı hata bilgisi
        if (error.response) {
          console.error('API Hata Kodu:', error.response.status);
          console.error('API Hata Detayı:', error.response.data);
        }
        
        return handleApiError(error, 'Sorun atanırken bir hata oluştu');
      }
    },
    
    // Resmi yanıt ekle
    addOfficialResponse: async (issueId, responseText) => {
      try {
        const token = await AsyncStorage.getItem('token');
        
        const response = await client.post(`/admin/issues/${issueId}/response`, 
          { response: responseText }, 
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        return {
          success: true,
          data: response.data.data
        };
      } catch (error) {
        return handleApiError(error, 'Resmi yanıt eklenirken bir hata oluştu');
      }
    },
    
    // Belediye çalışanlarını getir
    getWorkers: async () => {
      try {
        console.log('Belediye çalışanları getiriliyor...');
        const token = await AsyncStorage.getItem('token');
        
        if (!token) {
          console.error('Token bulunamadı');
          return {
            success: false,
            message: 'Oturum açık değil'
          };
        }
        
        const response = await client.get('/admin/workers', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('Çalışanlar başarıyla alındı:', response.status);
        
        // Farklı API yanıt formatlarını değerlendir
        let workersData = [];
        
        if (response.data) {
          // 1. Durum: response.data.data şeklinde (standart)
          if (response.data.data && Array.isArray(response.data.data)) {
            workersData = response.data.data;
            console.log(`${workersData.length} çalışan bulundu (data.data içinde)`);
          } 
          // 2. Durum: response.data.workers şeklinde
          else if (response.data.workers && Array.isArray(response.data.workers)) {
            workersData = response.data.workers;
            console.log(`${workersData.length} çalışan bulundu (data.workers içinde)`);
          }
          // 3. Durum: response.data doğrudan bir dizi
          else if (Array.isArray(response.data)) {
            workersData = response.data;
            console.log(`${workersData.length} çalışan bulundu (doğrudan dizi olarak)`);
          }
          // 4. Durum: Hiçbir format uygun değil, boş dizi kullan
          else {
            console.warn('Beklenmeyen yanıt formatı, çalışan listesi bulunamadı:', response.data);
          }
        } else {
          console.warn('API yanıtında veri bulunamadı');
        }
        
        // Çalışan verilerini doğrula
        if (workersData.length > 0) {
          // En azından ilk çalışanın ID ve isim bilgisini kontrol et
          const sampleWorker = workersData[0];
          if (!sampleWorker._id || !sampleWorker.name) {
            console.warn('Çalışan verilerinde eksik bilgiler olabilir:', sampleWorker);
          } else {
            console.log('Örnek çalışan verisi:', sampleWorker._id, sampleWorker.name);
          }
        }
        
        return {
          success: true,
          workers: workersData
        };
      } catch (error) {
        console.error('Çalışanları getirme hatası:', error);
        
        // Daha detaylı hata bilgisi
        if (error.response) {
          console.error('API Hata Kodu:', error.response.status);
          console.error('API Hata Detayı:', error.response.data);
        }
        
        return handleApiError(error, 'Belediye çalışanları alınırken bir hata oluştu');
      }
    },
    
    // İstatistikleri getir
    getStats: async (timeRange = 'last30days') => {
      try {
        const token = await AsyncStorage.getItem('token');
        const user = JSON.parse(await AsyncStorage.getItem('user'));
        
        console.log('İstatistik raporu isteniyor, zaman aralığı:', timeRange);
        
        const params = { timeRange };
        
        // Municipal worker için şehir filtresi ekle
        if (user?.role === 'municipal_worker' && user?.city) {
          params.city = user.city;
          console.log('Belediye çalışanı için şehir filtresi eklendi:', user.city);
        }
        
        // Doğru endpoint'i kullan - /admin/stats yerine /admin/reports
        const response = await client.get('/admin/reports', {
          headers: { Authorization: `Bearer ${token}` },
          params: params
        });
        
        console.log('İstatistik yanıtı alındı:', response.status);
        
        // Yanıtı doğru formata dönüştürme
        const responseData = response.data?.data || {};
        
        // İlçe verileri için ekstra kontrol yapalım
        const districtData = (responseData.byDistrict || []).map(item => {
          // İlçe adını ve şehir bilgisini kontrol et
          // Bazı backend yanıtlarında '_id' altında olabilir, bazılarında doğrudan 'district' olabilir
          const district = item.district || item._id || 'Bilinmeyen İlçe';
          
          // Şehir bilgisi de benzer şekilde farklı formatlarda gelebilir
          const city = item.city || (item.location ? item.location.city : null) || user?.city || 'Bilinmeyen Şehir';
          
          return {
            district: district,
            city: city,
            count: item.count
          };
        });
        
        // Kategori ve durum verilerini düzenleme
        const formattedData = {
          byStatus: (responseData.byStatus || []).map(item => ({
            status: item._id,
            count: item.count
          })),
          byCategory: (responseData.byCategory || []).map(item => ({
            category: item._id,
            count: item.count
          })),
          byCity: (responseData.byCity || []).map(item => ({
            city: item._id,
            count: item.count
          })),
          byDistrict: districtData,
          byMonth: (responseData.byMonth || []).map(item => ({
            month: new Date(item._id).getMonth() + 1,
            year: new Date(item._id).getFullYear(),
            count: item.count
          })),
          total: responseData.total || 0
        };
        
        return {
          success: true,
          data: formattedData
        };
      } catch (error) {
        console.error('İstatistikler alınırken hata:', error);
        
        // Daha detaylı hata bilgisi
        if (error.response) {
          console.error('API Hata Kodu:', error.response.status);
          console.error('API Hata Detayı:', error.response.data);
        }
        
        return handleApiError(error, 'İstatistikler alınırken bir hata oluştu');
      }
    },
    
    // Kullanıcı yönetimi
    getUsers: async (params = {}) => {
      try {
        const token = await AsyncStorage.getItem('token');
        
        const response = await client.get('/admin/users', {
          headers: { Authorization: `Bearer ${token}` },
          params
        });
        
        return {
          success: true,
          data: response.data.data
        };
      } catch (error) {
        return handleApiError(error, 'Kullanıcılar alınırken bir hata oluştu');
      }
    },
    
    updateUser: async (userId, userData) => {
      try {
        const token = await AsyncStorage.getItem('token');
        
        const response = await client.put(`/admin/users/${userId}`, userData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        return {
          success: true,
          data: response.data.data
        };
      } catch (error) {
        return handleApiError(error, 'Kullanıcı güncellenirken bir hata oluştu');
      }
    }
  },

  // Bağlantı durumunu kontrol et
  checkConnection: async () => {
    try {
      // /health endpoint'i yerine /issues endpoint'ini kullanıyoruz (var olduğunu biliyoruz)
      const response = await client.get('/issues', { 
        timeout: 5000,
        params: { limit: 1 } // Sadece 1 kayıt isteyelim, performans için
      });
      return { success: true, data: { status: 'online' } };
    } catch (error) {
      console.error('API bağlantı kontrolü başarısız:', error);
      return { success: false, message: 'API sunucusuna bağlanılamadı' };
    }
  },
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
export { apiStatus, tryAllApiUrls, enableDemoMode, isDemoMode }; 