# Şehir Sorun Bildirimi ve Takip Sistemi

Bu proje, vatandaşların şehirlerindeki sorunları bildirebilecekleri ve bu sorunların durumunu takip edebilecekleri bir web uygulamasıdır. Belediye yetkilileri bildirilen sorunları görebilir, durumlarını güncelleyebilir ve çözüm sürecini yönetebilir.

## Özellikler

- Kullanıcı kaydı ve kimlik doğrulama
- Sorun bildirme (konum, kategori, açıklama, fotoğraf)
- Sorunları filtreleme ve arama
- Sorun durumunu takip etme
- Belediye yetkililerinin sorun yönetimi
- Admin paneli ve istatistikler
- Mobil uyumlu arayüz

## Teknoloji Yığını

### Backend
- Node.js
- Express.js
- MongoDB (Mongoose)
- JWT kimlik doğrulama

### Frontend
- React.js
- Redux (Durum yönetimi)
- Tailwind CSS
- Leaflet (Harita entegrasyonu)

## Kurulum

### Gereksinimler
- Node.js 14.x veya üzeri
- MongoDB

### Backend Kurulumu
```bash
# Backend dizinine git
cd yerel-hizmet-ve-geri-bildirim/backend

# Bağımlılıkları yükle
npm install

# .env dosyasını yapılandır (örnek olarak .env.example kullanılabilir)

# Geliştirme modunda başlat
npm run dev
```

### Frontend Kurulumu
```bash
# Frontend dizinine git
cd yerel-hizmet-ve-geri-bildirim/frontend

# Bağımlılıkları yükle
npm install

# Geliştirme modunda başlat
npm run dev
```

## API Rotaları

### Kimlik Doğrulama
- `POST /api/auth/register` - Kullanıcı kaydı
- `POST /api/auth/login` - Kullanıcı girişi
- `GET /api/auth/me` - Mevcut kullanıcı bilgilerini getir
- `PUT /api/auth/updatepassword` - Şifre güncelleme

### Sorunlar
- `GET /api/issues` - Tüm sorunları getir (filtreleme ile)
- `POST /api/issues` - Yeni sorun bildirimi oluştur
- `GET /api/issues/:id` - Tek bir sorunu getir
- `PUT /api/issues/:id` - Bir sorunu güncelle
- `DELETE /api/issues/:id` - Bir sorunu sil
- `PUT /api/issues/:id/status` - Sorun durumunu güncelle (yetkili)
- `PUT /api/issues/:id/upvote` - Bir soruna oy ver
- `GET /api/issues/myissues` - Kullanıcının kendi sorunları

### Admin
- `GET /api/admin/dashboard` - Dashboard istatistikleri
- `GET /api/admin/users` - Tüm kullanıcıları getir
- `GET /api/admin/users/:id` - Tek bir kullanıcıyı getir
- `PUT /api/admin/users/:id` - Kullanıcı güncelle
- `DELETE /api/admin/users/:id` - Kullanıcı sil
- `PUT /api/admin/users/:id/role` - Kullanıcı rolünü değiştir
- `PUT /api/admin/users/:id/status` - Kullanıcı durumunu değiştir

## Kullanıcı Rolleri

- `user` - Normal vatandaş (sorun bildirebilir, takip edebilir)
- `municipal_worker` - Belediye çalışanı (sorunları çözümleyebilir)
- `admin` - Yönetici (tam erişim)

## Lisans

MIT
