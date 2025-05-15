import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { adminService } from '../services/api';

const AdminDashboardPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    inProgress: 0,
    resolved: 0,
    rejected: 0
  });
  const [recentIssues, setRecentIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Gerçek API çağrısı yap
        const response = await adminService.getDashboardStats();
        console.log('Dashboard verileri:', response);
        
        if (response && response.data) {
          // API'den gelen istatistikleri ayarla
          const issueStats = response.data.issues;
          
          // Durumlara göre sayıları ayarla
          const statusCounts = {
            total: issueStats.total || 0,
            new: 0,
            inProgress: 0,
            resolved: 0,
            rejected: 0
          };
          
          // API'den gelen durum sayılarını işle
          if (issueStats.byStatus && Array.isArray(issueStats.byStatus)) {
            issueStats.byStatus.forEach(item => {
              if (item._id === 'pending') statusCounts.new = item.count;
              if (item._id === 'in_progress') statusCounts.inProgress = item.count;
              if (item._id === 'resolved') statusCounts.resolved = item.count;
              if (item._id === 'rejected') statusCounts.rejected = item.count;
            });
          }
          
          setStats(statusCounts);
          
          // Son eklenen sorunları ayarla
          if (issueStats.recent && Array.isArray(issueStats.recent)) {
            // API'den gelen son sorunları formatlayarak ayarla
            const formattedRecentIssues = issueStats.recent.map(issue => {
              // Tarih formatını düzenle
              const date = new Date(issue.createdAt);
              const formattedDate = date.toLocaleDateString('tr-TR');
              
              return {
                id: issue._id,
                title: issue.title,
                status: getStatusText(issue.status),
                date: formattedDate,
                district: issue.location?.district || 'Belirtilmemiş'
              };
            });
            
            setRecentIssues(formattedRecentIssues);
          }
        }
      } catch (error) {
        console.error('Dashboard verileri alınırken hata:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

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

  // Durum rengini belirle
  const getStatusColor = (status) => {
    switch (status) {
      case 'Çözüldü':
        return 'bg-green-100 text-green-800';
      case 'İnceleniyor':
        return 'bg-blue-100 text-blue-800';
      case 'Yeni':
        return 'bg-yellow-100 text-yellow-800';
      case 'Reddedildi':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
        <h1 className="text-2xl font-bold text-gray-800">Yönetim Paneli</h1>
        <div className="text-sm text-gray-600">
          Hoş geldiniz, <span className="font-semibold">{user?.name}</span>
        </div>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-gray-500">
          <div className="text-gray-500 text-sm">Toplam Sorun</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
          <div className="text-gray-500 text-sm">Yeni</div>
          <div className="text-2xl font-bold">{stats.new}</div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <div className="text-gray-500 text-sm">İnceleniyor</div>
          <div className="text-2xl font-bold">{stats.inProgress}</div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <div className="text-gray-500 text-sm">Çözüldü</div>
          <div className="text-2xl font-bold">{stats.resolved}</div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
          <div className="text-gray-500 text-sm">Reddedildi</div>
          <div className="text-2xl font-bold">{stats.rejected}</div>
        </div>
      </div>

      {/* Hızlı Erişim Butonları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link to="/admin/issues?filter=pending" className="bg-white rounded-lg shadow p-4 hover:bg-gray-50 transition">
          <div className="flex items-center">
            <div className="bg-yellow-100 p-3 rounded-lg mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <div className="font-semibold">Yeni Sorunlar</div>
              <div className="text-sm text-gray-500">Henüz incelenmemiş sorunları görüntüle</div>
            </div>
          </div>
        </Link>
        
        <Link to="/admin/issues?filter=in_progress" className="bg-white rounded-lg shadow p-4 hover:bg-gray-50 transition">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-lg mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="font-semibold">İncelenen Sorunlar</div>
              <div className="text-sm text-gray-500">İşlem sürecindeki sorunları görüntüle</div>
            </div>
          </div>
        </Link>
        
        <Link to="/admin/reports" className="bg-white rounded-lg shadow p-4 hover:bg-gray-50 transition">
          <div className="flex items-center">
            <div className="bg-purple-100 p-3 rounded-lg mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <div className="font-semibold">Raporlar</div>
              <div className="text-sm text-gray-500">İstatistikler ve analizleri görüntüle</div>
            </div>
          </div>
        </Link>
      </div>

      {/* Son Eklenen Sorunlar */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Son Eklenen Sorunlar</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Başlık</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İlçe</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlem</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentIssues.length > 0 ? (
                recentIssues.map((issue) => (
                  <tr key={issue.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{issue.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{issue.district}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(issue.status)}`}>
                        {issue.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {issue.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link to={`/admin/issues/${issue.id}`} className="text-blue-600 hover:text-blue-900">
                        Detay
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
                    Henüz sorun bulunmuyor
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="px-6 py-4 border-t border-gray-200">
          <Link to="/admin/issues" className="text-blue-600 hover:text-blue-900 text-sm font-medium">
            Tüm sorunları görüntüle →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage; 