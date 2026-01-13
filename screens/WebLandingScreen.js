import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Linking,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Font from 'expo-font';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isLargeScreen = SCREEN_WIDTH > 768;

// Color palette - Fresh & Eco-conscious
const COLORS = {
  primaryGreen: '#22C55E',
  darkGreen: '#166534',
  cream: '#FEF9F3',
  sage: '#BBF7D0',
  coral: '#FB923C',
  charcoal: '#1F2937',
  white: '#FFFFFF',
  lightGray: '#F3F4F6',
};

// Animated countdown badge component
const ExpiryBadge = ({ days, delay = 0 }) => {
  const [currentDays, setCurrentDays] = useState(days);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const getColor = () => {
    if (currentDays <= 2) return '#EF4444';
    if (currentDays <= 5) return COLORS.coral;
    return COLORS.primaryGreen;
  };

  return (
    <View style={[
      styles.expiryBadge,
      { backgroundColor: getColor(), opacity: animated ? 1 : 0, transform: [{ scale: animated ? 1 : 0.8 }] }
    ]}>
      <Text style={styles.expiryText}>{currentDays}d</Text>
    </View>
  );
};

// Food item in the hero mockup
const FoodItem = ({ name, emoji, days, delay }) => (
  <View style={[styles.foodItem, { animationDelay: `${delay}ms` }]}>
    <Text style={styles.foodEmoji}>{emoji}</Text>
    <Text style={styles.foodName}>{name}</Text>
    <ExpiryBadge days={days} delay={delay} />
  </View>
);

// App screenshots for carousel
const APP_SCREENSHOTS = [
  { id: 1, source: require('../assets/screenshots/Screen shot 1.jpg'), label: 'AI Scanning' },
  { id: 2, source: require('../assets/screenshots/Screen shot 2.jpg'), label: 'Smart Detection' },
  { id: 3, source: require('../assets/screenshots/Screen shot 3.jpg'), label: 'Pantry Management' },
  { id: 4, source: require('../assets/screenshots/Screen shot 4.jpg'), label: 'Recipe Ideas' },
  { id: 5, source: require('../assets/screenshots/Screen shot 5.jpg'), label: 'Pantry Check' },
];

// Phone mockup component with screenshot carousel
const PhoneMockup = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Auto-advance carousel
  useEffect(() => {
    if (!isAutoPlaying) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % APP_SCREENSHOTS.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [isAutoPlaying]);

  const goToSlide = (index) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
    // Resume auto-play after 10 seconds of inactivity
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const goNext = () => {
    goToSlide((currentIndex + 1) % APP_SCREENSHOTS.length);
  };

  const goPrev = () => {
    goToSlide((currentIndex - 1 + APP_SCREENSHOTS.length) % APP_SCREENSHOTS.length);
  };

  return (
    <View style={styles.screenshotCarouselContainer}>
      {/* Phone Frame */}
      <View style={styles.phoneMockup}>
        <View style={styles.phoneScreenshot}>
          <Image 
            source={APP_SCREENSHOTS[currentIndex].source}
            style={styles.screenshotImage}
            resizeMode="contain"
          />
        </View>
      </View>
      
      {/* Navigation Arrows */}
      <TouchableOpacity style={[styles.carouselArrow, styles.carouselArrowLeft]} onPress={goPrev}>
        <View style={styles.arrowLeft} />
      </TouchableOpacity>
      <TouchableOpacity style={[styles.carouselArrow, styles.carouselArrowRight]} onPress={goNext}>
        <View style={styles.arrowRight} />
      </TouchableOpacity>
      
      {/* Dots Indicator */}
      <View style={styles.carouselDots}>
        {APP_SCREENSHOTS.map((_, index) => (
          <TouchableOpacity 
            key={index} 
            onPress={() => goToSlide(index)}
            style={[
              styles.carouselDot,
              index === currentIndex && styles.carouselDotActive
            ]}
          />
        ))}
      </View>
      
      {/* Label */}
      <Text style={styles.screenshotLabel}>{APP_SCREENSHOTS[currentIndex].label}</Text>
    </View>
  );
};

// Feature card component
const FeatureCard = ({ icon, title, description }) => (
  <View style={styles.featureCard}>
    <View style={styles.featureIconContainer}>
      <Ionicons name={icon} size={32} color={COLORS.primaryGreen} />
    </View>
    <Text style={styles.featureTitle}>{title}</Text>
    <Text style={styles.featureDescription}>{description}</Text>
  </View>
);

// Step component for "How it works"
const Step = ({ number, icon, title, description }) => (
  <View style={styles.step}>
    <View style={styles.stepNumber}>
      <Text style={styles.stepNumberText}>{number}</Text>
    </View>
    <View style={{ minWidth: 40, minHeight: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
      <Ionicons name={icon} size={40} color={COLORS.primaryGreen} />
    </View>
    <Text style={styles.stepTitle}>{title}</Text>
    <Text style={styles.stepDescription}>{description}</Text>
  </View>
);

// YouTube embed component
const YouTubeEmbed = ({ videoId, title = "Shelfze Demo", placeholder = true, aspectRatio = 16 / 9 }) => {
  const [showVideo, setShowVideo] = useState(!placeholder);

  if (!showVideo) {
    return (
      <TouchableOpacity 
        style={[styles.videoPlaceholder, { aspectRatio }]} 
        onPress={() => setShowVideo(true)}
      >
        <View style={styles.playButton}>
          <Ionicons name="play" size={48} color={COLORS.white} />
        </View>
        <Text style={styles.videoPlaceholderText} numberOfLines={1}>Watch {title}</Text>
        <Text style={styles.videoComingSoon}>Click to play</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.videoContainer, { aspectRatio }]}>
      {Platform.OS === 'web' ? (
        <iframe
          width="100%"
          height="100%"
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`}
          title={title}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ borderRadius: 16 }}
        />
      ) : (
        <Text style={{ color: 'white' }}>Video only available on web</Text>
      )}
    </View>
  );
};

// Legal Modal Component
const LegalModal = ({ visible, onClose, title, content }) => (
  <Modal
    visible={visible}
    animationType="fade"
    transparent={true}
    onRequestClose={onClose}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
            <Ionicons name="close" size={24} color={COLORS.charcoal} />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalContent}>
          <Text style={styles.modalText}>{content}</Text>
        </ScrollView>
      </View>
    </View>
  </Modal>
);

// Privacy Policy Content
const PRIVACY_POLICY = `Privacy Policy for Shelfze
Last Updated: December 11, 2025

Introduction
Welcome to Shelfze ("we," "our," or "us"). This Privacy Policy explains how we collect, use, store, and protect your information when you use our mobile application (the "App"). We are committed to protecting your privacy while helping you reduce food waste through intelligent inventory management.

By downloading or using Shelfze, you agree to the collection and use of information in accordance with this policy.

1. Information We Collect

1.1 Information You Provide Directly

Account Information: If you create an account, we collect your email address. If you use social login (Google/Apple), we collect your basic profile information provided by that service.

Inventory Data: Food items, expiration dates, quantities, categories, and notes you manually enter or scan.

Images and Video: Photos and video frames of food items/labels captured via the camera for analysis.

Preferences: Language settings, app configuration, and dietary preferences (e.g., "Vegetarian," "Gluten-Free").

Household Data: If you create or join a Household, we collect household membership information, including household name, member IDs, invite codes, and shared pantry data.

Nickname: You may set a display nickname (up to 20 characters) to identify yourself to other household members. This nickname is stored with your account and visible to household members.

Note on Dietary Data: By voluntarily providing dietary preferences, you consent to our processing of this data solely to filter recipes and organize your pantry.

1.2 Automatically Collected Information

Device Data: Model, OS version, unique device identifiers (e.g., IDFV), and app version.
Usage Analytics: Feature usage, scan success rates, recipe generation frequency, and interaction logs.
Diagnostics: Crash reports, error logs, and performance metrics.
Authentication Data: Anonymous User IDs assigned by Firebase Authentication to sync your data.
Purchase History: Subscription status, transaction receipts, and renewal information (processed via RevenueCat).
Attribution IDs: We may collect advertising identifiers (such as IDFA or Google Advertising ID) via our partners (RevenueCat, Firebase) solely for the purpose of attributing install sources and measuring campaign performance.

1.3 Information We Do NOT Collect

We do not collect:

Financial Information: All payments are processed directly by Apple (App Store) or Google (Play Store). We do not access or store credit card numbers or bank account details.
Precise Location Data: We do not track your GPS location.
Clinical Health Data: We do not collect medical records, biometric data (FaceID/Fingerprint), or clinical health information.

2. How We Use Your Information

2.1 Core Functionality

We use your data to:

• Process images to identify food and expiration dates via AI.
• Sync your pantry inventory across your devices via the Cloud.
• Generate relevant recipes based strictly on your available ingredients.
• Manage your premium subscription status and entitlements via RevenueCat.
• Send push notifications for expiring items (if enabled).
• Enable Household sharing so family members can access a shared pantry and credits.

2.2 AI Improvement & Data Analysis

We utilize Artificial Intelligence (AI) services provided by Google.

Service Improvement: Aggregated, anonymized data (such as scan success rates and detected food labels) may be used to improve the accuracy of our food recognition algorithms.

Google's Use: Data sent to Google Cloud Vision and Gemini AI is processed according to Google's Data Processing Terms. While we send data for the purpose of analysis, Google may use anonymized payloads to improve their own models depending on their current policies.

2.3 Analytics

We use tools like Firebase Analytics to understand how the App is used, detect crash patterns, and improve user experience.

3. Data Sharing

3.1 Household Sharing

If you create or join a Household:
• Your pantry items are shared with all household members.
• Your shopping list is shared with all household members.
• Your saved recipes are shared with all household members.
• Your usage credits (scans, recipes) are pooled with the household.
• Other household members can see items you add to the shared pantry, shopping list, and saved recipes.
• Your nickname is visible to other household members.
• Household members cannot see your personal account details (email, password).

When you leave a household, your personal credits are restored, and you no longer have access to the shared pantry data, shopping list, or saved recipes.

3.2 Third-Party Service Providers

We share data only with the specific third-party services required to operate the App.

• Google Firebase: Authentication, Database, Hosting, Analytics
• Google Cloud Vision: OCR & Image Recognition
• Google Gemini (Vertex AI): AI Food Detection & Recipe Generation
• RevenueCat: Subscription Management & Purchase Validation

We do not sell your personal data to advertisers or data brokers.

4. Camera and Microphone Usage

The App requests permissions to:

Camera: To capture images of food packaging and read expiration dates via OCR.
Microphone: Required by the system when recording video clips for scanning. Note: We do not analyze or transcribe audio from these clips; the microphone is accessed only because it is part of the standard video recording format.

Data Retention for Images: Images and video frames are transmitted securely to our cloud processors for immediate analysis. We do not permanently store your raw photos or videos on our servers. Once the analysis (JSON data) is extracted, the visual media is discarded.

5. Data Retention & Security

Storage: Data is stored securely on Google Cloud Platform (Firestore).
Retention: We retain your inventory data as long as your account is active.
Security: We use HTTPS (TLS) encryption for all data in transit and industry-standard security rules for database access.
Anonymous Accounts: If you use the App without signing in, your data is tied to an anonymous ID. If you delete the App or clear your device storage without linking an email, this data will be permanently lost.

6. Your Rights and Choices

6.1 Account & Data Deletion

You have the right to delete your data at any time.

• In-App Deletion: Go to Settings > Delete Account. This will permanently wipe your inventory and user record from our database.
• Manual Request: Contact support@shelfze.com.

6.2 Permissions

You can revoke Camera, Microphone, or Notification permissions at any time via your device settings. Note that revoking permissions will disable scanning features.

6.3 European Users (GDPR)

If you are in the EEA, you have the right to access, rectify, erase, or restrict the processing of your personal data. To exercise these rights, contact us at the email below. Our legal basis for processing is Contractual Necessity (to provide the service) and Legitimate Interest (to improve security and features). By providing dietary preferences, you explicitly consent to their processing.

6.4 California Users (CCPA)

We do not "sell" or "share" personal information as defined by the CCPA. You have the right to know what data we collect and request deletion.

7. Children's Privacy

Shelfze is not intended for children under the age of 13 (or 16 in certain jurisdictions). We do not knowingly collect personal data from children. If we discover such data, we will delete it immediately.

8. Changes to This Policy

We may update this Privacy Policy to reflect changes in our practices. We will notify you of any material changes via an in-app update or notification. The "Last Updated" date at the top of this policy indicates the latest revision.

9. Contact Us

If you have questions about this Privacy Policy or your data, please contact us:

Shelfze Contacts:
Email: support@shelfze.com
Website: https://shelfze.com/

Developer: M-AI d.o.o.
Website: https://m-ai.info/`;

// Terms of Service Content
const TERMS_OF_SERVICE = `Terms of Service for Shelfze
Last Updated: December 11, 2025

1. Acceptance of Terms

By downloading, installing, or using the Shelfze mobile application ("App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the App.

2. Description of Service

Shelfze is a mobile application that uses artificial intelligence (AI) and image recognition technology to help users:

• Scan and identify food items (via Photo or Video mode)
• Track food inventory and expiration dates
• Generate recipe suggestions based on available ingredients
• Manage pantry items
• Share a pantry with household members (family sharing)

3. AI-Generated Content Disclaimer

3.1 No Warranty for AI Accuracy

IMPORTANT: Shelfze uses artificial intelligence technology, including but not limited to Google Cloud Vision API and Google Gemini AI, to scan food items, detect expiration dates, and generate recipes. AI TECHNOLOGY CAN AND DOES MAKE MISTAKES.

3.2 Food Scanning and Detection

WE DO NOT GUARANTEE THE ACCURACY OF:

• Food item identification through camera scanning
• Expiration date detection from product labels
• Nutritional information provided
• Allergen detection or warnings
• Food safety assessments

YOU ARE SOLELY RESPONSIBLE FOR:

• Verifying all scanned information for accuracy
• Checking actual expiration dates on product packaging
• Inspecting food for signs of spoilage
• Making your own food safety decisions

3.3 Recipe Generation

WE EXPLICITLY DISCLAIM ALL LIABILITY FOR AI-GENERATED RECIPES:

• Recipes are generated by artificial intelligence and may contain errors
• Recipes may include unsafe food combinations
• Recipes may not account for food allergies or dietary restrictions
• Cooking instructions may be incomplete or incorrect
• Ingredient quantities may be inaccurate

YOU MUST:

• Review all recipe ingredients before cooking
• Verify cooking times and temperatures
• Check for allergens and dietary concerns
• Use your own judgment about food safety
• Consult a healthcare professional for dietary advice

3.4 Allergen and Nutritional Information Disclaimer

CRITICAL ALLERGEN WARNING:

• The App does NOT reliably detect allergens in food items
• AI scanning may miss or incorrectly identify allergens
• Cross-contamination risks are NOT evaluated
• Nutritional information may be inaccurate or incomplete

IF YOU HAVE FOOD ALLERGIES:

• DO NOT rely on the App for allergen detection
• Always read product labels carefully yourself
• Consult ingredient lists and manufacturer information
• When in doubt, do not consume the food item

WE ARE NOT LIABLE for allergic reactions, anaphylaxis, or any health complications resulting from food consumed based on App information.

3.5 No Medical or Nutritional Advice

Shelfze does not provide medical, nutritional, or dietary advice. The App is for informational and organizational purposes only. Always consult with qualified healthcare professionals regarding:

• Dietary restrictions
• Food allergies
• Nutritional needs
• Food safety for vulnerable populations (infants, elderly, pregnant, immunocompromised)

4. Limitation of Liability

4.1 Maximum Liability

TO THE MAXIMUM EXTENT PERMITTED BY LAW, SHELFZE AND ITS DEVELOPERS SHALL NOT BE LIABLE FOR ANY:

• Food poisoning or foodborne illness
• Allergic reactions
• Health complications from following AI-generated recipes
• Financial losses from food waste
• Property damage from cooking accidents
• Injuries resulting from use of the App
• Any other direct, indirect, incidental, special, or consequential damages

4.2 Use at Your Own Risk

YOU EXPRESSLY UNDERSTAND AND AGREE THAT YOUR USE OF SHELFZE IS AT YOUR SOLE RISK. The App is provided "AS IS" and "AS AVAILABLE" without warranties of any kind.

5. User Responsibilities

5.1 Proper Use

You agree to:

• Use the App for personal, non-commercial purposes only
• Verify all AI-generated information independently
• Exercise reasonable judgment regarding food safety
• Not rely solely on the App for critical food safety decisions
• Keep your device's camera clean for accurate scanning

5.2 Prohibited Uses

You agree NOT to:

• Use the App for commercial food service without professional verification
• Redistribute or resell AI-generated recipes as your own
• Attempt to reverse engineer or modify the App
• Use the App in any way that violates applicable laws
• Upload inappropriate, illegal, or harmful content

6. Camera and Data Usage

6.1 Camera Permission

The App requires camera access to scan food items and expiration dates. By granting camera permission, you:

• Authorize the App to capture images of food products
• Understand images are processed by third-party AI services
• Agree to the processing described in our Privacy Policy

6.2 Accounts and Authentication

The App supports both anonymous usage and registered accounts:

• Anonymous Mode: You can use the App without creating an account. Your data is tied to an anonymous ID on your device. Warning: If you uninstall the App or lose your device, your data cannot be recovered.
• Registered Accounts: You may choose to create an account using Email, Google, or Apple Sign-In. This allows you to sync data across devices and recover your data if you reinstall the App.

By creating an account, you agree to provide accurate information and keep your login credentials secure.

6.3 Household Sharing

Shelfze allows users to create or join a Household to share a pantry with family members.

Creating a Household:
• You become the Household Owner.
• An invite code is generated for others to join.
• Your personal pantry becomes the shared household pantry.

Joining a Household:
• You need an invite code from the Household Owner.
• Your personal credits are archived while you use household credits.
• You share pantry items, shopping list, and saved recipes with all household members.

Household Credits:
• Free households share 30 scans and 30 recipes per month.
• Premium households share 500 scans and 500 recipes per month.
• If any member has Premium, the entire household benefits.

Leaving a Household:
• Your personal credits are restored.
• A 7-day cooldown applies before joining another household.
• You lose access to the shared pantry data, shopping list, and saved recipes.

Data Sharing Warning:
By joining a Household, you consent to sharing your pantry items, shopping list, and saved recipes with other household members. Do not share sensitive information through pantry item names or notes.

7. Third-Party Services

Shelfze uses the following third-party services:

• Google Firebase - Data storage and authentication
• Google Cloud Vision API - Image recognition and OCR
• Google Gemini AI - Food detection and recipe generation
• RevenueCat - Subscription and purchase management

Your use of the App is also subject to the terms and policies of these third-party providers.

8. Subscriptions and Payments

8.1 Premium Subscriptions

Shelfze offers optional "Premium" subscription plans that unlock additional features, such as increased scan limits and unlimited recipe generation.

8.2 Billing and Renewal

• Payment Processing: All payments are handled directly by the Apple App Store or Google Play Store. Shelfze does not process payments or store financial information.
• Auto-Renewal: Subscriptions automatically renew unless auto-renew is turned off at least 24 hours before the end of the current period.
• Charges: Your account will be charged for renewal within 24 hours prior to the end of the current period.

8.3 Cancellations and Refunds

• Cancellation: You can manage or cancel your subscription at any time in your device's Account Settings (Apple ID or Google Play account).
• Refunds: Refund requests are handled by Apple or Google according to their respective refund policies. Shelfze cannot directly issue refunds for App Store or Play Store purchases.
• Right of Withdrawal (EU): If you are an EU consumer, you generally have a 14-day right of withdrawal. However, by using the App and accessing premium features immediately, you may acknowledge that you lose this right of withdrawal once the digital service has been fully performed or accessed. Please refer to Apple/Google's refund terms for specifics.

8.4 Price Changes

We reserve the right to change subscription prices at any time. Any price changes will take effect following notice to you and/or in accordance with App Store/Play Store policies.

9. Intellectual Property

9.1 App Ownership

The Shelfze App, including its design, code, features, and branding, is owned by the developers and protected by intellectual property laws.

9.2 Your Content

You retain ownership of images and videos you capture using the App. By using the App, you grant us a license to process these images/videos for the purpose of providing our services (as described in our Privacy Policy).

9.3 AI-Generated Recipes

AI-generated recipes are provided for your personal use. While you may cook and share these recipes, you acknowledge they were generated by AI and should not be represented as professionally verified.

10. Service Availability

10.1 No Guaranteed Uptime

We do not guarantee:

• Uninterrupted access to the App
• Error-free operation
• Availability of AI services
• Compatibility with all devices
• Preservation of your data

10.2 Modifications and Termination

We reserve the right to:

• Modify or discontinue features at any time
• Update these Terms without prior notice
• Terminate the App service entirely
• Limit access to users or regions

11. Updates and Changes

We may release updates to improve functionality, fix bugs, or add features. These Terms may be updated periodically. Continued use of the App after changes constitutes acceptance of the new Terms.

12. Age Restrictions

Shelfze is intended for users aged 13 and older. Users under 18 should use the App under parental supervision, especially when operating kitchen equipment.

13. Data Export

For data export requests, contact support@shelfze.com. We will provide data in a readable format (JSON or CSV) within 30 days. Note: We can only export data if you contact us from the device with your active session or a verified email account.

14. Indemnification

You agree to indemnify and hold harmless Shelfze and its developers from any claims, damages, losses, or expenses (including legal fees) arising from:

• Your use or misuse of the App
• Your violation of these Terms
• Your violation of any rights of others
• Food-related incidents resulting from App use

15. Dispute Resolution

15.1 Governing Law

These Terms are governed by the laws of Slovenia, without regard to its conflict of law principles.

15.2 Informal Resolution

Before filing any formal claim, you agree to contact us at support@shelfze.com to attempt informal resolution.

16. Severability

If any provision of these Terms is found to be unenforceable, the remaining provisions will remain in full effect.

17. Entire Agreement

These Terms, together with our Privacy Policy, constitute the entire agreement between you and Shelfze regarding use of the App.

18. Contact Information

For questions about these Terms, contact us at:

Shelfze Contacts:
Email: support@shelfze.com
Website: https://shelfze.com/

Developer: M-AI d.o.o.
Website: https://m-ai.info/

19. Additional Terms for App Store Users (Apple)

If you access or download the App from the Apple App Store, you agree to the following additional terms:

• Acknowledgement: These Terms are between you and Shelfze only, and not with Apple. Shelfze is solely responsible for the App and its content.
• Scope of License: The license granted to you is a non-transferable license to use the App on any Apple-branded products that you own or control.
• Maintenance and Support: Shelfze is solely responsible for providing any maintenance and support services. Apple has no obligation whatsoever to furnish any maintenance and support services with respect to the App.
• Warranty: Shelfze is solely responsible for any product warranties. In the event of any failure of the App to conform to any applicable warranty, you may notify Apple, and Apple will refund the purchase price for the App to you. To the maximum extent permitted by applicable law, Apple will have no other warranty obligation whatsoever with respect to the App.
• Product Claims: Shelfze, not Apple, is responsible for addressing any claims relating to the App or your possession and/or use of the App.
• Legal Compliance: You represent and warrant that (i) you are not located in a country that is subject to a U.S. government embargo, or that has been designated by the U.S. government as a "terrorist supporting" country; and (ii) you are not listed on any U.S. government list of prohibited or restricted parties.
• Third Party Beneficiary: Apple and Apple's subsidiaries are third-party beneficiaries of these Terms, and upon your acceptance, Apple will have the right to enforce these Terms against you.

---

SUMMARY OF KEY POINTS

⚠️ CRITICAL DISCLAIMERS:

1. AI Can Make Mistakes - All AI-generated content (scans, recipes, dates) may be inaccurate.
2. No Liability for Food Safety - We are not responsible for food poisoning, allergic reactions, or health issues.
3. Verify Everything - Always double-check AI suggestions before use.
4. Not Medical Advice - Consult healthcare professionals for dietary guidance.
5. Use at Your Own Risk - You accept all risks associated with using the App.

By using Shelfze, you acknowledge that you have read, understood, and agree to these Terms of Service.`;

// Main WebLandingScreen component
const WebLandingScreen = ({ onGetStarted }) => {
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 768;
  const [statsAnimated, setStatsAnimated] = useState(false);

  useEffect(() => {
    // Load Ionicons font for Web - inject CSS directly for immediate availability
    if (Platform.OS === 'web') {
      // Use local font file from public folder (copied during build)
      const iconFontStyles = `
        @font-face {
          font-family: 'Ionicons';
          src: url('/Ionicons.ttf') format('truetype');
          font-display: swap;
        }
        @font-face {
          font-family: 'ionicons';
          src: url('/Ionicons.ttf') format('truetype');
          font-display: swap;
        }
      `;
      
      // Inject CSS immediately
      const existingStyle = document.getElementById('ionicons-font');
      if (!existingStyle) {
        const style = document.createElement('style');
        style.id = 'ionicons-font';
        style.type = 'text/css';
        style.appendChild(document.createTextNode(iconFontStyles));
        document.head.appendChild(style);
      }
    }

    const timer = setTimeout(() => setStatsAnimated(true), 500);
    return () => clearTimeout(timer);
  }, []);
  
  // URL-based navigation for legal pages
  const navigateToPrivacy = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.history.pushState({}, '', '/privacy-policy.html');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };
  
  const navigateToTerms = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.history.pushState({}, '', '/terms-of-service.html');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Dummy icon to force font load / bypass first-icon render bug */}
      <Ionicons name="home" size={1} color="transparent" style={{ position: 'absolute', opacity: 0 }} />

      {/* Navigation */}
      <View style={styles.nav}>
        <View style={styles.navBrand}>
          <View style={styles.navLogoContainer}>
            <Image 
              source={require('../assets/shelfze_no_bg.png')} 
              style={styles.navLogoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.navTitle}>Shelfze</Text>
        </View>
        {/* <TouchableOpacity style={styles.navCta} onPress={onGetStarted}>
          <Text style={styles.navCtaText}>Get Started</Text>
        </TouchableOpacity> */}
      </View>

      {/* Hero Section */}
      <View style={styles.hero}>
        <View style={styles.heroContent}>
          <Text style={styles.heroTagline}>AI-Powered Pantry Management</Text>
          <Text style={styles.heroTitle}>Never waste food again.</Text>
          <Text style={styles.heroSubtitle}>
            Scan your groceries, track expiry dates automatically, and get recipes 
            that use what's about to expire. Save money. Save the planet.
          </Text>
          <View style={styles.heroCtas}>
            <TouchableOpacity style={styles.primaryCta} onPress={onGetStarted}>
              <Text style={styles.primaryCtaText}>Start Free</Text>
              <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryCta} onPress={() => Linking.openURL('https://apps.apple.com/app/id6755694325')}>
              <Ionicons name="logo-apple" size={20} color={COLORS.charcoal} />
              <Text style={styles.secondaryCtaText}>App Store</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryCta} onPress={() => Linking.openURL('https://play.google.com/store/apps/details?id=com.shelfze.app')}>
              <Ionicons name="logo-google-playstore" size={20} color={COLORS.charcoal} />
              <Text style={styles.secondaryCtaText}>Google Play</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.heroVisual}>
          <PhoneMockup />
        </View>
      </View>

      {/* Pain Point / Stats Section */}
      <View style={styles.statsSection}>
        <Text style={styles.statsSectionTitle}>The Problem We're Solving</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, statsAnimated && styles.statAnimated]}>1/3</Text>
            <Text style={styles.statLabel}>of all food produced is wasted globally</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, statsAnimated && styles.statAnimated]}>$1,500</Text>
            <Text style={styles.statLabel}>average food waste per household yearly</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, statsAnimated && styles.statAnimated]}>8-10%</Text>
            <Text style={styles.statLabel}>of global emissions from food waste</Text>
          </View>
        </View>
      </View>

      {/* How It Works Section */}
      <View style={styles.howItWorks}>
        <Text style={styles.sectionTitle}>How It Works</Text>
        <Text style={styles.sectionSubtitle}>Three simple steps to a waste-free kitchen</Text>
        <View style={[styles.stepsContainer, { flexDirection: isLargeScreen ? 'row' : 'column', gap: isLargeScreen ? 0 : 8 }]}>
          <Step 
            number="1" 
            icon="camera-outline" 
            title="Scan" 
            description="Point your camera at food items or receipts. Our AI detects items and expiry dates instantly."
          />
          <Step 
            number="2" 
            icon="list-outline" 
            title="Track" 
            description="Your pantry updates automatically with color-coded expiry alerts. Never forget what's in your fridge."
          />
          <Step 
            number="3" 
            icon="restaurant-outline" 
            title="Cook" 
            description="Get personalized recipes using ingredients from your pantry. Zero waste, delicious meals."
          />
        </View>
      </View>

      {/* Video Section */}
      <View style={styles.videoSection}>
        <Text style={styles.sectionTitle}>See It In Action</Text>
        <Text style={[styles.sectionSubtitle, { marginBottom: 40 }]}>
          Watch how Shelfze transforms your kitchen experience
        </Text>
        
        <View style={styles.videosGrid}>
          {/* Video 1 */}
          <View style={styles.videoWrapper}>
            <YouTubeEmbed 
              videoId="iKa09bIM4JY" 
              title="Shelfze: The AI Pantry Tracker" 
              placeholder={true}
              aspectRatio={9/16}
            />
            <Text style={styles.videoTitle}>
              Shelfze: The AI Pantry Tracker That Generates Recipes Instantly 📱✨
            </Text>
          </View>

          {/* Video 2 */}
          <View style={styles.videoWrapper}>
            <YouTubeEmbed 
              videoId="_biszFDW0Vw" 
              title="Shelfze Tutorial" 
              placeholder={true}
              aspectRatio={9/16}
            />
            <Text style={styles.videoTitle}>
              Shelfze Tutorial Video
            </Text>
          </View>
        </View>
      </View>

      {/* Features Section */}
      <View style={styles.featuresSection}>
        <Text style={styles.sectionTitle}>Powerful Features</Text>
        <Text style={styles.sectionSubtitle}>Everything you need to manage your kitchen smartly</Text>
        <View style={styles.featuresGrid}>
          <FeatureCard 
            icon="scan-outline"
            title="AI Recognition"
            description="Advanced image recognition identifies food items, brands, and expiry dates from photos or video."
          />
          <FeatureCard 
            icon="notifications-outline"
            title="Smart Alerts"
            description="Get notified before items expire. Color-coded system shows freshness at a glance."
          />
          <FeatureCard 
            icon="restaurant-outline"
            title="Recipe Magic"
            description="AI generates recipes using only what's in your pantry. Zero waste, delicious meals."
          />
          <FeatureCard 
            icon="sync-outline"
            title="Cross-Platform"
            description="Sync your pantry across iOS, Android, and Web. Access anywhere, anytime."
          />
          <FeatureCard 
            icon="people-outline"
            title="Family Sharing"
            description="Share your pantry with family members. Everyone stays updated on what's available."
          />
          <FeatureCard 
            icon="globe-outline"
            title="Multi-Language"
            description="Available in English, German, Italian, Slovenian, Spanish, and French."
          />
        </View>
      </View>

      {/* Final CTA Section */}
      <View style={styles.finalCta}>
        <Text style={styles.finalCtaTitle}>Ready to Stop Wasting Food?</Text>
        <Text style={styles.finalCtaSubtitle}>Join the movement to save money and reduce waste</Text>
        <View style={styles.finalCtaButtons}>
          <TouchableOpacity style={styles.primaryCtaLarge} onPress={onGetStarted}>
            <Text style={styles.primaryCtaText}>Try Free on Web</Text>
            <Ionicons name="arrow-forward" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>
        <View style={styles.appStoreButtons}>
          <TouchableOpacity style={styles.appStoreButton} onPress={() => Linking.openURL('https://apps.apple.com/app/id6755694325')}>
            <Ionicons name="logo-apple" size={28} color={COLORS.white} />
            <View>
              <Text style={styles.appStoreLabel}>Download on the</Text>
              <Text style={styles.appStoreName}>App Store</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.appStoreButton} onPress={() => Linking.openURL('https://play.google.com/store/apps/details?id=com.shelfze.app')}>
            <Ionicons name="logo-google-playstore" size={28} color={COLORS.white} />
            <View>
              <Text style={styles.appStoreLabel}>Get it on</Text>
              <Text style={styles.appStoreName}>Google Play</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerBrand}>
          <View style={styles.footerLogoContainer}>
            <View style={styles.footerLogoImageContainer}>
              <Image 
                source={require('../assets/Shelfze_ICON.png')} 
                style={styles.footerLogoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.footerLogoText}>Shelfze</Text>
          </View>
          <Text style={styles.footerTagline}>Reduce waste. Save money. Eat better.</Text>
        </View>
        <View style={styles.footerLinks}>
          <TouchableOpacity onPress={navigateToPrivacy}>
            <Text style={styles.footerLink}>Privacy Policy</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={navigateToTerms}>
            <Text style={styles.footerLink}>Terms of Service</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.footerCopyright}>© 2026 Shelfze. All rights reserved.</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },
  contentContainer: {
    alignItems: 'center',
  },

  // Navigation
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    maxWidth: 1200,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  navBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  navLogoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLogoImage: {
    width: 100,
    height: 100,
  },
  navTitle: {
    fontSize: 42,
    fontWeight: '800',
    color: COLORS.darkGreen,
  },
  navCta: {
    backgroundColor: COLORS.primaryGreen,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  navCtaText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 16,
  },

  // Hero
  hero: {
    flexDirection: isLargeScreen ? 'row' : 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 1200,
    paddingHorizontal: 24,
    paddingVertical: isLargeScreen ? 60 : 32,
    gap: isLargeScreen ? 40 : 24,
  },
  heroContent: {
    flex: 1,
    maxWidth: 600,
  },
  heroTagline: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primaryGreen,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: isLargeScreen ? 56 : 40,
    fontWeight: '800',
    color: COLORS.darkGreen,
    lineHeight: isLargeScreen ? 64 : 48,
    marginBottom: isLargeScreen ? 24 : 16,
  },
  heroSubtitle: {
    fontSize: isLargeScreen ? 20 : 18,
    color: COLORS.charcoal,
    lineHeight: isLargeScreen ? 32 : 28,
    marginBottom: isLargeScreen ? 32 : 20,
    opacity: 0.8,
  },
  heroCtas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryGreen,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  primaryCtaText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  secondaryCtaText: {
    color: COLORS.charcoal,
    fontSize: 16,
    fontWeight: '500',
  },
  heroVisual: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Screenshot Carousel
  screenshotCarouselContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingHorizontal: isLargeScreen ? 0 : 40,
    paddingBottom: 60,
  },

  // Phone Mockup
  phoneMockup: {
    width: 260,
    height: 520,
    backgroundColor: COLORS.charcoal,
    borderRadius: 36,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 40,
    elevation: 20,
  },
  phoneScreenshot: {
    flex: 1,
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
  },
  screenshotImage: {
    width: '100%',
    height: '100%',
  },
  carouselArrow: {
    position: 'absolute',
    top: '45%',
    backgroundColor: COLORS.white,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 10,
  },
  carouselArrowLeft: {
    left: isLargeScreen ? -20 : -5,
  },
  carouselArrowRight: {
    right: isLargeScreen ? -20 : -5,
  },
  arrowLeft: {
    width: 10,
    height: 10,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: COLORS.darkGreen,
    transform: [{ rotate: '45deg' }],
    marginLeft: 4,
  },
  arrowRight: {
    width: 10,
    height: 10,
    borderRightWidth: 2,
    borderTopWidth: 2,
    borderColor: COLORS.darkGreen,
    transform: [{ rotate: '45deg' }],
    marginRight: 4,
  },
  carouselDots: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
  carouselDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.lightGray,
  },
  carouselDotActive: {
    backgroundColor: COLORS.primaryGreen,
    width: 24,
  },
  screenshotLabel: {
    marginTop: 16,
    marginBottom: 8,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.darkGreen,
  },
  phoneScreen: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 28,
    padding: 16,
  },
  mockupTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.darkGreen,
    marginBottom: 16,
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cream,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  foodEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  foodName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.charcoal,
  },
  expiryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  expiryText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },

  // Stats Section
  statsSection: {
    width: '100%',
    backgroundColor: COLORS.darkGreen,
    paddingVertical: 60,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  statsSectionTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 40,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: isLargeScreen ? 'row' : 'column',
    maxWidth: 1000,
    gap: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 48,
    fontWeight: '800',
    color: COLORS.sage,
    marginBottom: 8,
  },
  statAnimated: {
    opacity: 1,
  },
  statLabel: {
    fontSize: 16,
    color: COLORS.white,
    textAlign: 'center',
    opacity: 0.9,
  },

  // How It Works
  howItWorks: {
    width: '100%',
    maxWidth: 1200,
    paddingVertical: isLargeScreen ? 80 : 60,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: isLargeScreen ? 36 : 28,
    fontWeight: '700',
    color: COLORS.darkGreen,
    marginBottom: 12,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: isLargeScreen ? 18 : 16,
    color: COLORS.charcoal,
    opacity: 0.7,
    marginBottom: isLargeScreen ? 48 : 32,
    textAlign: 'center',
    paddingHorizontal: 16,
    zIndex: 0,
  },
  stepsContainer: {
    flexDirection: isLargeScreen ? 'row' : 'column',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: isLargeScreen ? 0 : 8,
    overflow: 'visible',
    zIndex: 1,
  },
  step: {
    alignItems: 'center',
    maxWidth: 280,
    padding: 24,
    overflow: 'visible',
    zIndex: 2,
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.sage,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  stepNumberText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.darkGreen,
  },
  stepIcon: {
    marginBottom: 16,
  },
  stepEmoji: {
    fontSize: 40,
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.darkGreen,
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    color: COLORS.charcoal,
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.8,
  },
  stepConnector: {
    width: isLargeScreen ? 60 : 2,
    height: isLargeScreen ? 2 : 40,
    backgroundColor: COLORS.sage,
  },

  // Video Section
  videoSection: {
    width: '100%',
    maxWidth: 1200,
    paddingVertical: 60,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  videosGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 40,
  },
  videoWrapper: {
    width: isLargeScreen ? 350 : '100%',
    maxWidth: 400,
    alignItems: 'center',
    marginBottom: isLargeScreen ? 0 : 40,
  },
  videoTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.charcoal,
    marginTop: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  videoContainer: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: COLORS.charcoal,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  videoPlaceholder: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: COLORS.darkGreen,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  videoPlaceholderText: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 8,
  },
  videoComingSoon: {
    fontSize: 14,
    color: COLORS.sage,
    opacity: 0.8,
  },

  // Features Section
  featuresSection: {
    width: '100%',
    maxWidth: 1200,
    paddingVertical: 80,
    paddingHorizontal: 24,
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 24,
    maxWidth: 1000,
  },
  featureCard: {
    width: isLargeScreen ? 300 : '100%',
    backgroundColor: COLORS.cream,
    padding: 28,
    borderRadius: 16,
    alignItems: 'flex-start',
  },
  featureIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: COLORS.sage,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.darkGreen,
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 15,
    color: COLORS.charcoal,
    lineHeight: 24,
    opacity: 0.8,
  },

  // Social Proof
  socialProof: {
    width: '100%',
    maxWidth: 800,
    paddingVertical: 80,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  testimonialCard: {
    backgroundColor: COLORS.white,
    padding: 40,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  stars: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  testimonialText: {
    fontSize: 20,
    color: COLORS.charcoal,
    textAlign: 'center',
    lineHeight: 32,
    fontStyle: 'italic',
    marginBottom: 16,
  },
  testimonialAuthor: {
    fontSize: 16,
    color: COLORS.darkGreen,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 40,
  },
  miniStat: {
    alignItems: 'center',
  },
  miniStatNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.primaryGreen,
  },
  miniStatLabel: {
    fontSize: 14,
    color: COLORS.charcoal,
    opacity: 0.7,
  },

  // Final CTA
  finalCta: {
    width: '100%',
    backgroundColor: COLORS.sage,
    paddingVertical: 80,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  finalCtaTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.darkGreen,
    textAlign: 'center',
    marginBottom: 12,
  },
  finalCtaSubtitle: {
    fontSize: 18,
    color: COLORS.charcoal,
    marginBottom: 32,
    opacity: 0.8,
  },
  finalCtaButtons: {
    marginBottom: 24,
  },
  primaryCtaLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryGreen,
    paddingHorizontal: 32,
    paddingVertical: 18,
    borderRadius: 14,
    gap: 12,
  },
  appStoreButtons: {
    flexDirection: isLargeScreen ? 'row' : 'column',
    gap: 16,
  },
  appStoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.charcoal,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  appStoreLabel: {
    fontSize: 11,
    color: COLORS.white,
    opacity: 0.8,
  },
  appStoreName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
  },

  // Footer
  footer: {
    width: '100%',
    backgroundColor: COLORS.charcoal,
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  footerBrand: {
    alignItems: 'center',
    marginBottom: 24,
  },
  footerLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  footerLogoImageContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLogoImage: {
    width: 45,
    height: 45,
  },
  footerLogoText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.white,
  },
  footerTagline: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.7,
  },
  footerLinks: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 24,
  },
  footerLink: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.8,
  },
  footerCopyright: {
    fontSize: 12,
    color: COLORS.white,
    opacity: 0.5,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    width: '100%',
    maxWidth: 600,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.darkGreen,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
  },
  modalText: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.charcoal,
  },
});

export default WebLandingScreen;
