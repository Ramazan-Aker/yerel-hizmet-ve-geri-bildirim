// App konfigürasyonu
// İşletim sistemini ve ağ modüllerini içe aktar
const os = require('os');

// IP adresini otomatik olarak algıla
function getNetworkIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    // WiFi veya Ethernet adaptörlerini bul
    if (name.toLowerCase().includes('wi-fi') || name.toLowerCase().includes('ethernet')) {
      for (const iface of interfaces[name]) {
        // IPv4 adresini al ve VirtualBox adaptörlerini (192.168.56.x) hariç tut
        if (iface.family === 'IPv4' && !iface.internal && !iface.address.startsWith('192.168.56')) {
          return iface.address;
        }
      }
    }
  }
  // Bulunamazsa 127.0.0.1'i döndür (yerel geliştirme)
  return '127.0.0.1';
}

// Çevre değişkeninden IP adresini almaya çalış, yoksa otomatik algıla
const LOCAL_IP = process.env.REACT_NATIVE_PACKAGER_HOSTNAME || getNetworkIP();
console.log(`Uygulama için kullanılan IP adresi: ${LOCAL_IP}`);

const API_PORT = 5001;
const API_BASE_URL = `http://${LOCAL_IP}:${API_PORT}/api`;

export default {
  name: "Şehir Sorun Bildirimi",
  slug: "sehir-sorun-bildirimi",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff"
  },
  assetBundlePatterns: [
    "**/*"
  ],
  ios: {
    supportsTablet: true,
    infoPlist: {
      NSAppTransportSecurity: {
        NSAllowsArbitraryLoads: true
      }
    }
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff"
    }
  },
  web: {
    favicon: "./assets/favicon.png"
  },
  plugins: [
    "expo-image-picker",
    "expo-location",
    "expo-camera",
    "expo-file-system"
  ],
  androidStatusBar: {
    barStyle: "dark-content",
    backgroundColor: "#ffffff"
  },
  extra: {
    allowArbitraryNetworkAccess: true,
    apiBaseUrl: API_BASE_URL,
    hostIp: LOCAL_IP
  },
  // QR kodu doğru oluşturmak için
  scheme: "sehirsorun",
  sdkVersion: "53.0.0",
  owner: "anonymous",
  runtimeVersion: {
    policy: "sdkVersion"
  },
  updates: {
    url: "https://u.expo.dev/your-project-id",
    enabled: false
  },
  packagerOpts: {
    hostType: "tunnel",
    dev: true
  },
  hostUri: `${LOCAL_IP}:8081`,
  // QR kodunun Expo Go'yu açması için aşağıdaki ayarları ekliyoruz
  experiments: {
    manifestTypes: ["expo-go"]
  }
}; 