import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  RefreshControl,
  Linking
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Picker } from '@react-native-picker/picker';
import { PieChart, BarChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';

const screenWidth = Dimensions.get('window').width;

const AdminReportsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    byStatus: [],
    byCategory: [],
    byCity: [],
    byDistrict: [],
    byMonth: []
  });
  const [timeRange, setTimeRange] = useState('last30days');
  const [filterType, setFilterType] = useState('status');
  const [downloadLoading, setDownloadLoading] = useState(false);
  
  // İstatistikleri yükle
  const loadStats = async () => {
    try {
      setLoading(true);
      console.log(`İstatistikler yükleniyor... Seçilen zaman aralığı: ${timeRange}`);
      
      // API'den istatistikleri al
      const response = await api.admin.getStats(timeRange);
      console.log('API yanıtı:', response.success ? 'Başarılı' : 'Başarısız');
      
      if (response.success && response.data) {
        console.log('Alınan istatistik verileri:');
        console.log('- Durum dağılımı:', response.data.byStatus?.length || 0, 'kayıt');
        console.log('- Kategori dağılımı:', response.data.byCategory?.length || 0, 'kayıt');
        console.log('- Şehir dağılımı:', response.data.byCity?.length || 0, 'kayıt');
        console.log('- İlçe dağılımı:', response.data.byDistrict?.length || 0, 'kayıt');
        console.log('- Aylık dağılım:', response.data.byMonth?.length || 0, 'kayıt');
        
        // İlçe verisi var mı kontrol et
        if (response.data.byDistrict && response.data.byDistrict.length > 0) {
          console.log('İlk ilçe kaydı örneği:', JSON.stringify(response.data.byDistrict[0]));
        } else {
          console.warn('İlçe verisi bulunamadı');
        }
        
        // Eğer API yanıtında total değeri yoksa, durum verilerinden hesapla
        const totalIssues = response.data.total || 
          (response.data.byStatus && response.data.byStatus.length > 0 
            ? response.data.byStatus.reduce((sum, item) => sum + item.count, 0)
            : 0);
        
        // Kullanıcı rolüne göre görselleştirme verilerini ayarla
        setStats({
          ...response.data,
          total: totalIssues,
          // Eğer municipal_worker ise ve şehri tanımlıysa, ilçe dağılımını filtreleme
          byDistrict: user?.role === 'municipal_worker' && user?.city ? 
            (response.data.byDistrict || []).filter(item => 
              item.city && item.city.toLowerCase() === user.city.toLowerCase()
            ) : 
            (response.data.byDistrict || [])
        });
      } else {
        console.error('İstatistik verileri alınamadı:', response.message);
        Alert.alert('Hata', response.message || 'İstatistikler yüklenirken bir hata oluştu.');
      }
    } catch (error) {
      console.error('İstatistikler yüklenirken hata:', error);
      Alert.alert('Hata', 'İstatistikler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  useEffect(() => {
    loadStats();
  }, [timeRange]);
  
  // Yenileme işlemi
  const onRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  // Durum rengini belirle
  const getStatusColor = (status) => {
    switch (status) {
      case 'Yeni':
      case 'pending':
        return '#3498db'; // Mavi
      case 'İnceleniyor':
      case 'in_progress':
        return '#f39c12'; // Turuncu
      case 'Çözüldü':
      case 'resolved':
        return '#2ecc71'; // Yeşil
      case 'Reddedildi':
      case 'rejected':
        return '#e74c3c'; // Kırmızı
      default:
        return '#95a5a6'; // Gri
    }
  };

  // Durum kodunu Türkçe metne çevir
  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'Yeni';
      case 'in_progress':
        return 'İnceleniyor';
      case 'resolved':
        return 'Çözüldü';
      case 'rejected':
        return 'Reddedildi';
      default:
        return status;
    }
  };

  // Kategori rengini belirle
  const getCategoryColor = (category, index) => {
    const colors = [
      '#1abc9c', '#2ecc71', '#3498db', '#9b59b6', 
      '#f1c40f', '#e67e22', '#e74c3c', '#34495e'
    ];
    
    switch (category) {
      case 'Altyapı':
        return '#3498db';
      case 'Üstyapı':
        return '#2ecc71';
      case 'Çevre':
        return '#1abc9c';
      case 'Ulaşım':
        return '#f1c40f';
      case 'Güvenlik':
        return '#e74c3c';
      case 'Temizlik':
        return '#9b59b6';
      case 'Diğer':
        return '#95a5a6';
      default:
        return colors[index % colors.length];
    }
  };
  
  // Pasta grafik verisi (durum)
  const getStatusPieData = () => {
    if (!stats.byStatus || stats.byStatus.length === 0) {
      console.log('Durum verisi bulunamadı veya boş:', stats.byStatus);
      return [];
    }
    
    console.log('Durum verileri (ham):', JSON.stringify(stats.byStatus));
    
    // Durum verilerini dönüştürme
    const processedData = stats.byStatus.map(item => {
      // item.status veya item._id'yi kontrol et (backend yanıtına göre değişebilir)
      const statusName = item.status || item._id || 'Bilinmeyen Durum';
      return {
        name: getStatusText(statusName),
        count: item.count,
        color: getStatusColor(statusName),
        legendFontColor: '#7F7F7F',
        legendFontSize: 12
      };
    });
    
    console.log('İşlenmiş durum verileri:', JSON.stringify(processedData));
    return processedData;
  };
  
  // Pasta grafik verisi (kategori)
  const getCategoryPieData = () => {
    if (!stats.byCategory || stats.byCategory.length === 0) {
      console.log('Kategori verisi bulunamadı veya boş:', stats.byCategory);
      return [];
    }
    
    console.log('Kategori verileri (ham):', JSON.stringify(stats.byCategory));
    
    // Kategori verilerini dönüştürme
    const processedData = stats.byCategory.map((item, index) => {
      // item.category veya item._id'yi kontrol et (backend yanıtına göre değişebilir)
      const categoryName = item.category || item._id || 'Bilinmeyen Kategori';
      return {
        name: categoryName,
        count: item.count,
        color: getCategoryColor(categoryName, index),
        legendFontColor: '#7F7F7F',
        legendFontSize: 12
      };
    });
    
    console.log('İşlenmiş kategori verileri:', JSON.stringify(processedData));
    return processedData;
  };
  
  // Pasta grafik verisi (ilçe)
  const getDistrictPieData = () => {
    if (!stats.byDistrict || stats.byDistrict.length === 0) {
      console.log('İlçe verisi bulunamadı veya boş:', stats.byDistrict);
      return [];
    }
    
    console.log('İlçe verileri (ham):', JSON.stringify(stats.byDistrict));
    
    // İlçe verilerini dönüştürme
    const processedData = stats.byDistrict.map((item, index) => {
      // item.district veya item._id'yi kontrol et (backend yanıtına göre değişebilir)
      const districtName = item.district || item._id || 'Bilinmeyen İlçe';
      
      console.log(`İlçe #${index+1}:`, {
        district: districtName,
        count: item.count,
        city: item.city || 'N/A' 
      });
      
      return {
        name: districtName,
        count: item.count,
        color: `rgba(${Math.floor(Math.random() * 200)}, ${Math.floor(Math.random() * 200)}, ${Math.floor(Math.random() * 200)}, 1)`,
        legendFontColor: '#7F7F7F',
        legendFontSize: 12
      };
    });
    
    console.log('İşlenmiş ilçe verileri:', JSON.stringify(processedData));
    return processedData.slice(0, 5);
  };
  
  // Pasta grafik verisi (şehir) - Yöneticiler için
  const getCityPieData = () => {
    if (!stats.byCity || stats.byCity.length === 0) {
      console.log('Şehir verisi bulunamadı veya boş:', stats.byCity);
      return [];
    }
    
    console.log('Şehir verileri (ham):', JSON.stringify(stats.byCity));
    
    // Şehir verilerini dönüştürme
    const processedData = stats.byCity.map((item, index) => {
      // item.city veya item._id'yi kontrol et (backend yanıtına göre değişebilir)
      const cityName = item.city || item._id || 'Bilinmeyen Şehir';
      return {
        name: cityName,
        count: item.count,
        color: `rgba(${Math.floor(Math.random() * 200)}, ${Math.floor(Math.random() * 200)}, ${Math.floor(Math.random() * 200)}, 1)`,
        legendFontColor: '#7F7F7F',
        legendFontSize: 12
      };
    });
    
    console.log('İşlenmiş şehir verileri:', JSON.stringify(processedData));
    return processedData.slice(0, 5);
  };
  
  // Çubuk grafik verisi (aylık)
  const getMonthlyBarData = () => {
    if (!stats.byMonth || stats.byMonth.length === 0) {
      console.log('Aylık veri bulunamadı veya boş:', stats.byMonth);
      return {
        labels: [],
        datasets: [{ data: [] }]
      };
    }
    
    console.log('Aylık veriler (ham):', JSON.stringify(stats.byMonth));
    
    try {
      // Veri formatını kontrol et ve düzelt
      const processedMonthData = stats.byMonth.map(item => {
        // Backend'den gelen format farklı olabilir
        // _id string (örn. "2023-05") veya object (örn. {year: 2023, month: 5}) olabilir
        let year, month;
        
        if (typeof item._id === 'string' && item._id.includes('-')) {
          // String format: "2023-05"
          const parts = item._id.split('-');
          year = parseInt(parts[0]);
          month = parseInt(parts[1]);
        } else if (item._id && typeof item._id === 'object') {
          // Object format: {year: 2023, month: 5}
          year = item._id.year;
          month = item._id.month;
        } else {
          // Diğer durumlar - doğrudan year ve month özelliklerini kullan
          year = item.year || new Date().getFullYear();
          month = item.month || 1;
        }
        
        return {
          year,
          month,
          count: item.count
        };
      });
      
      const sortedMonths = [...processedMonthData].sort((a, b) => {
        // Yıl ve ay bilgilerine göre sırala
        if (a.year !== b.year) {
          return a.year - b.year;
        }
        return a.month - b.month;
      });
      
      console.log('İşlenmiş aylık veriler:', JSON.stringify(sortedMonths));
      
      const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
      
      return {
        labels: sortedMonths.map(item => `${months[item.month - 1]} ${item.year}`),
        datasets: [
          {
            data: sortedMonths.map(item => item.count)
          }
        ]
      };
    } catch (error) {
      console.error('Aylık verileri işlerken hata:', error);
      return {
        labels: [],
        datasets: [{ data: [] }]
      };
    }
  };
  
  // Çizelge konfigürasyonu
  const chartConfig = {
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    color: (opacity = 1) => `rgba(52, 152, 219, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 0
  };
  
  // Aktif filtreye göre grafik
  const renderChart = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
        </View>
      );
    }
    
    switch (filterType) {
      case 'status':
        return (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Duruma Göre Dağılım</Text>
            {getStatusPieData().length > 0 ? (
              <PieChart
                data={getStatusPieData()}
                width={screenWidth - 32}
                height={220}
                chartConfig={chartConfig}
                accessor="count"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
              />
            ) : (
              <Text style={styles.noDataText}>Veri bulunamadı</Text>
            )}
          </View>
        );
        
      case 'category':
        return (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Kategoriye Göre Dağılım</Text>
            {getCategoryPieData().length > 0 ? (
              <PieChart
                data={getCategoryPieData()}
                width={screenWidth - 32}
                height={220}
                chartConfig={chartConfig}
                accessor="count"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
              />
            ) : (
              <Text style={styles.noDataText}>Veri bulunamadı</Text>
            )}
          </View>
        );
        
      case 'district':
        return (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>
              {user?.role === 'municipal_worker' ? `${user.city} İlçelerine Göre Dağılım` : 'İlçelere Göre Dağılım (İlk 5)'}
            </Text>
            {getDistrictPieData().length > 0 ? (
              <PieChart
                data={getDistrictPieData()}
                width={screenWidth - 32}
                height={220}
                chartConfig={chartConfig}
                accessor="count"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
              />
            ) : (
              <Text style={styles.noDataText}>Veri bulunamadı</Text>
            )}
          </View>
        );
      
      case 'city':
        // Yalnızca admin kullanıcılar için şehir dağılımı göster
        return (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Şehirlere Göre Dağılım (İlk 5)</Text>
            {getCityPieData().length > 0 ? (
              <PieChart
                data={getCityPieData()}
                width={screenWidth - 32}
                height={220}
                chartConfig={chartConfig}
                accessor="count"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
              />
            ) : (
              <Text style={styles.noDataText}>Veri bulunamadı</Text>
            )}
          </View>
        );
        
      case 'monthly':
        const monthlyData = getMonthlyBarData();
        return (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Aylık Sorun Sayısı</Text>
            {monthlyData.labels.length > 0 ? (
              <BarChart
                data={monthlyData}
                width={screenWidth - 32}
                height={220}
                chartConfig={chartConfig}
                verticalLabelRotation={0}
                fromZero
              />
            ) : (
              <Text style={styles.noDataText}>Veri bulunamadı</Text>
            )}
          </View>
        );
        
      default:
        return null;
    }
  };

  // PDF Raporu oluşturma ve indirme
  const generateAndSharePDF = async () => {
    try {
      setDownloadLoading(true);
      
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Hata', 'Oturum bilgilerinize erişilemedi. Lütfen tekrar giriş yapın.');
        setDownloadLoading(false);
        return;
      }
      
      // Backend'deki PDF indirme endpoint'i
      const baseUrl = api.getBaseUrl ? api.getBaseUrl() : 'http://localhost:5001/api';
      // URL'e token ekle
      const pdfUrl = `${baseUrl}/admin/reports/export/pdf?timeRange=${timeRange}&filterType=${filterType}&token=${token}`;
      
      console.log('PDF indirme URL:', pdfUrl);
      
      // URL'i tarayıcıda aç
      const canOpen = await Linking.canOpenURL(pdfUrl);
      
      if (canOpen) {
        await Linking.openURL(pdfUrl);
        
        // Kullanıcıya indirme başarılı mesajı göster
        Alert.alert(
          'İşlem Başarılı',
          'Tarayıcıda raporu görüntüleyebilir ve indirebilirsiniz.',
          [{ text: 'Tamam' }]
        );
      } else {
        Alert.alert('Hata', 'Rapor indirme bağlantısı açılamadı. Lütfen daha sonra tekrar deneyin.');
      }
    } catch (error) {
      console.error('PDF raporu indirme hatası:', error);
      Alert.alert('Hata', 'PDF raporu indirilemedi. Lütfen internet bağlantınızı kontrol edin ve tekrar deneyin.');
    } finally {
      setDownloadLoading(false);
    }
  };
  
  // CSV Raporu oluşturma ve indirme
  const generateAndShareCSV = async () => {
    try {
      setDownloadLoading(true);
      
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Hata', 'Oturum bilgilerinize erişilemedi. Lütfen tekrar giriş yapın.');
        setDownloadLoading(false);
        return;
      }
      
      // Backend'deki CSV indirme endpoint'i
      const baseUrl = api.getBaseUrl ? api.getBaseUrl() : 'http://localhost:5001/api';
      // URL'e token ekle
      const csvUrl = `${baseUrl}/admin/reports/export/csv?timeRange=${timeRange}&filterType=${filterType}&token=${token}`;
      
      console.log('CSV indirme URL:', csvUrl);
      
      // URL'i tarayıcıda aç
      const canOpen = await Linking.canOpenURL(csvUrl);
      
      if (canOpen) {
        await Linking.openURL(csvUrl);
        
        // Kullanıcıya indirme başarılı mesajı göster
        Alert.alert(
          'İşlem Başarılı',
          'Tarayıcıda raporu görüntüleyebilir ve indirebilirsiniz.',
          [{ text: 'Tamam' }]
        );
      } else {
        Alert.alert('Hata', 'Rapor indirme bağlantısı açılamadı. Lütfen daha sonra tekrar deneyin.');
      }
    } catch (error) {
      console.error('CSV raporu indirme hatası:', error);
      Alert.alert('Hata', 'CSV raporu indirilemedi. Lütfen internet bağlantınızı kontrol edin ve tekrar deneyin.');
    } finally {
      setDownloadLoading(false);
    }
  };
  
  // Seçilen zaman aralığının adını döndür
  const getTimeRangeText = (range) => {
    switch(range) {
      case 'last7days': return 'Son 7 Gün';
      case 'last30days': return 'Son 30 Gün';
      case 'last90days': return 'Son 90 Gün';
      case 'lastYear': return 'Son 1 Yıl';
      case 'all': return 'Tüm Zamanlar';
      default: return 'Son 30 Gün';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#2c3e50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>İstatistikler ve Raporlar</Text>
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Özet Kartlar */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <View style={[styles.summaryIconContainer, {backgroundColor: '#e3f2fd'}]}>
                <Icon name="fiber-new" size={22} color="#3498db" />
              </View>
              <Text style={styles.summaryNumber}>
                {stats.byStatus?.find(s => s.status === 'Yeni' || s.status === 'pending')?.count || 0}
              </Text>
              <Text style={styles.summaryLabel}>Yeni</Text>
            </View>
            
            <View style={styles.summaryCard}>
              <View style={[styles.summaryIconContainer, {backgroundColor: '#e8f5e9'}]}>
                <Icon name="check-circle" size={22} color="#2ecc71" />
              </View>
              <Text style={styles.summaryNumber}>
                {stats.byStatus?.find(s => s.status === 'Çözüldü' || s.status === 'resolved')?.count || 0}
              </Text>
              <Text style={styles.summaryLabel}>Çözüldü</Text>
            </View>
          </View>
          
          <View style={[styles.summaryRow, {marginTop: 8}]}>
            <View style={styles.summaryCard}>
              <View style={[styles.summaryIconContainer, {backgroundColor: '#ffebee'}]}>
                <Icon name="cancel" size={22} color="#e74c3c" />
              </View>
              <Text style={styles.summaryNumber}>
                {stats.byStatus?.find(s => s.status === 'Reddedildi' || s.status === 'rejected')?.count || 0}
              </Text>
              <Text style={styles.summaryLabel}>Reddedildi</Text>
            </View>
            
            <View style={styles.summaryCard}>
              <View style={[styles.summaryIconContainer, {backgroundColor: '#fff8e1'}]}>
                <Icon name="assignment-late" size={22} color="#f39c12" />
              </View>
              <Text style={styles.summaryNumber}>
                {stats.byStatus?.find(s => s.status === 'İnceleniyor' || s.status === 'in_progress')?.count || 0}
              </Text>
              <Text style={styles.summaryLabel}>İşlemdeki</Text>
            </View>
          </View>
        </View>
        
        {/* Zaman Aralığı Seçimi */}
        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>Zaman Aralığı</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={timeRange}
              onValueChange={(itemValue) => setTimeRange(itemValue)}
              style={styles.picker}
              mode="dropdown"
            >
              <Picker.Item label="Son 30 Gün" value="last30days" />
              <Picker.Item label="Son 90 Gün" value="last90days" />
              <Picker.Item label="Son 6 Ay" value="last6months" />
              <Picker.Item label="Son 1 Yıl" value="last1year" />
              <Picker.Item label="Tüm Zamanlar" value="alltime" />
            </Picker>
          </View>
        </View>
        
        {/* Grafik Seçimi */}
        <View style={styles.chartTypeContainer}>
          <TouchableOpacity
            style={[styles.chartTypeButton, filterType === 'status' && styles.chartTypeButtonActive]}
            onPress={() => setFilterType('status')}
          >
            <Text style={[styles.chartTypeText, filterType === 'status' && styles.chartTypeTextActive]}>
              Durum
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.chartTypeButton, filterType === 'category' && styles.chartTypeButtonActive]}
            onPress={() => setFilterType('category')}
          >
            <Text style={[styles.chartTypeText, filterType === 'category' && styles.chartTypeTextActive]}>
              Kategori
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.chartTypeButton, filterType === 'district' && styles.chartTypeButtonActive]}
            onPress={() => setFilterType('district')}
          >
            <Text style={[styles.chartTypeText, filterType === 'district' && styles.chartTypeTextActive]}>
              İlçe
            </Text>
          </TouchableOpacity>
          
          {/* Şehir filtresini yalnızca admin kullanıcılar için göster */}
          {user?.role === 'admin' && (
            <TouchableOpacity
              style={[styles.chartTypeButton, filterType === 'city' && styles.chartTypeButtonActive]}
              onPress={() => setFilterType('city')}
            >
              <Text style={[styles.chartTypeText, filterType === 'city' && styles.chartTypeTextActive]}>
                Şehir
              </Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.chartTypeButton, filterType === 'monthly' && styles.chartTypeButtonActive]}
            onPress={() => setFilterType('monthly')}
          >
            <Text style={[styles.chartTypeText, filterType === 'monthly' && styles.chartTypeTextActive]}>
              Aylık
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Grafik */}
        {renderChart()}
        
        {/* Detaylı Liste */}
        <View style={styles.detailsContainer}>
          <Text style={styles.detailsTitle}>Detaylı İstatistikler</Text>
          
          {filterType === 'status' && stats.byStatus && (
            <View style={styles.detailsList}>
              {stats.byStatus.map((item, index) => {
                // Durum adı item.status veya item._id'den alınabilir
                const statusName = item.status || item._id || 'Bilinmeyen Durum';
                return (
                  <View key={index} style={styles.detailsItem}>
                    <View style={[styles.colorIndicator, { backgroundColor: getStatusColor(statusName) }]} />
                    <Text style={styles.detailsLabel}>{getStatusText(statusName)}</Text>
                    <Text style={styles.detailsValue}>{item.count}</Text>
                    <Text style={styles.detailsPercent}>
                      {stats.total ? `${Math.round((item.count / stats.total) * 100)}%` : '0%'}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
          
          {filterType === 'category' && stats.byCategory && (
            <View style={styles.detailsList}>
              {stats.byCategory.map((item, index) => {
                // Kategori adı item.category veya item._id'den alınabilir
                const categoryName = item.category || item._id || 'Bilinmeyen Kategori';
                return (
                  <View key={index} style={styles.detailsItem}>
                    <View style={[styles.colorIndicator, { backgroundColor: getCategoryColor(categoryName, index) }]} />
                    <Text style={styles.detailsLabel}>{categoryName}</Text>
                    <Text style={styles.detailsValue}>{item.count}</Text>
                    <Text style={styles.detailsPercent}>
                      {stats.total ? `${Math.round((item.count / stats.total) * 100)}%` : '0%'}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
          
          {filterType === 'district' && stats.byDistrict && (
            <View style={styles.detailsList}>
              {stats.byDistrict.map((item, index) => {
                // İlçe adı item.district veya item._id'den alınabilir
                const districtName = item.district || item._id || 'Bilinmeyen İlçe';
                return (
                  <View key={index} style={styles.detailsItem}>
                    <View 
                      style={[
                        styles.colorIndicator, 
                        { backgroundColor: `rgba(${Math.floor(Math.random() * 200)}, ${Math.floor(Math.random() * 200)}, ${Math.floor(Math.random() * 200)}, 1)` }
                      ]} 
                    />
                    <Text style={styles.detailsLabel} numberOfLines={1}>{districtName}</Text>
                    <Text style={styles.detailsValue}>{item.count}</Text>
                    <Text style={styles.detailsPercent}>
                      {stats.total ? `${Math.round((item.count / stats.total) * 100)}%` : '0%'}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
          
          {filterType === 'city' && stats.byCity && user?.role === 'admin' && (
            <View style={styles.detailsList}>
              {stats.byCity.map((item, index) => {
                // Şehir adı item.city veya item._id'den alınabilir
                const cityName = item.city || item._id || 'Bilinmeyen Şehir';
                return (
                  <View key={index} style={styles.detailsItem}>
                    <View 
                      style={[
                        styles.colorIndicator, 
                        { backgroundColor: `rgba(${Math.floor(Math.random() * 200)}, ${Math.floor(Math.random() * 200)}, ${Math.floor(Math.random() * 200)}, 1)` }
                      ]} 
                    />
                    <Text style={styles.detailsLabel} numberOfLines={1}>{cityName}</Text>
                    <Text style={styles.detailsValue}>{item.count}</Text>
                    <Text style={styles.detailsPercent}>
                      {stats.total ? `${Math.round((item.count / stats.total) * 100)}%` : '0%'}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
          
          {filterType === 'monthly' && stats.byMonth && (
            <View style={styles.detailsList}>
              {getMonthlyBarData().labels.map((label, index) => {
                const monthData = getMonthlyBarData().datasets[0].data[index];
                return (
                  <View key={index} style={styles.detailsItem}>
                    <View style={[styles.colorIndicator, { backgroundColor: '#3498db' }]} />
                    <Text style={styles.detailsLabel}>{label}</Text>
                    <Text style={styles.detailsValue}>{monthData}</Text>
                    <Text style={styles.detailsPercent}>
                      {stats.total ? `${Math.round((monthData / stats.total) * 100)}%` : '0%'}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
        
        {/* Rapor İndirme Butonları */}
        <View style={styles.reportButtonsContainer}>
        <TouchableOpacity 
            style={[styles.reportButton, downloadLoading && styles.reportButtonDisabled]}
            onPress={generateAndSharePDF}
            disabled={downloadLoading}
          >
            {downloadLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Icon name="picture-as-pdf" size={20} color="#fff" />
                <Text style={styles.reportButtonText}>PDF İndir</Text>
              </>
            )}
        </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.reportButton, styles.csvButton, downloadLoading && styles.reportButtonDisabled]}
            onPress={generateAndShareCSV}
            disabled={downloadLoading}
          >
            {downloadLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Icon name="format-list-numbered" size={20} color="#fff" />
                <Text style={styles.reportButtonText}>CSV İndir</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  scrollView: {
    flex: 1,
  },
  summaryContainer: {
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  summaryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  filterContainer: {
    padding: 16,
    paddingTop: 0,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  picker: {
    height: 40,
  },
  chartTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  chartTypeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#f2f2f2',
    marginBottom: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  chartTypeButtonActive: {
    backgroundColor: '#3498db',
  },
  chartTypeText: {
    fontSize: 12,
    color: '#34495e',
  },
  chartTypeTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  chartContainer: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 8,
    elevation: 2,
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  loadingContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    height: 220,
    textAlign: 'center',
    textAlignVertical: 'center',
    color: '#95a5a6',
  },
  detailsContainer: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 8,
    elevation: 2,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  detailsList: {
    
  },
  detailsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  detailsLabel: {
    flex: 2,
    fontSize: 14,
    color: '#34495e',
  },
  detailsValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'right',
  },
  detailsPercent: {
    flex: 1,
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'right',
  },
  reportButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  reportButton: {
    backgroundColor: '#3498db',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    margin: 16,
    marginTop: 8,
  },
  reportButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  reportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  csvButton: {
    backgroundColor: '#2ecc71',
  },
});

export default AdminReportsScreen; 