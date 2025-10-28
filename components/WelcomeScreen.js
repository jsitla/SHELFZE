import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';
import { t } from '../contexts/translations';

const WelcomeScreen = ({ onContinueAsGuest, onCreateAccount, onLogin }) => {
  const { language } = useLanguage();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>🥫</Text>
          <Text style={styles.appName}>Shelfze</Text>
          <Text style={styles.tagline}>{t('welcomeTagline', language)}</Text>
        </View>

        {/* Welcome Message */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>{t('welcomeTitle', language)}</Text>
          <Text style={styles.welcomeSubtitle}>{t('welcomeSubtitle', language)}</Text>
        </View>

        {/* Option 1: Try It First (Anonymous) */}
        <TouchableOpacity
          style={[styles.optionCard, styles.guestCard]}
          onPress={onContinueAsGuest}
          activeOpacity={0.8}
        >
          <View style={styles.optionHeader}>
            <Text style={styles.optionIcon}>🚀</Text>
            <View style={styles.optionTitleContainer}>
              <Text style={styles.optionTitle}>{t('tryItFirst', language)}</Text>
              <Text style={styles.optionBadge}>{t('noAccountNeeded', language)}</Text>
            </View>
          </View>

          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>⚡</Text>
              <Text style={styles.benefitText}>{t('startScanningNow', language)}</Text>
            </View>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>📸</Text>
              <Text style={styles.benefitText}>{t('guestScansLimit', language)}</Text>
            </View>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>🍳</Text>
              <Text style={styles.benefitText}>{t('guestRecipesLimit', language)}</Text>
            </View>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>📱</Text>
              <Text style={styles.benefitText}>{t('dataSavedLocally', language)}</Text>
            </View>
          </View>

          <Text style={styles.optionCTA}>{t('continueAsGuest', language)} →</Text>
        </TouchableOpacity>

        {/* Option 2: Create Account */}
        <TouchableOpacity
          style={[styles.optionCard, styles.accountCard]}
          onPress={onCreateAccount}
          activeOpacity={0.8}
        >
          <View style={styles.optionHeader}>
            <Text style={styles.optionIcon}>✨</Text>
            <View style={styles.optionTitleContainer}>
              <Text style={styles.optionTitle}>{t('createFreeAccount', language)}</Text>
              <Text style={[styles.optionBadge, styles.recommendedBadge]}>
                {t('recommended', language)}
              </Text>
            </View>
          </View>

          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>📸</Text>
              <Text style={styles.benefitText}>{t('freeScansLimit', language)}</Text>
            </View>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>🍳</Text>
              <Text style={styles.benefitText}>{t('freeRecipesLimit', language)}</Text>
            </View>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>🎁</Text>
              <Text style={styles.benefitText}>{t('monthlyBonus', language)}</Text>
            </View>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>☁️</Text>
              <Text style={styles.benefitText}>{t('syncAcrossDevices', language)}</Text>
            </View>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>🔒</Text>
              <Text style={styles.benefitText}>{t('secureBackup', language)}</Text>
            </View>
          </View>

          <Text style={styles.optionCTA}>{t('getStarted', language)} →</Text>
        </TouchableOpacity>

        {/* Login Link for Existing Users */}
        <TouchableOpacity 
          style={styles.loginLink}
          onPress={onLogin}
          activeOpacity={0.7}
        >
          <Text style={styles.loginLinkText}>
            {t('alreadyHaveAccount', language)} 
            <Text style={styles.loginLinkBold}> {t('login', language)}</Text>
          </Text>
        </TouchableOpacity>

        {/* Footer Note */}
        <Text style={styles.footerNote}>{t('upgradeAnytime', language)}</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 20 : 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    fontSize: 64,
    marginBottom: 8,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2d3436',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#636e72',
    textAlign: 'center',
  },
  welcomeSection: {
    marginBottom: 30,
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2d3436',
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#636e72',
    textAlign: 'center',
    lineHeight: 24,
  },
  optionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  guestCard: {
    borderWidth: 2,
    borderColor: '#dfe6e9',
  },
  accountCard: {
    borderWidth: 2,
    borderColor: '#00b894',
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  optionIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  optionTitleContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2d3436',
    marginBottom: 4,
  },
  optionBadge: {
    fontSize: 12,
    color: '#636e72',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  recommendedBadge: {
    backgroundColor: '#00b894',
    color: '#fff',
    fontWeight: '600',
  },
  benefitsList: {
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitIcon: {
    fontSize: 18,
    marginRight: 12,
    width: 24,
    textAlign: 'center',
  },
  benefitText: {
    fontSize: 15,
    color: '#2d3436',
    flex: 1,
    lineHeight: 22,
  },
  optionCTA: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00b894',
    textAlign: 'center',
  },
  loginLink: {
    marginTop: 16,
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  loginLinkText: {
    fontSize: 15,
    color: '#636e72',
    textAlign: 'center',
  },
  loginLinkBold: {
    fontWeight: 'bold',
    color: '#0984e3',
  },
  footerNote: {
    fontSize: 13,
    color: '#95a5a6',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
});

export default WelcomeScreen;
