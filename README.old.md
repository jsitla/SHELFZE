# PantryAI

A React Native Expo application that uses Google Cloud Vision API to scan food items, detect expiry dates, and store them in Firestore for tracking. Never let food go to waste again!

## 🎯 Features

- **📷 Camera Scanning**: Full-screen camera view to capture food items
- **🤖 AI-Powered Detection**: Uses Google Cloud Vision API for OCR and object detection
- **📅 Expiry Date Recognition**: Automatically extracts expiry dates from product labels
- **☁️ Cloud Storage**: Stores items in Firebase Firestore
- **📊 Smart Pantry List**: Displays items sorted by expiration date
- **⚠️ Expiry Alerts**: Visual warnings for items expiring soon or already expired
- **🗑️ Easy Management**: Simple interface to delete consumed items

## 🏗️ Project Structure

```
PantryAI/
├── components/
│   ├── CameraScanner.js    # Phase 1 & 2: Camera view and image processing
│   └── PantryList.js        # Phase 4: Display pantry items
├── functions/
│   ├── index.js             # Phase 2 & 3: Cloud Function for Vision API
│   └── package.json         # Cloud Functions dependencies
├── App.js                   # Main app with navigation
├── firebase.config.js       # Firebase configuration (create from example)
├── package.json             # App dependencies
└── app.json                 # Expo configuration
```

## 🚀 Getting Started

### Prerequisites

1. **Development Environment**
   - Node.js (v18 or higher)
   - Expo CLI: `npm install -g expo-cli`
   - Firebase CLI: `npm install -g firebase-tools`

2. **Google Cloud Project**
   - Create a project in [Google Cloud Console](https://console.cloud.google.com)
   - Enable the **Cloud Vision API**
   - Set up billing (required for Cloud Functions)

3. **Firebase Project**
   - Create a project in [Firebase Console](https://console.firebase.google.com)
   - Enable **Firestore Database**
   - Enable **Cloud Functions**
   - Download your Firebase configuration

### Installation

1. **Clone and Install Dependencies**
   ```bash
   cd Pantryai
   npm install
   ```

2. **Configure Firebase**
   ```bash
   # Copy the example config
   cp firebase.config.example.js firebase.config.js
   
   # Edit firebase.config.js with your Firebase credentials
   # Get these from Firebase Console > Project Settings > Your apps
   ```

3. **Set Up Cloud Functions**
   ```bash
   cd functions
   npm install
   
   # Login to Firebase
   firebase login
   
   # Initialize Firebase (select Functions and Firestore)
   firebase init
   
   # Deploy the cloud function
   firebase deploy --only functions
   ```

4. **Update Cloud Function URL**
   - After deployment, copy your Cloud Function URL
   - Open `components/CameraScanner.js`
   - Replace `YOUR_CLOUD_FUNCTION_URL_HERE` with your actual URL

### Running the App

```bash
# Start the Expo development server
npm start

# Or run on specific platform
npm run android
npm run ios
npm run web
```

## 📱 Usage

1. **Scan an Item**
   - Open the app and navigate to the "Scanner" tab
   - Point your camera at a food item with a visible expiry date
   - Tap the capture button
   - Wait for the AI to process the image
   - The item will be automatically saved to your pantry

2. **View Your Pantry**
   - Navigate to the "Pantry" tab
   - Items are sorted by expiration date (earliest first)
   - **Green border**: Item is fresh
   - **Orange border**: Item expires within 7 days
   - **Red background**: Item is expired

3. **Delete Items**
   - Tap the trash icon next to any item
   - Confirm deletion

## 🔧 Configuration

### Firebase Configuration

Edit `firebase.config.js`:
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

### Firestore Security Rules

In Firebase Console, set up these security rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /pantry/{document=**} {
      allow read, write: if true; // For development only
      // TODO: Add proper authentication rules for production
    }
  }
}
```

### Cloud Function Environment

The Cloud Function requires:
- Google Cloud Vision API enabled
- Firebase Admin SDK initialized
- CORS enabled for your app's domain

## 🏗️ Development Phases

### ✅ Phase 1: Camera View (The "Eye")
- Full-screen camera interface
- Image capture functionality
- Permission handling

### ✅ Phase 2: Cloud Connection (The "Brain")
- Base64 image conversion
- Cloud Function integration
- Google Cloud Vision API calls
- Text and object detection

### ✅ Phase 3: Parsing & Storage (The "Memory")
- Expiry date extraction with regex patterns
- Date format standardization
- Firestore storage
- Real-time data synchronization

### ✅ Phase 4: UI (The "Face")
- Pantry item list display
- Expiry status visualization
- Item deletion
- Responsive design

## 🎨 Design Philosophy

- **UX First**: Clean, intuitive interface
- **Test After Each Phase**: Iterative development
- **Clear Variable Names**: Maintainable code
- **React Hooks Best Practices**: Modern React patterns
- **Graceful Permission Handling**: User-friendly error states
- **Proper Error Handling**: Informative error messages

## 🔒 Security Notes

⚠️ **Important**: The current configuration is for development only!

For production deployment:
1. Add Firebase Authentication
2. Update Firestore security rules
3. Restrict Cloud Function access
4. Use environment variables for API keys
5. Enable CORS only for your domain

## 📦 Dependencies

### App Dependencies
- `expo`: ~51.0.0
- `expo-camera`: ~15.0.0
- `expo-file-system`: ~17.0.0
- `react-native`: 0.74.0
- `firebase`: ^10.7.1
- `@react-navigation/native`: ^6.1.9

### Cloud Function Dependencies
- `firebase-functions`: ^4.5.0
- `firebase-admin`: ^11.11.0
- `@google-cloud/vision`: ^4.0.0

## 🐛 Troubleshooting

### Camera not working
- Check camera permissions in device settings
- Ensure `expo-camera` is properly installed
- For iOS, check Info.plist camera usage description

### Cloud Function errors
- Verify Vision API is enabled in Google Cloud Console
- Check Cloud Function logs: `firebase functions:log`
- Ensure billing is enabled on Google Cloud

### Firestore connection issues
- Verify Firebase configuration in `firebase.config.js`
- Check Firestore security rules
- Ensure internet connection is stable

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review Firebase and Expo documentation
3. Open an issue on GitHub

---

**Note**: This is a test project for learning purposes. The name "PantryAI" is a working title.

Built with ❤️ using React Native, Expo, and Google Cloud Vision API
