import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
// import * as Google from 'expo-auth-session/providers/google'; // Replaced with native lib
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signInWithCredential,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  getAdditionalUserInfo,
} from 'firebase/auth';
import * as AppleAuthentication from 'expo-apple-authentication';
import { auth } from '../firebase.config';
import { useLanguage } from '../contexts/LanguageContext';
import { t } from '../contexts/translations';

WebBrowser.maybeCompleteAuthSession();

const AuthScreen = ({ mode, onBack, onSuccess }) => {
  const { language } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(mode === 'signup');
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);
  const extraConfig = Constants?.expoConfig?.extra || {};
  const googleClients = {
    ios: extraConfig.googleIosClientId || '',
    android: extraConfig.googleAndroidClientId || '',
    web: extraConfig.googleWebClientId || '',
  };
  const hasGoogleConfig = Boolean(googleClients.ios || googleClients.android || googleClients.web);
  
  // Determine if running in Expo Go
  const isExpoGo = Constants.appOwnership === 'expo';

  // Configure Native Google Sign In
  useEffect(() => {
    if (hasGoogleConfig) {
      GoogleSignin.configure({
        webClientId: googleClients.web, // Required for Firebase
        iosClientId: googleClients.ios, // Optional, but good for iOS
      });
    }
  }, [hasGoogleConfig, googleClients.web, googleClients.ios]);

  const isAppleButtonDisabled = Platform.OS !== 'ios' || !appleAuthAvailable;
  
  // Web platform check - hide Apple Sign-In on web
  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    checkAppleAuthAvailability();
  }, []);

  const checkAppleAuthAvailability = async () => {
    // Apple auth is only available on iOS, not on web
    if (Platform.OS === 'web') {
      setAppleAuthAvailable(false);
      return;
    }
    const isAvailable = await AppleAuthentication.isAvailableAsync();
    setAppleAuthAvailable(isAvailable);
  };

  const handleGoogleSignIn = async () => {
    // Web: Use Firebase popup-based sign-in
    if (Platform.OS === 'web') {
      try {
        setLoading(true);
        const provider = new GoogleAuthProvider();
        provider.addScope('email');
        provider.addScope('profile');
        
        const userCredential = await signInWithPopup(auth, provider);
        const { isNewUser } = getAdditionalUserInfo(userCredential) || {};
        if (onSuccess) onSuccess(isNewUser ? 'signup' : 'login');
      } catch (error) {
        console.error('Google Sign-In Error (Web):', error);
        if (error.code !== 'auth/popup-closed-by-user') {
          Alert.alert(t('error', language), error.message || 'Unable to sign in with Google');
        }
      } finally {
        setLoading(false);
      }
      return;
    }
    
    // Native: Use Google Sign-In SDK
    if (!hasGoogleConfig) {
      Alert.alert(
        t('error', language),
        'Google Sign-In is not configured. Please add your client IDs to app.json > extra.'
      );
      return;
    }

    try {
      setLoading(true);
      
      // Check if your device supports Google Play
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      
      // Get the user's ID token
      const userInfo = await GoogleSignin.signIn();
      console.log('Native Google Sign-In Result:', JSON.stringify(userInfo));

      // Extract ID token (structure depends on library version, checking both common paths)
      const idToken = userInfo.data?.idToken || userInfo.idToken;

      if (idToken) {
        const credential = GoogleAuthProvider.credential(idToken);
        const userCredential = await signInWithCredential(auth, credential);
        const { isNewUser } = getAdditionalUserInfo(userCredential) || {};
        if (onSuccess) onSuccess(isNewUser ? 'signup' : 'login');
      } else {
        Alert.alert(t('error', language), 'Google Sign-In succeeded but no ID Token was returned.');
      }
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // user cancelled the login flow
      } else if (error.code === statusCodes.IN_PROGRESS) {
        // operation (e.g. sign in) is in progress already
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        // play services not available or outdated
        Alert.alert(t('error', language), 'Google Play Services not available.');
      } else {
        // some other error happened
        Alert.alert(t('error', language), error.message || 'Unable to sign in with Google');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert(
        t('notAvailable', language) || 'Not Available',
        'Apple Sign-In is only available on iOS devices.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!appleAuthAvailable) {
      Alert.alert(
        t('notAvailable', language) || 'Not Available',
        t('appleSignInMessage', language) || 'Apple Sign-In is only available on iOS devices with iOS 13+',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setLoading(true);
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error('No identity token returned from Apple.');
      }

      const provider = new OAuthProvider('apple.com');
      const authCredential = provider.credential({
        idToken: credential.identityToken,
      });

      const userCredential = await signInWithCredential(auth, authCredential);
      const { isNewUser } = getAdditionalUserInfo(userCredential) || {};
      if (onSuccess) onSuccess(isNewUser ? 'signup' : 'login');
    } catch (error) {
      if (error.code !== 'ERR_CANCELED') {
        Alert.alert(t('error', language), error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const getAuthErrorMessage = (error) => {
    switch (error.code) {
      case 'auth/invalid-email':
        return t('invalidEmail', language) || 'Invalid email address';
      case 'auth/user-disabled':
        return t('accountDisabled', language) || 'This account has been disabled';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return t('invalidCredentials', language) || 'Invalid email or password';
      case 'auth/email-already-in-use':
        return t('emailInUse', language) || 'Email is already in use';
      case 'auth/weak-password':
        return t('weakPassword', language) || 'Password is too weak. Use at least 6 characters';
      case 'auth/network-request-failed':
        return t('networkError', language) || 'Network error. Please check your connection';
      case 'auth/too-many-requests':
        return t('tooManyAttempts', language) || 'Too many attempts. Please try again later';
      default:
        return error.message;
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      Alert.alert(t('enterYourEmail', language), t('passwordResetEmail', language));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert(t('error', language), t('invalidEmail', language));
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      Alert.alert(
        t('checkYourEmail', language),
        `${t('passwordResetSent', language)} ${email.trim()}`
      );
    } catch (error) {
      Alert.alert(t('error', language), getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(t('error', language), t('fillAllFields', language));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert(t('error', language), t('invalidEmail', language));
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      if (onSuccess) onSuccess('login');
    } catch (error) {
      Alert.alert(t('loginFailed', language), getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert(t('error', language), t('fillAllFields', language));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert(t('error', language), t('invalidEmail', language));
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(t('error', language), t('passwordsDoNotMatch', language));
      return;
    }

    if (password.length < 6) {
      Alert.alert(t('error', language), t('passwordTooShort', language));
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      
      if (displayName && displayName.trim()) {
        const sanitizedName = displayName.trim().replace(/[<>{}]/g, '').slice(0, 50);
        await updateProfile(userCredential.user, {
          displayName: sanitizedName,
        });
      }

      if (onSuccess) onSuccess('signup');
    } catch (error) {
      Alert.alert(t('signupFailed', language), getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.topSection}>
            <TouchableOpacity style={styles.backPill} onPress={onBack}>
              <Text style={styles.backPillText}>← {t('back', language)}</Text>
            </TouchableOpacity>
            <Text style={styles.heroTitle}>
              {isSignup
                ? 'Create your account'
                : 'Welcome back'}
            </Text>
            <Text style={styles.heroSubtitle}>
              {isSignup
                ? 'Unlock cloud sync, bonuses, and saved history across devices.'
                : 'Sign in to pick up where you left off—your pantry stays in sync.'}
            </Text>
          </View>

          <View style={styles.formCard}>
            {/* Social Sign In Buttons */}
            <View style={styles.socialButtons}>
              <TouchableOpacity 
                style={[styles.socialButton, styles.googleButton]}
                onPress={handleGoogleSignIn}
                disabled={loading}
              >
                <Text style={[styles.socialButtonIcon, styles.googleText]}>G</Text>
                <Text style={[styles.socialButtonText, styles.googleText]}>
                  {t('continueWithGoogle', language) || 'Continue with Google'}
                </Text>
              </TouchableOpacity>

              {/* Facebook Login Hidden
              <TouchableOpacity 
                style={[styles.socialButton, styles.facebookButton]}
                onPress={handleFacebookSignIn}
                disabled={loading}
              >
                <Text style={[styles.socialButtonIcon, styles.facebookIcon]}>f</Text>
                <Text style={[styles.socialButtonText, styles.facebookText]}>
                  {t('continueWithFacebook', language) || 'Continue with Facebook'}
                </Text>
              </TouchableOpacity>
              */}

              {/* Apple Sign-In - Only show on iOS, not on web */}
              {!isWeb && (
                <TouchableOpacity 
                  style={[styles.socialButton, styles.appleButton, isAppleButtonDisabled && styles.socialButtonDisabled]}
                  onPress={handleAppleSignIn}
                  disabled={loading || isAppleButtonDisabled}
                >
                  <Text style={[styles.socialButtonIcon, styles.appleIcon]}></Text>
                  <Text style={[styles.socialButtonText, styles.appleText]}>
                    {t('continueWithApple', language) || 'Continue with Apple'}
                  </Text>
                </TouchableOpacity>
              )}

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>
                  {t('orContinueWithEmail', language) || 'or continue with email'}
                </Text>
                <View style={styles.dividerLine} />
              </View>
            </View>

            {isSignup && (
              <TextInput
                style={styles.input}
                placeholder={`${t('displayName', language)} (${t('optional', language)})`}
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
              />
            )}
            
            <TextInput
              style={styles.input}
              placeholder={t('email', language)}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            
            <TextInput
              style={styles.input}
              placeholder={t('password', language)}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
            
            {isSignup && (
              <TextInput
                style={styles.input}
                placeholder={t('confirmPassword', language)}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            )}

            {!isSignup && (
              <TouchableOpacity style={styles.forgotPasswordButton} onPress={handlePasswordReset}>
                <Text style={styles.forgotPasswordText}>
                  {t('forgotPassword', language) || 'Forgot Password?'}
                </Text>
              </TouchableOpacity>
            )}

            {isSignup && (
              <Text style={styles.hint}>
                {t('passwordRequirement', language) || 'Password must be at least 6 characters'}
              </Text>
            )}

            <TouchableOpacity 
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={isSignup ? handleSignup : handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {isSignup ? t('createAccount', language) : t('login', language)}
                </Text>
              )}
            </TouchableOpacity>

            {/* Toggle between login and signup */}
            <TouchableOpacity 
              style={styles.toggleButton}
              onPress={() => {
                setIsSignup(!isSignup);
                setEmail('');
                setPassword('');
                setConfirmPassword('');
                setDisplayName('');
              }}
            >
              <Text style={styles.toggleButtonText}>
                {isSignup 
                  ? `${t('alreadyHaveAccount', language)} ${t('login', language)}`
                  : `${t('noAccount', language)} ${t('createAccount', language)}`
                }
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const BenefitRow = ({ icon, text }) => (
  <View style={styles.benefitRow}>
    <Text style={styles.benefitIcon}>{icon}</Text>
    <Text style={styles.benefitText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F1DE', // Alabaster
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 32 : 48,
    paddingBottom: 48,
  },
  topSection: {
    marginBottom: 20,
  },
  backPill: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(74, 124, 89, 0.1)', // Sage Green tint
    borderWidth: 1,
    borderColor: '#4A7C59', // Sage Green
    marginBottom: 18,
  },
  backPillText: {
    color: '#4A7C59', // Sage Green
    fontSize: 14,
    fontWeight: '600',
  },
  heroBadge: {
    fontSize: 15,
    color: '#E07A5F', // Terracotta
    marginBottom: 8,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#3D405B', // Charcoal
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 22,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  socialButtons: {
    marginBottom: 16,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  socialButtonIcon: {
    fontSize: 18,
    fontWeight: '700',
    marginRight: 10,
    color: '#0F172A',
  },
  socialButtonText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '600',
  },
  googleButton: {
    backgroundColor: '#DB4437', // Standard Google Red
    borderColor: '#DB4437',
  },
  googleText: {
    color: '#FFFFFF',
  },
  appleButton: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  appleIcon: {
    color: '#FFFFFF',
    fontSize: 18,
  },
  appleText: {
    color: '#FFFFFF',
  },
  socialButtonDisabled: {
    opacity: 0.5,
  },
  facebookButton: {
    backgroundColor: '#1877F2',
    borderColor: '#1877F2',
  },
  facebookIcon: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  facebookText: {
    color: '#FFFFFF',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    color: '#3D405B', // Charcoal
  },
  hint: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
    marginLeft: 4,
  },
  submitButton: {
    backgroundColor: '#4A7C59', // Sage Green
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  toggleButton: {
    marginTop: 16,
    padding: 12,
    alignItems: 'center',
  },
  toggleButtonText: {
    color: '#3D405B', // Charcoal
    fontSize: 15,
    fontWeight: '600',
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    marginBottom: 8,
  },
  forgotPasswordText: {
    color: '#4A7C59', // Sage Green
    fontSize: 14,
    fontWeight: '600',
  },
  benefitsCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  benefitsTitle: {
    color: '#3D405B', // Charcoal
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  benefitIcon: {
    width: 28,
    fontSize: 18,
  },
  benefitText: {
    flex: 1,
    color: '#666',
    fontSize: 15,
  },
});

export default AuthScreen;
