import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { useAuth } from '../hooks/useAuth';

// Leaflet default icon fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Placeholder resimler için daha güvenilir bir kaynak kullan
const placeholderImage = 'https://placehold.co/800x600/eee/999?text=Resim+Yok';

// Dummy data for development, will be replaced with API call
const dummyIssue = {
  _id: '1',
  title: 'Bozuk Yol',
  description: 'Ana caddede çukurlar ve bozukluklar var. Araçlar geçerken hasar görmekte ve yayalar için de tehlike oluşturmaktadır. En kısa sürede onarılması gerekmektedir.',
  location: {
    district: 'Kadıköy',
    address: 'Moda Caddesi',
    coordinates: [29.0335, 41.0082]
  },
  category: 'Altyapı',
  status: 'open',
  priority: 'high',
  upvotes: 15,
  createdAt: '2023-03-15T10:30:00Z',
  updatedAt: '2023-03-16T09:15:00Z',
  user: {
    _id: 'user1',
    name: 'Ahmet Yılmaz'
  },
  images: [
    placeholderImage,
    placeholderImage
  ],
  comments: [
    {
      id: '1',
      content: 'Bu durum gerçekten tehlikeli, ben de neredeyse düşüyordum. Bir an önce çözülmesini umuyorum.',
      date: '2023-05-15T11:20:00Z',
      user: {
        id: '234',
        name: 'Zeynep K.'
      }
    },
    {
      id: '2',
      content: 'Aynı sorun geçen yıl da olmuştu ve çözümü uzun sürmüştü. Umarım bu sefer daha hızlı çözülür.',
      date: '2023-05-15T16:05:00Z',
      user: {
        id: '345',
        name: 'Murat S.'
      }
    }
  ]
};

// Status Renk Kodları
const statusColors = {
  'Yeni': 'bg-blue-100 text-blue-800',
  'İnceleniyor': 'bg-yellow-100 text-yellow-800',
  'Çözüldü': 'bg-green-100 text-green-800',
  'Reddedildi': 'bg-red-100 text-red-800'
};

// Severity Renk Kodları
const severityColors = {
  'Düşük': 'bg-gray-100 text-gray-800',
  'Orta': 'bg-yellow-100 text-yellow-800',
  'Yüksek': 'bg-orange-100 text-orange-800',
  'Kritik': 'bg-red-100 text-red-800'
};

const IssueDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comment, setComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    const fetchIssue = async () => {
      try {
        // TODO: Replace with actual API call
        // Simulating API call
        setTimeout(() => {
          setIssue(dummyIssue);
          setLoading(false);
        }, 500);
      } catch (err) {
        setError('Sorun detayları yüklenirken bir hata oluştu.');
        setLoading(false);
      }
    };

    fetchIssue();
  }, [id]);

  const handleUpvote = async () => {
    // TODO: Implement upvote functionality with API
    console.log('Upvoting issue:', id);
    // Temporary UI update
    setIssue(prev => ({
      ...prev,
      upvotes: prev.upvotes + 1
    }));
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    
    if (!comment.trim()) return;
    
    setSubmittingComment(true);
    
    try {
      // TODO: Implement comment submission with API
      console.log('Submitting comment:', comment);
      
      // Temporary UI update
      const newComment = {
        id: Date.now().toString(),
        content: comment,
        date: new Date().toISOString(),
        user: {
          id: user?.id || 'guest',
          name: user?.name || 'Misafir'
        }
      };
      
      setIssue(prev => ({
        ...prev,
        comments: [newComment, ...prev.comments]
      }));
      
      setComment('');
    } catch (err) {
      console.error('Comment submission error:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format relative time (e.g., "2 gün önce")
  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffSec < 60) {
      return 'Az önce';
    } else if (diffMin < 60) {
      return `${diffMin} dakika önce`;
    } else if (diffHour < 24) {
      return `${diffHour} saat önce`;
    } else if (diffDay < 30) {
      return `${diffDay} gün önce`;
    } else {
      return formatDate(dateString);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-3 text-gray-600">Sorun detayları yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 text-red-700 p-4 rounded-lg">
          <p>{error || 'Sorun bulunamadı.'}</p>
        </div>
        <div className="mt-4">
          <Link
            to="/issues"
            className="text-blue-600 hover:text-blue-800"
          >
            &larr; Tüm Sorunlara Dön
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-gray-500 mb-6">
        <Link to="/" className="hover:text-blue-600">Ana Sayfa</Link>
        <span className="mx-2">/</span>
        <Link to="/issues" className="hover:text-blue-600">Sorunlar</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700">{issue.title}</span>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sol kolon - Sorun Bilgileri */}
        <div className="lg:col-span-2">
          {/* Başlık ve İşlemler */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <h1 className="text-3xl font-bold mb-2 md:mb-0">{issue.title}</h1>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={handleUpvote}
                className="bg-white border border-gray-300 rounded-lg px-4 py-2 flex items-center hover:bg-gray-50 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">{issue.upvotes}</span>
              </button>
              
              <button
                onClick={() => navigate('/issues')}
                className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-4 py-2 rounded-lg font-medium transition"
              >
                Geri
              </button>
            </div>
          </div>
          
          {/* Durum ve Kategori Rozetleri */}
          <div className="flex flex-wrap gap-2 mb-6">
            <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full ${statusColors[issue.status]}`}>
              {issue.status}
            </span>
            <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full ${severityColors[issue.priority]}`}>
              {issue.priority}
            </span>
            <span className="inline-block px-3 py-1 text-sm font-semibold rounded-full bg-gray-100 text-gray-800">
              {issue.category}
            </span>
          </div>
          
          {/* Tarih ve Konum Bilgisi */}
          <div className="mb-6 text-sm text-gray-500">
            <div className="mb-1">
              <span className="font-medium">Bildirilme Tarihi:</span> {formatDate(issue.createdAt)}
            </div>
            <div className="mb-1">
              <span className="font-medium">Son Güncelleme:</span> {formatDate(issue.updatedAt)}
            </div>
            <div>
              <span className="font-medium">Konum:</span> {issue.location.address}, {issue.location.district}
            </div>
          </div>
          
          {/* Fotoğraflar */}
          {issue.images && issue.images.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Fotoğraflar</h2>
              <div className="bg-gray-100 p-2 rounded-lg">
                <div className="mb-2 h-80 overflow-hidden rounded">
                  <img
                    src={issue.images[activeImageIndex]}
                    alt={`Sorun ${activeImageIndex + 1}`}
                    className="w-full h-full object-contain"
                  />
                </div>
                
                {issue.images.length > 1 && (
                  <div className="flex space-x-2 overflow-x-auto">
                    {issue.images.map((img, index) => (
                      <button
                        key={index}
                        onClick={() => setActiveImageIndex(index)}
                        className={`w-16 h-16 rounded overflow-hidden ${index === activeImageIndex ? 'ring-2 ring-blue-500' : ''}`}
                      >
                        <img
                          src={img}
                          alt={`Thumbnail ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Açıklama */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Açıklama</h2>
            <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
              {issue.description}
            </div>
          </div>
          
          {/* Çözüm Süreci ve Güncellemeler */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Çözüm Süreci</h2>
            
            <div className="relative pl-6 border-l-2 border-gray-200">
              {/* Assuming updates are not provided in the dummyIssue */}
            </div>
          </div>
          
          {/* Yorumlar */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Yorumlar ({issue.comments.length})</h2>
            
            {/* Yorum Formu */}
            <form onSubmit={handleSubmitComment} className="mb-6">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Yorum yazın..."
                className="w-full border border-gray-300 rounded-lg p-3 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
              ></textarea>
              <button
                type="submit"
                disabled={submittingComment || !comment.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 transition"
              >
                {submittingComment ? 'Gönderiliyor...' : 'Yorum Gönder'}
              </button>
            </form>
            
            {/* Yorum Listesi */}
            {issue.comments.length > 0 ? (
              <div className="space-y-4">
                {issue.comments.map(comment => (
                  <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium">{comment.user.name}</span>
                      <span className="text-xs text-gray-500">{formatRelativeTime(comment.date)}</span>
                    </div>
                    <p className="text-gray-700">{comment.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">Bu soruna henüz yorum yapılmamış.</p>
            )}
          </div>
        </div>
        
        {/* Sağ kolon - Harita ve Ek Bilgiler */}
        <div>
          {/* Harita */}
          <div className="bg-white shadow-md rounded-lg overflow-hidden mb-6">
            <h2 className="text-lg font-semibold p-4 border-b">Konum</h2>
            <div className="h-80">
              <MapContainer 
                center={issue.location.coordinates} 
                zoom={15} 
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={issue.location.coordinates} />
              </MapContainer>
            </div>
          </div>
          
          {/* Bildirim Yapan */}
          <div className="bg-white shadow-md rounded-lg overflow-hidden mb-6">
            <h2 className="text-lg font-semibold p-4 border-b">Bildirim Yapan</h2>
            <div className="p-4">
              <div className="flex items-center">
                <div className="bg-gray-200 rounded-full w-10 h-10 flex items-center justify-center text-gray-600 font-bold text-lg mr-3">
                  {issue.user.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium">{issue.user.name}</p>
                  <p className="text-sm text-gray-500">Vatandaş</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Sorumlu Kişi */}
          {/* Assuming assignedTo is not provided in the dummyIssue */}
          
          {/* Benzer Sorunlar (İleride eklenebilir) */}
          {/* <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <h2 className="text-lg font-semibold p-4 border-b">Benzer Sorunlar</h2>
            <div className="p-4">
              ...
            </div>
          </div> */}
        </div>
      </div>
    </div>
  );
};

export default IssueDetailPage; 