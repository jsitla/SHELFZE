# Google & Apple Sign-In Setup Guide

## Current Status

✅ **UI Implementation Complete** - The login screen now shows Google and Apple Sign-In buttons
⏳ **Firebase Configuration Required** - Need to enable OAuth providers in Firebase Console
⏳ **Standalone App Build Required** - Social auth requires building a standalone app (not available in Expo Go)

## What Works Now

- ✅ Email/Password authentication (fully functional)
- ✅ Google Sign-In flow in code (requires real client IDs)
- ✅ Apple Sign-In flow in code (iOS only, requires proper Apple keys)
- ✅ Proper UI with social auth buttons on login screen
- ✅ Fallback to email/password authentication

## To Complete Google Sign-In

### 1. Firebase Console Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `pantryai-3d396`
3. Navigate to **Authentication** → **Sign-in method**
4. Enable **Google** provider
5. Add your app's Bundle ID (iOS) and Package Name (Android):
   - iOS: `com.shelfze.app`
   - Android: `com.shelfze.app`

### 2. Get OAuth Client IDs

**For iOS:**
1. In Firebase Console, download `GoogleService-Info.plist`
2. Place it in project root: `./GoogleService-Info.plist`
3. Note the `CLIENT_ID` from the plist file

**For Android:**
1. In Firebase Console, download `google-services.json`
2. Place it in project root: `./google-services.json`
3. Note the `client_id` from the JSON file

### 3. Add client IDs to `app.json`

`AuthScreen.js` reads Google client IDs from `app.json > expo.extra`. Populate them with the values gathered above:

```json
{
  "expo": {
    "extra": {
      "googleIosClientId": "YOUR_IOS_CLIENT_ID.apps.googleusercontent.com",
      "googleAndroidClientId": "YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com",
      "googleWebClientId": "YOUR_WEB_CLIENT_ID.apps.googleusercontent.com"
    }
  }
}
```

If these keys are missing, the new Google Sign-In button will warn that configuration is incomplete.

### 4. Build Standalone App

Social authentication requires a standalone app build (not Expo Go):

```bash
# For iOS
eas build --platform ios

# For Android
eas build --platform android
```

## To Complete Apple Sign-In

### 1. Firebase Console Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `pantryai-3d396`
3. Navigate to **Authentication** → **Sign-in method**
4. Enable **Apple** provider
5. Register your Bundle ID: `com.shelfze.app`

### 2. Apple Developer Account Setup

1. Go to [Apple Developer Portal](https://developer.apple.com/account)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Create/Configure App ID:
   - Bundle ID: `com.shelfze.app`
   - Enable **Sign In with Apple** capability
4. Create a Service ID for Firebase
5. Add Firebase callback URL to Service ID:
   - `https://pantryai-3d396.firebaseapp.com/__/auth/handler`

`AuthScreen.js` already exchanges the Apple identity token for a Firebase credential. Once Firebase and Apple developer settings are complete, no additional code updates are required.

### 4. Update app.json

Ensure Apple Sign-In entitlement is configured and keep Google client IDs inside `extra`:

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.shelfze.app",
      "usesAppleSignIn": true,
      "infoPlist": {
        "NSCameraUsageDescription": "Shelfze needs access to your camera to scan food items and expiry dates."
      }
    }
  }
}
```

```json
{
  "expo": {
    "extra": {
      "googleIosClientId": "...",
      "googleAndroidClientId": "...",
      "googleWebClientId": "..."
    }
  }
}
```

## Testing

### In Expo Go (Current State)
- ⚠️ Google Sign-In - Requires real client IDs and only works on supported devices
- ⚠️ Apple Sign-In - Only works on iOS devices with proper Apple config  
- ✅ Email/Password - Fully functional

### In Standalone App (After Setup)
- ✅ Google Sign-In - Will work after Firebase configuration
- ✅ Apple Sign-In - Will work after Firebase + Apple Developer configuration
- ✅ Email/Password - Fully functional

## Security Notes

1. **Never commit OAuth credentials** - Add `GoogleService-Info.plist` and `google-services.json` to `.gitignore`
2. **Use environment variables** for sensitive OAuth client IDs in production
3. **Enable Firebase App Check** for additional security
4. **Implement rate limiting** on auth endpoints

## Additional Resources

- [Expo Google Authentication](https://docs.expo.dev/guides/google-authentication/)
- [Expo Apple Authentication](https://docs.expo.dev/versions/latest/sdk/apple-authentication/)
- [Firebase OAuth Providers](https://firebase.google.com/docs/auth/web/google-signin)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)

## Current Implementation

The app now displays social sign-in buttons with proper UI, but shows informative messages that these features require:
1. Firebase OAuth configuration
2. Standalone app build (not Expo Go)

This provides a better user experience by showing what's coming while keeping the app functional with email/password authentication.
