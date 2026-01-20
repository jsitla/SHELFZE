# Shelfze - Technical Documentation

## Table of Contents

1. [Tech Stack Overview](#tech-stack-overview)
2. [System Architecture](#system-architecture)
3. [Frontend Implementation](#frontend-implementation)
4. [Backend Services](#backend-services)
5. [AI Integration](#ai-integration)
6. [RevenueCat Implementation](#revenuecat-implementation)
7. [Database Schema](#database-schema)
8. [Authentication Flow](#authentication-flow)

---

## Tech Stack Overview

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React Native | 0.81.5 | Cross-platform mobile framework |
| Expo | 54.0.25 | Development platform & build tools |
| React Navigation | 6.x | Navigation & routing |
| expo-camera | 17.0.9 | Camera access for scanning |
| expo-file-system | 19.0.17 | File handling for images |
| react-native-purchases | 9.6.8 | RevenueCat SDK |
| @react-native-async-storage | 2.2.0 | Local storage |
| react-native-gesture-handler | 2.x | Touch gestures |

### Backend & Cloud Services

| Service | Purpose |
|---------|---------|
| Firebase Authentication | User auth (Email, Google, Apple, Anonymous) |
| Cloud Firestore | Real-time NoSQL database |
| Cloud Functions (v2) | Serverless API endpoints |
| Google Cloud Vision API | OCR & object detection fallback |
| Google Vertex AI | Gemini 2.5 Flash AI model |
| RevenueCat | Subscription management |

### Development Tools

| Tool | Purpose |
|------|---------|
| Node.js 18+ | Runtime environment |
| npm | Package management |
| Firebase CLI | Cloud deployment |
| EAS Build | Native app builds |

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐                   │
│  │    iOS    │  │  Android  │  │    Web    │                   │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘                   │
│        └──────────────┼──────────────┘                          │
│                       ▼                                          │
│              React Native / Expo                                 │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SERVICE LAYER                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Firebase Cloud Functions (v2)               │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │   │
│  │  │ analyzeImage │ │generateRecipe│ │checkIngredient│    │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
└───────────────────────┬─────────────────────────────────────────┘
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  Gemini AI   │ │ Vision API   │ │  RevenueCat  │
│ (Primary AI) │ │  (Fallback)  │ │ (Purchases)  │
└──────────────┘ └──────────────┘ └──────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DATA LAYER                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  Cloud Firestore                         │   │
│  │  /users/{uid}/pantry                                     │   │
│  │  /users/{uid}/shoppingList                               │   │
│  │  /users/{uid}/savedRecipes                               │   │
│  │  /users/{uid}/usage                                      │   │
│  │  /households/{householdId}/...                           │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow: Image Scanning

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Camera  │───▶│  Base64  │───▶│  Cloud   │───▶│  Gemini  │
│  Capture │    │  Encode  │    │ Function │    │   2.5    │
└──────────┘    └──────────┘    └──────────┘    └────┬─────┘
                                                      │
                                                      ▼
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Firestore│◀───│  Review  │◀───│  Parse   │◀───│   JSON   │
│  Save    │    │  Modal   │    │ Response │    │ Response │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
```

---

## Frontend Implementation

### Project Structure

```
Shelfze/
├── App.js                    # Entry point, navigation setup
├── config.js                 # Cloud Function URLs
├── firebase.config.js        # Firebase initialization
│
├── components/
│   ├── AuthScreen.js         # Login/Signup UI
│   ├── CameraScanner.js      # AI scanning interface
│   ├── PantryList.js         # Inventory display
│   ├── RecipeGenerator.js    # Recipe suggestions
│   ├── Profile.js            # User settings & subscription
│   ├── ShoppingList.js       # Shopping management
│   └── PremiumPlansScreen.js # Subscription UI
│
├── contexts/
│   ├── LanguageContext.js    # i18n state management
│   ├── PurchaseContext.js    # RevenueCat state
│   └── translations.js       # Translation strings
│
└── utils/
    ├── usageTracking.js      # Scan/recipe quota management
    ├── dateHelpers.js        # Expiry date formatting
    └── ingredientScaler.js   # Recipe serving adjustment
```

### Navigation Structure

```javascript
Tab.Navigator
├── Pantry (Stack.Navigator)
│   ├── PantryList          // Main inventory view
│   ├── ManualEntry         // Add items manually
│   ├── ProfileScreen       // User account & settings
│   └── PremiumPlans        // Subscription upgrade
│
├── Scanner                  // CameraScanner component
│
├── Recipes (Stack.Navigator)
│   ├── RecipeGenerator     // AI recipe suggestions
│   ├── CustomRecipeGenerator // Chef's Table feature
│   └── SavedRecipes        // Bookmarked recipes
│
└── ShoppingList            // Shopping list management
```

### State Management

- **React Context API** for global state (Language, Purchases)
- **useState/useEffect** for component-level state
- **Firestore onSnapshot** for real-time data sync
- **AsyncStorage** for local persistence (settings, cache)

---

## Backend Services

### Cloud Functions

All functions are deployed as Firebase Cloud Functions v2:

#### `analyzeImage`

```javascript
// Endpoint: POST /analyzeImage
// Purpose: Process food images with AI

Input: {
  imageBase64: string,      // Base64 encoded image
  language: string,         // User's language code
  isVideo?: boolean         // Video mode flag
}

Output: {
  success: boolean,
  items: [
    {
      name: string,
      quantity: number,
      unit: string,
      category: string,
      expiryDate: string,   // ISO format
      confidence: number    // 0-100
    }
  ]
}
```

#### `generateRecipes`

```javascript
// Endpoint: POST /generateRecipes
// Purpose: Generate recipes from pantry ingredients

Input: {
  ingredients: string[],    // Available ingredients
  category: string,         // Meal type filter
  language: string
}

Output: {
  success: boolean,
  recipes: [
    {
      title: string,
      ingredients: [],
      instructions: [],
      prepTime: string,
      cookTime: string,
      servings: number,
      difficulty: string
    }
  ]
}
```

#### `checkIngredients`

```javascript
// Endpoint: POST /checkIngredients
// Purpose: Compare recipe needs vs pantry

Input: {
  recipeIngredients: string[],
  pantryItems: string[]
}

Output: {
  available: string[],
  missing: string[],
  canMake: boolean
}
```

---

## AI Integration

### Primary: Google Gemini 2.5 Flash

```javascript
// Vertex AI Configuration
const model = 'gemini-2.5-flash';

// Image Analysis Prompt Structure
const prompt = `
Analyze this food image and return JSON:
{
  "items": [
    {
      "name": "specific product name",
      "quantity": number,
      "unit": "pcs/kg/L/g",
      "category": "Dairy|Meat|Fruits|Vegetables|...",
      "expiryDate": "YYYY-MM-DD or null",
      "confidence": 0-100
    }
  ]
}

Rules:
- Be specific (e.g., "Sheep Milk" not just "Milk")
- Detect form (Fresh, Dried, Ground, Whole)
- Extract expiry dates from labels via OCR
- Support multiple date formats
`;
```

### Fallback: Google Cloud Vision API

Used when Gemini fails or for enhanced OCR:

```javascript
// Vision API Features Used
const features = [
  { type: 'TEXT_DETECTION' },      // OCR for expiry dates
  { type: 'LABEL_DETECTION' },     // Product identification
  { type: 'OBJECT_LOCALIZATION' }  // Multi-item detection
];
```

---

## RevenueCat Implementation

### Setup & Configuration

```javascript
// contexts/PurchaseContext.js

import Purchases from 'react-native-purchases';

// Initialize RevenueCat
const initializePurchases = async () => {
  Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
  
  if (Platform.OS === 'ios') {
    await Purchases.configure({ 
      apiKey: 'appl_XXXXXXXXXXXXXXXX' 
    });
  } else if (Platform.OS === 'android') {
    await Purchases.configure({ 
      apiKey: 'goog_XXXXXXXXXXXXXXXX' 
    });
  }
};
```

### Product Configuration

| Product ID | Type | Price | Description |
|------------|------|-------|-------------|
| `shelfze_premium_monthly` | Subscription | $2/month | Premium Monthly |
| `shelfze_premium_annual` | Subscription | $20/year | Premium Annual |

### Purchase Flow

```javascript
// PremiumPlansScreen.js

const purchasePremium = async (packageType) => {
  try {
    // 1. Get available offerings
    const offerings = await Purchases.getOfferings();
    const package = offerings.current.availablePackages
      .find(p => p.identifier === packageType);
    
    // 2. Make purchase
    const { customerInfo } = await Purchases.purchasePackage(package);
    
    // 3. Check entitlement
    if (customerInfo.entitlements.active['premium']) {
      // Update user tier in Firestore
      await updateUserTier(userId, 'premium');
      
      // Update local state
      setIsPremium(true);
    }
  } catch (error) {
    if (!error.userCancelled) {
      Alert.alert('Purchase Failed', error.message);
    }
  }
};
```

### Subscription Status Check

```javascript
// Check subscription on app launch
const checkSubscriptionStatus = async () => {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const isPremium = customerInfo.entitlements.active['premium'] !== undefined;
    
    return {
      isPremium,
      expirationDate: customerInfo.entitlements.active['premium']?.expirationDate,
      willRenew: customerInfo.entitlements.active['premium']?.willRenew
    };
  } catch (error) {
    console.error('Failed to check subscription:', error);
    return { isPremium: false };
  }
};
```

### Restore Purchases

```javascript
const restorePurchases = async () => {
  try {
    const customerInfo = await Purchases.restorePurchases();
    
    if (customerInfo.entitlements.active['premium']) {
      await updateUserTier(userId, 'premium');
      Alert.alert('Success', 'Your premium subscription has been restored!');
    } else {
      Alert.alert('No Subscription', 'No active subscription found.');
    }
  } catch (error) {
    Alert.alert('Error', 'Failed to restore purchases.');
  }
};
```

### Entitlement Verification (Server-Side)

```javascript
// Cloud Function: verifySubscription
const verifySubscription = async (userId, receiptData) => {
  const response = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${userId}`,
    {
      headers: {
        'Authorization': `Bearer ${REVENUECAT_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  const data = await response.json();
  return data.subscriber.entitlements.premium?.expires_date;
};
```

---

## Database Schema

### Firestore Collections

```
/users/{userId}
  ├── /pantry/{itemId}
  │     ├── name: string
  │     ├── quantity: number
  │     ├── unit: string
  │     ├── category: string
  │     ├── expiryDate: timestamp
  │     ├── addedAt: timestamp
  │     ├── source: "scan" | "manual"
  │     └── confidence: number
  │
  ├── /shoppingList/{itemId}
  │     ├── name: string
  │     ├── checked: boolean
  │     └── addedAt: timestamp
  │
  ├── /savedRecipes/{recipeId}
  │     ├── title: string
  │     ├── ingredients: array
  │     ├── instructions: array
  │     ├── rating: number
  │     └── savedAt: timestamp
  │
  └── /usage
        ├── tier: "free" | "premium"
        ├── scansUsed: number
        ├── recipesUsed: number
        ├── scansLimit: number
        ├── recipesLimit: number
        ├── lastResetDate: timestamp
        └── legalConsentDate: timestamp

/households/{householdId}
  ├── ownerId: string
  ├── inviteCode: string
  ├── members: array<userId>
  ├── /pantry/{itemId}
  ├── /shoppingList/{itemId}
  └── /savedRecipes/{recipeId}
```

---

## Authentication Flow

### Supported Methods

1. **Anonymous** - Guest mode with limited features
2. **Email/Password** - Standard registration
3. **Google Sign-In** - OAuth 2.0
4. **Apple Sign-In** - iOS only, required for App Store

### Auth State Management

```javascript
// App.js
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (user) {
      // User signed in
      setUser(user);
      
      // Check legal consent
      const hasConsent = await checkUserLegalConsent(user.uid);
      setHasLegalConsent(hasConsent);
      
      // Initialize usage tracking
      await initializeUsageTracking(user.uid, user.isAnonymous ? 'anonymous' : 'free');
      
      // Check subscription status via RevenueCat
      const { isPremium } = await checkSubscriptionStatus();
      if (isPremium) {
        await updateUserTier(user.uid, 'premium');
      }
    } else {
      // Show welcome screen
      setShowWelcome(true);
    }
  });
  
  return () => unsubscribe();
}, []);
```

---

## Security Rules

### Firestore Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User data - only accessible by owner
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Household data - accessible by members
    match /households/{householdId}/{document=**} {
      allow read, write: if request.auth != null && 
        request.auth.uid in resource.data.members;
    }
  }
}
```

---

## Deployment

### Mobile Apps (EAS Build)

```bash
# iOS Production Build
eas build --platform ios --profile production

# Android Production Build  
eas build --platform android --profile production
```

### Cloud Functions

```bash
cd functions
npm install
firebase deploy --only functions
```

### Environment Variables

```
GOOGLE_CLOUD_PROJECT=your-project-id
GEMINI_API_KEY=your-gemini-key
REVENUECAT_API_KEY=your-revenuecat-key
```

---

*Documentation last updated: January 2026*
