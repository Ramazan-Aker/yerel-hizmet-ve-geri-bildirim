// App konfigürasyonu
const LOCAL_IP = '192.168.1.54';
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
    "expo-location"
  ],
  androidStatusBar: {
    barStyle: "dark-content",
    backgroundColor: "#ffffff"
  },
  newArchEnabled: true,
  extra: {
    allowArbitraryNetworkAccess: true,
    apiBaseUrl: API_BASE_URL,
    hostIp: LOCAL_IP
  },
  packagerOpts: {
    hostType: "lan"
  },
  hostUri: `${LOCAL_IP}:8081`
}; 