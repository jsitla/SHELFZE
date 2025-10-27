import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LanguageContext = createContext();

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'sl', name: 'Slovene', nativeName: 'Slovenščina' },
];

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('en');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem('appLanguage');
      if (savedLanguage) {
        setLanguage(savedLanguage);
      }
    } catch (error) {
      console.error('Error loading language:', error);
    } finally {
      setLoading(false);
    }
  };

  const changeLanguage = async (newLanguage) => {
    try {
      await AsyncStorage.setItem('appLanguage', newLanguage);
      setLanguage(newLanguage);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  const getLanguageName = () => {
    const lang = SUPPORTED_LANGUAGES.find(l => l.code === language);
    return lang ? lang.name : 'English';
  };

  const getLanguageBadge = () => {
    const lang = SUPPORTED_LANGUAGES.find(l => l.code === language);
    return (lang ? lang.code : 'en').toUpperCase();
  };

  return (
    <LanguageContext.Provider value={{ 
      language, 
      changeLanguage, 
  getLanguageName, 
  getLanguageBadge,
      loading 
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
