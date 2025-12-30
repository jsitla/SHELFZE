import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  primaryGreen: '#22C55E',
  darkGreen: '#166534',
  cream: '#FEF9F3',
  charcoal: '#1F2937',
  white: '#FFFFFF',
  lightGray: '#F3F4F6',
};

const PrivacyPolicyScreen = ({ onBack }) => {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={COLORS.darkGreen} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 80 }} />
      </View>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>Privacy Policy for Shelfze</Text>
        <Text style={styles.lastUpdated}>Last Updated: December 24, 2025</Text>

        <Section title="Introduction">
          <Text style={styles.paragraph}>
            Welcome to Shelfze ("we," "our," or "us"). This Privacy Policy explains how we collect, use, store, and protect your information when you use our mobile application (the "App"). We are committed to protecting your privacy while helping you reduce food waste through intelligent inventory management.
          </Text>
          <Text style={styles.paragraph}>
            By downloading or using Shelfze, you agree to the collection and use of information in accordance with this policy.
          </Text>
        </Section>

        <Section title="1. Information We Collect">
          <Text style={styles.subheading}>1.1 Information You Provide Directly</Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Account Information:</Text> If you create an account, we collect your email address. If you use social login (Google/Apple), we collect your basic profile information provided by that service.
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Inventory Data:</Text> Food items, expiration dates, quantities, categories, and notes you manually enter or scan.
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Images and Video:</Text> Photos and video frames of food items/labels captured via the camera for analysis.
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Preferences:</Text> Language settings, app configuration, and dietary preferences (e.g., "Vegetarian," "Gluten-Free").
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Household Data:</Text> If you create or join a Household, we collect household membership information, including household name, member IDs, invite codes, and shared pantry data.
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Nickname:</Text> You may set a display nickname (up to 20 characters) to identify yourself to other household members.
          </Text>

          <Text style={styles.subheading}>1.2 Automatically Collected Information</Text>
          <Text style={styles.bulletItem}>• Device Data: Model, OS version, unique device identifiers, and app version.</Text>
          <Text style={styles.bulletItem}>• Usage Analytics: Feature usage, scan success rates, recipe generation frequency.</Text>
          <Text style={styles.bulletItem}>• Diagnostics: Crash reports, error logs, and performance metrics.</Text>
          <Text style={styles.bulletItem}>• Authentication Data: Anonymous User IDs assigned by Firebase Authentication.</Text>
          <Text style={styles.bulletItem}>• Purchase History: Subscription status and renewal information (via RevenueCat).</Text>

          <Text style={styles.subheading}>1.3 Information We Do NOT Collect</Text>
          <Text style={styles.bulletItem}>• Financial Information: All payments are processed by Apple/Google.</Text>
          <Text style={styles.bulletItem}>• Precise Location Data: We do not track your GPS location.</Text>
          <Text style={styles.bulletItem}>• Clinical Health Data: No medical records or biometric data.</Text>
        </Section>

        <Section title="2. How We Use Your Information">
          <Text style={styles.subheading}>2.1 Core Functionality</Text>
          <Text style={styles.bulletItem}>• Process images to identify food and expiration dates via AI.</Text>
          <Text style={styles.bulletItem}>• Sync your pantry inventory across your devices via the Cloud.</Text>
          <Text style={styles.bulletItem}>• Generate relevant recipes based on your available ingredients.</Text>
          <Text style={styles.bulletItem}>• Manage your premium subscription status via RevenueCat.</Text>
          <Text style={styles.bulletItem}>• Send push notifications for expiring items (if enabled).</Text>
          <Text style={styles.bulletItem}>• Enable Household sharing for family members.</Text>

          <Text style={styles.subheading}>2.2 AI Improvement & Data Analysis</Text>
          <Text style={styles.paragraph}>
            We utilize AI services provided by Google. Aggregated, anonymized data may be used to improve the accuracy of our food recognition algorithms.
          </Text>
        </Section>

        <Section title="3. Data Sharing">
          <Text style={styles.subheading}>3.1 Household Sharing</Text>
          <Text style={styles.paragraph}>If you create or join a Household:</Text>
          <Text style={styles.bulletItem}>• Your pantry items are shared with all household members.</Text>
          <Text style={styles.bulletItem}>• Your shopping list is shared with all household members.</Text>
          <Text style={styles.bulletItem}>• Your saved recipes are shared with all household members.</Text>
          <Text style={styles.bulletItem}>• Your usage credits are pooled with the household.</Text>
          <Text style={styles.bulletItem}>• Your nickname is visible to other household members.</Text>
          <Text style={styles.bulletItem}>• Household members cannot see your personal account details.</Text>

          <Text style={styles.subheading}>3.2 Third-Party Service Providers</Text>
          <Text style={styles.bulletItem}>• Google Firebase: Authentication, Database, Analytics</Text>
          <Text style={styles.bulletItem}>• Google Cloud Vision: OCR & Image Recognition</Text>
          <Text style={styles.bulletItem}>• Google Gemini: AI Food Detection & Recipe Generation</Text>
          <Text style={styles.bulletItem}>• RevenueCat: Subscription Management</Text>
          <Text style={styles.paragraph}>
            We do not sell your personal data to advertisers or data brokers.
          </Text>
        </Section>

        <Section title="4. Camera and Microphone Usage">
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Camera:</Text> To capture images of food packaging and read expiration dates via OCR.
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Microphone:</Text> Required when recording video clips for scanning. We do not analyze or transcribe audio.
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Data Retention:</Text> Images and video frames are transmitted securely for immediate analysis. We do not permanently store your raw photos or videos.
          </Text>
        </Section>

        <Section title="5. Data Retention & Security">
          <Text style={styles.bulletItem}>• Storage: Data is stored securely on Google Cloud Platform (Firestore).</Text>
          <Text style={styles.bulletItem}>• Retention: We retain your inventory data as long as your account is active.</Text>
          <Text style={styles.bulletItem}>• Security: We use HTTPS (TLS) encryption for all data in transit.</Text>
          <Text style={styles.bulletItem}>• Anonymous Accounts: Data tied to an anonymous ID will be lost if you delete the App.</Text>
        </Section>

        <Section title="6. Your Rights and Choices">
          <Text style={styles.subheading}>6.1 Account & Data Deletion</Text>
          <Text style={styles.paragraph}>
            You have the right to delete your data at any time. Go to Settings → Delete Account, or contact support@shelfze.com.
          </Text>

          <Text style={styles.subheading}>6.2 European Users (GDPR)</Text>
          <Text style={styles.paragraph}>
            If you are in the EEA, you have the right to access, rectify, erase, or restrict the processing of your personal data.
          </Text>

          <Text style={styles.subheading}>6.3 California Users (CCPA)</Text>
          <Text style={styles.paragraph}>
            We do not "sell" or "share" personal information as defined by the CCPA.
          </Text>
        </Section>

        <Section title="7. Children's Privacy">
          <Text style={styles.paragraph}>
            Shelfze is not intended for children under the age of 13 (or 16 in certain jurisdictions). We do not knowingly collect personal data from children.
          </Text>
        </Section>

        <Section title="8. Changes to This Policy">
          <Text style={styles.paragraph}>
            We may update this Privacy Policy to reflect changes in our practices. The "Last Updated" date at the top indicates the latest revision.
          </Text>
        </Section>

        <Section title="9. Contact Us">
          <Text style={styles.paragraph}>
            If you have questions about this Privacy Policy or your data, please contact us:
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Shelfze Contacts:</Text>{'\n'}
            <Text style={styles.bold}>Email:</Text> support@shelfze.com{'\n'}
            <Text style={styles.bold}>Website:</Text> https://shelfze.com/{'\n'}{'\n'}
            <Text style={styles.bold}>Developer:</Text> M-AI d.o.o.{'\n'}
            <Text style={styles.bold}>Website:</Text> https://m-ai.info/
          </Text>
        </Section>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2025 Shelfze. All rights reserved.</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const Section = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    fontSize: 16,
    color: COLORS.darkGreen,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.darkGreen,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.darkGreen,
    marginBottom: 8,
  },
  lastUpdated: {
    fontSize: 14,
    color: COLORS.charcoal,
    opacity: 0.6,
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.darkGreen,
    marginBottom: 16,
  },
  subheading: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.charcoal,
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 24,
    color: COLORS.charcoal,
    marginBottom: 12,
  },
  bold: {
    fontWeight: '600',
  },
  bulletItem: {
    fontSize: 15,
    lineHeight: 24,
    color: COLORS.charcoal,
    marginBottom: 6,
    paddingLeft: 8,
  },
  footer: {
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: COLORS.charcoal,
    opacity: 0.5,
  },
});

export default PrivacyPolicyScreen;
