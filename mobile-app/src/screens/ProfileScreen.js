import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Switch
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../hooks/useAuth';
import * as ImagePicker from 'expo-image-picker';
import api from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ProfileScreen = ({ navigation }) => {
  const { user, logout, updateUser } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [city, setCity] = useState(user?.city || '');
  const [address, setAddress] = useState(user?.address || '');
  const [profileImage, setProfileImage] = useState(user?.profileImage || null);
  const [notifications, setNotifications] = useState(user?.notifications || true);
  const [district, setDistrict] = useState(user?.district || '');
  
  // Kullanıcının bildirimleri için state değişkenleri
  const [userReports, setUserReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(true);

  // Kullanıcı bilgileri değiştiğinde state'i güncelle
  useEffect(() => {
    if (user) {
      console.log('ProfileScreen: Kullanıcı verileri değişti, state güncelleniyor:', user);
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setCity(user.city || '');
      setAddress(user.address || '');
      setProfileImage(user.profileImage || null);
      setNotifications(user.notifications || true);
      setDistrict(user.district || '');
    }
  }, [user]);

  // Kullanıcının bildirimlerini getir
  const fetchUserReports = useCallback(async () => {
    try {
      setReportsLoading(true);
      console.log('Kullanıcı bildirimleri getiriliyor...');
      const response = await api.issues.getMyIssues();
      
      if (response.success) {
        console.log('Getirilen bildirimler:', response.data);
        
        // response.data kontrolü
        const issuesData = Array.isArray(response.data) ? response.data : [];
        
        // Sadece ilk 3 bildirimi göster
        const formattedReports = issuesData.slice(0, 3).map(issue => ({
          id: issue._id,
          title: issue.title,
          status: issue.status,
          date: new Date(issue.createdAt).toLocaleDateString('tr-TR'),
        }));
        
        setUserReports(formattedReports);
      } else {
        console.error('Bildirimler getirilemedi:', response.message);
        setUserReports([]);
      }
    } catch (error) {
      console.error('Bildirimler getirilirken hata oluştu:', error);
      setUserReports([]);
    } finally {
      setReportsLoading(false);
    }
  }, []);
  
  // Sayfa yüklendiğinde bildirimleri getir
  useEffect(() => {
    fetchUserReports();
  }, [fetchUserReports]);

  // Profil bilgilerini yenile
  const refreshUserData = useCallback(async () => {
    try {
      console.log('Kullanıcı profil bilgileri yenileniyor...');
      const response = await api.auth.getUserProfile();
      
      if (response.success && response.data) {
        // API'den dönen veri yapısını kontrol et
        const userData = response.data.data;
        
        if (userData) {
          console.log('Yeni kullanıcı bilgileri alındı:', userData);
          
          // Güncel verileri local state'e kaydet
          setName(userData.name || '');
          setEmail(userData.email || '');
          setPhone(userData.phone || '');
          setCity(userData.city || '');
          setAddress(userData.address || '');
          setDistrict(userData.district || '');
          
          // Bildirimleri de yenile
          fetchUserReports();
          
          return true;
        }
      } else {
        console.warn('Kullanıcı verileri alınamadı:', response.message);
      }
      return false;
    } catch (error) {
      console.error('Profil bilgileri yenilenirken hata:', error);
      return false;
    }
  }, [fetchUserReports]);

  // Sayfa yüklendiğinde kullanıcı bilgilerini yenile
  useEffect(() => {
    refreshUserData();
  }, [refreshUserData]);

  // Profil resmi seçme
  const pickImage = async () => {
    if (!isEditing) return;
    
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Hata', 'Galerinize erişmek için izin gerekiyor!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };

  // Profil güncelleme
  const handleUpdateProfile = async () => {
    if (!name) {
      Alert.alert('Uyarı', 'İsim alanı boş olamaz.');
      return;
    }

    setLoading(true);

    try {
      // API'ye gönderilecek veriler - sadece değiştirilebilir alanları gönder
      const profileData = {
        name,
        phone: phone || '',
        city: city || '',
        district: district || '',
        address: address || ''
      };

      console.log('Profil güncelleme verileri:', profileData);

      // Önce updateUser fonksiyonu ile API'ye gönder
      const success = await updateUser(profileData);
      
      if (success) {
        // Profil başarıyla güncellendikten sonra lokal state'i güncelle
        // Not: AuthContext içindeki updateUser zaten user state'ini güncellemiş olacak
        // Ancak ekstra güvenlik için burada bir daha güncelliyoruz
        await refreshUserData();
        
        // Bildirimleri yenile
        await fetchUserReports();
        
        setIsEditing(false);
        Alert.alert('Başarılı', 'Profil bilgileriniz güncellendi.');
        
        // Lokal state'i doğrudan da güncelleyelim (UI'ın hemen yenilenmesi için)
        setName(profileData.name);
        setPhone(profileData.phone);
        setCity(profileData.city);
        setDistrict(profileData.district);
        setAddress(profileData.address);
      } else {
        Alert.alert('Hata', 'Profil güncellenirken bir sorun oluştu.');
      }
    } catch (error) {
      console.error('Profil güncellenirken hata:', error);
      Alert.alert('Hata', 'Profil güncellenirken bir sorun oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Durum rengini belirle
  const getStatusColor = (status) => {
    switch (status) {
      case 'Çözüldü':
      case 'resolved':
        return '#4CAF50'; // Yeşil
      case 'İnceleniyor':
      case 'in_progress':
        return '#2196F3'; // Mavi
      case 'Beklemede':
      case 'pending':
        return '#FFC107'; // Sarı
      case 'Reddedildi':
      case 'rejected':
        return '#F44336'; // Kırmızı
      default:
        return '#9E9E9E'; // Gri
    }
  };

  // Durum metni
  const getStatusText = (status) => {
    const statusMap = {
      'pending': 'Yeni',
      'in_progress': 'İnceleniyor',
      'resolved': 'Çözüldü',
      'rejected': 'Reddedildi'
    };
    
    return statusMap[status] || status;
  };

  // Bildirimin detayına git
  const navigateToReportDetail = (report) => {
    navigation.navigate('IssueDetail', { issueId: report.id });
  };

  // Çıkış yapma işlemi
  const handleLogout = () => {
    Alert.alert(
      'Çıkış Yap',
      'Hesabınızdan çıkış yapmak istediğinize emin misiniz?',
      [
        {
          text: 'İptal',
          style: 'cancel'
        },
        {
          text: 'Çıkış Yap',
          onPress: () => logout()
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>
      {/* Üst Kısım - Profil Bilgileri */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.profileImageContainer}
          onPress={pickImage}
          disabled={!isEditing}
        >
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.profileImage} />
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <Icon name="person" size={50} color="#fff" />
            </View>
          )}
          {isEditing && (
            <View style={styles.editImageBadge}>
              <Icon name="edit" size={20} color="#fff" />
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.profileName}>{user?.name || 'Kullanıcı'}</Text>
        <Text style={styles.profileEmail}>{user?.email || 'kullanici@ornek.com'}</Text>
        
        <View style={styles.profileActions}>
          {isEditing ? (
            <>
              <TouchableOpacity 
                style={[styles.actionButton, styles.saveButton]}
                onPress={handleUpdateProfile}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Icon name="check" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Kaydet</Text>
                  </>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => {
                  setIsEditing(false);
                  // Değerleri eski haline döndür
                  setName(user?.name || '');
                  setEmail(user?.email || '');
                  setPhone(user?.phone || '');
                  setCity(user?.city || '');
                  setAddress(user?.address || '');
                  setProfileImage(user?.profileImage || null);
                  setNotifications(user?.notifications || true);
                  setDistrict(user?.district || '');
                }}
              >
                <Icon name="close" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>İptal</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity 
                style={[styles.actionButton, styles.editButton]}
                onPress={() => setIsEditing(true)}
              >
                <Icon name="edit" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Düzenle</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.logoutButton]}
                onPress={handleLogout}
              >
                <Icon name="logout" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Çıkış Yap</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Ana İçerik */}
      <View style={styles.content}>
        {/* Profil Bilgileri */}
        <View style={styles.infoContainer}>
          <Text style={styles.sectionTitle}>Profil Bilgileri</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Ad Soyad</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Ad Soyad"
              />
            ) : (
              <Text style={styles.infoValue}>{name || 'Belirtilmemiş'}</Text>
            )}
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>E-posta</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="E-posta"
                keyboardType="email-address"
                editable={false} // E-posta değiştirilemez
              />
            ) : (
              <Text style={styles.infoValue}>{email || 'Belirtilmemiş'}</Text>
            )}
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Telefon</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Telefon Numarası"
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.infoValue}>{phone || 'Belirtilmemiş'}</Text>
            )}
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Şehir</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={city}
                onChangeText={setCity}
                placeholder="Şehir"
              />
            ) : (
              <Text style={styles.infoValue}>{city || 'Belirtilmemiş'}</Text>
            )}
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Adres</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={address}
                onChangeText={setAddress}
                placeholder="Adres"
                multiline
              />
            ) : (
              <Text style={styles.infoValue}>{address || 'Belirtilmemiş'}</Text>
            )}
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Bildirimler</Text>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              disabled={!isEditing}
              trackColor={{ false: '#d1d1d1', true: '#a7c9ff' }}
              thumbColor={notifications ? '#3b82f6' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Kullanıcının Bildirimleri */}
        <View style={styles.reportsContainer}>
          <Text style={styles.sectionTitle}>Bildirimlerim</Text>
          
          {reportsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#3b82f6" />
              <Text style={styles.loadingText}>Bildirimler yükleniyor...</Text>
            </View>
          ) : userReports.length > 0 ? (
            userReports.map((report) => (
              <TouchableOpacity 
                key={report.id}
                style={styles.reportCard}
                onPress={() => navigateToReportDetail(report)}
              >
                <View style={styles.reportInfo}>
                  <Text style={styles.reportTitle}>{report.title}</Text>
                  <Text style={styles.reportDate}>{report.date}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.status) }]}>
                  <Text style={styles.statusText}>{getStatusText(report.status)}</Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyReports}>
              <Icon name="info" size={40} color="#ccc" />
              <Text style={styles.emptyReportsText}>Henüz bir bildiriminiz bulunmuyor.</Text>
            </View>
          )}
          
          <TouchableOpacity
            style={styles.newReportButton}
            onPress={() => navigation.navigate('CreateReport')}
          >
            <Icon name="add-circle" size={20} color="#3b82f6" />
            <Text style={styles.newReportButtonText}>Yeni Bildirim Oluştur</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={async () => {
            // MyIssues sayfasına gitmeden önce bildirimleri yenile
            setReportsLoading(true);
            try {
              await fetchUserReports();
            } catch (error) {
              console.error('Bildirimler yenilenirken hata:', error);
            } finally {
              setReportsLoading(false);
              navigation.navigate('MyIssues');
            }
          }}
        >
          <Icon name="assignment" size={24} color="#3b82f6" style={styles.menuIcon} />
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuText}>Bildirdiğim Sorunlar</Text>
            <Icon name="chevron-right" size={24} color="#ccc" />
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#3b82f6',
    paddingTop: 60,
    paddingBottom: 30,
    alignItems: 'center',
  },
  profileImageContainer: {
    position: 'relative',
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#a0c2ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editImageBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#3b82f6',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    color: '#e6effd',
    marginBottom: 20,
  },
  profileActions: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginHorizontal: 6,
  },
  actionButtonText: {
    color: '#fff',
    marginLeft: 6,
    fontWeight: '500',
  },
  editButton: {
    backgroundColor: '#5e9cf5',
  },
  logoutButton: {
    backgroundColor: '#f44336',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    backgroundColor: '#9e9e9e',
  },
  content: {
    padding: 16,
  },
  infoContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  infoRow: {
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 0,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  input: {
    width: '60%',
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  reportsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  reportCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 10,
  },
  reportInfo: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  reportDate: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyReports: {
    alignItems: 'center',
    padding: 20,
  },
  emptyReportsText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  newReportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    padding: 12,
    backgroundColor: '#f0f7ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d0e1fd',
  },
  newReportButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '500',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 10,
  },
  menuIcon: {
    marginRight: 12,
  },
  menuTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '500',
  },
});

export default ProfileScreen; 