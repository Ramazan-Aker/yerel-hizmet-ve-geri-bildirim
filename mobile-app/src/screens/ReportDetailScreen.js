import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';

const ReportDetailScreen = ({ route, navigation }) => {
  const { reportId } = route.params;
  const { user } = useAuth();
  const [report, setReport] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Demo veri
  const dummyReport = {
    id: reportId || 1,
    title: 'Kaldırım Sorunu',
    description: "Atatürk Mahallesi 1234. Sokak'ta kaldırım taşları yerinden çıkmış durumda ve yayalar için tehlike oluşturuyor. Birçok insan bu sorun nedeniyle düşme tehlikesi yaşıyor. Acil çözüm bekliyoruz.",
    category: 'Altyapı',
    status: 'İnceleniyor',
    location: 'Atatürk Mahallesi, 1234. Sokak',
    imageUrl: 'https://via.placeholder.com/500',
    createdAt: '2023-06-15T10:30:00',
    userId: 1,
    userName: 'Ahmet Yılmaz',
    votesCount: 23,
    hasVoted: false,
  };

  const dummyComments = [
    {
      id: 1,
      text: 'Ben de aynı sokakta yaşıyorum ve bu durumdan oldukça rahatsızım. Lütfen en kısa sürede müdahale edilsin.',
      createdAt: '2023-06-16T11:20:00',
      userId: 2,
      userName: 'Ayşe Demir',
    },
    {
      id: 2,
      text: 'Geçen gün yağmurdan sonra daha da kötüleşti durum. Acil çözüm gerekiyor.',
      createdAt: '2023-06-17T09:45:00',
      userId: 3,
      userName: 'Mehmet Kaya',
    },
  ];

  // Bildirim detaylarını getiren fonksiyon
  const fetchReportDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (refreshing) {
        setRefreshing(true);
      }
      
      // API'den bildirim detaylarını al
      const response = await api.reports.getById(reportId);
      setReport(response.data);
      setComments(response.data.comments || []);
      
      // Demo mod kapalı, çünkü API çağrısı başarılı oldu
      setIsDemoMode(false);
    } catch (error) {
      console.error('Bildirim detayları alınırken hata oluştu:', error);
      setError('Bildirim detayları alınırken bir hata oluştu.');
      
      // API bağlantısı yoksa demo veri göster
      setReport(dummyReport);
      setComments(dummyComments);
      setIsDemoMode(true);
      
      // Network hatası olduğunda sadece bir kere uyarı göster
      if (!isDemoMode && (error.message === 'Network Error' || error.isDemoMode)) {
        Alert.alert(
          'Bağlantı Hatası', 
          'API sunucusuna bağlanılamadı. Demo veriler gösteriliyor.',
          [{ text: 'Tamam', style: 'default' }]
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Sayfa yüklendiğinde bildirim detaylarını getir
  useEffect(() => {
    fetchReportDetails();
  }, [reportId]);

  // Yorum ekleme fonksiyonu
  const handleAddComment = async () => {
    if (!newComment.trim()) {
      Alert.alert('Uyarı', 'Lütfen bir yorum yazın.');
      return;
    }

    // Demo modda lokalde güncelleme yap
    if (isDemoMode) {
      const newCommentObj = {
        id: comments.length + 1,
        text: newComment,
        createdAt: new Date().toISOString(),
        userId: user?.id || 1,
        userName: user?.name || 'Kullanıcı',
      };
      
      setComments([...comments, newCommentObj]);
      setNewComment('');
      Alert.alert('Bilgi', 'Demo modda yorum eklendi.');
      return;
    }

    try {
      setSending(true);
      const response = await api.reports.addComment(reportId, { text: newComment });
      
      // Yorumları güncelle
      setComments([...comments, response.data]);
      setNewComment('');
    } catch (error) {
      console.error('Yorum eklenirken hata oluştu:', error);
      Alert.alert('Hata', 'Yorum eklenirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setSending(false);
    }
  };

  // Oy verme fonksiyonu
  const handleVote = async () => {
    // Demo modda oy vermeyi simüle et
    if (isDemoMode) {
      setReport({
        ...report,
        votesCount: report.hasVoted ? report.votesCount - 1 : report.votesCount + 1,
        hasVoted: !report.hasVoted,
      });
      Alert.alert('Bilgi', `Demo modda ${report.hasVoted ? 'oy kaldırıldı' : 'oy verildi'}.`);
      return;
    }

    try {
      // API'ye oy isteği gönder
      const response = await api.reports.vote(reportId);
      setReport({
        ...report,
        votesCount: response.data.votesCount,
        hasVoted: response.data.hasVoted,
      });
    } catch (error) {
      console.error('Oy verme işlemi sırasında hata oluştu:', error);
      Alert.alert('Hata', 'Oy verme işlemi sırasında bir hata oluştu.');
    }
  };

  // Tarih biçimlendirme
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Durum rengini belirle
  const getStatusColor = (status) => {
    switch (status) {
      case 'Çözüldü':
        return '#4CAF50'; // Yeşil
      case 'İnceleniyor':
        return '#2196F3'; // Mavi
      case 'Beklemede':
        return '#FFC107'; // Sarı
      default:
        return '#9E9E9E'; // Gri
    }
  };

  // Yükleniyor durumu
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Bildirim yükleniyor...</Text>
      </View>
    );
  }

  // Hata durumu
  if (error && !report) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="error" size={60} color="#f44336" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchReportDetails}>
          <Text style={styles.retryButtonText}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {isDemoMode && (
        <View style={styles.demoModeContainer}>
          <Icon name="info-outline" size={16} color="#fff" />
          <Text style={styles.demoModeText}>Demo Mod</Text>
        </View>
      )}
      
      {/* Bildirim başlığı ve durumu */}
      <View style={styles.header}>
        <Text style={styles.title}>{report?.title}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report?.status) }]}>
          <Text style={styles.statusText}>{report?.status}</Text>
        </View>
      </View>
      
      {/* Bildirim görseli */}
      {report?.images && report.images.length > 0 && (
        <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={styles.imageScrollView}>
          {report.images.map((imageUri, index) => (
            <Image
              key={index}
              source={{ uri: imageUri }}
              style={styles.image}
              resizeMode="cover"
            />
          ))}
        </ScrollView>
      )}
      
      {/* Bildirim detayları */}
      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <Icon name="person" size={20} color="#666" />
          <Text style={styles.detailText}>
            <Text style={styles.detailLabel}>Bildiren: </Text>
            {report?.userName}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Icon name="category" size={20} color="#666" />
          <Text style={styles.detailText}>
            <Text style={styles.detailLabel}>Kategori: </Text>
            {report?.category}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Icon name="location-on" size={20} color="#666" />
          <Text style={styles.detailText}>
            <Text style={styles.detailLabel}>Konum: </Text>
            {report?.location}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Icon name="event" size={20} color="#666" />
          <Text style={styles.detailText}>
            <Text style={styles.detailLabel}>Tarih: </Text>
            {report && formatDate(report.createdAt)}
          </Text>
        </View>
        
        <View style={styles.voteContainer}>
          <TouchableOpacity 
            style={[styles.voteButton, report?.hasVoted && styles.votedButton]}
            onPress={handleVote}
          >
            <Icon 
              name={report?.hasVoted ? "thumb-up" : "thumb-up-off-alt"} 
              size={20} 
              color={report?.hasVoted ? "#fff" : "#666"} 
            />
            <Text style={[styles.voteText, report?.hasVoted && styles.votedText]}>
              {report?.votesCount || 0} Destek
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Bildirim açıklaması */}
      <View style={styles.descriptionContainer}>
        <Text style={styles.descriptionTitle}>Açıklama</Text>
        <Text style={styles.description}>{report?.description}</Text>
      </View>
      
      {/* Yorumlar bölümü */}
      <View style={styles.commentsContainer}>
        <Text style={styles.commentsTitle}>
          Yorumlar ({comments.length})
        </Text>
        
        {comments.length === 0 ? (
          <Text style={styles.noCommentsText}>Henüz yorum yapılmamış.</Text>
        ) : (
          comments.map((comment) => (
            <View key={comment.id} style={styles.commentItem}>
              <View style={styles.commentHeader}>
                <Text style={styles.commentAuthor}>{comment.userName}</Text>
                <Text style={styles.commentDate}>
                  {formatDate(comment.createdAt)}
                </Text>
              </View>
              <Text style={styles.commentText}>{comment.text}</Text>
            </View>
          ))
        )}
        
        {/* Yorum ekleme formu */}
        <View style={styles.addCommentContainer}>
          <TextInput
            style={styles.commentInput}
            placeholder="Yorumunuzu yazın..."
            value={newComment}
            onChangeText={setNewComment}
            multiline
          />
          <TouchableOpacity 
            style={styles.addCommentButton} 
            onPress={handleAddComment}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Icon name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  demoModeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 999,
  },
  demoModeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#3b82f6',
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  imageScrollView: {
    marginBottom: 15,
  },
  image: {
    width: 300,
    height: 200,
    borderRadius: 8,
    marginRight: 10,
  },
  detailsContainer: {
    padding: 16,
    backgroundColor: '#fff',
    marginTop: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailText: {
    fontSize: 14,
    color: '#444',
    marginLeft: 10,
    flex: 1,
  },
  detailLabel: {
    fontWeight: 'bold',
  },
  voteContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  votedButton: {
    backgroundColor: '#3b82f6',
  },
  voteText: {
    marginLeft: 5,
    color: '#666',
    fontWeight: 'bold',
  },
  votedText: {
    color: '#fff',
  },
  descriptionContainer: {
    padding: 16,
    backgroundColor: '#fff',
    marginTop: 10,
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
  },
  commentsContainer: {
    padding: 16,
    backgroundColor: '#fff',
    marginTop: 10,
    marginBottom: 20,
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  noCommentsText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 20,
  },
  commentItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  commentDate: {
    fontSize: 12,
    color: '#999',
  },
  commentText: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
  },
  addCommentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    fontSize: 14,
    maxHeight: 100,
  },
  addCommentButton: {
    backgroundColor: '#3b82f6',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ReportDetailScreen; 