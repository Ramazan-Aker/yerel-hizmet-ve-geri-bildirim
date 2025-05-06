// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const ip = require('ip');
const os = require('os');

// Sistem IP adresini otomatik olarak algıla
// Sanal adaptörleri hariç tut (192.168.56.x)
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
  // Varsayılan IP'yi döndür
  return ip.address();
}

const HOST = process.env.REACT_NATIVE_PACKAGER_HOSTNAME || getNetworkIP();
console.log(`Algılanan IP adresi: ${HOST}`);

// Varsayılan konfigürasyon
const config = getDefaultConfig(__dirname);

// Expo Go ile çalışmak için gerekli değişiklikler
if (process.env.REACT_NATIVE_PACKAGER_HOSTNAME) {
  console.log(`Çevre değişkeninden alınan IP: ${process.env.REACT_NATIVE_PACKAGER_HOSTNAME}`);
}

// HOST değişkeninin değeri zaten çevresel değişkenden alınmış olabilir
// Eğer yoksa, algılanan IP adresini kullan
if (!process.env.REACT_NATIVE_PACKAGER_HOSTNAME) {
  process.env.REACT_NATIVE_PACKAGER_HOSTNAME = HOST;
}

module.exports = config;