@echo off
echo IP adresi otomatik olarak algılaniyor...

:: IP adresini otomatik olarak al
FOR /F "tokens=4 delims= " %%i IN ('ipconfig ^| findstr /C:"IPv4 Address" ^| findstr /V "192.168.56"') DO (
    SET IP_ADDRESS=%%i
    goto :found_ip
)

:found_ip
echo Bulunan IP adresi: %IP_ADDRESS%
set REACT_NATIVE_PACKAGER_HOSTNAME=%IP_ADDRESS%
echo Expo Go ile LAN modunda baslatiliyor...

:: Expo'nun QR kodunu Expo Go ile açacak şekilde yapılandır
set EXPO_FORCE_MANIFEST_TYPE=expo-go
set EXPO_USE_TUNNEL=true

cd %~dp0
npx expo start --tunnel 