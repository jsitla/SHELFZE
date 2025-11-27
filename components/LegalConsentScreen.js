import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Linking,
  ScrollView,
  SafeAreaView,
  Platform,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Checkbox from 'expo-checkbox';
import { StatusBar } from 'expo-status-bar';

// Simple in-app legal consent screen. It assumes Terms and Privacy are available
// via external links for now (GitHub markdown). We just enforce confirmation.

const TERMS_URL = 'https://github.com/jsitla/SHELFZE/blob/main/TERMS-OF-SERVICE.md';
const PRIVACY_URL = 'https://github.com/jsitla/SHELFZE/blob/main/PRIVACY-POLICY.md';
const LEGAL_CONSENT_KEY = 'legalConsent_v5'; // Changed key to force re-consent for testing Login vs Signup

export async function getStoredLegalConsent() {
  try {
    const value = await AsyncStorage.getItem(LEGAL_CONSENT_KEY);
    return value ? new Date(value) : null;
  } catch (e) {
    console.warn('Failed to read legal consent from storage', e);
    return null;
  }
}

export async function storeLegalConsent(date = new Date()) {
  try {
    await AsyncStorage.setItem(LEGAL_CONSENT_KEY, date.toISOString());
  } catch (e) {
    console.warn('Failed to store legal consent', e);
  }
}

export default function LegalConsentScreen({ onAccepted }) {
  const [checked, setChecked] = useState(false);

  const openUrl = useCallback(async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch (e) {
      console.warn('Failed to open URL', url, e);
    }
  }, []);

  const handleContinue = useCallback(async () => {
    if (!checked) return;
    await storeLegalConsent();
    if (onAccepted) {
      onAccepted();
    }
  }, [checked, onAccepted]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.backgroundLayer}>
        <View style={[styles.glow, styles.glowTop]} />
        <View style={[styles.glow, styles.glowBottom]} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        <View style={styles.card}>
          <Text style={styles.title}>Welcome to Shelfze</Text>
          <Text style={styles.description}>
            Before you start, please confirm you agree to the Terms of Service and Privacy Policy.
          </Text>

          <View style={styles.linksRow}>
            <TouchableOpacity onPress={() => openUrl(TERMS_URL)} style={styles.linkButton}>
              <Text style={styles.linkLabel}>📄 Terms of Service</Text>
              <Text style={styles.linkHint}>Opens browser</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => openUrl(PRIVACY_URL)} style={styles.linkButton}>
              <Text style={styles.linkLabel}>🔐 Privacy Policy</Text>
              <Text style={styles.linkHint}>Opens browser</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.checkboxRow}>
            <Checkbox
              value={checked}
              onValueChange={setChecked}
              color={checked ? '#38BDF8' : undefined}
              style={styles.checkbox}
            />
            <Text style={styles.checkboxLabel}>
              I confirm that I have read and agree to both documents.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.continueButton, !checked && styles.continueButtonDisabled]}
            onPress={handleContinue}
            disabled={!checked}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#050B18',
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#050B18',
  },
  glow: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 280,
    backgroundColor: 'rgba(225, 29, 72, 0.18)',
    opacity: 0.9,
  },
  glowTop: {
    top: -40,
    right: -60,
  },
  glowBottom: {
    bottom: -80,
    left: -40,
    backgroundColor: 'rgba(56, 189, 248, 0.25)',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#475569',
    lineHeight: 22,
    marginBottom: 20,
  },
  linksRow: {
    flexDirection: 'column',
    marginTop: 12,
    gap: 12,
  },
  linkButton: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  linkLabel: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
  },
  linkHint: {
    color: '#64748B',
    fontSize: 13,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 20,
  },
  checkbox: {
    marginTop: Platform.OS === 'ios' ? 2 : 0,
  },
  checkboxLabel: {
    flex: 1,
    marginLeft: 12,
    color: '#0F172A',
    fontSize: 14,
    lineHeight: 20,
  },
  continueButton: {
    marginTop: 20,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
