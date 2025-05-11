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
          
          // Aylık dağılımı işle
          const monthData = reportData.byMonth || [];
          
          // İstatistikleri ayarla
          setStats({
            byStatus: statusData,
            byCategory: categoryData,
            byDistrict: districtData,
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
    const total = data.reduce((sum, item) => sum + item.count, 0);
    let cumulativePercent = 0;
    
    return (
      <div className="relative h-64 w-64 mx-auto">
        <svg viewBox="0 0 100 100" className="h-full w-full">
          {data.map((item, index) => {
            const percent = (item.count / total) * 100;
            const startPercent = cumulativePercent;
            cumulativePercent += percent;
            
            const startX = 50 + 50 * Math.cos(2 * Math.PI * startPercent / 100);
            const startY = 50 + 50 * Math.sin(2 * Math.PI * startPercent / 100);
            const endX = 50 + 50 * Math.cos(2 * Math.PI * cumulativePercent / 100);
            const endY = 50 + 50 * Math.sin(2 * Math.PI * cumulativePercent / 100);
            
            const largeArcFlag = percent > 50 ? 1 : 0;
            
            const pathData = [
              `M 50 50`,
              `L ${startX} ${startY}`,
              `A 50 50 0 ${largeArcFlag} 1 ${endX} ${endY}`,
              `Z`
            ].join(' ');
            
            return (
              <path 
                key={index} 
                d={pathData} 
                fill={item.color}
                stroke="#fff"
                strokeWidth="0.5"
              />
            );
          })}
        </svg>
      </div>
    );
  };
  
  // Bar grafik oluşturma
  const renderBarChart = (data) => {
    const maxValue = Math.max(...data.map(item => item.count));
    
    return (
      <div className="h-64 flex items-end space-x-2">
        {data.map((item, index) => {
          const height = (item.count / maxValue) * 100;
          
          return (
            <div key={index} className="flex flex-col items-center flex-1">
              <div 
                className="w-full bg-blue-500 rounded-t"
                style={{ 
                  height: `${height}%`,
                  backgroundColor: item.color || '#3B82F6'
                }}
              ></div>
              <div className="text-xs mt-1 text-gray-600 whitespace-nowrap overflow-hidden text-ellipsis w-full text-center">
                {item.name}
              </div>
            </div>
          );
        })}
      </div>
    );
  };
  
  // Çizgi grafik oluşturma
  const renderLineChart = (data) => {
    const maxValue = Math.max(...data.map(item => item.count));
    const points = data.map((item, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 100 - (item.count / maxValue) * 100;
      return `${x},${y}`;
    }).join(' ');
    
    return (
      <div className="h-64 w-full">
        <svg viewBox="0 0 100 100" className="h-full w-full" preserveAspectRatio="none">
          {/* Y ekseni çizgileri */}
          {[0, 25, 50, 75, 100].map((value, index) => (
            <line 
              key={index}
              x1="0" 
              y1={value} 
              x2="100" 
              y2={value} 
              stroke="#e5e7eb" 
              strokeWidth="0.5"
            />
          ))}
          
          {/* X ekseni çizgileri */}
          {data.map((_, index) => {
            const x = (index / (data.length - 1)) * 100;
            return (
              <line 
                key={index}
                x1={x} 
                y1="0" 
                x2={x} 
                y2="100" 
                stroke="#e5e7eb" 
                strokeWidth="0.5"
              />
            );
          })}
          
          {/* Veri çizgisi */}
          <polyline
            fill="none"
            stroke="#3B82F6"
            strokeWidth="2"
            points={points}
          />
          
          {/* Veri noktaları */}
          {data.map((item, index) => {
            const x = (index / (data.length - 1)) * 100;
            const y = 100 - (item.count / maxValue) * 100;
            
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="2"
                fill="#3B82F6"
                stroke="#fff"
                strokeWidth="1"
              />
            );
          })}
        </svg>
        
        {/* X ekseni etiketleri */}
        <div className="flex justify-between mt-2">
          {data.map((item, index) => (
            <div key={index} className="text-xs text-gray-600">
              {index % 3 === 0 ? item.name : ''}
            </div>
          ))}
        </div>
      </div>
    );
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
                
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {stats.byStatus.map((item, index) => (
                    <div key={index} className="flex items-center">
                      <div 
                        className="w-4 h-4 rounded-full mr-2" 
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <div className="text-sm">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-gray-500 ml-1">({item.count})</span>
                      </div>
                    </div>
                  ))}
                </div>
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
              renderBarChart(stats.byCategory)
            ) : (
              <div className="text-center py-8 text-gray-500">Veri bulunamadı</div>
            )}
          </div>
        </div>
        
        {/* İlçe Dağılımı */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">İlçe Dağılımı</h2>
          </div>
          <div className="p-6">
            {stats.byDistrict.length > 0 ? (
              renderBarChart(stats.byDistrict)
            ) : (
              <div className="text-center py-8 text-gray-500">Veri bulunamadı</div>
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