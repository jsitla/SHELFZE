# 📱 Shelfze - Pre-Publishing Checklist for App Stores

**Date:** October 29, 2025  
**Version:** 1.0.0  
**Target Platforms:** Apple App Store & Google Play Store

---

## ✅ CRITICAL ISSUES RESOLVED

### 1. ✅ Code Cleanup - COMPLETE
- [x] All `console.log` statements removed from production code
- [x] All commented-out logs cleaned up
- [x] Linting errors fixed (80-character line limit)
- [x] No compilation errors

### 2. ✅ App Configuration - COMPLETE
- [x] App name: "Shelfze" (properly branded)
- [x] Version: 1.0.0
- [x] Bundle identifiers set:
  - iOS: `com.shelfze.app`
  - Android: `com.shelfze.app`

---

## 🚨 CRITICAL REQUIREMENTS TO ADDRESS

### 1. ❌ PRIVACY POLICY - **REQUIRED IMMEDIATELY**

**Status:** MISSING - This will cause REJECTION

**Impact:** Both Apple and Google **REQUIRE** a privacy policy URL

**Action Required:**
1. Create a privacy policy document covering:
   - What data you collect (food items, expiry dates, user preferences)
   - How you use it (AI processing, recipe generation)
   - Third-party services (Google Cloud Vision, Gemini AI, Firebase)
   - Data storage (Firebase/Firestore)
   - User rights (data deletion, export)
   - Anonymous authentication details
   
2. Host it publicly (options):
   - GitHub Pages (free)
   - Firebase Hosting (free)
   - Your own website

3. Add URL to `app.json`:
```json
{
  "expo": {
    "privacy": "https://your-domain.com/privacy-policy",
    // ... rest of config
  }
}
```

**Sample Privacy Policy Template:**
```markdown
# Privacy Policy for Shelfze

Last updated: October 29, 2025

## Data We Collect
- Food item names and expiry dates you scan or manually enter
- Language preference
- Usage statistics (anonymous)

## How We Use Your Data
- Store your pantry items in Firebase Firestore
- Process images using Google Cloud Vision API and Gemini AI
- Generate personalized recipe suggestions

## Third-Party Services
- Firebase (Google) - Data storage and authentication
- Google Cloud Vision API - Image processing
- Google Gemini AI - Food detection and recipe generation

## Data Retention
- Your data is stored until you delete it
- You can delete your account and all data at any time

## Contact
Email: your-email@example.com
```

---

### 2. ❌ TERMS OF SERVICE - **HIGHLY RECOMMENDED**

**Status:** MISSING

**Action Required:**
Create a Terms of Service document covering:
- User responsibilities
- Acceptable use
- Liability disclaimers (food safety)
- Intellectual property rights

---

### 3. ⚠️ APP STORE ASSETS - **REQUIRED**

**Status:** NEEDS VERIFICATION

**Required Assets:**

#### Apple App Store
- [ ] App Icon (1024x1024px)
- [ ] Screenshots (multiple sizes):
  - iPhone 6.7" (1290x2796px) - 3-10 images
  - iPhone 6.5" (1242x2688px) - 3-10 images
  - iPhone 5.5" (1242x2208px) - Optional
  - iPad Pro 12.9" (2048x2732px) - 3-10 images
- [ ] App Preview videos (optional but recommended)

#### Google Play Store
- [ ] App Icon (512x512px)
- [ ] Feature Graphic (1024x500px)
- [ ] Screenshots:
  - Phone (16:9 or 9:16) - 2-8 images
  - 7" Tablet - Optional
  - 10" Tablet - Optional
- [ ] Promo Video (YouTube URL, optional)

**Action Required:**
```bash
# Check if assets exist
ls -la assets/icon.png
ls -la assets/adaptive-icon.png
ls -la assets/splash.png
```

---

### 4. ⚠️ APP DESCRIPTION & METADATA

**Status:** NEEDS CREATION

**Required for Both Stores:**

#### Short Description (80 characters max)
Example: "Smart AI-powered pantry tracker - never waste food again! 🥫"

#### Full Description (4000 characters max for Google, unlimited for Apple)
- Clear feature list
- Benefits to users
- How it works
- Supported languages (18!)

#### Keywords (Apple) / Search Terms (Google)
Suggested keywords:
- pantry tracker
- food inventory
- expiry date scanner
- recipe generator
- AI food detection
- reduce food waste
- grocery organizer
- meal planner

#### Category
- Primary: **Food & Drink**
- Secondary: **Productivity** or **Lifestyle**

#### Age Rating
- **4+** (No objectionable content)

---

### 5. ⚠️ SUPPORT & CONTACT INFO

**Status:** NEEDS SETUP

**Required:**
- [ ] Support email address
- [ ] Support website/URL (can be GitHub repo)
- [ ] Marketing website (optional)

**Action Required:**
1. Create support email: `support@shelfze.app` or similar
2. Add to `app.json`:
```json
{
  "expo": {
    "supportUrl": "https://github.com/YOUR-USERNAME/shelfze/issues",
    // ...
  }
}
```

---

### 6. ✅ SECURITY & PERMISSIONS - GOOD

**Status:** IMPLEMENTED CORRECTLY

**Current Setup:**
- [x] HTTPS Cloud Functions
- [x] Firebase Anonymous Authentication
- [x] User-specific data isolation (Firestore rules)
- [x] Camera permission request with description

**iOS Permissions (in `app.json`):**
```json
"infoPlist": {
  "NSCameraUsageDescription": "Shelfze needs access to your camera to scan food items and expiry dates."
}
```

**Android Permissions (in `app.json`):**
```json
"permissions": [
  "CAMERA"
]
```

**✅ This is properly configured!**

---

### 7. ⚠️ CONTENT RATING

**Status:** NEEDS COMPLETION

**Google Play Content Rating:**
- Must complete questionnaire at: https://play.google.com/console
- Categories to consider:
  - Violence: None
  - Sexual Content: None
  - Language: None
  - Controlled Substances: None (food items)
  - User-Generated Content: None
  - Realistic Depiction: None

**Expected Rating:** Everyone / PEGI 3

**Apple Age Rating:**
- Based on content: **4+** (No restrictions)

---

### 8. ⚠️ TEST ACCOUNTS (If Applicable)

**Status:** NOT NEEDED (Anonymous auth)

Since the app uses anonymous authentication, no test accounts are needed. However:

**Action Required:**
Add to App Store review notes:
```
"This app uses Firebase Anonymous Authentication. No test account needed.
Simply install and start using - the app will create an anonymous user automatically."
```

---

### 9. ⚠️ EXPORT COMPLIANCE

**Status:** NEEDS DECLARATION

**Both Stores Require:**
Declare if your app uses encryption

**Your App:**
- Uses HTTPS (standard encryption)
- No custom encryption algorithms

**Action Required:**
In App Store Connect:
- Answer "NO" to custom encryption
- Standard HTTPS is exempt

---

### 10. ✅ FUNCTIONALITY VERIFICATION

**Status:** VERIFIED

**Tested Features:**
- [x] Camera scanning (photo mode)
- [x] Video recording mode (mobile only)
- [x] AI detection (Gemini + Vision API)
- [x] Pantry management
- [x] Manual entry
- [x] Recipe generation
- [x] Language switching (18 languages)
- [x] Data persistence (Firestore)

**✅ All core features working!**

---

## 📋 FINAL PRE-SUBMISSION CHECKLIST

### Apple App Store

#### Account & Setup
- [ ] Apple Developer account ($99/year)
- [ ] App Store Connect configured
- [ ] Bundle ID registered: `com.shelfze.app`

#### App Information
- [ ] App name: "Shelfze"
- [ ] Subtitle (30 chars): "Smart Pantry Tracker"
- [ ] Privacy Policy URL added
- [ ] Support URL added
- [ ] Category: Food & Drink
- [ ] Age rating: 4+

#### Media Assets
- [ ] App Icon (1024x1024px)
- [ ] Screenshots for all required sizes
- [ ] App previews (optional)

#### Build & Submission
- [ ] Build with EAS: `eas build --platform ios`
- [ ] Upload to App Store Connect
- [ ] Complete app description
- [ ] Add keywords (max 100 characters)
- [ ] Set pricing: Free
- [ ] Submit for review

#### Review Notes
- [ ] Add testing instructions
- [ ] Mention anonymous authentication
- [ ] Explain camera permission usage

---

### Google Play Store

#### Account & Setup
- [ ] Google Play Console account ($25 one-time)
- [ ] App created in console
- [ ] Package name: `com.shelfze.app`

#### Store Listing
- [ ] App name: "Shelfze"
- [ ] Short description (80 chars)
- [ ] Full description (4000 chars)
- [ ] Privacy Policy URL
- [ ] Category: Food & Drink
- [ ] Contact email

#### Graphics
- [ ] App Icon (512x512px)
- [ ] Feature Graphic (1024x500px)
- [ ] Screenshots (2-8 images)
- [ ] Promo video (optional)

#### Content Rating
- [ ] Complete questionnaire
- [ ] Expected: Everyone

#### Build & Submission
- [ ] Build with EAS: `eas build --platform android`
- [ ] Upload AAB to Play Console
- [ ] Set pricing: Free
- [ ] Select countries
- [ ] Submit for review

---

## 🔧 IMMEDIATE ACTION ITEMS (Priority Order)

### 1. **CRITICAL - Privacy Policy** (Est. time: 2 hours)
```bash
# Steps:
1. Write privacy policy (use template above)
2. Host on GitHub Pages or Firebase Hosting
3. Update app.json with URL
4. Redeploy cloud functions with updated config
```

### 2. **CRITICAL - App Store Assets** (Est. time: 4 hours)
```bash
# Steps:
1. Design app icon (1024x1024 for iOS, 512x512 for Android)
2. Take screenshots on various devices
3. Create feature graphic for Google Play (1024x500)
4. Prepare app descriptions
```

### 3. **HIGH - Terms of Service** (Est. time: 1 hour)
```bash
# Steps:
1. Write ToS document
2. Host publicly
3. Link in app (Settings/Profile screen)
```

### 4. **HIGH - Support Email Setup** (Est. time: 30 min)
```bash
# Steps:
1. Create support@shelfze.app or use personal email
2. Add to app.json
3. Test email reception
```

### 5. **MEDIUM - App Descriptions** (Est. time: 2 hours)
```bash
# Steps:
1. Write compelling short description (80 chars)
2. Write full description highlighting features
3. Research and add keywords
4. Translate to other languages (optional)
```

---

## 💰 COSTS TO CONSIDER

### One-Time Costs
- **Apple Developer Account:** $99/year
- **Google Play Console:** $25 one-time

### Ongoing Costs (From Firebase/Google Cloud)
**Current Free Tier Limits:**
- Firebase Firestore: 50K reads/day, 20K writes/day
- Cloud Functions: 2M invocations/month
- Cloud Vision API: 1,000 units/month FREE
- Gemini AI (Vertex): Pay-per-use (very low initially)

**Estimated Monthly Costs (100 active users):**
- Firebase: $0-5/month (within free tier)
- Cloud Vision: $5-10/month
- Gemini AI: $10-20/month
- **Total: ~$15-35/month**

**At Scale (1,000 users):**
- Firebase: $25-50/month
- Cloud Vision: $50-100/month
- Gemini AI: $100-200/month
- **Total: ~$175-350/month**

---

## 🎯 RECOMMENDED TIMELINE

### Week 1: Core Preparations
- **Day 1-2:** Create privacy policy and ToS
- **Day 3-4:** Design app icons and screenshots
- **Day 5-7:** Write app descriptions and metadata

### Week 2: Account Setup
- **Day 1-2:** Register Apple Developer account
- **Day 3:** Register Google Play Console
- **Day 4-5:** Set up App Store Connect and Play Console
- **Day 6-7:** Upload metadata and assets

### Week 3: Builds & Submission
- **Day 1-2:** Build and test iOS version
- **Day 3-4:** Build and test Android version
- **Day 5:** Submit to both stores
- **Day 6-7:** Monitor review status and respond to feedback

**Total Time to Launch: ~3 weeks**

---

## 🚀 BUILD COMMANDS

### iOS Build
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure iOS build
eas build:configure

# Build for iOS (production)
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios
```

### Android Build
```bash
# Build for Android (production)
eas build --platform android --profile production

# Submit to Google Play
eas submit --platform android
```

---

## 📊 CURRENT STATUS SUMMARY

### ✅ Ready for Publishing
- Clean, production-ready code
- No console.log statements
- No linting errors
- All features functional
- Multi-language support (18 languages)
- Secure authentication
- Proper data isolation
- Camera permissions configured

### ❌ Blockers Before Publishing
1. **Privacy Policy** - CRITICAL
2. **App Store Assets** - CRITICAL
3. **Support Email** - REQUIRED
4. **App Descriptions** - REQUIRED
5. **Terms of Service** - HIGHLY RECOMMENDED

### ⚠️ Nice to Have
- App preview videos
- Localized screenshots
- Marketing website
- Social media presence

---

## 🎉 YOU'RE VERY CLOSE!

**Estimated effort to launch: 15-25 hours**

Your app is technically ready and well-built. The remaining work is purely administrative:
1. Legal documents (privacy policy, ToS)
2. Marketing materials (screenshots, descriptions)
3. Account setup (developer registrations)

**The hard technical work is DONE! 🎊**

---

## 📞 RESOURCES

### Official Documentation
- **Apple:** https://developer.apple.com/app-store/review/guidelines/
- **Google:** https://play.google.com/console/about/guides/
- **Expo EAS:** https://docs.expo.dev/submit/introduction/

### Privacy Policy Generators
- https://www.privacypolicygenerator.info/
- https://www.freeprivacypolicy.com/
- https://app-privacy-policy-generator.firebaseapp.com/

### App Store Optimization (ASO)
- https://www.apptentive.com/blog/app-store-optimization/
- https://www.apptamin.com/blog/aso-app-store-optimization/

---

**Good luck with your launch! 🚀**
