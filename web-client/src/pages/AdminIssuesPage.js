import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { issueService } from '../services/api';

const AdminIssuesPage = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(searchParams.get('filter') || 'all');
  const [search, setSearch] = useState('');
  
  useEffect(() => {
    const fetchIssues = async () => {
      try {
        setLoading(true);
        
        // API filtreleme parametrelerini oluştur
        const apiFilters = {};
        if (filter !== 'all') {
          apiFilters.status = filter;
        }
        
        // Belediye çalışanları için şehir filtresini ekle
        if (user && user.role === 'municipal_worker' && user.city) {
          console.log('Belediye çalışanı kendi şehrine ait sorunları görüntülüyor:', user.city);
          apiFilters.city = user.city;
        }
        
        // Gerçek API çağrısı yap
        const response = await issueService.getAllIssues(apiFilters);
        console.log('Sorunlar:', response);
        
        if (response && response.data) {
          // API'den gelen sorunları formatlayarak ayarla
          const formattedIssues = response.data.map(issue => {
            // Tarih formatını düzenle
            const date = new Date(issue.createdAt);
            const formattedDate = date.toLocaleDateString('tr-TR');
            
            return {
              id: issue._id,
              title: issue.title,
              status: issue.status,
              statusText: getStatusText(issue.status),
              date: formattedDate,
              city: issue.location?.city || 'Belirtilmemiş',
              district: issue.location?.district || 'Belirtilmemiş',
              category: issue.category || 'Genel'
            };
          });
          
          setIssues(formattedIssues);
        } else {
          setIssues([]);
        }
      } catch (error) {
        console.error('Sorunlar alınırken hata:', error);
        setIssues([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchIssues();
  }, [filter, user]);
  
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
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
      case 'new':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Arama işlemi
  const filteredIssues = issues.filter(issue => {
    if (!search) return true;
    
    const searchLower = search.toLowerCase();
    return (
      issue.title.toLowerCase().includes(searchLower) ||
      issue.district.toLowerCase().includes(searchLower) ||
      issue.category.toLowerCase().includes(searchLower)
    );
  });

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
        <h1 className="text-2xl font-bold text-gray-800">Tüm Sorunlar</h1>
        <div className="text-sm text-gray-600">
          Toplam: <span className="font-semibold">{filteredIssues.length}</span> sorun
        </div>
      </div>

      {/* Filtreleme ve Arama */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => setFilter('all')} 
              className={`px-4 py-2 text-sm rounded-md ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}
            >
              Tümü
            </button>
            <button 
              onClick={() => setFilter('pending')} 
              className={`px-4 py-2 text-sm rounded-md ${filter === 'pending' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}
            >
              Yeni
            </button>
            <button 
              onClick={() => setFilter('in_progress')} 
              className={`px-4 py-2 text-sm rounded-md ${filter === 'in_progress' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}
            >
              İnceleniyor
            </button>
            <button 
              onClick={() => setFilter('resolved')} 
              className={`px-4 py-2 text-sm rounded-md ${filter === 'resolved' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}
            >
              Çözüldü
            </button>
            <button 
              onClick={() => setFilter('rejected')} 
              className={`px-4 py-2 text-sm rounded-md ${filter === 'rejected' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}
            >
              Reddedildi
            </button>
          </div>
          
          <div className="relative">
            <input
              type="text"
              placeholder="Ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-64 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Sorun Listesi */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Başlık</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
                {user && user.role === 'admin' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Şehir</th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İlçe</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlem</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredIssues.length > 0 ? (
                filteredIssues.map((issue) => (
                  <tr key={issue.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{issue.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{issue.category}</div>
                    </td>
                    {user && user.role === 'admin' && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{issue.city}</div>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{issue.district}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(issue.status)}`}>
                        {issue.statusText}
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
                  <td colSpan={user && user.role === 'admin' ? "7" : "6"} className="px-6 py-4 text-center text-sm text-gray-500">
                    Sonuç bulunamadı
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminIssuesPage; 