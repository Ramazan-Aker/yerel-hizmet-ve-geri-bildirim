import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';
import moment from 'moment';

const { height } = Dimensions.get('window');

const ChatbotScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState('checking');
  const flatListRef = useRef(null);

  // Başlangıç mesajı
  useEffect(() => {
    const welcomeMessage = {
      id: 'welcome',
      message: `Merhaba${user?.name ? ` ${user.name}` : ''}! 👋\n\nBen Şehir Asistanı. Size şehir sorunları bildirimi konusunda yardımcı olabilirim.\n\n📝 Sorun bildirimi nasıl yapılır?\n🏷️ Hangi kategorilerde sorun bildirebilirim?\n📍 Konum nasıl eklenir?\n\nBu konular hakkında sorularınızı sorabilirsiniz!`,
      isBot: true,
      timestamp: new Date().toISOString()
    };

    setMessages([welcomeMessage]);
    checkAIStatus();
  }, [user]);

  // AI sistem durumunu kontrol et
  const checkAIStatus = async () => {
    try {
      const response = await api.ai.getStatus();
      if (response.success) {
        setAiStatus('active');
        console.log('AI Chatbot aktif:', response.data.model);
      } else {
        setAiStatus('error');
      }
    } catch (error) {
      console.error('AI durum kontrol hatası:', error);
      setAiStatus('error');
    }
  };

  // Mesaj gönder
  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      message: inputText.trim(),
      isBot: false,
      timestamp: new Date().toISOString()
    };

    // Kullanıcı mesajını ekle
    setMessages(prev => [...prev, userMessage]);
    const messageToSend = inputText.trim();
    setInputText('');
    setIsLoading(true);

    try {
      // Sohbet geçmişini hazırla (son 10 mesaj)
      const conversationHistory = messages
        .slice(-10)
        .map(msg => ({
          user: !msg.isBot ? msg.message : '',
          assistant: msg.isBot ? msg.message : ''
        }))
        .filter(entry => entry.user || entry.assistant);

      // AI'dan yanıt al
      const response = await api.ai.chat(messageToSend, conversationHistory);

      if (response.success) {
        const botMessage = {
          id: (Date.now() + 1).toString(),
          message: response.data.message,
          isBot: true,
          timestamp: response.data.timestamp,
          isError: response.data.isError
        };

        setMessages(prev => [...prev, botMessage]);
      } else {
        throw new Error(response.message || 'AI yanıt veremedi');
      }
    } catch (error) {
      console.error('Chat hatası:', error);
      
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        message: 'Üzgünüm, şu anda bir teknik sorun yaşıyorum. Lütfen daha sonra tekrar deneyin.',
        isBot: true,
        timestamp: new Date().toISOString(),
        isError: true
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Enter tuşu ile mesaj gönderme
  const handleKeyPress = (event) => {
    if (event.nativeEvent.key === 'Enter') {
      sendMessage();
    }
  };

  // Mesaj render fonksiyonu
  const renderMessage = ({ item }) => (
    <View style={[
      styles.messageContainer,
      item.isBot ? styles.botMessageContainer : styles.userMessageContainer
    ]}>
      <View style={[
        styles.messageBox,
        item.isBot ? styles.botMessageBox : styles.userMessageBox,
        item.isError ? styles.errorMessageBox : {}
      ]}>
        {item.isBot && (
          <View style={styles.botHeader}>
            <Icon name="smart-toy" size={16} color="#3b82f6" />
            <Text style={styles.botName}>Şehir Asistanı</Text>
          </View>
        )}
        
        <Text style={[
          styles.messageText,
          item.isBot ? styles.botMessageText : styles.userMessageText,
          item.isError ? styles.errorMessageText : {}
        ]}>
          {item.message}
        </Text>
        
        <Text style={[
          styles.timestamp,
          item.isBot ? styles.botTimestamp : styles.userTimestamp
        ]}>
          {moment(item.timestamp).format('HH:mm')}
        </Text>
      </View>
    </View>
  );

  // Sohbet geçmişini temizle
  const clearChat = () => {
    Alert.alert(
      'Sohbet Geçmişini Temizle',
      'Tüm mesajlar silinecek. Emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Temizle', 
          style: 'destructive',
          onPress: () => {
            setMessages([{
              id: 'welcome-new',
              message: 'Sohbet geçmişi temizlendi. Tekrar nasıl yardımcı olabilirim?',
              isBot: true,
              timestamp: new Date().toISOString()
            }]);
          }
        }
      ]
    );
  };

  // AI durumu göstergesi
  const renderAIStatus = () => {
    switch (aiStatus) {
      case 'active':
        return (
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.statusText}>Şehir Asistanı Çevrimiçi</Text>
          </View>
        );
      case 'error':
        return (
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: '#F44336' }]} />
            <Text style={styles.statusText}>Geçici olarak kullanılamıyor</Text>
          </View>
        );
      default:
        return (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="small" color="#3b82f6" />
            <Text style={styles.statusText}>Bağlanıyor...</Text>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Şehir Asistanı</Text>
          {renderAIStatus()}
        </View>
        
        <TouchableOpacity 
          style={styles.clearButton}
          onPress={clearChat}
        >
          <Icon name="delete-sweep" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Mesajlar */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }}
        showsVerticalScrollIndicator={false}
      />

      {/* Yükleme göstergesi */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#3b82f6" />
          <Text style={styles.loadingText}>Şehir Asistanı yazıyor...</Text>
        </View>
      )}

      {/* Mesaj giriş alanı */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
      >
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            placeholder="Mesajınızı yazın..."
            value={inputText}
            onChangeText={setInputText}
            onKeyPress={handleKeyPress}
            multiline
            maxLength={1000}
            editable={aiStatus === 'active' && !isLoading}
          />
          
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isLoading || aiStatus !== 'active') ? 
                styles.sendButtonDisabled : {}
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isLoading || aiStatus !== 'active'}
          >
            <Icon 
              name="send" 
              size={24} 
              color={(!inputText.trim() || isLoading || aiStatus !== 'active') ? 
                '#ccc' : '#fff'
              } 
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  clearButton: {
    padding: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.9,
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messagesContent: {
    paddingTop: 16,
    paddingBottom: 16,
  },
  messageContainer: {
    marginBottom: 12,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  botMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBox: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  userMessageBox: {
    backgroundColor: '#3b82f6',
    borderBottomRightRadius: 4,
  },
  botMessageBox: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  errorMessageBox: {
    backgroundColor: '#ffebee',
    borderLeftWidth: 3,
    borderLeftColor: '#f44336',
  },
  botHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  botName: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#fff',
  },
  botMessageText: {
    color: '#333',
  },
  errorMessageText: {
    color: '#d32f2f',
  },
  timestamp: {
    fontSize: 12,
    marginTop: 6,
    opacity: 0.7,
  },
  userTimestamp: {
    color: '#fff',
    textAlign: 'right',
  },
  botTimestamp: {
    color: '#666',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  loadingText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
  },
  inputContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    maxHeight: 100,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  sendButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 24,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  sendButtonDisabled: {
    backgroundColor: '#e0e0e0',
    elevation: 0,
    shadowOpacity: 0,
  },
});

export default ChatbotScreen; 