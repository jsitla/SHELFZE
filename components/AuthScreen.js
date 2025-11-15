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
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import * as AppleAuthentication from 'expo-apple-authentication';
import { auth } from '../firebase.config';
import { useLanguage } from '../contexts/LanguageContext';
import { t } from '../contexts/translations';

const AuthScreen = ({ mode, onBack, onSuccess }) => {
  const { language } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(mode === 'signup');
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);

  useEffect(() => {
    checkAppleAuthAvailability();
  }, []);

  const checkAppleAuthAvailability = async () => {
    const isAvailable = await AppleAuthentication.isAvailableAsync();
    setAppleAuthAvailable(isAvailable);
  };

  const handleGoogleSignIn = () => {
    Alert.alert(
      t('comingSoon', language) || 'Coming Soon',
      t('googleSignInMessage', language) || 'Google Sign-In will be available in the standalone app version. For now, please use email/password authentication.',
      [{ text: 'OK' }]
    );
  };

  const handleAppleSignIn = async () => {
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

      // In a production app, you would send this credential to Firebase
      // For now, show coming soon message
      Alert.alert(
        t('comingSoon', language) || 'Coming Soon',
        t('appleSignInCompleteMessage', language) || 'Apple Sign-In integration will be completed in the standalone app version.',
        [{ text: 'OK' }]
      );
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
      if (onSuccess) onSuccess();
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

      if (onSuccess) onSuccess();
    } catch (error) {
      Alert.alert(t('signupFailed', language), getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <Text style={styles.backButtonText}>← {t('back', language)}</Text>
            </TouchableOpacity>
            <Text style={styles.logo}>🥫</Text>
            <Text style={styles.appName}>Shelfze</Text>
            <Text style={styles.title}>
              {isSignup ? t('createAccount', language) : t('login', language)}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Social Sign In Buttons */}
            {!isSignup && (
              <View style={styles.socialButtons}>
                <TouchableOpacity 
                  style={styles.googleButton}
                  onPress={handleGoogleSignIn}
                  disabled={loading}
                >
                  <Text style={styles.googleButtonIcon}>G</Text>
                  <Text style={styles.googleButtonText}>
                    {t('continueWithGoogle', language) || 'Continue with Google'}
                  </Text>
                </TouchableOpacity>

                {Platform.OS === 'ios' && appleAuthAvailable && (
                  <TouchableOpacity 
                    style={styles.appleButton}
                    onPress={handleAppleSignIn}
                    disabled={loading}
                  >
                    <Text style={styles.appleButtonIcon}></Text>
                    <Text style={styles.appleButtonText}>
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
            )}

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

          {/* Info */}
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>
              ✨ {t('freeAccountBenefits', language) || 'Free Account Benefits'}
            </Text>
            <Text style={styles.infoItem}>📸 30 {t('scans', language)} / {t('month', language)}</Text>
            <Text style={styles.infoItem}>🍳 30 {t('recipes', language)} / {t('month', language)}</Text>
            <Text style={styles.infoItem}>🎁 {t('monthlyBonus', language)}</Text>
            <Text style={styles.infoItem}>☁️ {t('syncAcrossDevices', language)}</Text>
            <Text style={styles.infoItem}>🔒 {t('secureBackup', language)}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 20 : 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: '#0984e3',
    fontWeight: '600',
  },
  logo: {
    fontSize: 64,
    marginBottom: 8,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2d3436',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2d3436',
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  socialButtons: {
    marginBottom: 20,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#dfe6e9',
  },
  googleButtonIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 12,
    color: '#4285F4',
  },
  googleButtonText: {
    color: '#2d3436',
    fontSize: 15,
    fontWeight: '600',
  },
  appleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  appleButtonIcon: {
    fontSize: 20,
    marginRight: 8,
    color: '#fff',
  },
  appleButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#dfe6e9',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 13,
    color: '#636e72',
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#dfe6e9',
  },
  hint: {
    fontSize: 13,
    color: '#636e72',
    marginBottom: 12,
    marginLeft: 4,
  },
  submitButton: {
    backgroundColor: '#00b894',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
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
    color: '#0984e3',
    fontSize: 15,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#00b894',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d3436',
    marginBottom: 12,
  },
  infoItem: {
    fontSize: 15,
    color: '#2d3436',
    marginBottom: 8,
    lineHeight: 22,
  },
});

export default AuthScreen;
