import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Picker } from '@react-native-picker/picker';
import { PieChart, BarChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import api from '../utils/api';

const screenWidth = Dimensions.get('window').width;

const AdminReportsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    byStatus: [],
    byCategory: [],
    byDistrict: [],
    byMonth: []
  });
  const [timeRange, setTimeRange] = useState('last30days');
  const [filterType, setFilterType] = useState('status');
  
  // İstatistikleri yükle
  const loadStats = async () => {
    try {
      setLoading(true);
      
      // API'den istatistikleri al
      const response = await api.admin.getStats(timeRange);
      
      if (response.success && response.data) {
        setStats(response.data);
      } else {
        Alert.alert('Hata', 'İstatistikler yüklenirken bir hata oluştu.');
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
      return [];
    }
    
    return stats.byStatus.map(item => ({
      name: item.status,
      count: item.count,
      color: getStatusColor(item.status),
      legendFontColor: '#7F7F7F',
      legendFontSize: 12
    }));
  };
  
  // Pasta grafik verisi (kategori)
  const getCategoryPieData = () => {
    if (!stats.byCategory || stats.byCategory.length === 0) {
      return [];
    }
    
    return stats.byCategory.map((item, index) => ({
      name: item.category,
      count: item.count,
      color: getCategoryColor(item.category, index),
      legendFontColor: '#7F7F7F',
      legendFontSize: 12
    }));
  };
  
  // Pasta grafik verisi (ilçe)
  const getDistrictPieData = () => {
    if (!stats.byDistrict || stats.byDistrict.length === 0) {
      return [];
    }
    
    return stats.byDistrict.slice(0, 5).map((item, index) => ({
      name: item.district,
      count: item.count,
      color: `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 1)`,
      legendFontColor: '#7F7F7F',
      legendFontSize: 12
    }));
  };
  
  // Çubuk grafik verisi (aylık)
  const getMonthlyBarData = () => {
    if (!stats.byMonth || stats.byMonth.length === 0) {
      return {
        labels: [],
        datasets: [{ data: [] }]
      };
    }
    
    const sortedMonths = [...stats.byMonth].sort((a, b) => {
      const dateA = new Date(a.year, a.month - 1, 1);
      const dateB = new Date(b.year, b.month - 1, 1);
      return dateA - dateB;
    });
    
    const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    
    return {
      labels: sortedMonths.map(item => `${months[item.month - 1]}`),
      datasets: [
        {
          data: sortedMonths.map(item => item.count)
        }
      ]
    };
  };
  
  // Çizelge konfigürasyonu
  const chartConfig = {
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    color: (opacity = 1) => `rgba(52, 152, 219, ${opacity})`,
    strokeWidth: 2, // İsteğe bağlı
    barPercentage: 0.5,
    useShadowColorFromDataset: false, // İsteğe bağlı
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
            <Text style={styles.chartTitle}>İlçelere Göre Dağılım (İlk 5)</Text>
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
          <View style={styles.summaryCard}>
            <View style={styles.summaryIconContainer}>
              <Icon name="assignment" size={24} color="#3498db" />
            </View>
            <View style={styles.summaryContent}>
              <Text style={styles.summaryNumber}>{stats.total || 0}</Text>
              <Text style={styles.summaryLabel}>Toplam Sorun</Text>
            </View>
          </View>
          
          <View style={styles.summaryCard}>
            <View style={styles.summaryIconContainer}>
              <Icon name="assignment-returned" size={24} color="#2ecc71" />
            </View>
            <View style={styles.summaryContent}>
              <Text style={styles.summaryNumber}>
                {stats.byStatus?.find(s => s.status === 'Çözüldü' || s.status === 'resolved')?.count || 0}
              </Text>
              <Text style={styles.summaryLabel}>Çözülen</Text>
            </View>
          </View>
          
          <View style={styles.summaryCard}>
            <View style={styles.summaryIconContainer}>
              <Icon name="assignment-late" size={24} color="#f39c12" />
            </View>
            <View style={styles.summaryContent}>
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
              {stats.byStatus.map((item, index) => (
                <View key={index} style={styles.detailsItem}>
                  <View style={[styles.colorIndicator, { backgroundColor: getStatusColor(item.status) }]} />
                  <Text style={styles.detailsLabel}>{item.status}</Text>
                  <Text style={styles.detailsValue}>{item.count}</Text>
                  <Text style={styles.detailsPercent}>
                    {stats.total ? `${Math.round((item.count / stats.total) * 100)}%` : '0%'}
                  </Text>
                </View>
              ))}
            </View>
          )}
          
          {filterType === 'category' && stats.byCategory && (
            <View style={styles.detailsList}>
              {stats.byCategory.map((item, index) => (
                <View key={index} style={styles.detailsItem}>
                  <View style={[styles.colorIndicator, { backgroundColor: getCategoryColor(item.category, index) }]} />
                  <Text style={styles.detailsLabel}>{item.category}</Text>
                  <Text style={styles.detailsValue}>{item.count}</Text>
                  <Text style={styles.detailsPercent}>
                    {stats.total ? `${Math.round((item.count / stats.total) * 100)}%` : '0%'}
                  </Text>
                </View>
              ))}
            </View>
          )}
          
          {filterType === 'district' && stats.byDistrict && (
            <View style={styles.detailsList}>
              {stats.byDistrict.map((item, index) => (
                <View key={index} style={styles.detailsItem}>
                  <View 
                    style={[
                      styles.colorIndicator, 
                      { backgroundColor: `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 1)` }
                    ]} 
                  />
                  <Text style={styles.detailsLabel} numberOfLines={1}>{item.district}</Text>
                  <Text style={styles.detailsValue}>{item.count}</Text>
                  <Text style={styles.detailsPercent}>
                    {stats.total ? `${Math.round((item.count / stats.total) * 100)}%` : '0%'}
                  </Text>
                </View>
              ))}
            </View>
          )}
          
          {filterType === 'monthly' && stats.byMonth && (
            <View style={styles.detailsList}>
              {getMonthlyBarData().labels.map((label, index) => (
                <View key={index} style={styles.detailsItem}>
                  <View style={[styles.colorIndicator, { backgroundColor: '#3498db' }]} />
                  <Text style={styles.detailsLabel}>
                    {label} {stats.byMonth[index].year}
                  </Text>
                  <Text style={styles.detailsValue}>{stats.byMonth[index].count}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
        
        {/* Rapor İndirme Butonu */}
        <TouchableOpacity 
          style={styles.reportButton}
          onPress={() => {
            Alert.alert('Bilgi', 'Rapor indirme özelliği yakında eklenecektir.');
          }}
        >
          <Icon name="file-download" size={20} color="#fff" />
          <Text style={styles.reportButtonText}>Raporu İndir (PDF)</Text>
        </TouchableOpacity>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
  },
  summaryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f2f6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  summaryContent: {
    flex: 1,
  },
  summaryNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#7f8c8d',
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
  },
  chartTypeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#f2f2f2',
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
  reportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default AdminReportsScreen; 