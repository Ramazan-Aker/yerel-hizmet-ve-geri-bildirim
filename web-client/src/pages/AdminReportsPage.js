import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { adminService } from '../services/api';

const AdminReportsPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('last30days');
  const [stats, setStats] = useState({
    byStatus: [],
    byCategory: [],
    byDistrict: [],
    byCity: [],
    byMonth: []
  });
  
  // Renk paleti
  const colorPalette = {
    status: {
      'pending': '#FBBF24',
      'in_progress': '#3B82F6',
      'resolved': '#10B981',
      'rejected': '#EF4444'
    },
    category: [
      '#8B5CF6', '#F59E0B', '#10B981', '#3B82F6', 
      '#6366F1', '#EC4899', '#14B8A6', '#F97316',
      '#8B5CF6', '#06B6D4', '#D946EF', '#84CC16'
    ],
    district: [
      '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', 
      '#EC4899', '#F97316', '#6366F1', '#14B8A6',
      '#D946EF', '#84CC16', '#06B6D4', '#EF4444'
    ],
    city: [
      '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', 
      '#EC4899', '#F97316', '#6366F1', '#14B8A6',
      '#D946EF', '#84CC16', '#06B6D4', '#EF4444'
    ]
  };
  
  useEffect(() => {
    const fetchReportData = async () => {
      try {
        setLoading(true);
        
        // Gerçek API çağrısı yap
        const response = await adminService.getReports(timeRange);
        console.log('Rapor verileri:', response);
        
        if (response && response.data) {
          const reportData = response.data;
          
          // Durum dağılımını işle
          const statusData = reportData.byStatus ? reportData.byStatus.map((item, index) => ({
            name: getStatusText(item._id),
            count: item.count,
            color: colorPalette.status[item._id] || '#CBD5E1'
          })) : [];
          
          // Kategori dağılımını işle
          const categoryData = reportData.byCategory ? reportData.byCategory.map((item, index) => ({
            name: item._id || 'Diğer',
            count: item.count,
            color: colorPalette.category[index % colorPalette.category.length]
          })) : [];
          
          // İlçe dağılımını işle
          const districtData = reportData.byDistrict ? reportData.byDistrict.map((item, index) => ({
            name: item._id || 'Belirtilmemiş',
            count: item.count,
            color: colorPalette.district[index % colorPalette.district.length]
          })) : [];
          
          // Şehir dağılımını işle
          const cityData = reportData.byCity ? reportData.byCity.map((item, index) => ({
            name: item._id || 'Belirtilmemiş',
            count: item.count,
            color: colorPalette.city[index % colorPalette.city.length]
          })) : [];
          
          // Aylık dağılımı işle
          const monthData = reportData.byMonth || [];
          
          // İstatistikleri ayarla
          setStats({
            byStatus: statusData,
            byCategory: categoryData,
            byDistrict: districtData,
            byCity: cityData,
            byMonth: monthData
          });
        }
      } catch (error) {
        console.error('Rapor verileri alınırken hata:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchReportData();
  }, [timeRange]);
  
  // Durum kodunu metne çevir
  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Yeni';
      case 'in_progress': return 'İnceleniyor';
      case 'resolved': return 'Çözüldü';
      case 'rejected': return 'Reddedildi';
      default: return status;
    }
  };
  
  // Pasta grafik oluşturma
  const renderPieChart = (data) => {
    // Veri yoksa boş bir mesaj göster
    if (!data || !data.length) {
      return (
        <div className="text-center py-8 text-gray-500">
          Pasta grafik için veri bulunamadı
        </div>
      );
    }
    
    // Toplam hesapla ve 0 kontrolü yap
    const total = data.reduce((sum, item) => sum + (parseInt(item.count) || 0), 0);
    
    // Toplam 0 ise boş pasta grafik göster
    if (total <= 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          Gösterilecek veri bulunmuyor (toplam: 0)
        </div>
      );
    }
    
    // CSS ile pasta grafik dilimleri oluştur
    let cumulativePercent = 0;
    const pieSegments = [];
    
    data.forEach((item, index) => {
      if (!item.count || parseFloat(item.count) <= 0) return;
      
      const value = parseFloat(item.count);
      const percentage = (value / total) * 100;
      
      if (percentage < 1) return; // Çok küçük dilimleri gösterme
      
      const startPercent = cumulativePercent;
      cumulativePercent += percentage;
      
      // Her dilim için CSS conic-gradient parçası oluştur
      pieSegments.push({
        color: item.color || '#CBD5E1',
        start: startPercent,
        end: cumulativePercent,
        percentage,
        name: item.name,
        count: item.count
      });
    });
    
    // Conic gradient için string oluştur
    const conicGradient = pieSegments.map(segment => 
      `${segment.color} ${segment.start}% ${segment.end}%`
    ).join(', ');
    
    return (
      <div className="flex flex-col items-center my-4">
        <div 
          className="pie-chart relative w-52 h-52 rounded-full" 
          style={{
            background: `conic-gradient(${conicGradient})`,
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}
        >
          {/* Ortadaki beyaz daire */}
          <div className="absolute inset-0 m-auto w-20 h-20 bg-white rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-gray-700">Toplam: {total}</span>
          </div>
        </div>
        
        <div className="mt-6 grid grid-cols-2 gap-2 w-full">
          {pieSegments.map((segment, i) => (
            <div key={i} className="flex items-center">
              <div 
                className="w-4 h-4 rounded-full mr-2 flex-shrink-0" 
                style={{ backgroundColor: segment.color }}
              ></div>
              <div className="text-sm">
                <span className="font-medium">{segment.name}</span>
                <span className="text-gray-500 ml-1">
                  ({segment.count}, {Math.round(segment.percentage)}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Bar grafik oluşturma - kategori için optimizasyon
  const renderCategoryBarChart = (data) => {
    // Veri yoksa boş bir mesaj göster
    if (!data || !data.length) {
      return (
        <div className="text-center py-8 text-gray-500">
          Kategori verisi bulunamadı
        </div>
      );
    }
    
    // Tüm değerler 0 ise boş bir mesaj göster
    const hasNonZeroValue = data.some(item => (item.count || 0) > 0);
    if (!hasNonZeroValue) {
      return (
        <div className="text-center py-8 text-gray-500">
          Tüm kategoriler sıfır değerinde
        </div>
      );
    }
    
    const maxValue = Math.max(...data.map(item => parseFloat(item.count) || 0));
    
    return (
      <div className="p-4">
        <div className="max-w-full overflow-x-auto">
          <div style={{height: '220px', position: 'relative', marginBottom: '50px', minWidth: '100%'}}>
            {/* Yatay çizgiler - arka plan çizgileri */}
            <div style={{position: 'absolute', left: 0, right: 0, top: 0, bottom: 0}}>
              {[0, 1, 2, 3, 4].map((_, i) => (
                <div key={i} style={{
                  position: 'absolute',
                  left: 0, 
                  right: 0,
                  top: `${i * 25}%`,
                  height: '1px',
                  backgroundColor: '#f0f0f0'
                }}></div>
              ))}
            </div>
            
            <div style={{
              display: 'flex', 
              height: '100%', 
              alignItems: 'flex-end',
              position: 'relative',
              paddingLeft: '30px',
              paddingRight: '10px'
            }}>
              {/* Y ekseni etiketleri */}
              <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: '25px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'}}>
                {[maxValue, maxValue*0.75, maxValue*0.5, maxValue*0.25, 0].map((val, i) => (
                  <div key={i} style={{fontSize: '10px', color: '#666', textAlign: 'right', paddingRight: '5px'}}>
                    {Math.round(val)}
                  </div>
                ))}
              </div>
              
              {/* Çubuklar */}
              {data.map((item, index) => {
                const value = parseFloat(item.count) || 0;
                const barHeight = maxValue > 0 ? (value / maxValue) * 100 : 0;
                
                return (
                  <div key={index} style={{
                    flex: 1,
                    minWidth: '40px',
                    maxWidth: '100px',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    paddingBottom: '10px'
                  }}>
                    {/* Çubuk */}
                    <div style={{
                      width: '60%',
                      height: `${barHeight}%`,
                      backgroundColor: item.color || '#3B82F6',
                      borderRadius: '3px 3px 0 0',
                      position: 'relative',
                      minHeight: value > 0 ? '4px' : '0'
                    }}>
                      {/* Değer etiketi */}
                      <div style={{
                        position: 'absolute',
                        top: '-20px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontSize: '10px',
                        color: '#666',
                        whiteSpace: 'nowrap'
                      }}>
                        {value}
                      </div>
                    </div>
                    
                    {/* Kategori adı */}
                    <div style={{
                      position: 'absolute',
                      bottom: '-30px',
                      fontSize: '11px',
                      textAlign: 'center',
                      maxWidth: '90%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }} title={item.name || 'Bilinmeyen'}>
                      {item.name || 'Bilinmeyen'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Normal bar grafik - şehir dağılımı için
  const renderBarChart = (data) => {
    // Veri yoksa boş bir mesaj göster
    if (!data || !data.length) {
      return (
        <div className="text-center py-8 text-gray-500">
          Veri bulunamadı
        </div>
      );
    }
    
    // Tüm değerler 0 ise boş bir mesaj göster
    const hasNonZeroValue = data.some(item => (item.count || 0) > 0);
    if (!hasNonZeroValue) {
      return (
        <div className="text-center py-8 text-gray-500">
          Tüm değerler sıfır
        </div>
      );
    }
    
    const maxValue = Math.max(...data.map(item => parseFloat(item.count) || 0));
    
    // Şehir dağılımı için kategori grafiğiyle aynı yöntemi kullan
    return (
      <div className="p-4">
        <div className="max-w-full overflow-x-auto">
          <div style={{height: '220px', position: 'relative', marginBottom: '50px', minWidth: '100%'}}>
            {/* Yatay çizgiler - arka plan çizgileri */}
            <div style={{position: 'absolute', left: 0, right: 0, top: 0, bottom: 0}}>
              {[0, 1, 2, 3, 4].map((_, i) => (
                <div key={i} style={{
                  position: 'absolute',
                  left: 0, 
                  right: 0,
                  top: `${i * 25}%`,
                  height: '1px',
                  backgroundColor: '#f0f0f0'
                }}></div>
              ))}
            </div>
            
            <div style={{
              display: 'flex', 
              height: '100%', 
              alignItems: 'flex-end',
              position: 'relative',
              paddingLeft: '30px',
              paddingRight: '10px'
            }}>
              {/* Y ekseni etiketleri */}
              <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: '25px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'}}>
                {[maxValue, maxValue*0.75, maxValue*0.5, maxValue*0.25, 0].map((val, i) => (
                  <div key={i} style={{fontSize: '10px', color: '#666', textAlign: 'right', paddingRight: '5px'}}>
                    {Math.round(val)}
                  </div>
                ))}
              </div>
              
              {/* Çubuklar */}
              {data.map((item, index) => {
                const value = parseFloat(item.count) || 0;
                const barHeight = maxValue > 0 ? (value / maxValue) * 100 : 0;
                
                return (
                  <div key={index} style={{
                    flex: 1,
                    minWidth: '40px',
                    maxWidth: '100px',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    paddingBottom: '10px'
                  }}>
                    {/* Çubuk */}
                    <div style={{
                      width: '60%',
                      height: `${barHeight}%`,
                      backgroundColor: item.color || '#3B82F6',
                      borderRadius: '3px 3px 0 0',
                      position: 'relative',
                      minHeight: value > 0 ? '4px' : '0'
                    }}>
                      {/* Değer etiketi */}
                      <div style={{
                        position: 'absolute',
                        top: '-20px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontSize: '10px',
                        color: '#666',
                        whiteSpace: 'nowrap'
                      }}>
                        {value}
                      </div>
                    </div>
                    
                    {/* Şehir adı */}
                    <div style={{
                      position: 'absolute',
                      bottom: '-30px',
                      fontSize: '11px',
                      textAlign: 'center',
                      maxWidth: '90%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }} title={item.name || 'Bilinmeyen'}>
                      {item.name || 'Bilinmeyen'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Çizgi grafik oluşturma - Tamamen div tabanlı çözüm
  const renderLineChart = (data) => {
    // Veri yoksa veya tek nokta varsa NaN hatalarını önle
    if (!data || !data.length || data.length < 2) {
      return (
        <div className="text-center py-8 text-gray-500">
          Çizgi grafik için yeterli veri bulunmuyor (en az 2 nokta gerekli)
        </div>
      );
    }
    
    // Geçerli sayısal değerlere sahip veriler filtrele
    const validData = data.filter(item => 
      item && typeof item.count !== 'undefined' && 
      !isNaN(parseFloat(item.count)) && 
      isFinite(item.count)
    );
    
    // Geçerli veri sayısını kontrol et
    if (validData.length < 2) {
      return (
        <div className="text-center py-8 text-gray-500">
          Çizgi grafik için yeterli geçerli veri bulunmuyor
        </div>
      );
    }
    
    const maxValue = Math.max(...validData.map(item => parseFloat(item.count) || 0));
    
    // Maksimum değer 0 ise, boş bir grafik göster 
    if (maxValue <= 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          Grafik için yeterli değer bulunmuyor
        </div>
      );
    }
    
    try {
      // Line Chart için çizgileri oluştur
      return (
        <div className="my-4 overflow-hidden bg-white rounded-lg shadow">
          <div className="p-4">
            <div className="relative" style={{height: '200px'}}>
              {/* Yatay çizgiler - arka plan çizgileri */}
              <div className="absolute inset-0 flex flex-col justify-between">
                {[0, 1, 2, 3, 4].map((_, i) => (
                  <div key={i} className="w-full h-px bg-gray-100"></div>
                ))}
              </div>
              
              {/* Değer noktaları ve çizgiler */}
              <div className="absolute inset-0">
                {/* Her nokta ve çizgi */}
                {validData.map((item, index) => {
                  if (index === validData.length - 1) return null; // Son nokta için çizgi çizme
                  
                  const value1 = parseFloat(item.count) || 0;
                  const value2 = parseFloat(validData[index + 1].count) || 0;
                  
                  // 0-100 arası yüzde olarak değerleri hesapla
                  const percent1 = maxValue > 0 ? 100 - ((value1 / maxValue) * 100) : 0;
                  const percent2 = maxValue > 0 ? 100 - ((value2 / maxValue) * 100) : 0;
                  
                  // X konumlarını hesapla (0-100 arası)
                  const x1 = (index / (validData.length - 1)) * 100;
                  const x2 = ((index + 1) / (validData.length - 1)) * 100;
                  
                  return (
                    <div key={index} className="absolute bg-blue-500" 
                      style={{
                        height: '2px',
                        left: `${x1}%`,
                        width: `${x2 - x1}%`,
                        bottom: `${percent1}%`,
                        transform: `rotate(${Math.atan2((percent1 - percent2), (x2 - x1)) * (180 / Math.PI)}deg)`,
                        transformOrigin: 'left bottom'
                      }}>
                    </div>
                  );
                })}
                
                {/* Değer noktaları */}
                {validData.map((item, index) => {
                  const value = parseFloat(item.count) || 0;
                  const percentY = maxValue > 0 ? 100 - ((value / maxValue) * 100) : 0; // Y ekseni yüzdesi (tersine)
                  const percentX = (index / (validData.length - 1)) * 100; // X ekseni yüzdesi
                  
                  return (
                    <div key={`dot-${index}`} className="absolute" 
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: '#3B82F6',
                        border: '2px solid white',
                        bottom: `calc(${percentY}% - 5px)`,
                        left: `calc(${percentX}% - 5px)`,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                        zIndex: 10
                      }}>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-1 py-0.5 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none">
                        {value}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Y-ekseni değer etiketleri */}
              <div className="absolute inset-y-0 left-0 flex flex-col justify-between text-xs text-gray-500">
                {[0, maxValue/4, maxValue/2, (maxValue*3)/4, maxValue].map((val, i) => (
                  <div key={i} className="pr-1">{Math.round(val)}</div>
                ))}
              </div>
            </div>
            
            {/* X ekseni etiketleri */}
            <div className="flex justify-between mt-1">
              {validData.map((item, index) => (
                <div key={index} className="text-xs text-gray-600 px-1 whitespace-nowrap overflow-hidden text-ellipsis" 
                     style={{
                       maxWidth: `${100/validData.length}%`,
                       transform: index % 2 !== 0 ? 'translateY(10px)' : ''
                     }}>
                  {item.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    } catch (e) {
      console.error('Error rendering line chart', e);
      return (
        <div className="text-center py-8 text-gray-500">
          Grafik oluşturulurken bir hata oluştu
        </div>
      );
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">İstatistikler ve Raporlar</h1>
        <div className="text-sm text-gray-600">
          Son güncelleme: {new Date().toLocaleDateString('tr-TR')}
        </div>
      </div>
      
      {/* Zaman Aralığı Seçimi */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setTimeRange('last7days')} 
            className={`px-4 py-2 text-sm rounded-md ${timeRange === 'last7days' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}
          >
            Son 7 Gün
          </button>
          <button 
            onClick={() => setTimeRange('last30days')} 
            className={`px-4 py-2 text-sm rounded-md ${timeRange === 'last30days' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}
          >
            Son 30 Gün
          </button>
          <button 
            onClick={() => setTimeRange('last90days')} 
            className={`px-4 py-2 text-sm rounded-md ${timeRange === 'last90days' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}
          >
            Son 90 Gün
          </button>
          <button 
            onClick={() => setTimeRange('lastYear')} 
            className={`px-4 py-2 text-sm rounded-md ${timeRange === 'lastYear' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}
          >
            Son 1 Yıl
          </button>
          <button 
            onClick={() => setTimeRange('all')} 
            className={`px-4 py-2 text-sm rounded-md ${timeRange === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}
          >
            Tüm Zamanlar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Durum Dağılımı */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Durum Dağılımı</h2>
          </div>
          <div className="p-6">
            {stats.byStatus.length > 0 ? (
              <>
                {renderPieChart(stats.byStatus)}
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">Veri bulunamadı</div>
            )}
          </div>
        </div>
        
        {/* Kategori Dağılımı */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Kategori Dağılımı</h2>
          </div>
          <div className="p-6">
            {stats.byCategory.length > 0 ? (
              renderCategoryBarChart(stats.byCategory)
            ) : (
              <div className="text-center py-8 text-gray-500">Veri bulunamadı</div>
            )}
          </div>
        </div>
        
        {/* Şehir veya İlçe Dağılımı - Kullanıcı rolüne göre değişir */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">
              {user && user.role === 'municipal_worker' ? 'İlçe Dağılımı' : 'Şehir Dağılımı'}
            </h2>
          </div>
          <div className="p-6">
            {user && user.role === 'municipal_worker' ? (
              // Belediye çalışanları için ilçe dağılımı
              stats.byDistrict.length > 0 ? (
                renderBarChart(stats.byDistrict)
              ) : (
                <div className="text-center py-8 text-gray-500">Veri bulunamadı</div>
              )
            ) : (
              // Yöneticiler için şehir dağılımı
              stats.byCity.length > 0 ? (
                renderBarChart(stats.byCity)
              ) : (
                <div className="text-center py-8 text-gray-500">Veri bulunamadı</div>
              )
            )}
          </div>
        </div>
        
        {/* Aylık Dağılım */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Aylık Sorun Sayısı</h2>
          </div>
          <div className="p-6">
            {stats.byMonth.length > 0 ? (
              renderLineChart(stats.byMonth)
            ) : (
              <div className="text-center py-8 text-gray-500">Veri bulunamadı</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminReportsPage; 