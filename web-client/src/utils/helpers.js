/**
 * Format a date to localized string
 * @param {string|Date} date - The date to format
 * @param {string} locale - The locale to use
 * @returns {string} Formatted date
 */
export const formatDate = (date, locale = 'tr-TR') => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Format a date to include time
 * @param {string|Date} date - The date to format
 * @param {string} locale - The locale to use
 * @returns {string} Formatted date with time
 */
export const formatDateTime = (date, locale = 'tr-TR') => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Truncate a string to a specific length and add ellipsis
 * @param {string} str - The string to truncate
 * @param {number} length - The max length
 * @returns {string} Truncated string
 */
export const truncateString = (str, length = 100) => {
  if (!str) return '';
  
  if (str.length <= length) return str;
  
  return `${str.substring(0, length).trim()}...`;
};

/**
 * Validate an email address format
 * @param {string} email - The email to validate
 * @returns {boolean} Is valid or not
 */
export const isValidEmail = (email) => {
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
};

/**
 * Capitalize the first letter of each word in a string
 * @param {string} str - The string to capitalize
 * @returns {string} Capitalized string
 */
export const capitalizeWords = (str) => {
  if (!str) return '';
  
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Format a phone number to a more readable format
 * @param {string} phone - The phone number to format
 * @returns {string} Formatted phone number
 */
export const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Check if it's a valid Turkish mobile number
  if (cleaned.length === 10) {
    return `0${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 8)} ${cleaned.slice(8)}`;
  }
  
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 9)} ${cleaned.slice(9)}`;
  }
  
  return phone;
};

/**
 * Get the status label for an issue
 * @param {string} status - The status code
 * @returns {object} Status with label and style
 */
export const getIssueStatusInfo = (status) => {
  const statusMap = {
    'pending': {
      label: 'Beklemede',
      color: 'bg-yellow-100 text-yellow-800'
    },
    'in-progress': {
      label: 'İşlemde',
      color: 'bg-blue-100 text-blue-800'
    },
    'resolved': {
      label: 'Çözüldü',
      color: 'bg-green-100 text-green-800'
    },
    'closed': {
      label: 'Kapatıldı',
      color: 'bg-gray-100 text-gray-800'
    },
    'rejected': {
      label: 'Reddedildi',
      color: 'bg-red-100 text-red-800'
    }
  };
  
  return statusMap[status] || { label: 'Bilinmiyor', color: 'bg-gray-100 text-gray-800' };
}; 