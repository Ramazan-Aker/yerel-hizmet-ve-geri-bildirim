import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { workerService } from '../services/api';

const WorkerIssuesPage = () => {
  const { user } = useAuth();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Sorunları yükle
  useEffect(() => {
    const fetchAssignedIssues = async () => {
      try {
        setLoading(true);
        const response = await workerService.getAssignedIssues();
        
        if (response && response.data) {
          setIssues(response.data);
        }
      } catch (err) {
        console.error('Atanan sorunları getirirken hata oluştu:', err);
        setError('Atanan sorunlar yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };

    fetchAssignedIssues();
  }, []);

  // Duruma göre sorunları filtrele
  const filteredIssues = selectedStatus === 'all' 
    ? issues 
    : issues.filter(issue => issue.status === selectedStatus);

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
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Formatlanmış tarih
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Atanan Sorunlar</h1>
          <p className="text-gray-600">Merhaba {user?.name}, size atanan sorunların listesi aşağıdadır.</p>
        </div>
      </div>

      {/* Filtreleme seçenekleri */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedStatus('all')}
            className={`px-4 py-2 rounded-md ${
              selectedStatus === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'
            }`}
          >
            Tümü
          </button>
          <button
            onClick={() => setSelectedStatus('pending')}
            className={`px-4 py-2 rounded-md ${
              selectedStatus === 'pending' ? 'bg-yellow-500 text-white' : 'bg-gray-100 text-gray-800'
            }`}
          >
            Yeni
          </button>
          <button
            onClick={() => setSelectedStatus('in_progress')}
            className={`px-4 py-2 rounded-md ${
              selectedStatus === 'in_progress' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800'
            }`}
          >
            İnceleniyor
          </button>
          <button
            onClick={() => setSelectedStatus('resolved')}
            className={`px-4 py-2 rounded-md ${
              selectedStatus === 'resolved' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-800'
            }`}
          >
            Çözüldü
          </button>
        </div>
      </div>

      {/* Sorunlar Listesi */}
      {filteredIssues.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredIssues.map((issue) => (
            <Link
              to={`/worker/issues/${issue._id}`}
              key={issue._id}
              className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="relative">
                {issue.images && issue.images.length > 0 ? (
                  <img
                    src={issue.images[0]}
                    alt={issue.title}
                    className="w-full h-48 object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://via.placeholder.com/400x200?text=Görsel+Bulunamadı';
                    }}
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-16 w-16 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(issue.status)}`}>
                    {getStatusText(issue.status)}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <h2 className="text-lg font-semibold text-gray-800 mb-1 line-clamp-1">{issue.title}</h2>
                <p className="text-gray-600 text-sm mb-2 line-clamp-2">{issue.description}</p>
                <div className="flex justify-between items-center text-sm text-gray-500">
                  <span>{issue.category}</span>
                  <span>{formatDate(issue.createdAt)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16 text-gray-400 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Hiç sorun bulunamadı</h2>
          <p className="text-gray-600">
            {selectedStatus === 'all'
              ? 'Size henüz hiç sorun atanmamış.'
              : `${getStatusText(selectedStatus)} durumunda sorun bulunamadı.`}
          </p>
        </div>
      )}
    </div>
  );
};

export default WorkerIssuesPage; 