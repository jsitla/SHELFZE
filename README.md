# 🥫 Shelfze - Smart Food Inventory Management

<div align="center">

![Shelfze Banner](https://img.shields.io/badge/Shelfze-Smart_Pantry-4CAF50?style=for-the-badge&logo=google-cloud&logoColor=white)
[![Expo](https://img.shields.io/badge/Expo-54.0-000020?style=flat-square&logo=expo)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React_Native-0.81-61DAFB?style=flat-square&logo=react)](https://reactnative.dev)
[![Firebase](https://img.shields.io/badge/Firebase-11.1-FFCA28?style=flat-square&logo=firebase)](https://firebase.google.com)
[![Gemini AI](https://img.shields.io/badge/Gemini_2.5-Flash-8E75B2?style=flat-square&logo=google)](https://deepmind.google/technologies/gemini/)

*Never let food go to waste again! Smart AI-powered pantry tracking with expiry date detection, multilingual support, and intelligent recipe generation powered by Google Gemini AI.*

[Features](#-key-features) • [Installation](#-quick-start) • [Architecture](#-architecture) • [Languages](#-language-support)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Technology Stack](#-technology-stack)
- [Quick Start](#-quick-start)
- [Project Structure](#-project-structure)
- [Core Components](#-core-components)
- [Cloud Functions](#-cloud-functions)
- [Authentication & User Tiers](#-authentication--user-tiers)
- [Monetization](#-monetization)
- [Language Support](#-language-support)
- [Configuration](#-configuration)
- [Development](#-development)
- [Publishing](#-publishing)

---

## 🎯 Overview

**Shelfze** is an intelligent food inventory management application that leverages cutting-edge AI technology to help you track your groceries, minimize food waste, and discover delicious recipes. Simply scan your food items, and let our advanced AI detect products, expiry dates, and generate personalized recipes automatically!

### Why Shelfze?

| Feature | Description |
|---------|-------------|
| 🎯 **Reduce Waste** | 40% of food is wasted globally - Shelfze helps reduce this |
| ⏰ **Save Time** | No manual entry needed, just scan and go |
| 🤖 **AI-Powered** | Google Gemini 2.5 Flash for intelligent food recognition & recipes |
| 🌍 **Multilingual** | Available in 6+ languages with full UI translation |
| 🍳 **Smart Recipes** | AI generates recipes using ONLY your pantry items |
| 📱 **Cross-Platform** | Works seamlessly on iOS, Android, and Web |
| 🔄 **Real-time Sync** | Cloud-powered inventory with Firebase Firestore |
| 💳 **RevenueCat** | Premium subscriptions via App Store / Google Play |

---

## ✨ Key Features

### 📸 AI-Powered Scanning

**Dual Capture Modes:**
- **📷 Photo Mode** - Instant single-shot capture with immediate processing
- **🎥 Video Mode** - 10-second video capture with native Gemini video analysis
- **🔦 Flashlight** - Integrated torch toggle for low-light environments
- **🌐 Web Upload** - File upload support for web platform

**Intelligent Detection (Gemini 2.0 Flash):**
- Multi-item recognition in a single scan
- Product specificity (e.g., "Sheep Milk" vs "Goat Milk")
- Form detection (Fresh, Dried, Ground, Powder, Whole, Minced)
- Automatic category assignment (Dairy, Meat, Fruits, Vegetables, etc.)
- Expiry date OCR in multiple formats (DD/MM/YYYY, MM/YYYY, etc.)
- Multilingual text recognition
- Confidence scoring (0-100%)

**Detection Fallback Hierarchy:**
1. **Primary:** Google Gemini 2.0 Flash (`gemini-2.0-flash-exp`)
2. **Fallback:** Google Cloud Vision API (TEXT_DETECTION, LABEL_DETECTION, OBJECT_LOCALIZATION)

---

### 🗄️ Smart Pantry Management

**Organization:**
- Auto-sorting by expiration date (earliest first)
- Color-coded status indicators:
  - 🟢 **Green**: Fresh (7+ days)
  - 🟠 **Orange**: Expiring Soon (1-6 days)
  - 🔴 **Red**: Expired
- Category filtering (10 categories)
- Real-time search
- Sort options (expiry date, name, category)

**Item Management:**
- Inline editing (quantity, unit, category, expiry date, name)
- Manual entry form with validation
- Swipe-to-delete gestures
- Batch clear with confirmation
- Detection source tags (🤖 AI Scan vs ✋ Manual)

**Food Categories:**
- Dairy 🥛
- Meat & Poultry 🥩
- Fruits 🍎
- Vegetables 🥬
- Beverages 🥤
- Packaged Food 📦
- Bakery 🍞
- Condiments 🧂
- Spices 🌶️
- Other 🏷️

---

### 🍳 Intelligent Recipe Generation

**Dish Categories:**
- 🍽️ Main Course
- 🥗 Salad
- 🍰 Dessert
- 🍳 Breakfast
- 🥣 Soup
- 🍿 Snack

**AI-Powered Features (Gemini 2.5 Flash):**
- Uses ONLY ingredients from your pantry
- Assumes only kitchen basics (salt, pepper, oil, water, sugar)
- Optional ingredients clearly marked
- Smart quantity control (5-7 recipes per generation)
- Beverage filtering (excludes water, juice, soda from cooking)
- Professional quality recipes

**Recipe Details Include:**
- Step-by-step instructions
- Precise ingredient measurements
- Prep time, cook time, total time
- Serving size and difficulty level
- Cuisine type
- Chef's tips and tricks
- Adjustable serving sizes with ingredient scaling

**Additional Recipe Features:**
- 👨‍🍳 **Chef's Table** - Custom recipe generator for specific cravings
- 📚 **Saved Recipes** - Save favorite recipes for later
- 🛒 **Pantry Check** - AI compares recipe ingredients with your pantry
- ➕ **Shopping List Integration** - Add missing ingredients to shopping list

---

### 🛒 Shopping List

- Add items manually
- Toggle checked/unchecked state
- Sync across devices via Firestore
- Add missing recipe ingredients directly
- Clear completed items

---

### 👨‍👩‍👧‍👦 Household Sharing

Share your pantry and credits with family members!

**Features:**
- 🏠 **Create Household** - Start a new household and become the owner
- 🔗 **Invite Members** - Share a 6-character invite code
- 📋 **Shared Pantry** - All members see the same food items
- 🛒 **Shared Shopping List** - Coordinate grocery shopping together
- 📚 **Shared Saved Recipes** - Share your favorite recipes with the household
- ⚡ **Shared Credits** - Pool scans and recipes across the household
- 👤 **Nicknames** - Set a display name visible to household members
- 🔄 **Credit Management** - 7-day cooldown between households

**What's Shared vs Personal:**
| Feature | Shared? |
|---------|--------|
| Pantry Items | ✅ Shared |
| Shopping List | ✅ Shared |
| Saved Recipes | ✅ Shared |
| Scan/Recipe Credits | ✅ Pooled |
| Recipe Ratings | ❌ Personal |

**Credit Pools:**
| Tier | Scans/Month | Recipes/Month |
|------|-------------|---------------|
| Free Household | 30 | 30 |
| Premium Household | 500 | 500 |

**How It Works:**
1. Owner creates household from Profile screen
2. Members join using the invite code
3. Everyone shares the same pantry
4. Credits are deducted from household pool
5. When leaving, personal credits are restored

---

## 🏗️ Architecture

### Application Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                          App.js                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────┐ │
│  │ Welcome     │→ │ Auth Screen  │→ │ Legal Consent Screen    │ │
│  │ Screen      │  │ (Login/      │  │ (Terms & Privacy)       │ │
│  │             │  │  Signup)     │  │                         │ │
│  └─────────────┘  └──────────────┘  └─────────────────────────┘ │
│                           ↓                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                  Tab Navigator                               ││
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────┐  ││
│  │  │ Pantry   │ │ Scanner  │ │ Recipes  │ │ Shopping List  │  ││
│  │  │ Stack    │ │          │ │ Stack    │ │                │  ││
│  │  └──────────┘ └──────────┘ └──────────┘ └────────────────┘  ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘

Pantry Stack:                    Recipes Stack:
├── PantryList                   ├── RecipeGenerator
├── ManualEntry                  ├── CustomRecipeGenerator
├── ProfileScreen                └── SavedRecipes
└── PremiumPlans
```

### Data Flow

```
┌──────────────┐    ┌─────────────────┐    ┌──────────────────┐
│   Mobile/    │───▶│  Cloud Functions │───▶│  External APIs   │
│   Web App    │    │  (Firebase)      │    │                  │
│              │◀───│                  │◀───│  • Gemini AI     │
│  • Expo      │    │  • analyzeImage  │    │  • Vision API    │
│  • React     │    │  • generateRecipes│    │                  │
│    Native    │    │  • getRecipeDetails│   │                  │
└──────────────┘    │  • checkIngredients│   └──────────────────┘
       │            │  • generateCustom │
       │            │    Recipe         │
       ▼            └─────────────────┬─┘
┌──────────────┐                      │
│  Firestore   │◀─────────────────────┘
│  Database    │
│              │
│  /users/{uid}/
│    /pantry
│    /shoppingList
│    /usage
│    /savedRecipes
└──────────────┘
```

### Context Providers

```javascript
<GestureHandlerRootView>
  <LanguageProvider>        // Language state & translations
    <PurchaseProvider>      // RevenueCat subscriptions
      {content}
    </PurchaseProvider>
  </LanguageProvider>
</GestureHandlerRootView>
```

---

## 🛠️ Technology Stack

### Frontend
| Package | Version | Purpose |
|---------|---------|---------|
| React Native | 0.81.5 | Cross-platform mobile framework |
| Expo | 54.0.25 | Development platform & native modules |
| React Navigation | 6.x | Routing (Bottom Tabs + Stack) |
| expo-camera | 17.0.9 | Photo & video capture |
| expo-file-system | 19.0.17 | File operations |
| react-native-purchases | 9.6.8 | RevenueCat subscriptions |
| @react-native-async-storage | 2.2.0 | Local persistence |
| @react-native-community/datetimepicker | 8.4.4 | Date selection |

### Backend & Cloud
| Service | Purpose |
|---------|---------|
| Firebase Auth | Authentication (Email, Google, Apple, Anonymous) |
| Cloud Firestore | Real-time NoSQL database |
| Cloud Functions (v2) | Serverless backend logic |
| Google Cloud Vision API | Image OCR & object detection |
| Google Vertex AI (Gemini) | AI-powered food recognition & recipes |
| RevenueCat | Subscription management |

### AI Models
| Model | Usage |
|-------|-------|
| `gemini-2.0-flash-exp` | Camera/image analysis, pantry check |
| `gemini-2.5-flash` | Recipe generation |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ 
- **npm** or **yarn**
- **Expo CLI**: `npm install -g expo-cli`
- **Firebase CLI**: `npm install -g firebase-tools`
- Google Cloud account (Vision API & Vertex AI)
- Firebase project (Blaze plan for Cloud Functions)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/jsitla/SHELFZE.git
cd SHELFZE

# 2. Install app dependencies
npm install

# 3. Configure Firebase
cp firebase.config.example.js firebase.config.js
# Edit firebase.config.js with your Firebase credentials

# 4. Deploy Cloud Functions
cd functions
npm install
firebase login
firebase deploy --only functions
cd ..

# 5. Update config.js with your Cloud Function URLs

# 6. Start the app
npm start
# Or: npx expo start
```

### Running Tasks

The project includes VS Code tasks for quick startup:

- **Start Expo Server**: `npx expo start`
- **Start Expo Server (Clear Cache)**: `npx expo start --clear`

---

## 📂 Project Structure

```
Shelfze/
├── 📱 App.js                     # Main entry - navigation, auth, providers
├── ⚙️ config.js                   # Cloud Function URLs, RevenueCat keys
├── 🔥 firebase.config.js          # Firebase initialization
├── 📦 package.json               # Dependencies
├── 🎨 app.json                   # Expo configuration
│
├── 🧩 components/                # React components
│   ├── AuthScreen.js             # Login/Signup with Google, Apple, Email
│   ├── CameraScanner.js          # Photo/video capture & AI processing
│   ├── CustomRecipeGenerator.js  # Chef's Table - custom recipe requests
│   ├── LanguageSelector.js       # Language selection modal
│   ├── LegalConsentScreen.js     # Terms & Privacy agreement
│   ├── ManualEntry.js            # Manual item addition form
│   ├── PantryList.js             # Inventory display & management
│   ├── PremiumPlansScreen.js     # Subscription plans (RevenueCat)
│   ├── Profile.js                # User profile, settings, tier info
│   ├── RecipeGenerator.js        # AI recipe suggestions
│   ├── SavedRecipesScreen.js     # Saved recipe collection
│   ├── ShoppingList.js           # Shopping list management
│   ├── WelcomeScreen.js          # Onboarding with tier selection
│   └── ui/                       # Reusable UI components
│
├── 🌐 contexts/                  # React Context providers
│   ├── LanguageContext.js        # Language state (6 languages)
│   ├── PurchaseContext.js        # RevenueCat subscription state
│   └── translations.js           # i18n strings (150+ keys)
│
├── 🔧 utils/                     # Utility functions
│   ├── constants.js              # Categories, units, mappings
│   ├── dateHelpers.js            # Date parsing & formatting
│   ├── fetchWithTimeout.js       # Network requests with timeout
│   ├── ingredientScaler.js       # Recipe serving adjustments
│   ├── premiumPricing.js         # Pricing display helpers
│   └── usageTracking.js          # Scan/recipe quota management
│
├── ☁️ functions/                  # Firebase Cloud Functions
│   ├── index.js                  # All cloud functions (2500+ lines)
│   ├── package.json              # Function dependencies
│   └── src/                      # TypeScript sources (optional)
│
├── 🎨 assets/                    # Images & icons
├── 📱 android/                   # Android native code
└── 📄 *.md                       # Documentation files
```

---

## 🧩 Core Components

### App.js (Entry Point)

The main application component handles:

1. **Authentication State** - Firebase Auth listener with anonymous, email, Google, Apple sign-in
2. **Legal Consent Flow** - Terms & Privacy agreement gate
3. **Welcome Screen** - First-launch onboarding with tier selection
4. **Navigation Structure** - Bottom tab navigator with stack navigators
5. **Error Boundary** - Catches React errors and displays recovery UI
6. **Context Providers** - LanguageProvider, PurchaseProvider

```javascript
// Navigation Structure
Tab.Navigator
├── Pantry (Stack)
│   ├── PantryList
│   ├── ManualEntry
│   ├── ProfileScreen
│   └── PremiumPlans
├── Scanner (CameraScanner)
├── Recipes (Stack)
│   ├── RecipeGenerator
│   ├── CustomRecipeGenerator
│   └── SavedRecipes
└── ShoppingList
```

### CameraScanner.js

Handles all scanning functionality:

- **Camera Permissions** - Request and manage camera/microphone access
- **Photo Capture** - Single shot with base64 encoding
- **Video Recording** - 10-second max with duration timer
- **Image Processing** - Sends to `analyzeImage` Cloud Function
- **Review Modal** - Edit detected items before saving
- **Usage Tracking** - Checks and decrements scan quota
- **Web Support** - File upload fallback for web platform

### PantryList.js

Displays and manages pantry inventory:

- **Real-time Firestore Listener** - Auto-updates on data changes
- **Category Filtering** - Filter by 10 food categories
- **Search** - Text-based item search
- **Sorting** - Multiple sort options (expiry, name, category)
- **Inline Editing** - Full item editing in modal
- **Expiry Indicators** - Color-coded freshness status
- **Delete Actions** - Single item or clear all

### RecipeGenerator.js

AI-powered recipe suggestions:

- **Pantry Integration** - Fetches current ingredients
- **Category Selection** - Filter by dish type
- **Time/Dietary Filters** - Quick, vegetarian, vegan, etc.
- **Ingredient Selection** - Choose specific ingredients to use
- **Recipe Details** - Full instructions, tips, nutrition
- **Serving Adjuster** - Scale ingredients up/down
- **Pantry Check** - Compare recipe vs available ingredients
- **Save/Share** - Save recipes, share via native share sheet

### Profile.js

User account management:

- **Account Info** - Display user email, anonymous status
- **Usage Stats** - Show remaining scans/recipes
- **Tier Display** - Current subscription tier
- **Account Linking** - Upgrade anonymous to full account
- **Language Selection** - Change app language
- **Gift Codes** - Redeem promotional codes
- **Sign Out** - With data warning for anonymous users

---

## ☁️ Cloud Functions

Located in `functions/index.js`:

### analyzeImage
- **Purpose:** Process images/videos using Vision API + Gemini AI
- **Input:** Base64 image, language, mimeType, auth token
- **Output:** Detected food items, expiry dates, saved item IDs
- **Features:** Multi-item detection, auto-categorization, Firestore save

### generateRecipes
- **Purpose:** Generate recipe suggestions from pantry ingredients
- **Input:** Ingredients array, language, dish category
- **Output:** 5-7 recipe suggestions with metadata
- **Model:** Gemini 2.5 Flash

### getRecipeDetails
- **Purpose:** Get full recipe with step-by-step instructions
- **Input:** Recipe name, available ingredients, language
- **Output:** Complete recipe with instructions, tips, timing

### checkIngredients
- **Purpose:** Compare recipe ingredients against user's pantry
- **Input:** Recipe ingredients, user's pantry items
- **Output:** Matched items, missing items

### generateCustomRecipe
- **Purpose:** Generate recipe based on user's specific request
- **Input:** User prompt (e.g., "Spicy Tacos"), pantry items
- **Output:** Custom recipe tailored to request

### modifyRecipe
- **Purpose:** Modify existing recipe based on user guidance
- **Input:** Original recipe, modification request
- **Output:** Modified recipe

### Additional Functions
- `initializeUsage` - Set up usage tracking for new users
- `checkMonthlyBonus` - Apply monthly scan/recipe bonuses
- `upgradeTier` - Handle tier upgrades from RevenueCat
- `redeemGiftCode` - Process promotional gift codes
- `recordLegalConsent` - Store terms acceptance
- `rateRecipe` - Save user recipe ratings

---

## 🔐 Authentication & User Tiers

### Authentication Methods

1. **Anonymous** - Quick start, no credentials required
2. **Email/Password** - Traditional signup
3. **Google Sign-In** - OAuth via `@react-native-google-signin`
4. **Apple Sign-In** - iOS only, via `expo-apple-authentication`

### Account Upgrade Flow

Anonymous users can upgrade to a full account:
1. Navigate to Profile → Create Account
2. Choose Email, Google, or Apple sign-in
3. Anonymous account linked to new credentials
4. Pantry data preserved, tier upgraded to Free

### User Tiers

| Feature | 🚀 Anonymous | ✨ Free | 👑 Premium |
|---------|--------------|---------|------------|
| **Scans** | 10 (lifetime) | 30 + 5/month | 500/month |
| **Recipes** | 10 (lifetime) | 30 + 5/month | 500/month |
| **Cloud Sync** | ❌ Local only | ✅ | ✅ |
| **Monthly Bonus** | ❌ | ✅ +5 each | ✅ Resets |
| **Gift Codes** | ✅ | ✅ | ✅ |

### Firestore User Data Structure

```
/users/{userId}/
├── pantry/                 # Food items
│   └── {itemId}/
│       ├── name
│       ├── category
│       ├── quantity
│       ├── unit
│       ├── expiryDate
│       ├── addedAt
│       └── detectionSource
├── shoppingList/           # Shopping items
│   └── {itemId}/
│       ├── name
│       └── checked
├── usage/
│   └── current/            # Usage tracking
│       ├── tier
│       ├── scansRemaining
│       ├── recipesRemaining
│       ├── totalScansUsed
│       ├── totalRecipesUsed
│       └── lastMonthlyBonusDate
└── savedRecipes/           # Saved recipes
    └── {recipeId}/
```

---

## 💰 Monetization

### RevenueCat Integration

The app uses RevenueCat for subscription management:

```javascript
// config.js
revenueCat: {
  ios: 'appl_mhVIozZXkZvAnHbOlkAvqbyJrbq',
  android: 'goog_REPLACE_WITH_YOUR_ANDROID_KEY',
  entitlementId: 'Shelfze / M-AI d.o.o. Pro',
}
```

### Subscription Plans

Configured in RevenueCat dashboard:
- **Monthly** - Premium tier for 1 month
- **Annual** - Premium tier for 1 year (best value)

### Purchase Flow

1. User opens Premium Plans screen
2. RevenueCat fetches available offerings
3. User selects monthly or annual plan
4. Native payment sheet (App Store/Google Play)
5. On success, `PurchaseContext` updates `isPremium`
6. Cloud function `upgradeTier` updates Firestore usage

---

## 🌍 Language Support

### Supported Languages

| Language | Code | Native Name |
|----------|------|-------------|
| 🇬🇧 English | `en` | English |
| 🇪🇸 Spanish | `es` | Español |
| 🇫🇷 French | `fr` | Français |
| 🇩🇪 German | `de` | Deutsch |
| 🇮🇹 Italian | `it` | Italiano |
| 🇸🇮 Slovenian | `sl` | Slovenščina |

### Translation System

Located in `contexts/translations.js`:

```javascript
// 150+ translation keys covering:
- Navigation & Common UI
- Camera Scanner
- Review Modal
- Pantry List
- Recipe Generator
- Custom Recipe Generator
- Profile & Settings
- Error Messages
- Premium Plans
```

### Language Context

```javascript
// LanguageContext.js
const { language, changeLanguage, getLanguageName, getLanguageBadge } = useLanguage();

// Usage in components
import { t } from '../contexts/translations';
<Text>{t('myPantry', language)}</Text>
```

### AI Translation

- Product names translated by Gemini during scanning
- Recipes generated in user's selected language
- Category names localized throughout UI

---

## ⚙️ Configuration

### firebase.config.js

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};
```

### config.js

```javascript
export const config = {
  // Cloud Function URLs
  analyzeImage: 'https://analyzeimage-xxx-uc.a.run.app',
  generateRecipes: 'https://generaterecipes-xxx-uc.a.run.app',
  getRecipeDetails: 'https://getrecipedetails-xxx-uc.a.run.app',
  initializeUsage: 'https://us-central1-xxx.cloudfunctions.net/initializeUsage',
  checkMonthlyBonus: 'https://us-central1-xxx.cloudfunctions.net/checkMonthlyBonus',
  upgradeTier: 'https://us-central1-xxx.cloudfunctions.net/upgradeTier',
  redeemGiftCode: 'https://us-central1-xxx.cloudfunctions.net/redeemGiftCode',
  recordLegalConsent: 'https://us-central1-xxx.cloudfunctions.net/recordLegalConsent',
  rateRecipe: 'https://us-central1-xxx.cloudfunctions.net/rateRecipe',
  checkIngredients: 'https://checkingredients-xxx-uc.a.run.app',
  matchPantryToRecipes: 'https://matchpantrytorecipes-xxx-uc.a.run.app',
  generateCustomRecipe: 'https://us-central1-xxx.cloudfunctions.net/generateCustomRecipe',
  modifyRecipe: 'https://us-central1-xxx.cloudfunctions.net/modifyRecipe',
  
  // RevenueCat
  revenueCat: {
    ios: 'appl_YOUR_IOS_KEY',
    android: 'goog_YOUR_ANDROID_KEY',
    entitlementId: 'YOUR_ENTITLEMENT_ID',
  },
};
```

### app.json (Expo)

Key configurations:
- **Bundle ID:** `com.shelfze.app`
- **Plugins:** Google Sign-In, Expo Build Properties
- **Permissions:** Camera, Internet
- **EAS Project ID:** For OTA updates

---

## 🔧 Development

### Running Locally

```bash
# Start development server
npm start
# Or: npx expo start

# Platform-specific
npm run android     # Android emulator
npm run ios         # iOS simulator (Mac only)
npm run web         # Web browser
```

### Cloud Functions Development

```bash
cd functions

# Install dependencies
npm install

# Deploy all functions
npm run deploy
# Or: firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:analyzeImage
```

### Building for Production

```bash
# Install EAS CLI
npm install -g eas-cli

# Build for Android
eas build --platform android

# Build for iOS
eas build --platform ios

# Submit to stores
eas submit --platform android
eas submit --platform ios
```

### Environment Setup

1. **Google Cloud:**
   - Enable Cloud Vision API
   - Enable Vertex AI API
   - Create service account with appropriate roles

2. **Firebase:**
   - Create project (or link existing GCP project)
   - Enable Authentication (Email, Google, Apple, Anonymous)
   - Enable Firestore Database
   - Upgrade to Blaze plan for Cloud Functions

3. **RevenueCat:**
   - Create project
   - Configure products in App Store Connect / Google Play Console
   - Get API keys for iOS/Android

4. **Apple Developer (iOS):**
   - Configure Sign in with Apple capability
   - Create App ID with Sign in with Apple enabled

5. **Google Cloud (Android):**
   - Configure Google Sign-In
   - Download `google-services.json`

---

## � Publishing

Ready to publish? See the comprehensive **[App Store Publishing Guide](APP-STORE-PUBLISHING.md)**.

### Quick Checklist

- [ ] Host Privacy Policy at public URL
- [ ] Host Terms of Service at public URL
- [ ] Replace Android RevenueCat API key in `config.js`
- [ ] Create App Store screenshots
- [ ] Create Google Play Feature Graphic (1024×500px)
- [ ] Set up support email
- [ ] Build with `eas build --platform all --profile production`
- [ ] Submit to App Store Connect and Google Play Console

### Build Commands

```bash
# iOS Production Build
eas build --platform ios --profile production

# Android Production Build
eas build --platform android --profile production

# Submit to Stores
eas submit --platform ios
eas submit --platform android
```

---

## �📄 License

This project is proprietary software. All rights reserved.

---

## 🙏 Credits

- **AI:** Google Gemini 2.5 Flash & Google Cloud Vision API
- **Backend:** Firebase (Firestore, Cloud Functions, Auth)
- **Mobile:** React Native & Expo
- **Payments:** RevenueCat
- **Icons:** Expo Vector Icons (Ionicons, MaterialCommunityIcons)

---

<div align="center">

**Built with ❤️ by M-AI d.o.o.**

</div>
