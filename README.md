# 🥫 Shelfze - Smart Food Inventory Management

<div align="center">

![Shelfze Banner](https://img.shields.io/badge/Shelfze-Smart_Pantry-4CAF50?style=for-the-badge&logo=google-cloud&logoColor=white)
[![Expo](https://img.shields.io/badge/Expo-54.0-000020?style=flat-square&logo=expo)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React_Native-0.81-61DAFB?style=flat-square&logo=react)](https://reactnative.dev)
[![Firebase](https://img.shields.io/badge/Firebase-11.1-FFCA28?style=flat-square&logo=firebase)](https://firebase.google.com)
[![Gemini AI](https://img.shields.io/badge/Gemini_2.0-Flash-8E75B2?style=flat-square&logo=google)](https://deepmind.google/technologies/gemini/)

*Never let food go to waste again! Smart AI-powered pantry tracking with expiry date detection, multilingual support, and intelligent recipe generation powered by Google Gemini 2.0 Flash.*

[Features](#-key-features) • [Installation](#-quick-start) • [AI Technology](#-ai-technology) • [Languages](#-language-support) • [Documentation](#-documentation)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Monetization & Tiers](#-monetization--tiers)
- [AI Technology](#-ai-technology)
- [Technology Stack](#-technology-stack)
- [Quick Start](#-quick-start)
- [Detailed Installation](#-detailed-installation)
- [Usage Guide](#-usage-guide)
- [Language Support](#-language-support)
- [Project Structure](#-project-structure)
- [Design System](#-design-system)
- [Cloud Functions](#-cloud-functions)
- [Configuration](#-configuration)
- [Development](#-development)
- [Performance](#-performance)
- [Security](#-security)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [Roadmap](#-roadmap)
- [License](#-license)

---

## 🎯 Overview

**Shelfze** is an intelligent food inventory management application that leverages cutting-edge AI technology to help you track your groceries, minimize food waste, and discover delicious recipes. Simply scan your food items, and let our advanced AI detect products, expiry dates, and generate personalized recipes automatically!

### Why Shelfze?

- 🎯 **40% of food** is wasted globally - Shelfze helps reduce this
- ⏰ **Save Time** - No manual entry needed, just scan and go
- 🤖 **AI-Powered** - Google Gemini 2.0 Flash for intelligent food recognition
- 🌍 **Multilingual** - Available in 18 languages with full UI translation
- 🍳 **Smart Recipes** - AI generates recipes using ONLY your pantry items
- 📱 **Cross-Platform** - Works seamlessly on iOS, Android, and Web
- 🎨 **Modern Design** - Professional design system with consistent UI/UX
- 🔄 **Real-time Sync** - Cloud-powered inventory with Firebase Firestore
- **Flexible Tiers** - From anonymous guest access to a feature-rich premium plan

### Impact

- **Reduce Food Waste**: Track expiry dates and get alerts before items spoil
- **Save Money**: Use what you have before buying more
- **Discover Recipes**: Get creative with ingredients you already own
- **Multilingual Access**: Available in 18 languages for global use

---

## ✨ Key Features

### 📸 Advanced AI Scanning

#### Dual Capture Modes
- **📷 Photo Mode** - Instant single-shot capture with immediate processing
- **🎥 Video Mode** - 10-second video capture with native Gemini video analysis (no frame extraction needed)
- **🔦 Flashlight Support** - Integrated torch toggle for low-light environments
- ** Web Upload** - Upload photos directly from file system on web platforms

#### Intelligent Detection (Powered by Gemini 2.0 Flash)
- **Multi-Item Recognition** - Detects multiple food items in a single scan
- **Product Specificity** - Identifies exact products:
  - Example: "Sheep Milk" vs "Goat Milk" vs "Cow Milk"
  - Recognizes brand names when visible
- **Form Detection** - Distinguishes between:
  - Fresh vs Dried vs Ground vs Powder vs Whole vs Minced
  - Examples: "Fresh Garlic Cloves" vs "Garlic Powder"
  - "Whole Black Peppercorns" vs "Ground Black Pepper"
  - "Fresh Basil Leaves" vs "Dried Basil"
- **Category Auto-Assignment** - AI categorizes items automatically:
  - Dairy, Meat & Poultry, Fruits, Vegetables, Beverages
  - Packaged Food, Bakery, Condiments, Spices, Other
- **Expiry Date OCR** - Automatically extracts dates in multiple formats:
  - DD/MM/YYYY, MM/YYYY, MON YYYY, DD-MM-YY
  - Supports keywords: EXP, BEST BEFORE, BBE, USE BY, EXPIRES
- **Multilingual Text** - OCR works in 18+ languages
- **Confidence Scoring** - Shows AI confidence level (0-100%) for each detection

#### Detection Hierarchy (Smart Fallback)
1. **Primary**: Google Gemini 2.0 Flash (`gemini-2.0-flash-001`)
   - Most intelligent and context-aware
   - Multi-item detection capability
   - Language-aware product naming
2. **Fallback**: Google Cloud Vision API
   - TEXT_DETECTION (high-accuracy OCR)
   - LABEL_DETECTION (30 max labels for content understanding)
   - OBJECT_LOCALIZATION (physical object detection)
   - WEB_DETECTION (product identification)
   - CROP_HINTS (focus area detection)

---

### 🗄️ Smart Pantry Management

#### Organization & Display
- **Auto-Sorting** - Items automatically sorted by expiration date (earliest first)
- **Color-Coded Status** - Visual expiry warnings at a glance:
  - 🟢 **Green Border**: Fresh (7+ days remaining)
  - 🟠 **Orange Border**: Expiring Soon (1-6 days)
  - 🔴 **Red Background**: Expired (overdue)
- **Category Filtering** - Filter by 11 food categories:
  - All, Dairy, Meat & Poultry, Fruits, Vegetables
  - Beverages, Packaged Food, Bakery, Condiments, Spices, Other
- **Modern Chip UI** - Professional chip-based category selection
- **Real-time Count** - Live count of filtered items displayed
- **Empty State Guidance** - Helpful messages when pantry is empty

#### Item Management
- **Inline Editing** - Quick edit without modal dialogs:
  - Update quantity with stepper controls
  - Change unit (pcs, kg, g, L, ml, oz, lb)
  - Modify category with chip selection
  - Update expiry date with date picker
  - Rename item directly
- **Manual Entry** - Add items manually with intuitive form:
  - Smart category suggestions
  - Multiple unit options
  - Date picker with validation
  - Real-time form validation
- **Batch Actions**:
  - Clear all items with double confirmation
  - Delete individual items with swipe gesture
- **Detection Source Tags** - Visual indicators:
  - 🤖 **Camera Scan** (Gemini AI) - Purple chip
  - ✋ **Manual Entry** - Orange chip
- **Confidence Display** - AI confidence score shown for scanned items
- **Quantity Tracking** - Track amounts with flexible units

#### Real-time Sync & Data
- **Firebase Firestore** - Cloud-synced across all devices
- **Instant Updates** - Changes reflect immediately across sessions
- **Offline Support** - Works offline, syncs when connection restores
- **Data Persistence** - Items stored securely in cloud database

---

## 💰 Monetization & Tiers

Shelfze operates on a flexible 3-tier system to accommodate every type of user, from casual testers to power users.

| Feature | 🚀 Anonymous | ✨ Free | 👑 Premium |
|---|---|---|---|
| **Scans** | 10 (Lifetime) | 30 + 5/month (Bank) | **1000/month** (Quota) |
| **Recipes** | 10 (Lifetime) | 30 + 5/month (Bank) | **1000/month** (Quota) |
| **Cloud Sync & Backup** | ❌ | ✅ | ✅ |
| **Monthly Bonus** | ❌ | ✅ (+5 scans/recipes) | ❌ (Resets) |
| **Quota Model** | Lifetime | Accumulates | Resets Monthly |
| **Gift Codes** | ✅ | ✅ | ✅ |

- **Anonymous Tier**: Perfect for trying the app. You get 10 lifetime scans and recipes. Data is stored locally.
- **Free Tier**: Create a free account to get 30 scans and 30 recipes, plus a monthly bonus of 5 of each that accumulates over time. Your data is synced and backed up to the cloud.
- **Premium Tier**: For the ultimate experience, premium users receive a massive quota of 1,000 scans and 1,000 recipes every month.

---

### 🍳 Intelligent Recipe Generation

#### Dish Category Selection
Choose your desired dish type before generating recipes:
- 🍽️ **Main Course** - Dinner entrées and hearty dishes
- 🥗 **Appetizer** - Starters and small plates
- 🍰 **Dessert** - Sweet dishes and treats
- 🍳 **Breakfast** - Morning meals and brunch
- 🥣 **Soup / Salad** - Light meals and sides
- 🍿 **Snack** - Light bites and finger foods

#### AI-Powered Suggestions (Gemini 2.0 Flash)
- **Strict Ingredient Matching** - Uses ONLY ingredients from your pantry
- **No Assumptions** - Only assumes kitchen basics:
  - Salt, black pepper, cooking oil, water, sugar
- **Optional Ingredients** - "Nice-to-have" items clearly marked:
  - Format: "1 tbsp butter (Optional - if available)"
- **Smart Quantity Control** - Recipe count targets a consistent variety:
  - **Target**: 5-7 recipes per generation
  - **Variety**: Suggests different cooking styles (e.g., roasted vs. boiled) to meet the target
  - **Subset Selection**: AI intelligently selects a small subset (3-6 items) of ingredients for each recipe to ensure culinary coherence, avoiding "kitchen sink" dishes
- **Beverage Filtering** - Automatically excludes non-cooking beverages:
  - Removes: water, juice, soda, cola, beer
  - Keeps: milk, cream, broth, stock (cooking ingredients)
- **Professional Quality** - Recipes inspired by:
  - Bon Appétit • Serious Eats • America's Test Kitchen
  - Jamie Oliver • Gordon Ramsay
- **Variety** - Diverse cuisines, difficulty levels, cooking methods

#### Detailed Recipe View
When you select a recipe, you get:
- **Step-by-Step Instructions** - Clear, numbered cooking steps
- **Precise Ingredient List** - Exact measurements and quantities
- **Timing Information**:
  - Prep time (e.g., "15 minutes")
  - Cook time (e.g., "30 minutes")
  - Total time calculated
- **Serving Size** - Number of servings (e.g., "4 servings")
- **Difficulty Level** - Easy, Medium, or Hard
- **Cuisine Type** - Italian, Chinese, Mexican, French, etc.
- **Chef's Tips** - Professional cooking techniques and tricks
- **Source Attribution** - "Inspired by [Chef/Source]"
- **Optional Substitutions** - Suggested alternatives for flexibility

#### Multilingual Recipe Support
- **All 18 Languages** - Recipes generated in your selected language
- **Full Translation** - Ingredients, steps, and tips all translated
- **Cultural Adaptation** - Recipes adapted to language region
- **Consistent Terminology** - Cooking terms properly localized

---

### 🌍 Comprehensive Language Support

#### 18 Supported Languages

| Region | Languages |
|--------|-----------|
| **Western Europe** | 🇬🇧 English • 🇪🇸 Spanish • 🇫🇷 French • 🇩🇪 German • 🇮🇹 Italian • 🇵🇹 Portuguese • 🇳🇱 Dutch |
| **Eastern Europe** | 🇷🇺 Russian • 🇵🇱 Polish • 🇸🇮 Slovenian • 🇭🇷 Croatian • 🇷🇸 Serbian |
| **Asia** | 🇨🇳 Chinese • 🇯🇵 Japanese • 🇰🇷 Korean • 🇮🇳 Hindi |
| **Middle East** | 🇸🇦 Arabic • 🇹🇷 Turkish |

#### Full UI Translation (126+ strings)
- **Complete Interface** - Every button, label, message, and placeholder
- **Context-Aware** - Proper pluralization and grammar rules
- **Persistent Preferences** - Language selection saved using AsyncStorage
- **Instant Switching** - Change language anytime without app restart
- **No Placeholders** - All text fully translated, no English fallbacks

#### AI Translation Integration
- **Product Names** - Detected items translated to your language
- **Category Names** - All 11 food categories in your language
- **Recipe Generation** - AI creates recipes in target language
- **Error Messages** - User-friendly errors in your language
- **Date Formatting** - Localized date formats

---

### 🎨 Modern Design System

#### Design Tokens (Centralized)
Located in `styles/designTokens.js`:

**Colors:**
```javascript
Primary: #4CAF50 (Green)
Secondary: #2196F3 (Blue)
Danger: #F44336 (Red)
Warning: #FF9800 (Orange)
Success: #4CAF50 (Green)
Background: #F5F5F5, #FFFFFF
Text: Primary, Secondary, Tertiary levels
Borders: Subtle, Default, Strong
```

**Typography:**
```javascript
Headings: Large (24px), Medium (20px), Small (18px)
Body: Large (16px), Medium (14px), Small (12px)
Labels: Large (16px), Medium (14px), Small (12px)
Font Weights: Regular (400), Medium (500), SemiBold (600), Bold (700)
```

**Spacing System:**
```javascript
xs: 4px, sm: 8px, md: 16px, lg: 24px, xl: 32px, xxl: 48px
```

**Border Radius:**
```javascript
sm: 4px, md: 8px, lg: 12px, full: 9999px
```

**Shadows:**
```javascript
small, medium, large (elevation levels)
```

**Animations:**
```javascript
fast: 150ms, medium: 300ms, slow: 500ms
```

#### Reusable UI Components
Located in `components/ui/`:

**Button Component:**
- **Variants**: primary, secondary, ghost, danger
- **Sizes**: sm, md, lg
- **Features**: Loading state, disabled state, icon support

**SurfaceCard Component:**
- **Purpose**: Elevated cards for content grouping
- **Features**: Customizable padding, elevation, border radius
- **Usage**: Pantry items, filters, modals

**Chip Component:**
- **Tones**: primary, secondary, success, warning, danger, neutral
- **Usage**: Status indicators, category filters, tags
- **Features**: Active/inactive states, custom styling

**SectionHeader Component:**
- **Purpose**: Consistent section titles
- **Features**: Icon support, action buttons

#### Professional UX Patterns
- **Loading States** - Spinners and skeleton screens during processing
- **Empty States** - Helpful messages with action buttons
- **Error Handling** - User-friendly error messages with recovery options
- **Accessibility** - ARIA labels, semantic HTML, keyboard navigation
- **Responsive Design** - Adapts to phone, tablet, desktop
- **Touch Targets** - 44px minimum for mobile usability
- **Visual Feedback** - Button press states, hover effects

---

## 🤖 AI Technology

### Primary AI Model: Google Gemini 2.0 Flash

**Model ID:** `gemini-2.0-flash-001`

#### Why Gemini 2.0 Flash?
- **Latest Stable Model** - Google's newest production-ready model
- **Native Video Support** - Processes video files directly without client-side frame extraction
- **Multi-Modal** - Processes images, video, and text simultaneously
- **Fast Response** - Optimized for low-latency applications
- **Context Understanding** - Comprehends food packaging context
- **Multi-Language** - Native support for 18+ languages

#### Food Detection Capabilities
```javascript
{
  "productName": "Fresh Garlic Cloves",
  "category": "vegetable",
  "form": "fresh",  // fresh|dried|ground|powder|whole|minced|frozen
  "confidence": 0.92
}
```

- Detects **multiple items** in one image
- Identifies **specific product forms** (fresh vs dried vs ground)
- Recognizes **brand names** when visible
- Auto-assigns **food categories**
- Provides **confidence scores**

#### Recipe Generation Capabilities
- Uses ONLY pantry ingredients (strict matching)
- Generates 3-5 recipes based on dish category
- Provides detailed cooking instructions
- Includes chef's tips and professional techniques
- Fully multilingual (18 languages)

### Fallback: Google Cloud Vision API

**API:** `@google-cloud/vision` v5.3.3

#### Vision API Features
1. **TEXT_DETECTION** - High-accuracy OCR for expiry dates
2. **LABEL_DETECTION** - 30 max labels for content understanding
3. **OBJECT_LOCALIZATION** - Physical object detection
4. **WEB_DETECTION** - Product identification via web search
5. **CROP_HINTS** - Identifies focus areas in image

---

## 🛠️ Technology Stack

### Frontend (Mobile & Web)
- **React Native** 0.81.4 - Cross-platform mobile framework
- **Expo** 54.0.13 - Development platform and tooling
- **Expo SDK** 54 - Native modules and APIs
- **React Navigation** 6.1.18 - Routing and navigation
- **expo-camera** 17.0.8 - Camera and video capture
- **expo-video-thumbnails** 9.0.0 - Video frame extraction
- **expo-file-system** 18.0.8 - File operations
- **@react-native-community/datetimepicker** 8.4.5 - Date selection
- **@react-native-async-storage/async-storage** 2.2.0 - Local persistence

### Backend & Cloud Services
- **Firebase** 11.1.0 - Backend platform
- **Cloud Firestore** - NoSQL real-time database
- **Firebase Cloud Functions** 6.0.1 - Serverless functions
- **Google Cloud Vision API** 5.3.3 - Image OCR and analysis
- **Google Gemini AI** (Vertex AI 1.10.0) - AI-powered food detection & recipes
- **Firebase Admin SDK** 12.7.0 - Server-side Firebase operations

### Development Tools
- **Node.js** 22.x - JavaScript runtime
- **npm** - Package manager
- **Firebase CLI** - Deployment tools
- **Expo CLI** - Development server
- **ESLint** - Code linting
- **Git** - Version control

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ ([Download](https://nodejs.org/))
- **npm** or **yarn**
- **Expo CLI**: `npm install -g expo-cli`
- **Firebase CLI**: `npm install -g firebase-tools`
- **Google Cloud Account** (for Vision API & Gemini)
- **Firebase Account** (for Firestore & Functions)

### 5-Minute Setup

```bash
# 1. Clone the repository
git clone https://github.com/YOUR-USERNAME/shelfze.git
cd shelfze

# 2. Install dependencies
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

# 5. Update Cloud Function URL in CameraScanner.js
# Replace YOUR_CLOUD_FUNCTION_URL with deployed URL

# 6. Start the app
npm start
```

That's it! Scan the QR code with Expo Go to run on your phone.

---

## 📚 Detailed Installation

### Step 1: Google Cloud Setup

1. **Create Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Click "Create Project"
   - Note your Project ID

2. **Enable Required APIs**
   ```bash
   # Navigate to APIs & Services > Enable APIs and Services
   # Enable the following:
   ```
   - ✅ Cloud Vision API
   - ✅ Vertex AI API (for Gemini)
   - ✅ Cloud Functions API

3. **Set Up Billing**
   - Required for Cloud Functions
   - Navigate to Billing section
   - Link a payment method

### Step 2: Firebase Setup

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Click "Add Project"
   - Use the same Google Cloud Project ID

2. **Enable Services**
   - ✅ **Firestore Database** - Create database in production mode
   - ✅ **Cloud Functions** - Upgrade to Blaze plan (pay-as-you-go)

3. **Get Configuration**
   ```javascript
   // Firebase Console > Project Settings > Your apps > Web app
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.firebasestorage.app",
     messagingSenderId: "123456789",
     appId: "1:123:web:abc123"
   };
   ```

### Step 3: Install App Dependencies

```bash
# Clone repository
git clone https://github.com/YOUR-USERNAME/shelfze.git
cd shelfze

# Install app dependencies
npm install

# Install Cloud Functions dependencies
cd functions
npm install
cd ..
```

### Step 4: Configure Firebase

```bash
# Copy example config
cp firebase.config.example.js firebase.config.js

# Edit firebase.config.js
# Paste your Firebase configuration from Step 2
```

**firebase.config.js:**
```javascript
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
```

### Step 5: Deploy Cloud Functions

```bash
# Login to Firebase
firebase login

# Initialize Firebase (select Functions and Firestore)
firebase init

# Deploy Cloud Functions
cd functions
npm run deploy
# Or: firebase deploy --only functions

# Note the deployed URLs (you'll need these next)
```

After deployment, you'll see URLs like:
```
https://analyzeimage-[hash]-uc.a.run.app
https://generaterecipes-[hash]-uc.a.run.app
https://getrecipedetails-[hash]-uc.a.run.app
```

### Step 6: Update Cloud Function URL

```bash
# Open components/CameraScanner.js
# Find line ~57:
const CLOUD_FUNCTION_URL = 'YOUR_CLOUD_FUNCTION_URL_HERE';

# Replace with your deployed analyzeImage URL:
const CLOUD_FUNCTION_URL = 'https://analyzeimage-awiyk42b4q-uc.a.run.app';
```

### Step 7: Start the App

```bash
# Start Expo development server
npm start

# Options:
# - Scan QR code with Expo Go (iOS/Android)
# - Press 'w' for web browser
# - Press 'a' for Android emulator
# - Press 'i' for iOS simulator (Mac only)
```

---

## 📱 Usage Guide

### Scanning Your Items

#### Photo Mode
1.  Tap **📷 Capture** button
2.  AI processes the image instantly
3.  Review detected items in the modal
4.  Tap **✓ Confirm** to save to pantry

#### Video Mode
1. Tap **Video Mode** toggle (camera icon switches to video)
2. Tap **🔴 Record** button to start recording (max 10 seconds)
3. Tap **STOP** to end recording early (or wait for auto-stop)
4. AI extracts 5 frames and analyzes each
5. Best detections shown in review modal
6. Tap **✓ Confirm** to save

### Managing Your Pantry

#### Viewing Items
1. Navigate to **Pantry** tab
2. Items displayed in cards, sorted by expiration date
3. Visual indicators:
   - Green left border = Fresh (7+ days)
   - Orange left border = Expiring Soon (1-6 days)
   - Red background = Expired

#### Filtering by Category
1. Scroll category chips at top of Pantry tab
2. Tap any category (e.g., "Dairy", "Fruits")
3. List filters instantly to show only that category
4. Item count updates in real-time
5. Tap "All" to remove filter

#### Editing Items
1. Tap **✏️ Edit** button on any item card
2. Modal opens with current values
3. Update:
   - **Item Name** - Text input
   - **Category** - Tap category chips
   - **Quantity** - Number input
   - **Unit** - Tap unit chips (pcs, kg, g, L, ml, oz, lb)
   - **Expiry Date** - Tap date picker
4. Tap **💾 Save** to confirm changes
5. Tap **Cancel** to discard changes

#### Manual Entry
1. Tap **➕ Add** button (top right in Pantry tab)
2. Fill in the form:
   - **Food Name** (required)
   - **Category** - Select from chips
   - **Quantity** (required, default: 1)
   - **Unit** - Select from chips
   - **Expiry Date** - Pick a date
3. Tap **✨ Add to Pantry**
4. Item appears in list immediately

#### Deleting Items
- **Single Delete**: Tap **🗑️ Delete** on item card → Confirm
- **Clear All**: Scroll to bottom → Tap **🗑️ Clear All** → Confirm twice

### Generating Recipes

#### Step-by-Step
1. Navigate to **Recipes** tab
2. **Select Dish Category**:
   - Tap one of 6 chips: Main Course, Appetizer, Dessert, etc.
   - Selection highlighted in green
3. Tap **✨ Generate Recipe Ideas** button
4. Wait 3-5 seconds for AI to process
5. Browse 3-5 recipe suggestions
6. Tap any recipe card to view full details
7. Scroll through:
   - Ingredients list
   - Step-by-step instructions
   - Chef's tips
   - Cooking times

#### Recipe Details
When viewing a recipe, you see:
- **Emoji & Name** - Visual recipe identifier
- **Difficulty** - Easy, Medium, or Hard
- **Times** - Prep time, cook time, total time
- **Servings** - Number of portions
- **Cuisine** - Type (e.g., Italian, Mexican)
- **Ingredients** - Precise measurements
  - Items marked (Optional) if not in pantry
- **Instructions** - Numbered steps
- **Tips** - Professional cooking advice
- **Source** - Inspired by [Chef/Publication]

### Changing Language

#### Quick Change
1. Tap **Language** button (globe icon in Scanner header)
2. Modal shows 18 language options with flags
3. Tap any language
4. Entire app updates instantly
5. Language preference saved automatically

#### What Changes
- All UI text (buttons, labels, placeholders)
- Category names
- Error messages
- Date formats
- Future recipe generations

---

## 🌍 Language Support

### Complete UI Translation

All 126+ interface strings translated in these languages:

| Language | Code | Status | Strings |
|----------|------|--------|---------|
| 🇬🇧 **English** | `en` | ✅ Complete | 126+ |
| 🇪🇸 **Spanish** | `es` | ✅ Complete | 126+ |
| 🇫🇷 **French** | `fr` | ✅ Complete | 126+ |
| 🇩🇪 **German** | `de` | ✅ Complete | 126+ |
| 🇮🇹 **Italian** | `it` | ✅ Complete | 126+ |
| 🇸🇮 **Slovenian** | `sl` | ✅ Complete | 126+ |

### Recipe Generation Languages

AI generates recipes in all 18 languages:
- English, Spanish, French, German, Italian, Portuguese
- Russian, Chinese, Japanese, Korean, Arabic, Hindi
- Turkish, Polish, Dutch, Slovenian, Croatian, Serbian

### Translation Files
Located in `contexts/translations.js`:
- Centralized translation keys
- Organized by feature (scanner, pantry, recipes, etc.)
- Easy to add new languages

---

## 📂 Project Structure

```
Shelfze/
├── 📱 App.js                     # Main app entry, navigation setup
├── ⚙️ firebase.config.js          # Firebase initialization
├── 📦 package.json               # App dependencies
├── 🎨 app.json                   # Expo configuration
│
├── 🖼️ assets/                     # Images, icons, fonts
│   ├── icon.png
│   ├── splash.png
│   └── adaptive-icon.png
│
├── 🧩 components/                # React components
│   ├── CameraScanner.js          # Photo/video capture & AI
│   ├── PantryList.js             # Inventory management UI
│   ├── RecipeGenerator.js        # AI recipe suggestions
│   ├── ManualEntry.js            # Manual item addition form
│   ├── LanguageSelector.js       # Language selection modal
│   └── ui/                       # Shared UI components
│       ├── Button.js             # Reusable button (4 variants)
│       ├── SurfaceCard.js        # Elevated card container
│       ├── Chip.js               # Status/category chips
│       └── SectionHeader.js      # Section titles
│
├── 🌐 contexts/                  # React Context providers
│   ├── LanguageContext.js        # Language state management
│   └── translations.js           # i18n strings (126+ keys × 18 languages)
│
├── 🎨 styles/                    # Design system
│   └── designTokens.js           # Colors, spacing, typography, shadows
│
├── ☁️ functions/                  # Firebase Cloud Functions
│   ├── index.js                  # Main functions file
│   │   ├── analyzeImage          # Vision API + Gemini integration
│   │   ├── generateRecipes       # Gemini AI recipe generation
│   │   └── getRecipeDetails      # Detailed recipe with instructions
│   ├── package.json              # Function dependencies
│   └── src/
│       └── index.ts              # TypeScript functions (optional)
│
└── 📄 Documentation/
    ├── README.md                 # This file
    ├── README.old.md             # Previous README
    ├── FULL-LANGUAGE-SUPPORT.md  # Language implementation details
    ├── VIDEO-MODE-IMPLEMENTATION.md  # Video feature docs
    ├── RECIPE-ENHANCEMENTS.md    # Recipe generation details
    ├── RECIPE-STRICT-INGREDIENTS.md  # Pantry-only recipe logic
    ├── DESIGN-SYSTEM-IMPROVEMENTS.md # UI design system guide
    └── PROFESSIONAL-DESIGN-V2.md # Design system v2.0 spec
```

---

## ⚙️ Configuration

### Firebase Configuration

**File:** `firebase.config.js`

```javascript
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
```

### Firestore Data Model

**Collection:** `pantry`

```javascript
{
  "pantry": {
    "abc123def456": {  // Auto-generated document ID
      "name": "Sheep Milk",
      "itemName": "Sheep Milk",  // Backward compatibility
      "category": "Dairy",
      "quantity": 1,
      "unit": "L",
      "expiryDate": "2025-10-20T00:00:00.000Z",
      "addedAt": Timestamp,
      "detectionSource": "Gemini AI" | "Manual Entry",
      "confidence": 0.95,  // AI confidence (0-1)
      "detectedLabels": [...],  // Vision API labels
      "detectedObjects": [...],  // Vision API objects
      "fullText": "OCR text...",  // Extracted text
      "geminiDetails": {...}  // Gemini response
    }
  }
}
```

### Firestore Security Rules

**File:** `firestore.rules`

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User data - only accessible by the user who owns it
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Cloud Function Environment

**functions/index.js** requires:
- Google Cloud Vision API enabled
- Vertex AI API enabled (for Gemini)
- Firebase Admin SDK initialized
- CORS enabled for your app's domain

**Environment Variables:**
Set in Firebase Console > Functions > Configuration
```bash
firebase functions:config:set google.project_id="your-project-id"
firebase functions:config:set google.location="us-central1"
```

---

## ☁️ Cloud Functions

### 1. analyzeImage

**URL:** `https://analyzeimage-[hash]-uc.a.run.app`

**Purpose:** Process images using Google Cloud Vision API + Gemini AI

**Input:**
```json
{
  "image": "base64_encoded_image_string",
  "language": "en"  // Optional, default: "en"
}
```

**Output:**
```json
{
  "fullText": "Extracted OCR text",
  "foodItems": [
    {
      "name": "Sheep Milk",
      "category": "Dairy",
      "confidence": 0.92,
      "source": "Gemini AI",
      "form": "bottled",
      "details": "Packaged sheep milk product"
    }
  ],
  "totalItems": 1,
  "savedItems": [
    {
      "id": "abc123",
      "name": "Sheep Milk",
      "category": "Dairy"
    }
  ],
  "detectionSource": "Gemini AI",
  "expiryDate": "2025-10-20",
  "saved": true
}
```

**Features:**
- Tries Gemini AI first (most intelligent)
- Falls back to Vision API if Gemini fails
- Detects multiple items in one image
- Extracts expiry dates automatically
- Auto-categorizes food items
- Saves to Firestore automatically

---

### 2. generateRecipes

**URL:** `https://generaterecipes-[hash]-uc.a.run.app`

**Purpose:** Generate recipe suggestions using Gemini AI

**Input:**
```json
{
  "ingredients": ["Sheep Milk", "Eggs", "Flour", "Butter"],
  "language": "en",  // Optional, default: "en"
  "dishCategory": "mainCourse"  // Optional, default: "mainCourse"
}
```

**Dish Categories:**
- `mainCourse` - Main Course / Dinner Entrée
- `appetizer` - Appetizer / Starter
- `dessert` - Dessert / Sweet Dish
- `breakfast` - Breakfast / Brunch
- `soupSalad` - Soup / Salad
- `snack` - Snack / Light Bite

**Output:**
```json
{
  "recipes": [
    {
      "name": "Creamy Milk Pancakes",
      "emoji": "🥞",
      "description": "Fluffy pancakes made with sheep milk...",
      "prepTime": "10 minutes",
      "cookTime": "20 minutes",
      "servings": "4",
      "difficulty": "Easy",
      "cuisine": "American",
      "source": "Inspired by Bon Appétit"
    }
  ],
  "note": "Pantry ingredient count is low...",  // If < 4 items
  "noteCode": "limited_pantry_low"
}
```

**Features:**
- Uses ONLY ingredients from your pantry
- Assumes only basics: salt, pepper, oil, water, sugar
- Marks optional ingredients clearly
- Adjusts recipe count based on ingredient availability
- Filters out non-cooking beverages
- Generates 3-5 recipes (based on ingredient count)
- Professional quality from top culinary sources

---

### 3. getRecipeDetails

**URL:** `https://getrecipedetails-[hash]-uc.a.run.app`

**Purpose:** Get full recipe with step-by-step instructions

**Input:**
```json
{
  "recipeName": "Creamy Milk Pancakes",
  "availableIngredients": "Sheep Milk, Eggs, Flour, Butter",
  "language": "en"  // Optional, default: "en"
}
```

**Output:**
```json
{
  "name": "Creamy Milk Pancakes",
  "emoji": "🥞",
  "difficulty": "Easy",
  "cookTime": "20 minutes",
  "prepTime": "10 minutes",
  "servings": "4",
  "cuisine": "American",
  "source": "Inspired by Bon Appétit",
  "ingredients": [
    "2 cups sheep milk",
    "2 eggs",
    "1.5 cups flour",
    "2 tablespoons butter",
    "1 tablespoon sugar",
    "Pinch of salt"
  ],
  "instructions": [
    "In a large bowl, whisk together eggs and sheep milk...",
    "Add flour, sugar, and salt. Mix until just combined...",
    "Heat butter in a skillet over medium heat...",
    "Pour 1/4 cup batter for each pancake...",
    "Cook until bubbles form, then flip..."
  ],
  "tips": [
    "Don't overmix the batter - lumps are okay",
    "Use room temperature ingredients for fluffier pancakes",
    "Test pan temperature with a drop of water before cooking"
  ]
}
```

**Features:**
- Detailed step-by-step instructions
- Professional chef's tips
- Precise measurements and timing
- Uses ONLY available pantry ingredients
- Optional ingredients clearly marked
- Fully multilingual

---

## 🎨 Design System

### Design Tokens

**Location:** `styles/designTokens.js`

#### Colors
```javascript
export const Colors = {
  // Primary palette
  primary: '#4CAF50',       // Green
  primaryLight: '#81C784',
  primaryDark: '#388E3C',
  
  // Secondary palette
  secondary: '#2196F3',     // Blue
  secondaryLight: '#64B5F6',
  secondaryDark: '#1976D2',
  
  // Status colors
  success: '#4CAF50',
  warning: '#FF9800',
  danger: '#F44336',
  info: '#2196F3',
  
  // Neutral colors
  background: '#FFFFFF',
  backgroundSecondary: '#F5F5F5',
  surface: '#FFFFFF',
  surfaceVariant: '#F5F5F5',
  
  // Text colors
  textPrimary: '#212121',
  textSecondary: '#757575',
  textTertiary: '#BDBDBD',
  textDisabled: '#9E9E9E',
  textInverse: '#FFFFFF',
  
  // Border colors
  borderSubtle: '#E0E0E0',
  borderDefault: '#BDBDBD',
  borderStrong: '#757575'
};
```

#### Typography
```javascript
export const Typography = {
  headingLarge: {
    fontSize: 24,
    fontWeight: '700',  // Bold
    lineHeight: 32
  },
  headingMedium: {
    fontSize: 20,
    fontWeight: '600',  // SemiBold
    lineHeight: 28
  },
  headingSmall: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24
  },
  bodyLarge: {
    fontSize: 16,
    fontWeight: '400',  // Regular
    lineHeight: 24
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20
  },
  bodySmall: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16
  },
  labelLarge: {
    fontSize: 16,
    fontWeight: '500',  // Medium
    lineHeight: 24
  },
  labelMedium: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20
  },
  labelSmall: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16
  }
};
```

#### Spacing
```javascript
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48
};
```

#### Border Radius
```javascript
export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999
};
```

#### Shadows
```javascript
export const Shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8
  }
};
```

### UI Components

#### Button Component
**File:** `components/ui/Button.js`

**Usage:**
```jsx
<Button
  label="Save Changes"
  variant="primary"  // primary|secondary|ghost|danger
  size="md"          // sm|md|lg
  onPress={() => {}}
  loading={false}
  disabled={false}
  icon="✓"
/>
```

#### SurfaceCard Component
**File:** `components/ui/SurfaceCard.js`

**Usage:**
```jsx
<SurfaceCard
  elevated={true}
  padding="lg"  // xs|sm|md|lg|xl
  style={styles.customStyle}
>
  {children}
</SurfaceCard>
```

#### Chip Component
**File:** `components/ui/Chip.js`

**Usage:**
```jsx
<Chip
  label="Fresh"
  tone="success"  // primary|secondary|success|warning|danger|neutral
  style={styles.customChip}
/>
```

---

## 🔧 Development

### Running Locally

```bash
# Start Expo development server
npm start

# Run on specific platform
npm run android     # Android emulator
npm run ios         # iOS simulator (Mac only)
npm run web         # Web browser

# Clear cache and restart
npx expo start --clear
```

### Testing Cloud Functions Locally

```bash
cd functions

# Install Firebase emulator suite
firebase init emulators

# Start emulators
npm run serve
# Functions will run at http://localhost:5001

# Test with curl
curl -X POST http://localhost:5001/your-project-id/us-central1/analyzeImage \
  -H "Content-Type: application/json" \
  -d '{"image":"base64_string","language":"en"}'
```

### Code Linting

```bash
# Run ESLint
npm run lint

# Fix auto-fixable issues
npm run lint:fix
```

### Building for Production

```bash
# Build for Android
eas build --platform android

# Build for iOS
eas build --platform ios

# Build for both
eas build --platform all
```

---

## 📊 Performance

### Optimization Techniques

#### Image Processing
- **Base64 Compression** - Images compressed before upload
- **Max Resolution** - 1920x1080 for optimal balance
- **Format** - JPEG with 80% quality

#### AI Response Times
- **Gemini 2.0 Flash** - Average 2-3 seconds
- **Vision API Fallback** - Average 1-2 seconds
- **Recipe Generation** - Average 3-5 seconds

#### Database
- **Firestore Indexing** - Composite indexes for fast queries
- **Real-time Listeners** - Efficient snapshot listeners
- **Offline Support** - Local caching with Firestore

#### App Performance
- **Lazy Loading** - Components loaded on-demand
- **Memoization** - React.memo for expensive renders
- **Image Optimization** - Cached images, lazy loading

---

## 🔒 Security

### Current Status (Production Ready)

✅ **Security is implemented!**

**Current Setup:**
- ✅ HTTPS Cloud Functions
- ✅ CORS enabled for all origins (`*`)
- ✅ Firebase Anonymous Authentication
- ✅ Secure Firestore rules (user-specific data access)

### Production Recommendations

#### 1. Add Firebase Authentication

```javascript
// App.js
import { getAuth, signInAnonymously } from 'firebase/auth';

const auth = getAuth(app);
await signInAnonymously(auth);
```

#### 2. Update Firestore Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /pantry/{document=**} {
      // Only authenticated users can read/write
      allow read, write: if request.auth != null;
      
      // Or user-specific data:
      allow read, write: if request.auth.uid == resource.data.userId;
    }
  }
}
```

#### 3. Restrict CORS

```javascript
// functions/index.js
exports.analyzeImage = functions.https.onRequest(async (req, res) => {
  // Replace * with your app's domain
  res.set("Access-Control-Allow-Origin", "https://your-app.com");
  // ...
});
```

#### 4. Add Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/analyzeImage', limiter);
```

#### 5. Environment Variables

```bash
# Use Firebase Functions config
firebase functions:config:set vision.api_key="YOUR_API_KEY"
firebase functions:config:set gemini.api_key="YOUR_GEMINI_KEY"

# Access in code
const visionKey = functions.config().vision.api_key;
```

---

## 🐛 Troubleshooting

### Common Issues

#### Camera Not Working

**Problem:** Camera doesn't open or shows black screen

**Solutions:**
1. Check permissions in device settings
2. Restart the app
3. For iOS: Add camera usage description to `app.json`:
   ```json
   "infoPlist": {
     "NSCameraUsageDescription": "We need camera access to scan food items"
   }
   ```
4. For Android: Check `AndroidManifest.xml` has camera permissions

#### Cloud Function Errors

**Problem:** "Failed to process image" or timeout errors

**Solutions:**
1. Verify Vision API is enabled in Google Cloud Console
2. Check billing is enabled (required for Cloud Functions)
3. View logs: `firebase functions:log`
4. Check function URL is correct in `CameraScanner.js`
5. Verify internet connection

**Debug Logging:**
```bash
# View recent function logs
firebase functions:log --only analyzeImage

# Stream live logs
firebase functions:log --only analyzeImage --follow
```

#### Firestore Connection Issues

**Problem:** Items not saving or loading

**Solutions:**
1. Verify Firebase configuration in `firebase.config.js`
2. Check Firestore security rules
3. Ensure internet connection
4. Check Firebase Console for quota limits
5. Verify Firestore is enabled in Firebase project

**Test Connection:**
```javascript
import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase.config';

// Test write
await addDoc(collection(db, 'test'), { test: true });
console.log('Firestore connected!');
```

#### Language Not Changing

**Problem:** UI stays in same language after selection

**Solutions:**
1. Verify translation key exists in `contexts/translations.js`
2. Check `LanguageContext` is properly wrapped around app
3. Clear AsyncStorage: `expo install expo-secure-store` then clear
4. Restart app completely (not just reload)

**Debug:**
```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Check stored language
const lang = await AsyncStorage.getItem('selectedLanguage');
console.log('Stored language:', lang);
```

#### Expo Build Errors

**Problem:** Build fails with dependency errors

**Solutions:**
1. Clear npm cache: `npm cache clean --force`
2. Delete `node_modules` and `package-lock.json`
3. Reinstall: `npm install`
4. Update Expo: `npm install expo@latest`
5. Check package versions match Expo SDK 54

#### Module Not Found Errors

**Problem:** "Module 'X' not found" errors

**Solutions:**
1. Install missing module: `npm install [module-name]`
2. Restart Metro bundler: `npx expo start --clear`
3. For iOS: `cd ios && pod install && cd ..`
4. Verify import paths are correct

---

## 🤝 Contributing

We welcome contributions! Here's how to get started.

### Ways to Contribute

1. 🐛 **Report Bugs** - Open an issue with details
2. ✨ **Request Features** - Suggest new ideas
3. 🌍 **Add Translations** - Contribute new language support
4. 📝 **Improve Documentation** - Fix typos, add examples
5. 💻 **Submit Code** - Fix bugs, add features

### Development Workflow

```bash
# 1. Fork the repository on GitHub

# 2. Clone your fork
git clone https://github.com/YOUR-USERNAME/shelfze.git
cd shelfze

# 3. Create a feature branch
git checkout -b feature/amazing-feature

# 4. Make your changes
# - Follow existing code style
# - Add comments for complex logic
# - Update README if needed

# 5. Test your changes
npm start
npm run lint

# 6. Commit your changes
git add .
git commit -m "Add amazing feature"

# 7. Push to your fork
git push origin feature/amazing-feature

# 8. Open a Pull Request on GitHub
```

### Code Style Guidelines

- **JavaScript**: ES6+ syntax, arrow functions
- **React**: Functional components with hooks
- **Naming**: camelCase for variables, PascalCase for components
- **Comments**: JSDoc for functions, inline for complex logic
- **Formatting**: 2-space indentation, semicolons

### Adding a New Language

1. **Update `translations.js`:**
```javascript
// contexts/translations.js
export const translations = {
  // ... existing languages
  
  'xx': {  // Language code
    welcome: 'Welcome',
    scan: 'Scan',
    // ... all 126 keys
  }
};
```

2. **Update `LanguageSelector.js`:**
```javascript
const LANGUAGES = [
  // ... existing languages
  { code: 'xx', name: 'Language Name', flag: '🏴' }
];
```

3. **Test thoroughly** - Verify all screens show translated text

---

## 🗺️ Roadmap

### ✅ Completed Features

- [x] Camera scanning (photo mode)
- [x] AI-powered food detection (Gemini 2.0 Flash)
- [x] Expiry date OCR recognition
- [x] Pantry management with filtering
- [x] Recipe generation by dish category
- [x] 18-language support with full UI translation
- [x] Manual item entry
- [x] Modern design system with reusable components
- [x] Real-time Firestore sync
- [x] Web platform support

### 🚧 In Progress

- [x] User authentication (Firebase Anonymous Auth)
- [ ] Push notifications for expiring items
- [ ] Dark mode support
- [ ] Recipe favorites/bookmarks

### 🔮 Planned Features

#### Short Term (Q1 2026)
- [ ] Barcode scanning for packaged foods
- [ ] Shopping list generation from recipes
- [ ] Nutrition information display
- [ ] Meal planning calendar
- [ ] Offline mode with sync

#### Medium Term (Q2-Q3 2026)
- [ ] Social features (share recipes, pantry)
- [ ] Voice input for manual entry
- [ ] Smart recommendations based on season
- [ ] Integration with grocery delivery services
- [ ] Advanced analytics (waste tracking, savings)

#### Long Term (Q4 2026+)
- [ ] Smart home integration (Alexa, Google Home)
- [ ] AR mode for visual pantry organization
- [ ] Community recipe sharing platform
- [ ] Sustainability scoring
- [ ] Meal prep scheduling

---

## 📄 License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2025 Shelfze

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🙏 Acknowledgments

### Technologies
- **[Expo](https://expo.dev/)** - React Native development platform
- **[Firebase](https://firebase.google.com/)** - Backend infrastructure & hosting
- **[Google Cloud Vision](https://cloud.google.com/vision)** - OCR and image analysis
- **[Google Gemini AI](https://deepmind.google/technologies/gemini/)** - Intelligent food detection & recipe generation
- **[React Native](https://reactnative.dev/)** - Cross-platform mobile framework
- **[React Navigation](https://reactnavigation.org/)** - Navigation library

### Inspiration
- Food waste reduction initiatives worldwide
- Smart home inventory management systems
- AI-powered cooking assistants
- Sustainability-focused tech startups

### Contributors
Thank you to all contributors who have helped make Shelfze better!

---

## 📞 Contact & Support

### Getting Help
- **Documentation**: Read this README and related `.md` files in the repo
- **Issues**: Open an issue on [GitHub Issues](https://github.com/YOUR-USERNAME/shelfze/issues)
- **Firebase Support**: https://firebase.google.com/support
- **Expo Forums**: https://forums.expo.dev/
- **Stack Overflow**: Tag questions with `shelfze`, `expo`, `react-native`

### Stay Updated
- ⭐ **Star this repo** to follow updates
- 👀 **Watch releases** for new versions
- 🐦 **Follow on Twitter** (if applicable)

---

## 📊 Project Stats

- **Lines of Code**: ~7,000+
- **Components**: 9 React components (5 main + 4 UI primitives)
- **Cloud Functions**: 3 serverless functions
- **Translation Keys**: 126+ strings
- **Supported Languages**: 18 languages
- **Food Categories**: 11 categories
- **Platform Support**: iOS, Android, Web
- **Dependencies**: 25+ npm packages
- **Design Tokens**: 80+ design constants
- **AI Models**: 2 (Gemini 2.0 Flash + Vision API)

---

<div align="center">

### Built with ❤️ using React Native, Expo, Firebase, and Google Cloud AI

**Never waste food again! 🥫♻️🌍**

---

**Shelfze** • Smart Pantry • Zero Waste

[⬆ Back to Top](#-shelfze---smart-food-inventory-management)

---

## 🚀 App Store Readiness Status

### ✅ Complete
- ✅ **App Configuration** - Bundle IDs, permissions, camera descriptions
- ✅ **Code Quality** - No console.logs, linting passed, no errors
- ✅ **Core Features** - All 4 main features working perfectly
- ✅ **Multi-language** - 18 languages fully translated (126+ strings)
- ✅ **Security** - Firebase auth, HTTPS functions, secure Firestore rules
- ✅ **Legal Documents** - Privacy Policy ✓ | Terms of Service ✓
- ✅ **Testing Documentation** - Comprehensive testing guide available
- ✅ **App Assets** - Icon, splash screen, adaptive icon present

### ⚠️ Required Before Publishing
1. **App Store Screenshots** - Need 3-10 screenshots per device size
2. **Feature Graphic** (Android) - 1024x500px banner
3. **App Description** - Write compelling store description
4. **Support Email** - Set up support@shelfze.app or similar
5. **Privacy Policy Hosting** - Host PRIVACY-POLICY.md publicly
6. **Terms of Service Hosting** - Host TERMS-OF-SERVICE.md publicly
7. **Test on Real Devices** - iOS & Android physical device testing
8. **Build APK/IPA** - Create production builds with `eas build`

### 📋 Quick Pre-Launch Checklist
- [ ] Run `TESTING-GUIDE.md` full test suite
- [x] Host Privacy Policy at public URL
- [x] Host Terms of Service at public URL
- [ ] Create App Store screenshots (use device frames)
- [ ] Write store description (include 18 languages feature!)
- [ ] Set up support email
- [ ] Build production APK: `eas build -p android --profile production`
- [ ] Build production IPA: `eas build -p ios --profile production`
- [ ] Submit to Google Play Console
- [ ] Submit to Apple App Store Connect

**See `PRE-PUBLISHING-CHECKLIST.md` for detailed requirements.**

---

*Last Updated: November 30, 2025*  
*Version: 1.0.2*  
*Expo SDK: 54*

</div>
