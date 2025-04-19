import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { useAuth } from '../hooks/useAuth';

const RegisterScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [city, setCity] = useState(null);
  const [district, setDistrict] = useState(null);
  const [cities, setCities] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [isFocusCity, setIsFocusCity] = useState(false);
  const [isFocusDistrict, setIsFocusDistrict] = useState(false);
  const { register, loading, error, setError } = useAuth();

  // Türkiye'deki tüm şehirler
  useEffect(() => {
    // Tüm illeri alfabetik sırayla yükle
    const turkishCities = [
      { label: 'Adana', value: 'adana' },
      { label: 'Adıyaman', value: 'adiyaman' },
      { label: 'Afyonkarahisar', value: 'afyonkarahisar' },
      { label: 'Ağrı', value: 'agri' },
      { label: 'Aksaray', value: 'aksaray' },
      { label: 'Amasya', value: 'amasya' },
      { label: 'Ankara', value: 'ankara' },
      { label: 'Antalya', value: 'antalya' },
      { label: 'Ardahan', value: 'ardahan' },
      { label: 'Artvin', value: 'artvin' },
      { label: 'Aydın', value: 'aydin' },
      { label: 'Balıkesir', value: 'balikesir' },
      { label: 'Bartın', value: 'bartin' },
      { label: 'Batman', value: 'batman' },
      { label: 'Bayburt', value: 'bayburt' },
      { label: 'Bilecik', value: 'bilecik' },
      { label: 'Bingöl', value: 'bingol' },
      { label: 'Bitlis', value: 'bitlis' },
      { label: 'Bolu', value: 'bolu' },
      { label: 'Burdur', value: 'burdur' },
      { label: 'Bursa', value: 'bursa' },
      { label: 'Çanakkale', value: 'canakkale' },
      { label: 'Çankırı', value: 'cankiri' },
      { label: 'Çorum', value: 'corum' },
      { label: 'Denizli', value: 'denizli' },
      { label: 'Diyarbakır', value: 'diyarbakir' },
      { label: 'Düzce', value: 'duzce' },
      { label: 'Edirne', value: 'edirne' },
      { label: 'Elazığ', value: 'elazig' },
      { label: 'Erzincan', value: 'erzincan' },
      { label: 'Erzurum', value: 'erzurum' },
      { label: 'Eskişehir', value: 'eskisehir' },
      { label: 'Gaziantep', value: 'gaziantep' },
      { label: 'Giresun', value: 'giresun' },
      { label: 'Gümüşhane', value: 'gumushane' },
      { label: 'Hakkari', value: 'hakkari' },
      { label: 'Hatay', value: 'hatay' },
      { label: 'Iğdır', value: 'igdir' },
      { label: 'Isparta', value: 'isparta' },
      { label: 'İstanbul', value: 'istanbul' },
      { label: 'İzmir', value: 'izmir' },
      { label: 'Kahramanmaraş', value: 'kahramanmaras' },
      { label: 'Karabük', value: 'karabuk' },
      { label: 'Karaman', value: 'karaman' },
      { label: 'Kars', value: 'kars' },
      { label: 'Kastamonu', value: 'kastamonu' },
      { label: 'Kayseri', value: 'kayseri' },
      { label: 'Kırıkkale', value: 'kirikkale' },
      { label: 'Kırklareli', value: 'kirklareli' },
      { label: 'Kırşehir', value: 'kirsehir' },
      { label: 'Kilis', value: 'kilis' },
      { label: 'Kocaeli', value: 'kocaeli' },
      { label: 'Konya', value: 'konya' },
      { label: 'Kütahya', value: 'kutahya' },
      { label: 'Malatya', value: 'malatya' },
      { label: 'Manisa', value: 'manisa' },
      { label: 'Mardin', value: 'mardin' },
      { label: 'Mersin', value: 'mersin' },
      { label: 'Muğla', value: 'mugla' },
      { label: 'Muş', value: 'mus' },
      { label: 'Nevşehir', value: 'nevsehir' },
      { label: 'Niğde', value: 'nigde' },
      { label: 'Ordu', value: 'ordu' },
      { label: 'Osmaniye', value: 'osmaniye' },
      { label: 'Rize', value: 'rize' },
      { label: 'Sakarya', value: 'sakarya' },
      { label: 'Samsun', value: 'samsun' },
      { label: 'Siirt', value: 'siirt' },
      { label: 'Sinop', value: 'sinop' },
      { label: 'Sivas', value: 'sivas' },
      { label: 'Şanlıurfa', value: 'sanliurfa' },
      { label: 'Şırnak', value: 'sirnak' },
      { label: 'Tekirdağ', value: 'tekirdag' },
      { label: 'Tokat', value: 'tokat' },
      { label: 'Trabzon', value: 'trabzon' },
      { label: 'Tunceli', value: 'tunceli' },
      { label: 'Uşak', value: 'usak' },
      { label: 'Van', value: 'van' },
      { label: 'Yalova', value: 'yalova' },
      { label: 'Yozgat', value: 'yozgat' },
      { label: 'Zonguldak', value: 'zonguldak' }
    ];
    setCities(turkishCities);
  }, []);

  // Şehir seçildiğinde ilçeleri güncelle
  useEffect(() => {
    const getDistricts = async () => {
      if (city) {
        // İlçe listesi - Gerçek uygulamada API'dan alınabilir
        let cityDistricts = [];
        
        // Yaygın şehirler için örnek ilçe listeleri
        if (city === 'istanbul') {
          cityDistricts = [
            { label: 'Adalar', value: 'adalar' },
            { label: 'Arnavutköy', value: 'arnavutkoy' },
            { label: 'Ataşehir', value: 'atasehir' },
            { label: 'Avcılar', value: 'avcilar' },
            { label: 'Bağcılar', value: 'bagcilar' },
            { label: 'Bahçelievler', value: 'bahcelievler' },
            { label: 'Bakırköy', value: 'bakirkoy' },
            { label: 'Başakşehir', value: 'basaksehir' },
            { label: 'Bayrampaşa', value: 'bayrampasa' },
            { label: 'Beşiktaş', value: 'besiktas' },
            { label: 'Beykoz', value: 'beykoz' },
            { label: 'Beylikdüzü', value: 'beylikduzu' },
            { label: 'Beyoğlu', value: 'beyoglu' },
            { label: 'Büyükçekmece', value: 'buyukcekmece' },
            { label: 'Çatalca', value: 'catalca' },
            { label: 'Çekmeköy', value: 'cekmekoy' },
            { label: 'Esenler', value: 'esenler' },
            { label: 'Esenyurt', value: 'esenyurt' },
            { label: 'Eyüpsultan', value: 'eyupsultan' },
            { label: 'Fatih', value: 'fatih' },
            { label: 'Gaziosmanpaşa', value: 'gaziosmanpasa' },
            { label: 'Güngören', value: 'gungoren' },
            { label: 'Kadıköy', value: 'kadikoy' },
            { label: 'Kağıthane', value: 'kagithane' },
            { label: 'Kartal', value: 'kartal' },
            { label: 'Küçükçekmece', value: 'kucukcekmece' },
            { label: 'Maltepe', value: 'maltepe' },
            { label: 'Pendik', value: 'pendik' },
            { label: 'Sancaktepe', value: 'sancaktepe' },
            { label: 'Sarıyer', value: 'sariyer' },
            { label: 'Silivri', value: 'silivri' },
            { label: 'Sultanbeyli', value: 'sultanbeyli' },
            { label: 'Sultangazi', value: 'sultangazi' },
            { label: 'Şile', value: 'sile' },
            { label: 'Şişli', value: 'sisli' },
            { label: 'Tuzla', value: 'tuzla' },
            { label: 'Ümraniye', value: 'umraniye' },
            { label: 'Üsküdar', value: 'uskudar' },
            { label: 'Zeytinburnu', value: 'zeytinburnu' }
          ];
        } else if (city === 'ankara') {
          cityDistricts = [
            { label: 'Altındağ', value: 'altindag' },
            { label: 'Çankaya', value: 'cankaya' },
            { label: 'Etimesgut', value: 'etimesgut' },
            { label: 'Keçiören', value: 'kecioren' },
            { label: 'Mamak', value: 'mamak' },
            { label: 'Pursaklar', value: 'pursaklar' },
            { label: 'Sincan', value: 'sincan' },
            { label: 'Yenimahalle', value: 'yenimahalle' },
            { label: 'Akyurt', value: 'akyurt' },
            { label: 'Ayaş', value: 'ayas' },
            { label: 'Bala', value: 'bala' },
            { label: 'Beypazarı', value: 'beypazari' },
            { label: 'Çamlıdere', value: 'camlidere' },
            { label: 'Çubuk', value: 'cubuk' },
            { label: 'Elmadağ', value: 'elmadag' },
            { label: 'Evren', value: 'evren' },
            { label: 'Gölbaşı', value: 'golbasi' },
            { label: 'Güdül', value: 'gudul' },
            { label: 'Haymana', value: 'haymana' },
            { label: 'Kalecik', value: 'kalecik' },
            { label: 'Kazan', value: 'kazan' },
            { label: 'Kızılcahamam', value: 'kizilcahamam' },
            { label: 'Nallıhan', value: 'nallihan' },
            { label: 'Polatlı', value: 'polatli' },
            { label: 'Şereflikoçhisar', value: 'sereflikochisar' }
          ];
        } else if (city === 'izmir') {
          cityDistricts = [
            { label: 'Aliağa', value: 'aliaga' },
            { label: 'Balçova', value: 'balcova' },
            { label: 'Bayındır', value: 'bayindir' },
            { label: 'Bayraklı', value: 'bayrakli' },
            { label: 'Bergama', value: 'bergama' },
            { label: 'Beydağ', value: 'beydag' },
            { label: 'Bornova', value: 'bornova' },
            { label: 'Buca', value: 'buca' },
            { label: 'Çeşme', value: 'cesme' },
            { label: 'Çiğli', value: 'cigli' },
            { label: 'Dikili', value: 'dikili' },
            { label: 'Foça', value: 'foca' },
            { label: 'Gaziemir', value: 'gaziemir' },
            { label: 'Güzelbahçe', value: 'guzelbahce' },
            { label: 'Karabağlar', value: 'karabaglar' },
            { label: 'Karaburun', value: 'karaburun' },
            { label: 'Karşıyaka', value: 'karsiyaka' },
            { label: 'Kemalpaşa', value: 'kemalpasa' },
            { label: 'Kınık', value: 'kinik' },
            { label: 'Kiraz', value: 'kiraz' },
            { label: 'Konak', value: 'konak' },
            { label: 'Menderes', value: 'menderes' },
            { label: 'Menemen', value: 'menemen' },
            { label: 'Narlıdere', value: 'narlidere' },
            { label: 'Ödemiş', value: 'odemis' },
            { label: 'Seferihisar', value: 'seferihisar' },
            { label: 'Selçuk', value: 'selcuk' },
            { label: 'Tire', value: 'tire' },
            { label: 'Torbalı', value: 'torbali' },
            { label: 'Urla', value: 'urla' }
          ];
        } else {
          // Diğer şehirler için en azından 'Merkez' ilçesini ekle
          cityDistricts = [
            { label: 'Merkez', value: 'merkez' }
          ];
        }
        
        setDistricts(cityDistricts);
        setDistrict(null); // İlçe seçimini sıfırla
      } else {
        setDistricts([]);
        setDistrict(null);
      }
    };
    
    getDistricts();
  }, [city]);

  const validateEmail = (email) => {
    const re = /\S+@\S+\.\S+/;
    return re.test(email);
  };

  const handleRegister = async () => {
    // Form validasyonu
    if (!name.trim()) {
      Alert.alert('Hata', 'Lütfen adınızı girin');
      return;
    }
    if (!email.trim()) {
      Alert.alert('Hata', 'Lütfen e-posta adresinizi girin');
      return;
    }
    if (!validateEmail(email)) {
      Alert.alert('Hata', 'Lütfen geçerli bir e-posta adresi girin');
      return;
    }
    if (!password || password.length < 6) {
      Alert.alert('Hata', 'Şifre en az 6 karakter olmalı');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Hata', 'Şifreler eşleşmiyor');
      return;
    }
    if (!city) {
      Alert.alert('Hata', 'Lütfen şehir seçin');
      return;
    }
    if (!district) {
      Alert.alert('Hata', 'Lütfen ilçe seçin');
      return;
    }

    console.log('Kayıt denenecek:', { name, email, password, city, district });
    
    try {
      const cityLabel = cities.find(c => c.value === city)?.label || city;
      const districtLabel = districts.find(d => d.value === district)?.label || district;
      
      // Register fonksiyonunu çağırırken doğru veri formatını sağla
      const success = await register(name, email, password, cityLabel, districtLabel);
      
      if (!success && error) {
        Alert.alert('Kayıt Başarısız', error);
        setError(null);
      }
    } catch (err) {
      console.error('Kayıt hatası:', err);
      Alert.alert('Kayıt Başarısız', 'Bir hata oluştu, lütfen tekrar deneyin.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : null}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Yeni Hesap Oluştur</Text>
        <Text style={styles.subtitle}>
          Şehir sorunlarını bildirmek ve takip etmek için hesap oluşturun.
        </Text>

        <View style={styles.formContainer}>
          <Text style={styles.label}>Ad Soyad</Text>
          <TextInput
            style={styles.input}
            placeholder="Ad ve soyadınızı girin"
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>E-posta</Text>
          <TextInput
            style={styles.input}
            placeholder="E-posta adresinizi girin"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Şehir</Text>
          <Dropdown
            style={[styles.dropdown, isFocusCity && styles.focusedDropdown]}
            placeholderStyle={styles.placeholderStyle}
            selectedTextStyle={styles.selectedTextStyle}
            inputSearchStyle={styles.inputSearchStyle}
            data={cities}
            maxHeight={300}
            labelField="label"
            valueField="value"
            placeholder={!isFocusCity ? 'Şehir seçin' : '...'}
            searchPlaceholder="Ara..."
            value={city}
            onFocus={() => setIsFocusCity(true)}
            onBlur={() => setIsFocusCity(false)}
            onChange={item => {
              setCity(item.value);
              setIsFocusCity(false);
            }}
          />

          <Text style={styles.label}>İlçe</Text>
          <Dropdown
            style={[
              styles.dropdown, 
              isFocusDistrict && styles.focusedDropdown,
              !city && styles.disabledDropdown
            ]}
            placeholderStyle={styles.placeholderStyle}
            selectedTextStyle={styles.selectedTextStyle}
            inputSearchStyle={styles.inputSearchStyle}
            data={districts}
            maxHeight={300}
            labelField="label"
            valueField="value"
            placeholder={!isFocusDistrict ? 'İlçe seçin' : '...'}
            searchPlaceholder="Ara..."
            value={district}
            onFocus={() => setIsFocusDistrict(true)}
            onBlur={() => setIsFocusDistrict(false)}
            onChange={item => {
              setDistrict(item.value);
              setIsFocusDistrict(false);
            }}
            disable={!city}
          />

          <Text style={styles.label}>Şifre</Text>
          <TextInput
            style={styles.input}
            placeholder="En az 6 karakter"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Text style={styles.label}>Şifre Tekrar</Text>
          <TextInput
            style={styles.input}
            placeholder="Şifrenizi tekrar girin"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          <TouchableOpacity
            style={styles.button}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Kaydol</Text>
            )}
          </TouchableOpacity>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Zaten hesabınız var mı?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Giriş Yapın</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  dropdown: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
  },
  focusedDropdown: {
    borderColor: '#3b82f6',
  },
  disabledDropdown: {
    backgroundColor: '#f0f0f0',
    borderColor: '#ccc',
  },
  placeholderStyle: {
    fontSize: 16,
    color: '#aaa',
  },
  selectedTextStyle: {
    fontSize: 16,
    color: '#333',
  },
  inputSearchStyle: {
    height: 40,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  loginText: {
    color: '#666',
    fontSize: 14,
  },
  loginLink: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
});

export default RegisterScreen;