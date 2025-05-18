// Expo uygulamasını başlatmak için yardımcı script
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Expo uygulaması başlatılıyor...');

try {
  // Metro bundler'ı başlat
  console.log('Metro bundler başlatılıyor...');
  execSync('npx react-native start', { stdio: 'inherit' });
} catch (error) {
  console.error('Hata:', error.message);
  console.log('\nAlternatif çözüm deneniyor...');
  
  try {
    // Alternatif başlatma yöntemi
    execSync('npx expo start --no-dev --minify', { stdio: 'inherit' });
  } catch (innerError) {
    console.error('Alternatif çözüm de başarısız oldu:', innerError.message);
    console.log('\n\nLütfen aşağıdaki adımları manuel olarak deneyin:');
    console.log('1. Node.js sürümünüzü Node 18 veya 16\'ya düşürün');
    console.log('2. npm cache clean --force komutunu çalıştırın');
    console.log('3. node_modules klasörünü silin ve npm install ile tekrar yükleyin');
    console.log('4. npx expo start komutunu tekrar çalıştırın');
  }
} 