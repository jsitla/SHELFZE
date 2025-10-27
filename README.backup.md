# 🥫 Shelfze - Smart Food Inventory Management

<div align="center">

![Shelfze Banner](https://img.shields.io/badge/Shelfze-Smart_Pantry-4CAF50?style=for-the-badge&logo=google-cloud&logoColor=white)
[![Expo](https://img.shields.io/badge/Expo-54.0-000020?style=flat-square&logo=expo)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React_Native-0.81-61DAFB?style=flat-square&logo=react)](https://reactnative.dev)
[![Firebase](https://img.shields.io/badge/Firebase-11.1-FFCA28?style=flat-square&logo=firebase)](https://firebase.google.com)
[![Gemini AI](https://img.shields.io/badge/Gemini_2.0-Flash-8E75B2?style=flat-square&logo=google)](https://deepmind.google/technologies/gemini/)

*Never let food go to waste again! Smart AI-powered pantry tracking with expiry date detection, multilingual support, and intelligent recipe generation powered by Google Gemini 2.0 Flash.*

[Features](#-key-features) • [Installation](#-installation-guide) • [AI Technology](#-ai--ml-technology) • [Languages](#-language-support) • [Contributing](#-contributing)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Demo](#-demo)
- [Key Features](#-key-features)
- [AI & ML Technology](#-ai--ml-technology)
- [Technology Stack](#-technology-stack)
- [Architecture](#-architecture)
- [Installation Guide](#-installation-guide)
- [Usage Guide](#-usage-guide)
- [Language Support](#-language-support)
- [Project Structure](#-project-structure)
- [Configuration](#-configuration)
- [Cloud Functions](#-cloud-functions)
- [Design System](#-design-system)
- [Development](#-development)
- [Troubleshooting](#-troubleshooting)
- [Performance](#-performance)
- [Security](#-security)
- [Contributing](#-contributing)
- [License](#-license)
- [Roadmap](#-roadmap)

---

## 🎯 Overview

**Shelfze** is an intelligent food inventory management application that leverages cutting-edge AI technology to help you track your groceries, minimize food waste, and discover delicious recipes. Simply scan your food items, and let our advanced AI detect products, expiry dates, and generate recipes automatically!

### Why Shelfze?

- 🎯 **40% of food** is wasted globally - Shelfze helps reduce this
- ⏰ **Save Time** - No manual entry needed, just scan and go
- 🤖 **AI-Powered** - Google Gemini 2.0 Flash for intelligent food recognition
- 🌍 **Multilingual** - Available in 18 languages with full UI translation
- 🍳 **Smart Recipes** - Get creative with what you have using AI-powered suggestions
- 📱 **Cross-Platform** - Works seamlessly on iOS, Android, and Web
- 🎨 **Modern Design** - Professional design system with consistent UI/UX
- 🔄 **Real-time Sync** - Cloud-powered inventory management with Firebase

---

## 🎬 Demo

### Photo & Video Scanning
- **Photo Mode**: Single tap capture with instant AI processing
- **Video Mode**: 10-second recording for multiple item detection
- **Multi-item Recognition**: Detects multiple food items in one scan

### Smart Detection
- **Product Recognition**: Identifies specific products (e.g., "Sheep Milk", "Ground Cinnamon")
- **Form Detection**: Distinguishes between fresh, dried, ground, powder, whole, etc.
- **Expiry Date OCR**: Automatically extracts expiration dates from packaging
- **Multi-language Text**: Reads labels in 18+ languages

### Recipe Generation
- **Dish Category Selection**: Choose from 6 categories (Main Course, Appetizer, Dessert, etc.)
- **Strict Ingredient Matching**: Uses ONLY what's in your pantry
- **Professional Quality**: Recipes inspired by top culinary sources
- **Multilingual**: Recipes generated in your selected language

---

## ✨ Key Features

1. **Clone and Install Dependencies**

### 📸 Smart Scanning   ```bash

- **Photo & Video Modes** - Capture items quickly with photo or 10-second video recording   cd Pantryai

- **AI-Powered Detection** - Google Cloud Vision API recognizes food items and expiry dates   npm install

- **Multilingual OCR** - Detects text in multiple languages (English, Serbian, Croatian, Polish, Czech, French, Spanish, Italian, German)   ```

- **Web Upload Support** - Upload photos directly from web browser

- **Real-time Processing** - Instant feedback with progress indicators2. **Configure Firebase**

   ```bash

### 🗄️ Pantry Management   # Copy the example config

- **Smart Organization** - Items automatically sorted by expiration date   cp firebase.config.example.js firebase.config.js

- **Category Filtering** - 11 food categories (Dairy, Meat & Poultry, Fruits, Vegetables, Beverages, Packaged Food, Bakery, Condiments, Spices, Other)   

- **Visual Alerts** - Color-coded expiry warnings:   # Edit firebase.config.js with your Firebase credentials

  - 🟢 **Green**: Fresh items (7+ days)   # Get these from Firebase Console > Project Settings > Your apps

  - 🟠 **Orange**: Expiring soon (1-7 days)   ```

  - 🔴 **Red**: Expired items

- **Inline Editing** - Update quantity, category, and expiry date without leaving the list3. **Set Up Cloud Functions**

- **Manual Entry** - Add items manually with intuitive form   ```bash

- **Batch Actions** - Clear all items or delete individually   cd functions

   npm install

### 🍳 Recipe Generation   

- **Dish Category Selection** - Choose from 6 categories: Main Course, Appetizer, Dessert, Breakfast, Soup/Salad, or Snack
- **AI Recipe Suggestions** - Powered by Google Gemini AI, tailored to your selected dish type
- **Strict Ingredient Matching** - Uses ONLY ingredients from your pantry (no assumptions about missing items)
- **Optional Ingredients** - Any "nice-to-have" additions clearly marked as optional
- **Personalized Recipes** - Based on your actual pantry inventory   firebase login

- **Professional Quality** - Recipes sourced from culinary experts (Bon Appétit, Serious Eats, America's Test Kitchen)   

- **Detailed Instructions** - Step-by-step cooking guidance   # Initialize Firebase (select Functions and Firestore)

- **Chef's Tips** - Professional cooking techniques and suggestions   firebase init

- **Nutritional Info** - Cook time, servings, difficulty level   

- **Multilingual Recipes** - Recipes generated in your selected language   # Deploy the cloud function

   firebase deploy --only functions

### 🌍 Comprehensive Language Support   ```

- **18 Supported Languages**:

  - 🇬🇧 English • 🇪🇸 Spanish • 🇫🇷 French • 🇩🇪 German • 🇮🇹 Italian • 🇵🇹 Portuguese4. **Update Cloud Function URL**

  - 🇷🇺 Russian • 🇨🇳 Chinese • 🇯🇵 Japanese • 🇰🇷 Korean • 🇸🇦 Arabic • 🇮🇳 Hindi   - After deployment, copy your Cloud Function URL

  - 🇹🇷 Turkish • 🇵🇱 Polish • 🇳🇱 Dutch • 🇸🇮 Slovenian • 🇭🇷 Croatian • 🇷🇸 Serbian   - Open `components/CameraScanner.js`

   - Replace `YOUR_CLOUD_FUNCTION_URL_HERE` with your actual URL

- **Full UI Translation** - Complete interface in 5 languages (English, Spanish, French, German, Slovenian)

- **Recipe Translation** - AI-generated recipes in all 18 languages### Running the App

- **Persistent Preferences** - Language selection saved across sessions

```bash

---# Start the Expo development server

npm start

## 🛠️ Technology Stack

# Or run on specific platform

### Frontendnpm run android

- **React Native** 0.81.4npm run ios

- **Expo** 54.0.13npm run web

- **React Navigation** 6.1.18```

- **Firebase Firestore** 11.1.0

- **expo-camera** 17.0.8## 📱 Usage

- **AsyncStorage** 2.2.0

1. **Scan an Item**

### Backend   - Open the app and navigate to the "Scanner" tab

- **Firebase Cloud Functions** 6.0.1   - Point your camera at a food item with a visible expiry date

- **Google Cloud Vision API** 5.3.3   - Tap the capture button

- **Google Gemini AI** (Vertex AI 1.10.0)   - Wait for the AI to process the image

- **Cloud Firestore** (NoSQL Database)   - The item will be automatically saved to your pantry

- **Node.js** 22

2. **View Your Pantry**

---   - Navigate to the "Pantry" tab

   - Items are sorted by expiration date (earliest first)

## 🏗️ Architecture   - **Green border**: Item is fresh

   - **Orange border**: Item expires within 7 days

```   - **Red background**: Item is expired

┌─────────────────────────────────────────────────────────────┐

│                      Mobile App (Expo)                       │3. **Delete Items**

│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │   - Tap the trash icon next to any item

│  │  Camera  │  │  Pantry  │  │  Recipe  │  │ Language │   │   - Confirm deletion

│  │ Scanner  │  │   List   │  │Generator │  │ Selector │   │

│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │## 🔧 Configuration

│       │             │              │              │          │

│       └─────────────┴──────────────┴──────────────┘          │### Firebase Configuration

│                        │                                      │

│                  LanguageContext                             │Edit `firebase.config.js`:

│                  TranslationService                          │```javascript

└────────────────────────┬────────────────────────────────────┘const firebaseConfig = {

                         │  apiKey: "YOUR_API_KEY",

                         ▼  authDomain: "your-project.firebaseapp.com",

          ┌──────────────────────────────┐  projectId: "your-project-id",

          │   Firebase Cloud Functions   │  storageBucket: "your-project.appspot.com",

          │  ┌────────────────────────┐  │  messagingSenderId: "123456789",

          │  │   analyzeImage         │  │ ◄── Google Cloud Vision API  appId: "your-app-id"

          │  │   generateRecipes      │  │ ◄── Google Gemini AI};

          │  │   getRecipeDetails     │  │ ◄── Google Gemini AI```

          │  └────────────────────────┘  │

          └──────────────┬───────────────┘### Firestore Security Rules

                         │

                         ▼In Firebase Console, set up these security rules:

              ┌──────────────────┐```javascript

              │  Cloud Firestore │rules_version = '2';

              │  ┌────────────┐  │service cloud.firestore {

              │  │   pantry   │  │  match /databases/{database}/documents {

              │  │ collection │  │    match /pantry/{document=**} {

              │  └────────────┘  │      allow read, write: if true; // For development only

              └──────────────────┘      // TODO: Add proper authentication rules for production

```    }

  }

---}

```

## 🚀 Installation Guide

### Cloud Function Environment

### Prerequisites

The Cloud Function requires:

1. **Development Environment**- Google Cloud Vision API enabled

   ```bash- Firebase Admin SDK initialized

   # Install Node.js (v18 or higher)- CORS enabled for your app's domain

   # Download from https://nodejs.org/

   ## 🏗️ Development Phases

   # Install Expo CLI globally

   npm install -g expo-cli### ✅ Phase 1: Camera View (The "Eye")

   - Full-screen camera interface

   # Install Firebase CLI globally- Image capture functionality

   npm install -g firebase-tools- Permission handling

   ```

### ✅ Phase 2: Cloud Connection (The "Brain")

2. **Google Cloud Setup**- Base64 image conversion

   - Create project in [Google Cloud Console](https://console.cloud.google.com)- Cloud Function integration

   - Enable **Cloud Vision API**- Google Cloud Vision API calls

   - Enable **Vertex AI API** (for Gemini)- Text and object detection

   - Set up billing (required for Cloud Functions)

### ✅ Phase 3: Parsing & Storage (The "Memory")

3. **Firebase Setup**- Expiry date extraction with regex patterns

   - Create project in [Firebase Console](https://console.firebase.google.com)- Date format standardization

   - Enable **Firestore Database**- Firestore storage

   - Enable **Cloud Functions** (Blaze plan required)- Real-time data synchronization

   - Download Firebase configuration

### ✅ Phase 4: UI (The "Face")

### Installation Steps- Pantry item list display

- Expiry status visualization

#### 1. Clone and Install Dependencies- Item deletion

```bash- Responsive design

# Clone the repository

git clone <your-repo-url>## 🎨 Design Philosophy

cd Pantryai

- **UX First**: Clean, intuitive interface

# Install app dependencies- **Test After Each Phase**: Iterative development

npm install- **Clear Variable Names**: Maintainable code

- **React Hooks Best Practices**: Modern React patterns

# Install Cloud Functions dependencies- **Graceful Permission Handling**: User-friendly error states

cd functions- **Proper Error Handling**: Informative error messages

npm install

cd ..## 🔒 Security Notes

```

⚠️ **Important**: The current configuration is for development only!

#### 2. Configure Firebase

For production deployment:

```bash1. Add Firebase Authentication

# Copy the example config2. Update Firestore security rules

cp firebase.config.example.js firebase.config.js3. Restrict Cloud Function access

4. Use environment variables for API keys

# Edit firebase.config.js with your credentials5. Enable CORS only for your domain

```

## 📦 Dependencies

**firebase.config.js:**

```javascript### App Dependencies

import { initializeApp } from 'firebase/app';- `expo`: ~51.0.0

import { getFirestore } from 'firebase/firestore';- `expo-camera`: ~15.0.0

- `expo-file-system`: ~17.0.0

const firebaseConfig = {- `react-native`: 0.74.0

  apiKey: "YOUR_API_KEY",- `firebase`: ^10.7.1

  authDomain: "your-project.firebaseapp.com",- `@react-navigation/native`: ^6.1.9

  projectId: "your-project-id",

  storageBucket: "your-project.firebasestorage.app",### Cloud Function Dependencies

  messagingSenderId: "123456789",- `firebase-functions`: ^4.5.0

  appId: "your-app-id",- `firebase-admin`: ^11.11.0

  measurementId: "G-XXXXXXXXXX"- `@google-cloud/vision`: ^4.0.0

};

## 🐛 Troubleshooting

export const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);### Camera not working

```- Check camera permissions in device settings

- Ensure `expo-camera` is properly installed

#### 3. Deploy Cloud Functions- For iOS, check Info.plist camera usage description



```bash### Cloud Function errors

# Login to Firebase- Verify Vision API is enabled in Google Cloud Console

firebase login- Check Cloud Function logs: `firebase functions:log`

- Ensure billing is enabled on Google Cloud

# Deploy Cloud Functions

cd functions### Firestore connection issues

npm run deploy- Verify Firebase configuration in `firebase.config.js`

```- Check Firestore security rules

- Ensure internet connection is stable

#### 4. Start the App

## 📄 License

```bash

# Start Expo development serverThis project is open source and available under the MIT License.

npm start

## 🤝 Contributing

# Or run on specific platform

npm run android   # AndroidContributions are welcome! Please feel free to submit a Pull Request.

npm run ios       # iOS (Mac only)

npm run web       # Web browser## 📞 Support

```

For issues and questions:

---1. Check the troubleshooting section

2. Review Firebase and Expo documentation

## 📱 Usage Guide3. Open an issue on GitHub



### Scanning Food Items---



#### Photo Mode (Default)**Note**: This is a test project for learning purposes. The name "PantryAI" is a working title.

1. Open app and navigate to **Scanner** tab

2. Point camera at food item with visible expiry dateBuilt with ❤️ using React Native, Expo, and Google Cloud Vision API

3. Tap the **capture button**
4. Wait for AI processing (~2-5 seconds)
5. Review detected items
6. Tap **✓ Confirm** to save to pantry

#### Video Mode
1. Tap **Video Mode** toggle
2. Tap **red circle** to start recording (max 10 seconds)
3. Tap **STOP** to end recording
4. AI extracts best frame and processes
5. Review and confirm items

### Managing Your Pantry

#### View Items
- Navigate to **Pantry** tab
- Items sorted by expiration date
- Color coding: Green (fresh), Orange (expiring soon), Red (expired)

#### Filter by Category
- Tap category buttons at top
- Choose from 11 food categories

#### Edit Items
1. Tap **✏️ Edit** button
2. Update quantity, category, or expiry date
3. Tap **Save**

#### Manual Entry
1. Tap **➕ Add** button
2. Fill in: Food Name, Category, Quantity, Expiry Date
3. Tap **✨ Add to Pantry**

### Generating Recipes

1. Navigate to **Recipes** tab
2. **Select a dish category**:
   - 🍽️ Main Course
   - 🥗 Appetizer
   - 🍰 Dessert
   - 🍳 Breakfast
   - 🥣 Soup/Salad
   - 🍿 Snack
3. Tap **✨ Generate Recipe Ideas**
4. Browse personalized recipe suggestions for your selected category
5. Tap any recipe for full details with step-by-step instructions

### Changing Language

1. Tap **Language** button (Scanner screen header)
2. Select from 18 available languages
3. Entire app updates instantly

---

## 🌍 Language Support

### Fully Translated UI (5 Languages)

| Language | Code | Status |
|----------|------|--------|
| **English** | `en` | ✅ 126+ strings |
| **Spanish** | `es` | ✅ 126+ strings |
| **French** | `fr` | ✅ 126+ strings |
| **German** | `de` | ✅ 126+ strings |
| **Slovenian** | `sl` | ✅ 126+ strings |

### Recipe Generation (18 Languages)
All 18 languages supported for AI-generated recipes including English, Spanish, French, German, Slovenian, Italian, Portuguese, Dutch, Russian, Arabic, Hindi, Turkish, Polish, Chinese, Japanese, Korean, Croatian, Serbian.

---

## 📂 Project Structure

```
Shelfze/
├── 📱 App.js                          # Main app entry
├── ⚙️ firebase.config.js              # Firebase initialization
├── 📦 package.json                    # Dependencies
│
├── 🎨 components/
│   ├── CameraScanner.js               # Photo/video capture & AI
│   ├── PantryList.js                  # Inventory management
│   ├── RecipeGenerator.js             # AI recipe suggestions
│   ├── ManualEntry.js                 # Manual item addition
│   └── LanguageSelector.js            # Language selection
│
├── 🌐 contexts/
│   ├── LanguageContext.js             # Language state management
│   └── translations.js                # i18n strings (126+ keys)
│
├── ☁️ functions/
│   ├── index.js                       # Cloud Functions
│   │   ├── analyzeImage               # Vision API integration
│   │   ├── generateRecipes            # Gemini AI recipes
│   │   └── getRecipeDetails           # Detailed recipes
│   └── package.json                   # Function dependencies
│
└── 📄 Documentation/
    ├── README.md                      # This file
    ├── FULL-LANGUAGE-SUPPORT.md       # Language details
    ├── VIDEO-MODE-IMPLEMENTATION.md   # Video feature
    ├── RECIPE-ENHANCEMENTS.md         # Recipe details
    ├── RECIPE-MANUAL-ENTRY-FIX.md     # Critical bug fix
    ├── RECIPE-STRICT-INGREDIENTS.md   # Pantry-only recipes
    ├── DESIGN-SYSTEM-IMPROVEMENTS.md  # UI design system
    └── PROFESSIONAL-DESIGN-V2.md      # Design system v2.0
```

---

## ⚙️ Configuration

### Firestore Data Model

```javascript
{
  "pantry": {
    "{itemId}": {
      "name": "Sheep Milk",
      "itemName": "Sheep Milk",
      "category": "Dairy",
      "quantity": 1,
      "unit": "L",
      "expiryDate": "2025-10-20T00:00:00.000Z",
      "addedDate": "2025-10-13T12:30:00.000Z",
      "detectionSource": "Camera Scan" | "Manual Entry",
      "confidence": 0.95
    }
  }
}
```

### Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /pantry/{document=**} {
      allow read, write: if request.time < timestamp.date(2025, 12, 31);
      // TODO: Add authentication for production
    }
  }
}
```

---

## ☁️ Cloud Functions

### analyzeImage
- **Purpose**: Process images using Google Cloud Vision API
- **Input**: Base64 image + language
- **Output**: Detected food items with expiry dates

### generateRecipes
- **Purpose**: Generate recipe suggestions using Gemini AI
- **Input**: Ingredients array + language
- **Output**: 3-5 recipe suggestions

### getRecipeDetails
- **Purpose**: Get full recipe with instructions
- **Input**: Recipe name + language
- **Output**: Complete recipe with steps and tips

---

## 🔧 Development

### Running Locally

```bash
# Start Expo server
npm start

# Run on iOS/Android/Web
npm run ios
npm run android
npm run web

# Clear cache
npx expo start --clear
```

### Testing Cloud Functions

```bash
cd functions
npm run serve

# Test locally at http://localhost:5001
```

---

## 🐛 Troubleshooting

### Camera Not Working
- Check device permissions: Settings > Shelfze > Camera
- Restart app after granting permissions

### Cloud Function Errors
- Verify APIs are enabled in Google Cloud Console
- Check billing is enabled
- View logs: `firebase functions:log`

### Firestore Issues
- Verify `firebase.config.js` credentials
- Check security rules
- Ensure internet connection

### Language Not Changing
- Verify translation keys exist in `translations.js`
- Restart app to reload context
- Clear AsyncStorage if needed

---

## 🤝 Contributing

We welcome contributions!

### Ways to Contribute
1. 🐛 Report bugs
2. ✨ Request features
3. 🌍 Add translations
4. 📝 Improve documentation
5. 💻 Submit code

### Development Workflow

```bash
# Fork and clone
git clone https://github.com/YOUR-USERNAME/shelfze.git

# Create feature branch
git checkout -b feature/amazing-feature

# Make changes and commit
git commit -m "Add amazing feature"

# Push and create Pull Request
git push origin feature/amazing-feature
```

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
- **[Expo](https://expo.dev/)** - React Native framework
- **[Firebase](https://firebase.google.com/)** - Backend infrastructure
- **[Google Cloud Vision](https://cloud.google.com/vision)** - OCR detection
- **[Google Gemini AI](https://deepmind.google/technologies/gemini/)** - Recipe generation

### Inspiration
- Food waste reduction initiatives
- Smart home inventory management
- AI-powered cooking assistants

---

## 📊 Project Stats

- **Lines of Code**: ~5,000+
- **Components**: 5 major components
- **Cloud Functions**: 3 serverless functions
- **Translation Keys**: 126+ strings
- **Supported Languages**: 18 languages
- **Food Categories**: 11 categories
- **Platform Support**: iOS, Android, Web

---

## 🗺️ Roadmap

### ✅ Completed
- [x] Camera scanning (photo & video)
- [x] AI expiry date detection
- [x] Pantry management
- [x] Recipe generation
- [x] 18-language support
- [x] Manual entry
- [x] Category filtering

### 🔮 Planned
- [ ] User authentication
- [ ] Push notifications for expiring items
- [ ] Shopping list generation
- [ ] Barcode scanning
- [ ] Nutrition information
- [ ] Meal planning calendar
- [ ] Dark mode
- [ ] Offline mode

---

## 📞 Contact & Support

### Getting Help
- **Documentation**: See this README and related .md files
- **Issues**: Open issue on GitHub
- **Firebase Support**: https://firebase.google.com/support
- **Expo Forums**: https://forums.expo.dev/

---

<div align="center">

### Built with ❤️ using React Native, Expo, Firebase, and Google Cloud AI

**Never waste food again! 🥫♻️🌍**

[⬆ Back to Top](#-shelfze---smart-food-inventory-management)

---

*Last Updated: October 13, 2025*

</div>
