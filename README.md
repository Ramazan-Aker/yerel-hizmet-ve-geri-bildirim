# 🏙️ Şehir Sorun Bildirimi ve Takip Sistemi

Bu proje, vatandaşların şehirlerindeki sorunları bildirebilecekleri ve bu sorunların durumunu takip edebilecekleri kapsamlı bir platform sistemidir. Sistem web uygulaması ve mobil uygulama olmak üzere iki farklı arayüz sunar. Belediye yetkilileri bildirilen sorunları görebilir, durumlarını güncelleyebilir ve çözüm sürecini etkin bir şekilde yönetebilir.

## ✨ Özellikler

### 👥 Kullanıcı Özellikleri
- **Kullanıcı Yönetimi**: Kayıt olma, giriş yapma ve profil yönetimi
- **Sorun Bildirme**: Konum, kategori, açıklama ve fotoğraf ile detaylı sorun bildirimi
- **Harita Entegrasyonu**: Leaflet haritalar ile konumsal sorun bildirimi ve görüntüleme
- **Takip Sistemi**: Bildirilen sorunların durumunu gerçek zamanlı takip etme
- **Filtreleme ve Arama**: Gelişmiş filtreleme seçenekleri ile sorunları bulma
- **Yorum ve Etkileşim**: Sorunlara yorum yapma ve oy verme sistemi

### 🏛️ Belediye Yetkilisi Özellikleri
- **Sorun Yönetimi**: Bildirilen sorunları görüntüleme ve yönetme
- **Durum Güncellemeleri**: Sorun durumlarını güncelleme (beklemede, çözülüyor, çözüldü)
- **Çalışan Ataması**: Sorunları uygun çalışanlara atama
- **Resmi Yanıtlar**: Vatandaşlara resmi geri bildirim verme
- **Dashboard**: Şehir bazında sorun istatistikleri

### 🔧 Admin Özellikleri
- **Kapsamlı Admin Paneli**: Tüm sistem yönetimi
- **Kullanıcı Yönetimi**: Kullanıcı rolleri ve yetkilendirme
- **İstatistikler ve Raporlar**: Detaylı sistem analitikleri
- **Sistem Konfigürasyonu**: Platform ayarları yönetimi

### 🤖 AI Entegrasyonu
- **Akıllı Analiz**: Google Generative AI ve OpenAI entegrasyonu
- **Otomatik Kategorizasyon**: Sorunların AI ile otomatik sınıflandırılması
- **Öneri Sistemi**: Akıllı çözüm önerileri

## 🛠️ Teknoloji Yığını

### 🖥️ Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Veritabanı**: MongoDB (Mongoose ODM)
- **Kimlik Doğrulama**: JWT (JSON Web Token)
- **Güvenlik**: Helmet, CORS, bcrypt
- **Dosya Yönetimi**: Multer, Cloudinary
- **AI Entegrasyonu**: Google Generative AI, OpenAI
- **Loglama**: Morgan
- **Geliştirme**: Nodemon

### 🌐 Web Client
- **Framework**: React.js 18
- **Durum Yönetimi**: Context API (AuthContext)
- **Stilizasyon**: Tailwind CSS
- **Harita**: Leaflet & React-Leaflet
- **HTTP İstemcisi**: Axios
- **Yönlendirme**: React Router DOM
- **UI Komponentleri**: React Icons
- **Bildirimler**: React Hot Toast
- **Tarih İşleme**: date-fns

### 📱 Mobile App
- **Platform**: React Native (Expo)
- **Framework**: Expo SDK 53
- **Haritalar**: React Native Maps
- **Kamera**: Expo Camera, Image Picker
- **Konum**: Expo Location
- **Depolama**: AsyncStorage
- **Navigasyon**: React Navigation 6
- **Grafik**: React Native Chart Kit
- **UI**: React Native Vector Icons

## 🚀 Kurulum ve Çalıştırma

### 📋 Gereksinimler
- **Node.js**: 18.x veya üzeri
- **npm**: 8.x veya üzeri
- **MongoDB**: 5.x veya üzeri
- **Git**: Version control için

### 🗂️ Proje Yapısı
```
yerel-hizmet-ve-geri-bildirim/
├── backend/           # Node.js backend API
├── web-client/        # React web uygulaması
├── mobile-app/        # React Native mobil uygulama
├── docs/             # Dokümantasyon
└── README.md         # Bu dosya
```

### 🔧 Backend Kurulumu
```bash
# Proje dizinine git
cd yerel-hizmet-ve-geri-bildirim/backend

# Bağımlılıkları yükle
npm install

# Çevre değişkenlerini yapılandır
# .env dosyası oluştur ve gerekli değişkenleri ayarla:
# MONGO_URI, JWT_SECRET, CLOUDINARY_CONFIG, vb.

# Geliştirme modunda başlat
npm run dev

# Üretim modunda başlat
npm start
```

### 🌐 Web Client Kurulumu
```bash
# Web client dizinine git
cd yerel-hizmet-ve-geri-bildirim/web-client

# Bağımlılıkları yükle
npm install

# Geliştirme sunucusunu başlat
npm start

# Üretim için build al
npm run build
```

### 📱 Mobile App Kurulumu
```bash
# Mobile app dizinine git
cd yerel-hizmet-ve-geri-bildirim/mobile-app

# Bağımlılıkları yükle
npm install

# Expo development server'ını başlat
npm start

# Android emülatöründe çalıştır
npm run android

# iOS simülatöründe çalıştır
npm run ios
```

## 🔌 API Dokümantasyonu

### 🔐 Kimlik Doğrulama Rotaları
- `POST /api/auth/register` - Kullanıcı kaydı
- `POST /api/auth/login` - Kullanıcı girişi
- `GET /api/auth/me` - Mevcut kullanıcı bilgilerini getir
- `PUT /api/auth/updatepassword` - Şifre güncelleme
- `PUT /api/auth/updateprofile` - Profil güncelleme

### 📋 Sorun Yönetimi Rotaları
- `GET /api/issues` - Tüm sorunları getir (filtreleme ile)
- `POST /api/issues` - Yeni sorun bildirimi oluştur
- `GET /api/issues/:id` - Tek bir sorunu getir
- `PUT /api/issues/:id` - Bir sorunu güncelle
- `DELETE /api/issues/:id` - Bir sorunu sil
- `PUT /api/issues/:id/status` - Sorun durumunu güncelle (yetkili)
- `PUT /api/issues/:id/upvote` - Bir soruna oy ver
- `GET /api/issues/myissues` - Kullanıcının kendi sorunları
- `POST /api/issues/:id/comments` - Soruna yorum ekle
- `GET /api/issues/stats/public` - Genel istatistikler

### 👨‍💼 Admin Rotaları
- `GET /api/admin/dashboard` - Dashboard istatistikleri
- `GET /api/admin/users` - Tüm kullanıcıları getir
- `PUT /api/admin/users/:id` - Kullanıcı güncelle
- `DELETE /api/admin/users/:id` - Kullanıcı sil
- `PUT /api/admin/users/:id/role` - Kullanıcı rolünü değiştir
- `POST /api/admin/issues/:id/assign` - Sorunu çalışana ata

### 🏛️ Belediye Çalışanı Rotaları
- `GET /api/municipal/issues` - Şehir bazında sorunları getir
- `GET /api/municipal/workers` - Çalışan listesi
- `PUT /api/municipal/issues/:id/status` - Sorun durumunu güncelle
- `POST /api/municipal/issues/:id/response` - Resmi yanıt ekle

### 👷‍♂️ Çalışan Rotaları
- `GET /api/worker/assigned-issues` - Atanan sorunları getir
- `PUT /api/worker/issues/:id/status` - Sorun durumunu güncelle

### 🤖 AI Rotaları
- `GET /api/ai/status` - AI sistem durumu
- `POST /api/ai/analyze` - Sorun analizi

## 👥 Kullanıcı Rolleri ve Yetkileri

| Rol | Açıklama | Yetkiler |
|-----|----------|----------|
| `user` | Normal vatandaş | Sorun bildirme, takip etme, yorum yapma |
| `municipal_worker` | Belediye çalışanı | Sorunları görüntüleme, durum güncelleme |
| `worker` | Saha çalışanı | Atanan sorunları çözme, durum güncelleme |
| `admin` | Sistem yöneticisi | Tam sistem erişimi, kullanıcı yönetimi |

## 🔒 Güvenlik Özellikleri

- **JWT Tabanlı Kimlik Doğrulama**: Güvenli oturum yönetimi
- **Rol Bazlı Yetkilendirme**: Endpoint'lere rol bazlı erişim kontrolü
- **Şifre Şifreleme**: bcrypt ile güvenli şifre saklama
- **CORS Koruması**: Cross-origin request güvenliği
- **Helmet**: HTTP başlık güvenliği
- **Rate Limiting**: API isteklerinin sınırlandırılması

## 📊 Performans ve Özellikler

- **Responsive Design**: Tüm cihazlarda uyumlu arayüz
- **Real-time Updates**: Sorun durumlarının anlık güncellenmesi
- **Optimized Images**: Cloudinary ile görsel optimizasyonu
- **Mobile-first**: Mobil öncelikli tasarım yaklaşımı
- **PWA Ready**: Progressive Web App özellikleri

## 🤝 Katkıda Bulunma

1. Bu projeyi fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add amazing feature'`)
4. Branch'inizi push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📝 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için [LICENSE](LICENSE) dosyasına bakın.

## 📞 İletişim

Proje hakkında sorularınız için:
- 📧 Email: [proje@email.com]
- 🐛 Issues: [GitHub Issues](https://github.com/username/repo/issues)
- 📖 Docs: [Dokümantasyon](./docs/)

---

⭐ Bu projeyi beğendiyseniz yıldız vermeyi unutmayın!
