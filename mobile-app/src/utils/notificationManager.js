import { Alert, Platform } from 'react-native';
import Toast from 'react-native-toast-message';

// Track the most recently displayed messages to prevent duplicates
const messageTracker = {
  lastMessages: {},
  timeouts: {},
  
  // Throttle duration in milliseconds (prevent same message within this time)
  throttleDuration: 3000,
  
  // Check if a message has been shown recently
  isDuplicate: function(type, message) {
    const key = `${type}:${message}`;
    const lastShown = this.lastMessages[key];
    
    if (!lastShown) return false;
    
    // Check if the message was shown less than throttleDuration ago
    return (Date.now() - lastShown) < this.throttleDuration;
  },
  
  // Record that a message has been shown
  recordMessage: function(type, message) {
    const key = `${type}:${message}`;
    
    // Record the current timestamp
    this.lastMessages[key] = Date.now();
    
    // Clear the record after throttle duration
    if (this.timeouts[key]) {
      clearTimeout(this.timeouts[key]);
    }
    
    this.timeouts[key] = setTimeout(() => {
      delete this.lastMessages[key];
      delete this.timeouts[key];
    }, this.throttleDuration);
  }
};

// Determine if a message is short enough for Toast
const shouldUseToast = (message) => {
  // Use Toast for short messages, Alert for longer ones or those with multiple lines
  return message && message.length < 100 && !message.includes('\n');
};

// Toast wrapper with duplicate prevention
export const showToast = (type, message1, message2) => {
  // In case the second message is empty, use first for both
  const title = message1;
  const body = message2 || message1;
  
  // Prevent duplicates
  if (messageTracker.isDuplicate('toast', body)) {
    return;
  }
  
  messageTracker.recordMessage('toast', body);
  
  try {
    // Toast mevcut mu ve show metodu var mı kontrol et
    if (Toast && typeof Toast.show === 'function') {
      Toast.show({
        type: type, // 'success', 'error', 'info', or 'warning'
        text1: title,
        text2: body,
        position: 'bottom',
        visibilityTime: 4000,
        autoHide: true,
      });
    } else {
      // Toast kullanılamıyorsa Alert'e geri dön
      console.warn('Toast.show is not available, falling back to Alert');
      Alert.alert(title, body);
    }
  } catch (error) {
    console.error('Error showing toast:', error);
    // Toast başarısız olursa Alert'e geri dön
    Alert.alert(title, body);
  }
};

// Alert wrapper with duplicate prevention
export const showAlert = (title, message, buttons) => {
  // Prevent duplicates
  if (messageTracker.isDuplicate('alert', message)) {
    return;
  }
  
  messageTracker.recordMessage('alert', message);
  
  // Default button if none provided
  const defaultButtons = [{
    text: 'Tamam',
    onPress: () => {}
  }];
  
  Alert.alert(title, message, buttons || defaultButtons);
};

// Smart notification that chooses between Toast and Alert based on message length
export const showNotification = (type, title, message, buttons) => {
  try {
    // Use Toast for short messages if available
    if (shouldUseToast(message) && Toast && typeof Toast.show === 'function') {
      showToast(type, title, message);
      return;
    }
    
    // For longer messages or if Toast is not available, use Alert
    showAlert(title, message, buttons);
  } catch (error) {
    console.error('Error in showNotification:', error);
    // Fallback to basic Alert in case of any error
    Alert.alert(title, message);
  }
};

export default {
  showToast,
  showAlert,
  showNotification,
  
  // Success notification shortcuts
  success: (title, message) => {
    try {
      if (shouldUseToast(message) && Toast && typeof Toast.show === 'function') {
        showToast('success', title, message);
      } else {
        showAlert(title, message);
      }
    } catch (error) {
      console.error('Error in success notification:', error);
      Alert.alert(title, message);
    }
  },
  
  // Error notification shortcuts
  error: (title, message) => {
    try {
      if (shouldUseToast(message) && Toast && typeof Toast.show === 'function') {
        showToast('error', title, message);
      } else {
        showAlert(title, message);
      }
    } catch (error) {
      console.error('Error in error notification:', error);
      Alert.alert(title, message);
    }
  },
  
  // Info notification shortcuts
  info: (title, message) => {
    try {
      if (shouldUseToast(message) && Toast && typeof Toast.show === 'function') {
        showToast('info', title, message);
      } else {
        showAlert(title, message);
      }
    } catch (error) {
      console.error('Error in info notification:', error);
      Alert.alert(title, message);
    }
  },
  
  // Warning notification shortcuts
  warning: (title, message) => {
    try {
      if (shouldUseToast(message) && Toast && typeof Toast.show === 'function') {
        showToast('warning', title, message);
      } else {
        showAlert(title, message);
      }
    } catch (error) {
      console.error('Error in warning notification:', error);
      Alert.alert(title, message);
    }
  }
}; 