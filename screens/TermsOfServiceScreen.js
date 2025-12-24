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
  coral: '#FB923C',
  red: '#EF4444',
};

const TermsOfServiceScreen = ({ onBack }) => {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={COLORS.darkGreen} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={{ width: 80 }} />
      </View>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>Terms of Service for Shelfze</Text>
        <Text style={styles.lastUpdated}>Last Updated: December 24, 2025</Text>

        {/* Critical Disclaimer Box */}
        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>⚠️ CRITICAL DISCLAIMERS</Text>
          <Text style={styles.warningItem}>1. AI Can Make Mistakes - All AI-generated content may be inaccurate.</Text>
          <Text style={styles.warningItem}>2. No Liability for Food Safety - We are not responsible for food poisoning, allergic reactions, or health issues.</Text>
          <Text style={styles.warningItem}>3. Verify Everything - Always double-check AI suggestions before use.</Text>
          <Text style={styles.warningItem}>4. Not Medical Advice - Consult healthcare professionals for dietary guidance.</Text>
          <Text style={styles.warningItem}>5. Use at Your Own Risk - You accept all risks associated with using the App.</Text>
        </View>

        <Section title="1. Acceptance of Terms">
          <Text style={styles.paragraph}>
            By downloading, installing, or using the Shelfze mobile application ("App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the App.
          </Text>
        </Section>

        <Section title="2. Description of Service">
          <Text style={styles.paragraph}>
            Shelfze is a mobile application that uses artificial intelligence (AI) and image recognition technology to help users:
          </Text>
          <Text style={styles.bulletItem}>• Scan and identify food items (via Photo or Video mode)</Text>
          <Text style={styles.bulletItem}>• Track food inventory and expiration dates</Text>
          <Text style={styles.bulletItem}>• Generate recipe suggestions based on available ingredients</Text>
          <Text style={styles.bulletItem}>• Manage pantry items</Text>
          <Text style={styles.bulletItem}>• Share a pantry with household members</Text>
        </Section>

        <Section title="3. AI-Generated Content Disclaimer">
          <Text style={styles.subheading}>3.1 No Warranty for AI Accuracy</Text>
          <View style={styles.importantBox}>
            <Text style={styles.importantText}>
              IMPORTANT: Shelfze uses artificial intelligence technology, including Google Cloud Vision API and Google Gemini AI. AI TECHNOLOGY CAN AND DOES MAKE MISTAKES.
            </Text>
          </View>

          <Text style={styles.subheading}>3.2 Food Scanning and Detection</Text>
          <Text style={styles.paragraph}>WE DO NOT GUARANTEE THE ACCURACY OF:</Text>
          <Text style={styles.bulletItem}>• Food item identification through camera scanning</Text>
          <Text style={styles.bulletItem}>• Expiration date detection from product labels</Text>
          <Text style={styles.bulletItem}>• Nutritional information provided</Text>
          <Text style={styles.bulletItem}>• Allergen detection or warnings</Text>
          <Text style={styles.bulletItem}>• Food safety assessments</Text>

          <Text style={styles.paragraph}>YOU ARE SOLELY RESPONSIBLE FOR:</Text>
          <Text style={styles.bulletItem}>• Verifying all scanned information for accuracy</Text>
          <Text style={styles.bulletItem}>• Checking actual expiration dates on product packaging</Text>
          <Text style={styles.bulletItem}>• Inspecting food for signs of spoilage</Text>
          <Text style={styles.bulletItem}>• Making your own food safety decisions</Text>

          <Text style={styles.subheading}>3.3 Recipe Generation</Text>
          <Text style={styles.paragraph}>WE EXPLICITLY DISCLAIM ALL LIABILITY FOR AI-GENERATED RECIPES:</Text>
          <Text style={styles.bulletItem}>• Recipes may contain errors</Text>
          <Text style={styles.bulletItem}>• Recipes may include unsafe food combinations</Text>
          <Text style={styles.bulletItem}>• Recipes may not account for allergies or dietary restrictions</Text>
          <Text style={styles.bulletItem}>• Cooking instructions may be incomplete or incorrect</Text>
          <Text style={styles.bulletItem}>• Ingredient quantities may be inaccurate</Text>

          <Text style={styles.subheading}>3.4 Allergen Warning</Text>
          <View style={styles.allergenBox}>
            <Text style={styles.allergenTitle}>🚨 CRITICAL ALLERGEN WARNING</Text>
            <Text style={styles.allergenText}>
              The App does NOT reliably detect allergens in food items. AI scanning may miss or incorrectly identify allergens. If you have food allergies, DO NOT rely on the App for allergen detection. Always read product labels carefully.
            </Text>
          </View>

          <Text style={styles.subheading}>3.5 No Medical or Nutritional Advice</Text>
          <Text style={styles.paragraph}>
            Shelfze does not provide medical, nutritional, or dietary advice. Always consult with qualified healthcare professionals regarding dietary restrictions, food allergies, and nutritional needs.
          </Text>
        </Section>

        <Section title="4. Limitation of Liability">
          <Text style={styles.subheading}>4.1 Maximum Liability</Text>
          <Text style={styles.paragraph}>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, SHELFZE AND ITS DEVELOPERS SHALL NOT BE LIABLE FOR ANY:
          </Text>
          <Text style={styles.bulletItem}>• Food poisoning or foodborne illness</Text>
          <Text style={styles.bulletItem}>• Allergic reactions</Text>
          <Text style={styles.bulletItem}>• Health complications from AI-generated recipes</Text>
          <Text style={styles.bulletItem}>• Financial losses from food waste</Text>
          <Text style={styles.bulletItem}>• Property damage from cooking accidents</Text>
          <Text style={styles.bulletItem}>• Any direct, indirect, incidental, or consequential damages</Text>

          <Text style={styles.subheading}>4.2 Use at Your Own Risk</Text>
          <Text style={styles.paragraph}>
            YOUR USE OF SHELFZE IS AT YOUR SOLE RISK. The App is provided "AS IS" and "AS AVAILABLE" without warranties of any kind.
          </Text>
        </Section>

        <Section title="5. User Responsibilities">
          <Text style={styles.subheading}>5.1 Proper Use</Text>
          <Text style={styles.bulletItem}>• Use the App for personal, non-commercial purposes only</Text>
          <Text style={styles.bulletItem}>• Verify all AI-generated information independently</Text>
          <Text style={styles.bulletItem}>• Exercise reasonable judgment regarding food safety</Text>
          <Text style={styles.bulletItem}>• Not rely solely on the App for critical food safety decisions</Text>

          <Text style={styles.subheading}>5.2 Prohibited Uses</Text>
          <Text style={styles.bulletItem}>• Use for commercial food service without professional verification</Text>
          <Text style={styles.bulletItem}>• Redistribute or resell AI-generated recipes</Text>
          <Text style={styles.bulletItem}>• Attempt to reverse engineer the App</Text>
          <Text style={styles.bulletItem}>• Upload inappropriate, illegal, or harmful content</Text>
        </Section>

        <Section title="6. Camera and Data Usage">
          <Text style={styles.paragraph}>
            The App requires camera access to scan food items. By granting permission, you authorize the App to capture images which are processed by third-party AI services as described in our Privacy Policy.
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Anonymous Mode:</Text> Data is tied to your device. If you uninstall, your data cannot be recovered.
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Registered Accounts:</Text> Allows sync across devices and data recovery.
          </Text>
        </Section>

        <Section title="7. Household Sharing">
          <Text style={styles.paragraph}>
            When you create or join a Household, your pantry items, shopping list, and saved recipes are shared with all household members. Usage credits are pooled.
          </Text>
          <Text style={styles.paragraph}>
            Leaving a household restores your personal credits with a 7-day cooldown before joining another.
          </Text>
        </Section>

        <Section title="8. Subscriptions and Payments">
          <Text style={styles.bulletItem}>• All payments are handled by Apple App Store or Google Play Store</Text>
          <Text style={styles.bulletItem}>• Subscriptions auto-renew unless cancelled 24 hours before period end</Text>
          <Text style={styles.bulletItem}>• Manage subscriptions in your device's Account Settings</Text>
          <Text style={styles.bulletItem}>• Refunds are handled by Apple/Google per their policies</Text>
        </Section>

        <Section title="9. Intellectual Property">
          <Text style={styles.paragraph}>
            The Shelfze App is owned by the developers and protected by intellectual property laws. You retain ownership of images you capture. AI-generated recipes are for personal use only.
          </Text>
        </Section>

        <Section title="10. Service Availability">
          <Text style={styles.paragraph}>We do not guarantee uninterrupted access, error-free operation, or preservation of your data. We may modify or discontinue features at any time.</Text>
        </Section>

        <Section title="11. Age Restrictions">
          <Text style={styles.paragraph}>
            Shelfze is intended for users aged 13 and older. Users under 18 should use the App under parental supervision.
          </Text>
        </Section>

        <Section title="12. Dispute Resolution">
          <Text style={styles.paragraph}>
            These Terms are governed by the laws of Slovenia. Before filing any formal claim, contact us at support@shelfze.com to attempt informal resolution.
          </Text>
        </Section>

        <Section title="13. Contact Information">
          <Text style={styles.paragraph}>
            For questions about these Terms, contact us:
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Email:</Text> support@shelfze.com{'\n'}
            <Text style={styles.bold}>Developer:</Text> Shelfze Team
          </Text>
        </Section>

        <Section title="14. Apple App Store Terms">
          <Text style={styles.paragraph}>
            If you access the App from Apple App Store: These Terms are between you and Shelfze only. Shelfze is solely responsible for the App, maintenance, support, warranties, and claims. Apple and its subsidiaries are third-party beneficiaries of these Terms.
          </Text>
        </Section>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By using Shelfze, you acknowledge that you have read, understood, and agree to these Terms of Service.
          </Text>
          <Text style={styles.copyright}>© 2025 Shelfze. All rights reserved.</Text>
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
    marginBottom: 24,
  },
  warningBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 2,
    borderColor: COLORS.red,
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.red,
    marginBottom: 12,
  },
  warningItem: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.charcoal,
    marginBottom: 6,
  },
  importantBox: {
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.coral,
    padding: 16,
    marginVertical: 12,
  },
  importantText: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.charcoal,
    fontWeight: '500',
  },
  allergenBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 16,
    marginVertical: 12,
  },
  allergenTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.red,
    marginBottom: 8,
  },
  allergenText: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.charcoal,
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
    lineHeight: 22,
    color: COLORS.charcoal,
    textAlign: 'center',
    marginBottom: 12,
  },
  copyright: {
    fontSize: 14,
    color: COLORS.charcoal,
    opacity: 0.5,
  },
});

export default TermsOfServiceScreen;
