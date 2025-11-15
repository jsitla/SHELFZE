# Google & Apple Sign-In Setup Guide

## Current Status

✅ **UI Implementation Complete** - The login screen now shows Google and Apple Sign-In buttons
⏳ **Firebase Configuration Required** - Need to enable OAuth providers in Firebase Console
⏳ **Standalone App Build Required** - Social auth requires building a standalone app (not available in Expo Go)

## What Works Now

- ✅ Email/Password authentication (fully functional)
- ✅ Google Sign-In button (shows "Coming Soon" message)
- ✅ Apple Sign-In button (iOS only, shows "Coming Soon" message)
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

### 3. Update AuthScreen.js

Replace the `handleGoogleSignIn` function with actual Google OAuth implementation using Firebase:

```javascript
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import * as Google from 'expo-auth-session/providers/google';

const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
  clientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
  androidClientId: 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com',
});

const handleGoogleSignIn = async () => {
  try {
    setLoading(true);
    const result = await promptAsync();
    
    if (result.type === 'success') {
      const { id_token } = result.params;
      const credential = GoogleAuthProvider.credential(id_token);
      await signInWithCredential(auth, credential);
      if (onSuccess) onSuccess();
    }
  } catch (error) {
    Alert.alert(t('error', language), error.message);
  } finally {
    setLoading(false);
  }
};
```

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

### 3. Update AuthScreen.js

Replace the `handleAppleSignIn` function with actual Apple OAuth implementation:

```javascript
import { OAuthProvider, signInWithCredential } from 'firebase/auth';

const handleAppleSignIn = async () => {
  try {
    setLoading(true);
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    const { identityToken } = credential;
    const provider = new OAuthProvider('apple.com');
    const authCredential = provider.credential({
      idToken: identityToken,
    });

    await signInWithCredential(auth, authCredential);
    if (onSuccess) onSuccess();
  } catch (error) {
    if (error.code !== 'ERR_CANCELED') {
      Alert.alert(t('error', language), error.message);
    }
  } finally {
    setLoading(false);
  }
};
```

### 4. Update app.json

Ensure Apple Sign-In entitlement is configured:

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

## Testing

### In Expo Go (Current State)
- ❌ Google Sign-In - Shows "Coming Soon" message
- ❌ Apple Sign-In - Shows "Coming Soon" message  
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
