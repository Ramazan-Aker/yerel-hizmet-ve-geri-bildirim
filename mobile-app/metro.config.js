// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const ip = require('ip');

// Sistem IP adresini otomatik olarak algıla
const HOST = process.env.HOST || ip.address();

// Varsayılan konfigürasyon
const defaultConfig = getDefaultConfig(__dirname);

// Metro Config'i özelleştir
defaultConfig.server = {
  port: 8081,
  host: '192.168.1.54'
};

// Açıkça localhost kullanmayı devre dışı bırak
defaultConfig.resolver = {
  ...defaultConfig.resolver,
  // DevServer'ın özel host settings kullanmasına izin ver
  useDevServer: {
    useCustomHost: true
  }
};

// Metro Dev Server'ın hostname'ini zorlayan ek ayarlar
defaultConfig.transformer = {
  ...defaultConfig.transformer,
  publicPath: '/assets', // Sadece web için gerekli
  // İstemcilerin doğrudan bu IP'ye erişmesini sağlar
  assetPlugins: []
};

// Açıkça belirtilen ip adresini kullanmaya zorla
process.env.REACT_NATIVE_PACKAGER_HOSTNAME = '192.168.1.54';

module.exports = defaultConfig; 