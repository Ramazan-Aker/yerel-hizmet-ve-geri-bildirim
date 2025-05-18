@echo off
echo Node.js 18 ile Expo uygulamasını başlatma

:: Eğer sistemde NVM kurulu ise
where nvm >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  echo NVM bulundu, Node.js 18 kullanılıyor...
  call nvm use 18
) else (
  echo NVM bulunamadı.
  echo Node.js'in daha eski bir sürümünü kullanmanız gerekiyor (18.x veya 16.x).
  echo Node.js sürümünüzü kontrol edin: node -v
  pause
  exit /b 1
)

:: Expo uygulamasını başlat
echo Expo uygulaması başlatılıyor...
npx expo start

pause 