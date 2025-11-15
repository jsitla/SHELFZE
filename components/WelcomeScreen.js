import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

const WelcomeScreen = ({ onContinueAsGuest, onCreateAccount, onLogin }) => {
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Choose how to begin</Text>
          <Text style={styles.sectionCaption}>Pick a starting mode now—you can switch later without losing tracked items.</Text>
        </View>

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

        <TouchableOpacity
          style={[styles.planCard, styles.accountPlan]}
          activeOpacity={0.9}
          onPress={onCreateAccount}
        >
          <View style={styles.planHeader}>
            <Text style={styles.planIcon}>✨</Text>
            <View style={styles.planTitleWrap}>
              <Text style={styles.planTitle}>Create a free account</Text>
              <Text style={[styles.planBadge, styles.recommendedBadge]}>Recommended</Text>
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
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 32 : 48,
    paddingBottom: 48,
    backgroundColor: '#0F172A',
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  sectionCaption: {
    fontSize: 15,
    color: '#CBD5F5',
    lineHeight: 20,
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 22,
    marginBottom: 18,
  },
  guestPlan: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  accountPlan: {
    borderWidth: 1.5,
    borderColor: '#E11D48',
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
    color: '#0F172A',
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
    backgroundColor: '#E11D48',
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
    color: '#0F172A',
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
    color: '#0F172A',
  },
  primaryCTA: {
    backgroundColor: '#E11D48',
    borderColor: '#E11D48',
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
    borderColor: '#F8FAFC',
    backgroundColor: 'rgba(248, 250, 252, 0.08)',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  loginButtonLabel: {
    fontSize: 15,
    color: '#E2E8F0',
  },
  loginButtonAction: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  footerNote: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 12,
  },
});

export default WelcomeScreen;
