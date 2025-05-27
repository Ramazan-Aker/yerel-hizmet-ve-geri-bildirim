import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { showWelcomeToast, showErrorToast, showSuccessToast } from '../utils/toastConfig';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loginWithDemo, loading, error, setError, user } = useAuth();

  const handleLogin = async () => {
    if (!email.trim()) {
      showErrorToast('Hata', 'Lütfen e-posta adresinizi girin');
      return;
    }
    if (!password) {
      showErrorToast('Hata', 'Lütfen şifrenizi girin');
      return;
    }

    console.log('Giriş denenecek:', { email, password });
    
    try {
      const success = await login(email, password);
      
      if (success) {
        // Başarılı giriş mesajı
        showWelcomeToast(
          'Hoş Geldiniz! 👋', 
          'Uygulamaya başarıyla giriş yaptınız. İyi günler!'
        );
      } else if (error) {
        // Hata mesajı - daha net ve kullanıcı dostu
        let errorTitle = 'Giriş Başarısız';
        let errorMessage = error;
        
        // Yaygın hata mesajlarını daha kullanıcı dostu hale getir
        if (error.toLowerCase().includes('şifre') || error.toLowerCase().includes('password')) {
          errorTitle = 'Şifre Hatalı';
          errorMessage = 'Lütfen şifrenizi kontrol edin ve tekrar deneyin.';
        } else if (error.toLowerCase().includes('email') || error.toLowerCase().includes('e-posta') || error.toLowerCase().includes('kullanıcı bulunamadı')) {
          errorTitle = 'E-posta Hatalı';
          errorMessage = 'Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı.';
        } else if (error.toLowerCase().includes('network') || error.toLowerCase().includes('bağlantı')) {
          errorTitle = 'Bağlantı Sorunu';
          errorMessage = 'İnternet bağlantınızı kontrol edin ve tekrar deneyin.';
        }
        
        showErrorToast(errorTitle, errorMessage);
        setError(null);
      }
    } catch (err) {
      console.error('Login hatası:', err);
      showErrorToast(
        'Beklenmeyen Hata', 
        'Bir hata oluştu, lütfen tekrar deneyin.'
      );
    }
  };

  const handleDemoLogin = async () => {
    try {
      const success = await loginWithDemo();
      
      if (success) {
        // Demo giriş başarılı mesajı
        showSuccessToast(
          'Demo Giriş Başarılı! 🎯', 
          'Demo hesabı ile uygulamayı keşfedebilirsiniz.'
        );
      } else if (error) {
        showErrorToast('Demo Giriş Başarısız', error);
        setError(null);
      }
    } catch (err) {
      console.error('Demo login hatası:', err);
      showErrorToast(
        'Demo Giriş Başarısız', 
        'Bir hata oluştu, lütfen tekrar deneyin.'
      );
    }
  };

  const fillDemoCredentials = () => {
    setEmail('demo@example.com');
    setPassword('password');
    showSuccessToast(
      'Demo Bilgileri Dolduruldu', 
      'Artık "Giriş Yap" butonuna tıklayabilirsiniz.'
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : null}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.logoContainer}>
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoText}>ŞT</Text>
          </View>
          <Text style={styles.title}>Şehir Sorun Takip</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.label}>E-posta</Text>
          <TextInput
            style={styles.input}
            placeholder="E-posta adresinizi girin"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Şifre</Text>
          <TextInput
            style={styles.input}
            placeholder="Şifrenizi girin"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            style={styles.button}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Giriş Yap</Text>
            )}
          </TouchableOpacity>

          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Hesabınız yok mu?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>Kaydolun</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.demoContainer}>
            <TouchableOpacity 
              style={styles.demoButton}
              onPress={fillDemoCredentials}
            >
              <Text style={styles.demoButtonText}>Demo Bilgilerini Doldur</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.demoLoginButton}
              onPress={handleDemoLogin}
            >
              <Text style={styles.demoLoginButtonText}>Demo Giriş Yap</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 10,
  },
  logoPlaceholder: {
    width: 120,
    height: 120,
    backgroundColor: '#3b82f6',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  logoText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3b82f6',
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  registerText: {
    color: '#666',
    fontSize: 14,
  },
  registerLink: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  demoContainer: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  demoButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  demoButtonText: {
    color: '#666',
    fontSize: 14,
  },
  demoLoginButton: {
    backgroundColor: '#e6f0ff',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    flex: 1,
    marginLeft: 8,
  },
  demoLoginButtonText: {
    color: '#3b82f6',
    fontSize: 14,
  },
});

export default LoginScreen; 