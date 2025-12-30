export const parseDate = (dateInput) => {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return dateInput;
  
  const date = new Date(dateInput);
  // Check if valid date
  if (!isNaN(date.getTime())) {
    return date;
  }
  
  if (__DEV__) console.warn('Invalid date encountered:', dateInput);
  return null; // Fallback to null
};

export const formatDate = (date, language = 'en') => {
  if (!date) return '';
  
  const localeMap = {
    'en': 'en-US',
    'de': 'de-DE',
    'it': 'it-IT',
    'sl': 'sl-SI'
  };
  
  const locale = localeMap[language] || 'en-US';
  
  return date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};
