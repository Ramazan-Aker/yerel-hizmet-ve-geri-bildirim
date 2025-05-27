import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
  SafeAreaView,
  ScrollView
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import Icon from 'react-native-vector-icons/MaterialIcons';
import api from '../utils/api';

const HomeScreen = ({ navigation }) => {
  const { user, isOffline, serverStatus, checkConnection } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState([
    { id: 1, name: 'Toplam Sorun', value: '0' },
    { id: 2, name: 'Çözümlenen Sorunlar', value: '0' },
    { id: 3, name: 'Aktif Kullanıcılar', value: '0' },
    { id: 4, name: 'Ortalama Çözüm Süresi', value: '0 gün' },
  ]);

  // İstatistikleri getiren fonksiyon
  const fetchStats = async (shouldRefresh = false) => {
    try {
      if (shouldRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Genel istatistikleri getir
      const response = await api.issues.getPublicStats();

      console.log('API istatistik yanıtı:', response);
      
      if (response && response.success && response.data) {
        // API'den gelen gerçek verileri kullan
        setStats([
          { id: 1, name: 'Toplam Sorun', value: response.data.totalIssues.toString() },
          { id: 2, name: 'Çözümlenen Sorunlar', value: response.data.resolvedIssues.toString() },
          { id: 3, name: 'Aktif Kullanıcılar', value: response.data.activeUsers.toString() },
          { id: 4, name: 'Ortalama Çözüm Süresi', value: `${response.data.averageResolveTime} gün` },
        ]);
      } else {
        console.error('API istatistik hatası döndürdü:', response?.message);
        
        // Hata durumunda varsayılan değerler göster (kullanıcı deneyimi için)
        setStats([
          { id: 1, name: 'Toplam Sorun', value: '0' },
          { id: 2, name: 'Çözümlenen Sorunlar', value: '0' },
          { id: 3, name: 'Aktif Kullanıcılar', value: '0' },
          { id: 4, name: 'Ortalama Çözüm Süresi', value: '0 gün' },
        ]);
      }
    } catch (error) {
      console.error('İstatistikler getirilirken hata oluştu:', error);
      
      // Hata durumunda varsayılan değerler göster
      setStats([
        { id: 1, name: 'Toplam Sorun', value: '0' },
        { id: 2, name: 'Çözümlenen Sorunlar', value: '0' },
        { id: 3, name: 'Aktif Kullanıcılar', value: '0' },
        { id: 4, name: 'Ortalama Çözüm Süresi', value: '0 gün' },
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Sayfa yüklendiğinde istatistikleri getir
  useEffect(() => {
    fetchStats();
  }, []);

  // Yenileme işlemi
  const onRefresh = () => {
    fetchStats(true);
  };

  // Yeni bildirim oluştur
  const navigateToCreateReport = () => {
    navigation.navigate('CreateIssue');
  };

  // Sorunlara git
  const navigateToIssues = () => {
    navigation.navigate('Issues');
  };

  // Chatbot'a git
  const navigateToChatbot = () => {
    navigation.navigate('Chatbot');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Bağlantı Durumu Çubuğu */}
      {isOffline && (
        <TouchableOpacity
          style={styles.connectionStatusBar}
          onPress={checkConnection}
          activeOpacity={0.7}
        >
          <Icon name="wifi-off" size={18} color="#fff" />
          <Text style={styles.connectionStatusText}>
            Sunucu bağlantısı kurulamadı. Yenilemek için dokunun.
          </Text>
        </TouchableOpacity>
      )}

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Hero Bölümü */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Şehir Sorunlarını Bildirin ve Takip Edin</Text>
          <Text style={styles.heroSubtitle}>
            Hoş geldiniz, {user?.name || 'Kullanıcı'}
          </Text>
          <Text style={styles.heroDescription}>
            Yaşadığınız şehirdeki sorunları hızlıca bildirin ve çözüm sürecini adım adım takip edin.
          </Text>
          
          <View style={styles.heroBtnContainer}>
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={navigateToCreateReport}
            >
              <Text style={styles.primaryButtonText}>Sorun Bildir</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={navigateToIssues}
            >
              <Text style={styles.secondaryButtonText}>Sorunları Görüntüle</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.aiButton}
              onPress={navigateToChatbot}
            >
              <Icon name="smart-toy" size={20} color="#fff" />
              <Text style={styles.aiButtonText}>Şehir Asistanı</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Nasıl Çalışır Bölümü */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Nasıl Çalışır?</Text>
          
          <View style={styles.featureCard}>
            <View style={styles.featureIconContainer}>
              <Text style={styles.featureIconText}>1</Text>
            </View>
            <Text style={styles.featureTitle}>Sorun Bildirin</Text>
            <Text style={styles.featureDescription}>
              Şehrinizde karşılaştığınız altyapı, ulaşım, çevre veya diğer sorunları detaylı bir şekilde bildirin.
            </Text>
          </View>
          
          <View style={styles.featureCard}>
            <View style={styles.featureIconContainer}>
              <Text style={styles.featureIconText}>2</Text>
            </View>
            <Text style={styles.featureTitle}>Takip Edin</Text>
            <Text style={styles.featureDescription}>
              Bildirdiğiniz sorunun durumunu ve çözüm sürecini gerçek zamanlı olarak takip edin.
            </Text>
          </View>
          
          <View style={styles.featureCard}>
            <View style={styles.featureIconContainer}>
              <Text style={styles.featureIconText}>3</Text>
            </View>
            <Text style={styles.featureTitle}>Sonuçları Görün</Text>
            <Text style={styles.featureDescription}>
              Sorunların çözüldüğünü görün ve daha yaşanabilir bir şehir oluşumuna katkıda bulunun.
            </Text>
          </View>
        </View>

        {/* İstatistikler Bölümü */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Rakamlarla Platformumuz</Text>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
            </View>
          ) : (
            <View style={styles.statsContainer}>
              {stats.map((stat) => (
                <View key={stat.id} style={styles.statCard}>
                  <Text style={styles.statName}>{stat.name}</Text>
                  <Text style={styles.statValue}>{stat.value}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* CTA Bölümü */}
        <View style={styles.ctaSection}>
          <Text style={styles.ctaTitle}>Şehrinizi İyileştirmeye Yardımcı Olun</Text>
          <Text style={styles.ctaDescription}>
            Yaşadığınız sorunları bildirerek şehrinizin daha yaşanabilir olmasına katkıda bulunun.
          </Text>
          
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={navigateToCreateReport}
          >
            <Text style={styles.primaryButtonText}>Sorun Bildirmeye Başlayın</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Sabit Bildirim Oluşturma Butonu */}
      <TouchableOpacity 
        style={styles.addButton} 
        onPress={navigateToCreateReport}
      >
        <Icon name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  connectionStatusBar: {
    backgroundColor: '#ef4444',
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderRadius: 4,
    marginHorizontal: 8,
  },
  connectionStatusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  heroSection: {
    backgroundColor: '#3b82f6',
    padding: 20,
    paddingTop: 40,
    paddingBottom: 30,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#e6effd',
    marginTop: 4,
    marginBottom: 10,
  },
  heroDescription: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  heroBtnContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginHorizontal: 8,
    minWidth: 150,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#3b82f6',
    fontWeight: 'bold',
    fontSize: 14,
  },
  secondaryButton: {
    backgroundColor: '#1d4ed8',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginHorizontal: 8,
    minWidth: 150,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  aiButton: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginHorizontal: 8,
    minWidth: 150,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  aiButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  sectionContainer: {
    padding: 20,
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  featureCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  featureIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ebf5ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureIconText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  statsSection: {
    backgroundColor: '#f0f4f8',
    padding: 20,
    borderRadius: 12,
    margin: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  ctaSection: {
    backgroundColor: '#2563eb',
    padding: 25,
    borderRadius: 12,
    margin: 20,
    alignItems: 'center',
    marginBottom: 30,
  },
  ctaTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  ctaDescription: {
    fontSize: 14,
    color: '#e6effd',
    textAlign: 'center',
    marginBottom: 20,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#3b82f6',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});

export default HomeScreen; 