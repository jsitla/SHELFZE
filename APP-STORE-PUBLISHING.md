# 📱 Shelfze - App Store Publishing Guide

**Last Updated:** December 11, 2025  
**Version:** 1.0.0  
**Bundle ID:** `com.shelfze.app`

---

## ✅ Pre-Publishing Checklist

### Completed Items
- [x] App name and branding: "Shelfze"
- [x] Bundle identifiers configured
- [x] Version 1.0.0, iOS buildNumber: 2
- [x] Privacy Policy created (`PRIVACY-POLICY.md`)
- [x] Terms of Service created (`TERMS-OF-SERVICE.md`)
- [x] Camera permissions with usage description
- [x] Export compliance (ITSAppUsesNonExemptEncryption: false)
- [x] EAS Build configuration (`eas.json`)
- [x] RevenueCat iOS integration
- [x] All 6 languages translated
- [x] Household sharing feature complete

### Action Required Before Publishing

| Priority | Item | Status | Action |
|----------|------|--------|--------|
| 🔴 HIGH | Host Privacy Policy | ❌ Pending | Deploy to public URL |
| 🔴 HIGH | Host Terms of Service | ❌ Pending | Deploy to public URL |
| 🔴 HIGH | Android RevenueCat Key | ❌ Pending | Replace placeholder in config.js |
| 🟡 MEDIUM | App Store Screenshots | ❌ Pending | Create for all sizes |
| 🟡 MEDIUM | Feature Graphic (Android) | ❌ Pending | Create 1024×500px |
| 🟡 MEDIUM | Support Email | ❌ Pending | Set up email address |

---

## 📝 Step 1: Host Legal Documents

### Option A: Firebase Hosting (Recommended)

```bash
# Initialize Firebase Hosting
firebase init hosting

# Create public folder structure
mkdir -p public
cp PRIVACY-POLICY.md public/privacy.md
cp TERMS-OF-SERVICE.md public/terms.md

# Deploy
firebase deploy --only hosting
```

URLs will be:
- `https://pantryai-3d396.web.app/privacy`
- `https://pantryai-3d396.web.app/terms`

### Option B: GitHub Pages

1. Go to GitHub repo Settings → Pages
2. Enable Pages from `main` branch
3. URLs: `https://jsitla.github.io/SHELFZE/PRIVACY-POLICY.md`

### After Hosting: Update app.json

```json
{
  "expo": {
    "privacy": "https://YOUR-DOMAIN/privacy"
  }
}
```

---

## 🔑 Step 2: Fix Android RevenueCat Key

1. Go to [RevenueCat Dashboard](https://app.revenuecat.com/)
2. Select your project → Settings → API Keys
3. Copy the **Android Public API Key**
4. Update `config.js`:

```javascript
revenueCat: {
  ios: 'appl_mhVIozZXkZvAnHbOlkAvqbyJrbq',
  android: 'goog_YOUR_ACTUAL_KEY_HERE',  // ← Replace this!
  entitlementId: 'Shelfze / M-AI d.o.o. Pro',
}
```

---

## 🖼️ Step 3: Create App Store Assets

### iOS App Store Screenshots

| Device | Size | Required |
|--------|------|----------|
| iPhone 6.7" | 1290×2796px | ✅ 3-10 images |
| iPhone 6.5" | 1242×2688px | ✅ 3-10 images |
| iPhone 5.5" | 1242×2208px | Optional |
| iPad Pro 12.9" | 2048×2732px | If iPad supported |

**Recommended Screens to Screenshot:**
1. Camera Scanner (scanning a product)
2. Pantry List (with items showing expiry)
3. Recipe Generator (recipe suggestions)
4. Custom Recipe Generator (Chef's Table)
5. Household sharing

### Google Play Store Assets

| Asset | Size | Required |
|-------|------|----------|
| App Icon | 512×512px | ✅ |
| Feature Graphic | 1024×500px | ✅ |
| Phone Screenshots | Any 16:9/9:16 | ✅ 2-8 images |
| Promo Video | YouTube URL | Optional |

### Tools for Screenshots
- **Figma** - Design with device frames
- **Screenshots.pro** - Generate store-ready images
- **AppMockUp** - Quick mockups

---

## 📋 Step 4: App Store Metadata

### Short Description (80 chars)
```
Smart AI pantry tracker - scan food, get recipes, reduce waste! 🥫
```

### Full Description
```
🥫 SHELFZE - Smart Food Inventory Management

Never waste food again! Shelfze uses cutting-edge AI to track your pantry, detect expiry dates, and suggest delicious recipes using only what you have.

✨ KEY FEATURES:

📸 AI-POWERED SCANNING
• Scan food items with your camera
• Automatic expiry date detection
• Multi-item recognition in a single shot
• Video scanning for bulk items

🗄️ SMART PANTRY MANAGEMENT
• Color-coded expiry indicators (green/orange/red)
• 10 food categories with filtering
• Real-time search and sorting
• Cloud sync across devices

🍳 INTELLIGENT RECIPES
• AI generates recipes from YOUR ingredients only
• 6 dish categories (Main, Salad, Dessert, Breakfast, Soup, Snack)
• Chef's Table for custom recipe requests
• Save favorites for later

👨‍👩‍👧‍👦 HOUSEHOLD SHARING
• Share pantry with family members
• Shared credit pool for scans and recipes
• Easy invite code system

🌍 MULTILINGUAL
Available in English, Spanish, French, German, Italian, and Slovenian

⭐ PREMIUM FEATURES
• 500 scans/month (vs 30 free)
• 500 recipe generations/month
• Priority support

Download now and start reducing food waste today!
```

### Keywords (iOS - max 100 chars)
```
pantry,food tracker,expiry,recipe,AI,scan,groceries,inventory,meal planner
```

### Category
- **Primary:** Food & Drink
- **Secondary:** Lifestyle

### Age Rating
- **iOS:** 4+
- **Android:** Everyone

---

## 📧 Step 5: Support Contact

Create a support email:
- `support@shelfze.app` (if you have domain)
- `shelfze.support@gmail.com` (alternative)
- Or use GitHub Issues: `https://github.com/jsitla/SHELFZE/issues`

---

## 🏗️ Step 6: Build for Production

### iOS Build
```bash
# Login to EAS
eas login

# Build for App Store
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios
```

### Android Build
```bash
# Build for Google Play (AAB)
eas build --platform android --profile production

# Submit to Google Play
eas submit --platform android
```

---

## 📤 Step 7: App Store Connect (iOS)

1. **Create App** at [App Store Connect](https://appstoreconnect.apple.com/)
2. **Fill Required Fields:**
   - App Name: Shelfze
   - Subtitle: Smart Pantry Tracker
   - Privacy Policy URL
   - Support URL
   - Category: Food & Drink
   - Age Rating: 4+

3. **Upload Screenshots** for each device size

4. **Version Information:**
   - Version: 1.0.0
   - Build: (from EAS)
   - What's New: "Initial release"

5. **App Review Information:**
   ```
   Review Notes:
   - This app uses Firebase Anonymous Authentication
   - No test account needed - just install and use
   - Camera permission is for scanning food items
   - In-app purchases are handled via RevenueCat
   ```

6. **Submit for Review**

---

## 📤 Step 8: Google Play Console (Android)

1. **Create App** at [Google Play Console](https://play.google.com/console)

2. **Store Listing:**
   - App name: Shelfze
   - Short description (80 chars)
   - Full description
   - Screenshots and Feature Graphic

3. **Content Rating:** Complete questionnaire
   - Violence: None
   - Sexual Content: None
   - Controlled Substances: None
   - Expected Rating: Everyone

4. **Data Safety:**
   - Data collected: Email (optional), Food items, Usage data
   - Third-party sharing: Firebase, Google Cloud
   - Data encrypted in transit: Yes

5. **App Content:** Answer all policy questions

6. **Release:** Create Production release with AAB

---

## 🔍 Common Review Rejection Reasons & Solutions

| Rejection Reason | Solution |
|------------------|----------|
| Missing Privacy Policy | Host at public URL, add to app.json |
| Missing Permissions Purpose | Already have NSCameraUsageDescription |
| Crashes on Launch | Test production build before submitting |
| Login Issues | Anonymous auth works without account |
| In-App Purchase Issues | Test RevenueCat in sandbox mode |
| Metadata Issues | Ensure descriptions match app functionality |

---

## 📊 Post-Launch Checklist

- [ ] Monitor crash reports in Firebase Crashlytics
- [ ] Respond to user reviews
- [ ] Track analytics in Firebase
- [ ] Monitor RevenueCat for subscription metrics
- [ ] Prepare 1.0.1 bug fix release if needed

---

## 🔗 Important Links

- **Firebase Console:** https://console.firebase.google.com/project/pantryai-3d396
- **RevenueCat Dashboard:** https://app.revenuecat.com/
- **EAS Dashboard:** https://expo.dev/accounts/m-ai-doo/projects/shelfze
- **App Store Connect:** https://appstoreconnect.apple.com/
- **Google Play Console:** https://play.google.com/console

---

## ⏱️ Estimated Timeline

| Task | Time |
|------|------|
| Host legal documents | 30 min |
| Fix Android RevenueCat key | 5 min |
| Create screenshots | 2-3 hours |
| Write descriptions | 30 min |
| Build & upload iOS | 1-2 hours |
| Build & upload Android | 1-2 hours |
| Complete store listings | 1 hour |
| **Total** | **~8 hours** |

**Review Times:**
- iOS: 24-48 hours (can be faster)
- Android: 1-7 days (varies)

---

*Good luck with your launch! 🚀*
