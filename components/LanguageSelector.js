import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { useLanguage, SUPPORTED_LANGUAGES } from '../contexts/LanguageContext';
import { t } from '../contexts/translations';

export default function LanguageSelector({ visible, onClose }) {
  const { language, changeLanguage } = useLanguage();

  const handleSelectLanguage = async (langCode) => {
    await changeLanguage(langCode);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>🌍 {t('languageModalTitle', language)}</Text>
          <Text style={styles.modalSubtitle}>
            {t('languageModalSubtitle', language)}
          </Text>

          <ScrollView style={styles.languageList}>
            {SUPPORTED_LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageItem,
                  language === lang.code && styles.languageItemSelected,
                ]}
                onPress={() => handleSelectLanguage(lang.code)}
              >
                <View
                  style={[
                    styles.languageBadge,
                    language === lang.code && styles.languageBadgeSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.languageBadgeText,
                      language === lang.code && styles.languageBadgeTextSelected,
                    ]}
                  >
                    {lang.code.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.languageInfo}>
                  <Text
                    style={[
                      styles.languageName,
                      language === lang.code && styles.languageNameSelected,
                    ]}
                  >
                    {lang.name}
                  </Text>
                  {lang.nativeName && lang.nativeName !== lang.name && (
                    <Text style={styles.languageNativeName}>{lang.nativeName}</Text>
                  )}
                </View>
                {language === lang.code && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>{t('close', language)}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  languageList: {
    maxHeight: 400,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: '#F5F5F5',
  },
  languageItemSelected: {
    backgroundColor: '#FEE2E2',
    borderWidth: 2,
    borderColor: '#E53E3E',
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  languageNameSelected: {
    fontWeight: 'bold',
    color: '#E53E3E',
  },
  languageNativeName: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  checkmark: {
    fontSize: 20,
    color: '#E53E3E',
    fontWeight: 'bold',
  },
  languageBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 15,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E0E0E0',
  },
  languageBadgeSelected: {
    backgroundColor: '#E53E3E',
  },
  languageBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#424242',
  },
  languageBadgeTextSelected: {
    color: '#fff',
  },
  closeButton: {
    backgroundColor: '#DD6B20',
    borderRadius: 10,
    padding: 15,
    marginTop: 15,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
