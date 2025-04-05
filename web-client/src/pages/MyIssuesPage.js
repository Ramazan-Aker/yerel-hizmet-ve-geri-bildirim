import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { issueService } from '../services/api';

// Status Renk Kodları
const statusColors = {
  'open': 'bg-blue-100 text-blue-800',
  'pending': 'bg-yellow-100 text-yellow-800',
  'resolved': 'bg-green-100 text-green-800',
  'rejected': 'bg-red-100 text-red-800',
  // Türkçe karşılıklar
  'Yeni': 'bg-blue-100 text-blue-800',
  'İnceleniyor': 'bg-yellow-100 text-yellow-800',
  'Çözüldü': 'bg-green-100 text-green-800',
  'Reddedildi': 'bg-red-100 text-red-800'
};

// Severity/Priority Renk Kodları
const severityColors = {
  'low': 'bg-gray-100 text-gray-800',
  'medium': 'bg-yellow-100 text-yellow-800',
  'high': 'bg-orange-100 text-orange-800',
  'critical': 'bg-red-100 text-red-800',
  // Türkçe karşılıklar
  'Düşük': 'bg-gray-100 text-gray-800',
  'Orta': 'bg-yellow-100 text-yellow-800',
  'Yüksek': 'bg-orange-100 text-orange-800',
  'Kritik': 'bg-red-100 text-red-800'
};

const MyIssuesPage = () => {
  const { user } = useAuth();
  const [myIssues, setMyIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'active', 'resolved'

  useEffect(() => {
    const fetchMyIssues = async () => {
      try {
        setLoading(true);
        console.log('Kullanıcı sorunları yükleniyor...');
        
        // Gerçek API çağrısı
        const response = await issueService.getUserIssues();
        console.log('API yanıtı:', response);
        
        if (response && response.data) {
          setMyIssues(response.data);
        } else {
          setMyIssues([]);
        }
      } catch (err) {
        console.error('Sorunları yükleme hatası:', err);
        setError('Sorunlarınız yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchMyIssues();
    }
  }, [user]);

  // Filter issues based on active tab
  const filteredIssues = myIssues.filter(issue => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return ['open', 'pending', 'Yeni', 'İnceleniyor'].includes(issue.status);
    if (activeTab === 'resolved') return ['resolved', 'rejected', 'Çözüldü', 'Reddedildi'].includes(issue.status);
    return true;
  });

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'open': return 'Açık';
      case 'pending': return 'İnceleniyor';
      case 'resolved': return 'Çözüldü';
      case 'rejected': return 'Reddedildi';
      // Türkçe alanlar için destek
      case 'Yeni': return 'Yeni bildirildi';
      case 'İnceleniyor': return 'İnceleniyor';
      case 'Çözüldü': return 'Çözüldü';
      case 'Reddedildi': return 'Reddedildi';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-3 text-gray-600">Sorunlarınız yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 text-red-700 p-4 rounded-lg">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-3xl font-bold mb-4 md:mb-0">Bildirdiğim Sorunlar</h1>
        <Link
          to="/report-issue"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
        >
          + Yeni Sorun Bildir
        </Link>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'all'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('all')}
          >
            Tümü
          </button>
          <button
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'active'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('active')}
          >
            Aktif
          </button>
          <button
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'resolved'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('resolved')}
          >
            Çözülmüş
          </button>
        </nav>
      </div>

      {/* Issues */}
      {filteredIssues.length > 0 ? (
        <div className="grid gap-6">
          {filteredIssues.map((issue) => (
            <div
              key={issue._id || issue.id}
              className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200 hover:shadow-lg transition"
            >
              <div className="p-4 md:p-6">
                <div className="flex flex-col md:flex-row justify-between items-start mb-4">
                  <div className="flex-1">
                    <Link
                      to={`/issues/${issue._id || issue.id}`}
                      className="text-xl font-semibold text-blue-600 hover:text-blue-800 mb-2 block"
                    >
                      {issue.title}
                    </Link>
                    <p className="text-gray-600 line-clamp-2 mb-3">
                      {issue.description}
                    </p>
                  </div>
                  <div className="mt-2 md:mt-0 md:ml-6 flex flex-col items-end">
                    <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full ${statusColors[issue.status]}`}>
                      {getStatusText(issue.status)}
                    </span>
                    <span className="text-sm text-gray-500 mt-2">
                      {formatDate(issue.createdAt)}
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center justify-between">
                  <div className="flex flex-wrap gap-2 mb-2 md:mb-0">
                    <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${severityColors[issue.severity || issue.priority]}`}>
                      {issue.severity || issue.priority}
                    </span>
                    <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                      {issue.category}
                    </span>
                    <span className="inline-block px-2 py-1 text-xs text-gray-500">
                      {issue.location && (issue.location.district || issue.location.address)}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                    </svg>
                    <span className="text-xs text-gray-500">{issue.upvotes}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-16 w-16 mx-auto text-gray-400 mb-4" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={1.5} 
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
            />
          </svg>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Henüz Sorun Bildirmediniz</h2>
          <p className="text-gray-600 mb-6">
            Şehrimizde karşılaştığınız sorunları bildirerek çözülmelerine katkı sağlayabilirsiniz.
          </p>
          <Link
            to="/report-issue"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition inline-block"
          >
            İlk Sorununuzu Bildirin
          </Link>
        </div>
      )}
    </div>
  );
};

export default MyIssuesPage; 