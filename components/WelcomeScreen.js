import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

const WelcomeScreen = ({ onContinueAsGuest, onCreateAccount, onLogin }) => {
  const isWeb = Platform.OS === 'web';
  
  const guestBenefits = [
    { icon: '⚡', text: 'Start scanning immediately' },
    { icon: '📸', text: '10 free scans' },
    { icon: '🍳', text: '10 free recipes' },
    { icon: '📱', text: 'Data saved on this device' },
  ];

  const accountBenefits = [
    { icon: '📸', text: '30 scans to start' },
    { icon: '🍳', text: '30 recipes to start' },
    { icon: '🎁', text: '+5 monthly bonus scans & recipes' },
    { icon: '☁️', text: 'Sync across devices' },
    { icon: '🔒', text: 'Secure cloud backup' },
  ];

  const premiumBenefits = [
    { icon: '👑', text: '500 scans per month' },
    { icon: '👨‍🍳', text: '500 recipes per month' },
    { icon: '☁️', text: 'Sync across devices' },
    { icon: '🔒', text: 'Secure cloud backup' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.brandHeader}>
          <Text style={styles.welcomeText}>Welcome to</Text>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../assets/shelfze_no_bg.png')} 
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.appName}>Shelfze</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Choose how to begin</Text>
          <Text style={styles.sectionCaption}>
            {isWeb 
              ? 'Create an account to sync across all your devices.'
              : 'Pick a starting mode now—you can switch later without losing tracked items.'}
          </Text>
        </View>

        {/* Guest option - only show on mobile apps */}
        {!isWeb && (
          <TouchableOpacity
            style={[styles.planCard, styles.guestPlan]}
            activeOpacity={0.9}
            onPress={onContinueAsGuest}
          >
            <View style={styles.planHeader}>
              <Text style={styles.planIcon}>🚀</Text>
              <View style={styles.planTitleWrap}>
                <Text style={styles.planTitle}>Try it first</Text>
                <Text style={styles.planBadge}>No account needed</Text>
              </View>
            </View>

            <View style={styles.planBenefits}>
              {guestBenefits.map((item) => (
                <BenefitRow key={item.text} icon={item.icon} text={item.text} />
              ))}
            </View>

            <View style={styles.planCTA}>
              <Text style={styles.planCTAText}>Continue as guest</Text>
            </View>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.planCard, styles.accountPlan]}
          activeOpacity={0.9}
          onPress={() => onCreateAccount(false)}
        >
          <View style={styles.planHeader}>
            <Text style={styles.planIcon}>✨</Text>
            <View style={styles.planTitleWrap}>
              <Text style={styles.planTitle}>Create a free account</Text>
              <Text style={[styles.planBadge, styles.recommendedBadge]}>Most Popular</Text>
            </View>
          </View>

          <View style={styles.planBenefits}>
            {accountBenefits.map((item) => (
              <BenefitRow key={item.text} icon={item.icon} text={item.text} />
            ))}
          </View>

          <View style={[styles.planCTA, styles.primaryCTA]}>
            <Text style={[styles.planCTAText, styles.primaryCTAText]}>Get started</Text>
          </View>
        </TouchableOpacity>

        {/* Premium option - only show on mobile apps where purchases are available */}
        {!isWeb && (
          <TouchableOpacity
            style={[styles.planCard, styles.premiumPlan]}
            activeOpacity={0.9}
            onPress={() => onCreateAccount(true)}
          >
            <View style={styles.planHeader}>
              <Text style={styles.planIcon}>👑</Text>
              <View style={styles.planTitleWrap}>
                <Text style={styles.planTitle}>Premium</Text>
                <Text style={[styles.planBadge, styles.premiumBadge]}>Best Value</Text>
              </View>
            </View>

            <View style={styles.planBenefits}>
              {premiumBenefits.map((item) => (
                <BenefitRow key={item.text} icon={item.icon} text={item.text} />
              ))}
            </View>

            <View style={[styles.planCTA, styles.premiumCTA]}>
              <Text style={[styles.planCTAText, styles.premiumCTAText]}>Go Premium</Text>
            </View>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.loginButton} onPress={onLogin} activeOpacity={0.85}>
          <Text style={styles.loginButtonLabel}>Already have an account?</Text>
          <Text style={styles.loginButtonAction}>Log in</Text>
        </TouchableOpacity>

        <Text style={styles.footerNote}>You can upgrade from guest to account anytime.</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const BenefitRow = ({ icon, text }) => (
  <View style={styles.benefitRow}>
    <Text style={styles.benefitIcon}>{icon}</Text>
    <Text style={styles.benefitText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F1DE', // Alabaster
  },
  scrollContent: {
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 32 : 48,
    paddingBottom: 48,
    backgroundColor: '#F4F1DE', // Alabaster
  },
  sectionHeader: {
    marginBottom: 16,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 16,
  },
  welcomeText: {
    fontSize: 20,
    color: '#3D405B',
    marginBottom: 8,
    fontWeight: '500',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  logoImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  appName: {
    fontSize: 42,
    fontWeight: '900',
    color: '#4A7C59', // Sage Green
    letterSpacing: -1,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#3D405B', // Charcoal
    marginBottom: 6,
  },
  sectionCaption: {
    fontSize: 15,
    color: '#666',
    lineHeight: 20,
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 22,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  guestPlan: {
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
  },
  accountPlan: {
    borderWidth: 1.5,
    borderColor: '#4A7C59', // Sage Green
  },
  premiumPlan: {
    borderWidth: 2,
    borderColor: '#F59E0B', // Gold/Amber
    backgroundColor: '#FFFBEB', // Light Amber bg
  },
  premiumBadge: {
    backgroundColor: '#F59E0B',
    color: '#fff',
  },
  premiumCTA: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  premiumCTAText: {
    color: '#fff',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  planIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  planTitleWrap: {
    flex: 1,
  },
  planTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3D405B', // Charcoal
    marginBottom: 4,
  },
  planBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    backgroundColor: '#F1F5F9',
    textTransform: 'uppercase',
  },
  recommendedBadge: {
    backgroundColor: '#4A7C59', // Sage Green
    color: '#fff',
  },
  planBenefits: {
    marginBottom: 20,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  benefitIcon: {
    fontSize: 20,
    width: 28,
  },
  benefitText: {
    flex: 1,
    fontSize: 15,
    color: '#3D405B', // Charcoal
  },
  planCTA: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 12,
    alignItems: 'center',
  },
  planCTAText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3D405B',
  },
  primaryCTA: {
    backgroundColor: '#4A7C59', // Sage Green
    borderColor: '#4A7C59',
  },
  primaryCTAText: {
    color: '#fff',
  },
  loginButton: {
    marginTop: 8,
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#4A7C59', // Sage Green
    backgroundColor: 'rgba(74, 124, 89, 0.1)', // Sage Green with opacity
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  loginButtonLabel: {
    fontSize: 15,
    color: '#3D405B', // Charcoal
  },
  loginButtonAction: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4A7C59', // Sage Green
  },
  footerNote: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    marginTop: 12,
  },
});

export default WelcomeScreen;
