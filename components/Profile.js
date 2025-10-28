import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { 
  signOut, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  linkWithCredential,
  EmailAuthProvider,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../firebase.config';
import { useLanguage } from '../contexts/LanguageContext';
import { t } from '../contexts/translations';
import LanguageSelector from './LanguageSelector';
import { getUserUsage, redeemGiftCode, checkAndApplyMonthlyBonus } from '../utils/usageTracking';

export default function Profile({ navigation }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [showAnonymousLogin, setShowAnonymousLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [giftCode, setGiftCode] = useState('');
  const [showGiftCode, setShowGiftCode] = useState(false);
  const [usageData, setUsageData] = useState(null);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const { language, getLanguageBadge } = useLanguage();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setLoading(false);
      
      // Load usage data when user changes
      if (currentUser) {
        loadUsageData(currentUser.uid);
        checkMonthlyBonus(currentUser.uid);
      }
    });
    return unsubscribe;
  }, []);

  // Reload usage data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        loadUsageData(user.uid);
      }
    }, [user])
  );

  const loadUsageData = async (userId) => {
    setLoadingUsage(true);
    try {
      const usage = await getUserUsage(userId);
      setUsageData(usage);
    } catch (error) {
      console.error('Error loading usage data:', error);
    } finally {
      setLoadingUsage(false);
    }
  };

  const checkMonthlyBonus = async (userId) => {
    try {
      const result = await checkAndApplyMonthlyBonus(userId);
      if (result.bonusApplied) {
        Alert.alert(
          '🎁 ' + t('monthlyBonusAdded', language),
          `+${result.bonusAmount} ${t('scansRemaining', language).toLowerCase()} & ${t('recipesRemaining', language).toLowerCase()}!`
        );
        // Reload usage data
        loadUsageData(userId);
      }
    } catch (error) {
      console.error('Error checking monthly bonus:', error);
    }
  };

  const handleRedeemGiftCode = async () => {
    if (!giftCode.trim()) {
      Alert.alert(t('error', language), t('enterGiftCode', language));
      return;
    }

    setLoading(true);
    try {
      const result = await redeemGiftCode(user.uid, giftCode.trim().toUpperCase());
      
      if (result.success) {
        Alert.alert(
          '🎁 ' + t('giftCodeSuccess', language),
          result.message
        );
        setGiftCode('');
        setShowGiftCode(false);
        // Reload usage data
        loadUsageData(user.uid);
      } else {
        let errorMessage = t('giftCodeInvalid', language);
        if (result.message.includes('used')) {
          errorMessage = t('giftCodeUsed', language);
        } else if (result.message.includes('expired')) {
          errorMessage = t('giftCodeExpired', language);
        }
        Alert.alert(t('error', language), errorMessage);
      }
    } catch (error) {
      console.error('Error redeeming gift code:', error);
      Alert.alert(t('error', language), t('giftCodeInvalid', language));
    } finally {
      setLoading(false);
    }
  };

  const getAuthErrorMessage = (error) => {
    const errorCode = error.code;
    
    switch (errorCode) {
      case 'auth/invalid-email':
        return t('invalidEmail', language) || 'Invalid email address format';
      case 'auth/user-disabled':
        return t('userDisabled', language) || 'This account has been disabled';
      case 'auth/user-not-found':
        return t('userNotFound', language) || 'No account found with this email address';
      case 'auth/wrong-password':
        return t('wrongPassword', language) || 'Incorrect password. Please try again';
      case 'auth/invalid-credential':
        return t('invalidCredentials', language) || 'Invalid email or password. Please check and try again';
      case 'auth/too-many-requests':
        return t('tooManyAttempts', language) || 'Too many failed login attempts. Please try again later';
      case 'auth/network-request-failed':
        return t('networkError', language) || 'Network error. Please check your internet connection';
      case 'auth/email-already-in-use':
        return t('emailInUse', language) || 'This email is already registered';
      case 'auth/weak-password':
        return t('weakPassword', language) || 'Password is too weak. Use at least 6 characters';
      default:
        return error.message;
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      t('signOut', language),
      t('signOutConfirm', language),
      [
        { text: t('cancel', language), style: 'cancel' },
        {
          text: t('signOut', language),
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
              // Don't show success alert - let App.js handle re-auth
              // Navigate to Pantry tab after sign out
              if (navigation) {
                navigation.navigate('Pantry');
              }
            } catch (error) {
              Alert.alert(t('error', language), error.message);
            }
          },
        },
      ]
    );
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(t('error', language), t('fillAllFields', language));
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setShowLogin(false);
      setEmail('');
      setPassword('');
      Alert.alert(t('success', language), t('loginSuccess', language));
    } catch (error) {
      Alert.alert(t('loginFailed', language) || 'Login Failed', getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert(t('error', language), t('fillAllFields', language));
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
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update display name if provided
      if (displayName) {
        await updateProfile(userCredential.user, {
          displayName: displayName,
        });
      }

      setShowSignup(false);
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setDisplayName('');
      Alert.alert(t('success', language), t('accountCreated', language));
    } catch (error) {
      Alert.alert(t('signupFailed', language) || 'Signup Failed', getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeAccount = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert(t('error', language), t('fillAllFields', language));
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
      const credential = EmailAuthProvider.credential(email, password);
      await linkWithCredential(user, credential);

      // Update display name if provided
      if (displayName) {
        await updateProfile(user, {
          displayName: displayName,
        });
      }

      // Upgrade tier from anonymous to free (30 scans + 30 recipes)
      const { upgradeTier } = await import('../utils/usageTracking');
      await upgradeTier(user.uid, 'free');

      // Reload usage data to show new limits
      await loadUsageData(user.uid);

      setShowSignup(false);
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setDisplayName('');
      Alert.alert(
        t('success', language),
        t('accountUpgraded', language) + '\n\n' + t('youNowHave', language) + ' 30 ' + t('scans', language) + ' + 30 ' + t('recipes', language) + '!'
      );
    } catch (error) {
      Alert.alert(t('upgradeFailed', language) || 'Upgrade Failed', getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleAnonymousLogin = async () => {
    if (!email || !password) {
      Alert.alert(t('error', language), t('fillAllFields', language));
      return;
    }

    setLoading(true);
    try {
      // Sign out of anonymous account
      await signOut(auth);
      
      // Sign in with existing account
      await signInWithEmailAndPassword(auth, email, password);
      
      setShowAnonymousLogin(false);
      setEmail('');
      setPassword('');
      Alert.alert(
        t('success', language),
        t('switchedToExistingAccount', language) || 'Switched to existing account successfully!'
      );
    } catch (error) {
      Alert.alert(t('loginFailed', language) || 'Login Failed', getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const isAnonymous = user?.isAnonymous;

  if (loading && !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E53E3E" />
        <Text style={styles.loadingText}>{t('loading', language)}</Text>
      </View>
    );
  }

  // Not logged in - show login/signup options
  if (!user) {
    return (
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.headerIcon}>👤</Text>
            <Text style={styles.title}>{t('account', language)}</Text>
            <Text style={styles.subtitle}>{t('loginOrSignup', language)}</Text>
          </View>

          {showLogin ? (
            <View style={styles.formContainer}>
              <Text style={styles.formTitle}>{t('login', language)}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('email', language)}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder={t('password', language)}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              <TouchableOpacity style={styles.primaryButton} onPress={handleLogin}>
                <Text style={styles.primaryButtonText}>{t('login', language)}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.secondaryButton} 
                onPress={() => {
                  setShowLogin(false);
                  setEmail('');
                  setPassword('');
                }}
              >
                <Text style={styles.secondaryButtonText}>{t('cancel', language)}</Text>
              </TouchableOpacity>
            </View>
          ) : showSignup ? (
            <View style={styles.formContainer}>
              <Text style={styles.formTitle}>{t('createAccount', language)}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('displayName', language) + ' (' + t('optional', language) + ')'}
                value={displayName}
                onChangeText={setDisplayName}
              />
              <TextInput
                style={styles.input}
                placeholder={t('email', language)}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder={t('password', language)}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              <TextInput
                style={styles.input}
                placeholder={t('confirmPassword', language)}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
              <TouchableOpacity style={styles.primaryButton} onPress={handleSignup}>
                <Text style={styles.primaryButtonText}>{t('createAccount', language)}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.secondaryButton} 
                onPress={() => {
                  setShowSignup(false);
                  setEmail('');
                  setPassword('');
                  setConfirmPassword('');
                  setDisplayName('');
                }}
              >
                <Text style={styles.secondaryButtonText}>{t('cancel', language)}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.buttonsContainer}>
              <TouchableOpacity 
                style={styles.largeButton} 
                onPress={() => setShowLogin(true)}
              >
                <Text style={styles.largeButtonIcon}>🔑</Text>
                <Text style={styles.largeButtonText}>{t('login', language)}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.largeButton} 
                onPress={() => setShowSignup(true)}
              >
                <Text style={styles.largeButtonIcon}>✨</Text>
                <Text style={styles.largeButtonText}>{t('createAccount', language)}</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Logged in - show profile
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.headerIcon}>👤</Text>
        <Text style={styles.title}>{t('myAccount', language)}</Text>
      </View>

      <View style={styles.profileCard}>
        {isAnonymous ? (
          <>
            <Text style={styles.accountType}>🔒 {t('guestAccount', language)}</Text>
            <Text style={styles.accountWarning}>{t('guestAccountWarning', language)}</Text>
          </>
        ) : (
          <>
            {user.displayName && (
              <Text style={styles.displayName}>{user.displayName}</Text>
            )}
            <Text style={styles.email}>{user.email}</Text>
            <Text style={styles.accountType}>✅ {t('permanentAccount', language)}</Text>
          </>
        )}
        
        <Text style={styles.userId}>
          {t('userId', language)}: {user.uid.substring(0, 8)}...
        </Text>
      </View>

      {/* Usage & Tier Info */}
      <View style={styles.tierCard}>
        <View style={styles.tierHeader}>
          <Text style={styles.tierTitle}>{t('tier', language)}</Text>
          {loadingUsage ? (
            <ActivityIndicator size="small" color="#E53E3E" />
          ) : (
            <View style={[
              styles.tierBadge,
              usageData?.tier === 'premium' && styles.tierBadgePremium,
              usageData?.tier === 'free' && styles.tierBadgeFree,
            ]}>
              <Text style={styles.tierBadgeText}>
                {usageData?.tier === 'premium' ? '👑 ' + t('premium', language) :
                 usageData?.tier === 'free' ? '✨ ' + t('free', language) :
                 '🚀 ' + t('anonymous', language)}
              </Text>
            </View>
          )}
        </View>

        {usageData && (
          <View style={styles.usageStats}>
            <View style={styles.usageStat}>
              <Text style={styles.usageIcon}>📸</Text>
              <View style={styles.usageInfo}>
                <Text style={styles.usageLabel}>{t('scansRemaining', language)}</Text>
                <Text style={styles.usageValue}>
                  {usageData.tier === 'premium' ? 
                    `${usageData.scansRemaining}/1000` : 
                    usageData.scansRemaining}
                </Text>
              </View>
            </View>
            
            <View style={styles.usageStat}>
              <Text style={styles.usageIcon}>🍳</Text>
              <View style={styles.usageInfo}>
                <Text style={styles.usageLabel}>{t('recipesRemaining', language)}</Text>
                <Text style={styles.usageValue}>
                  {usageData.tier === 'premium' ? 
                    `${usageData.recipesRemaining}/1000` : 
                    usageData.recipesRemaining}
                </Text>
              </View>
            </View>
          </View>
        )}

        {usageData?.tier !== 'premium' && (
          <TouchableOpacity 
            style={styles.upgradePremiumButton}
            onPress={() => {
              Alert.alert(
                '👑 ' + t('premium', language),
                t('upgradeToPremiumMessage', language) + '\n\n' +
                '• 1000 ' + t('scansRemaining', language).toLowerCase() + '/month\n' +
                '• 1000 ' + t('recipesRemaining', language).toLowerCase() + '/month\n' +
                '• Early bird: €2/month or €20/year'
              );
            }}
          >
            <Text style={styles.upgradePremiumText}>⬆️ {t('upgradeToPremium', language)}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Gift Code Section */}
      <View style={styles.giftCodeSection}>
        {showGiftCode ? (
          <View>
            <Text style={styles.sectionTitle}>{t('redeemGiftCode', language)}</Text>
            <View style={styles.giftCodeInputContainer}>
              <TextInput
                style={styles.giftCodeInput}
                placeholder={t('enterGiftCode', language).toUpperCase()}
                value={giftCode}
                onChangeText={(text) => setGiftCode(text.toUpperCase())}
                autoCapitalize="characters"
                maxLength={20}
              />
              <TouchableOpacity 
                style={styles.redeemButton}
                onPress={handleRedeemGiftCode}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.redeemButtonText}>{t('redeem', language)}</Text>
                )}
              </TouchableOpacity>
            </View>
            <TouchableOpacity 
              style={styles.cancelGiftCodeButton}
              onPress={() => {
                setShowGiftCode(false);
                setGiftCode('');
              }}
            >
              <Text style={styles.cancelGiftCodeText}>{t('cancel', language)}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.showGiftCodeButton}
            onPress={() => setShowGiftCode(true)}
          >
            <Text style={styles.showGiftCodeText}>🎁 {t('haveGiftCode', language)}</Text>
          </TouchableOpacity>
        )}
      </View>

      {isAnonymous && (
        <View style={styles.upgradeSection}>
          <Text style={styles.sectionTitle}>{t('upgradeAccount', language)}</Text>
          <Text style={styles.sectionSubtitle}>{t('upgradeAccountDesc', language)}</Text>
          
          {showSignup ? (
            <View style={styles.formContainer}>
              <TextInput
                style={styles.input}
                placeholder={t('displayName', language) + ' (' + t('optional', language) + ')'}
                value={displayName}
                onChangeText={setDisplayName}
              />
              <TextInput
                style={styles.input}
                placeholder={t('email', language)}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder={t('password', language)}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              <TextInput
                style={styles.input}
                placeholder={t('confirmPassword', language)}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
              <TouchableOpacity style={styles.primaryButton} onPress={handleUpgradeAccount}>
                <Text style={styles.primaryButtonText}>{t('upgradeAccount', language)}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.secondaryButton} 
                onPress={() => {
                  setShowSignup(false);
                  setEmail('');
                  setPassword('');
                  setConfirmPassword('');
                  setDisplayName('');
                }}
              >
                <Text style={styles.secondaryButtonText}>{t('cancel', language)}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.upgradeButton} 
              onPress={() => setShowSignup(true)}
            >
              <Text style={styles.upgradeButtonText}>⬆️ {t('upgradeNow', language)}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {isAnonymous && (
        <View style={styles.upgradeSection}>
          <Text style={styles.sectionTitle}>{t('existingAccount', language) || 'Already Have an Account?'}</Text>
          <Text style={styles.sectionSubtitle}>{t('existingAccountDesc', language) || 'Sign in with your existing account. Note: Your guest data will not be transferred.'}</Text>
          
          {showAnonymousLogin ? (
            <View style={styles.formContainer}>
              <TextInput
                style={styles.input}
                placeholder={t('email', language)}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder={t('password', language)}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              <TouchableOpacity style={styles.primaryButton} onPress={handleAnonymousLogin}>
                <Text style={styles.primaryButtonText}>🔑 {t('login', language)}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.secondaryButton} 
                onPress={() => {
                  setShowAnonymousLogin(false);
                  setEmail('');
                  setPassword('');
                }}
              >
                <Text style={styles.secondaryButtonText}>{t('cancel', language)}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.loginExistingButton} 
              onPress={() => setShowAnonymousLogin(true)}
            >
              <Text style={styles.loginExistingButtonText}>🔑 {t('loginExisting', language) || 'Login with Existing Account'}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Language Selection */}
      <View style={styles.languageSection}>
        <Text style={styles.sectionTitle}>{t('language', language)}</Text>
        <TouchableOpacity 
          style={styles.languageButton}
          onPress={() => setLanguageModalVisible(true)}
        >
          <Text style={styles.languageButtonText}>🌐 {getLanguageBadge()}</Text>
          <Text style={styles.languageButtonSubtext}>{t('languageModalTitle', language)}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutButtonText}>🚪 {t('signOut', language)}</Text>
      </TouchableOpacity>

      <LanguageSelector 
        visible={languageModalVisible} 
        onClose={() => setLanguageModalVisible(false)} 
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  headerIcon: {
    fontSize: 60,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  accountType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E53E3E',
    marginBottom: 10,
  },
  accountWarning: {
    fontSize: 14,
    color: '#FF6B00',
    marginBottom: 10,
  },
  userId: {
    fontSize: 12,
    color: '#999',
  },
  upgradeSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#E53E3E',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  upgradeButton: {
    backgroundColor: '#E53E3E',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginExistingButton: {
    backgroundColor: '#3B82F6',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  loginExistingButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonsContainer: {
    gap: 15,
  },
  largeButton: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  largeButtonIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  largeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
  },
  primaryButton: {
    backgroundColor: '#E53E3E',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  signOutButton: {
    backgroundColor: '#666',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  signOutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tierCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  tierTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  tierBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tierBadgeFree: {
    backgroundColor: '#E3F2FD',
  },
  tierBadgePremium: {
    backgroundColor: '#FFF3E0',
    borderWidth: 2,
    borderColor: '#FFB74D',
  },
  tierBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  usageStats: {
    marginBottom: 15,
  },
  usageStat: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  usageIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  usageInfo: {
    flex: 1,
  },
  usageLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  usageValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E53E3E',
  },
  upgradePremiumButton: {
    backgroundColor: '#FFB74D',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  upgradePremiumText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  giftCodeSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  giftCodeInputContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  giftCodeInput: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 10,
  },
  redeemButton: {
    backgroundColor: '#00b894',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 100,
  },
  redeemButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  showGiftCodeButton: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#00b894',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  showGiftCodeText: {
    color: '#00b894',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelGiftCodeButton: {
    padding: 10,
    alignItems: 'center',
  },
  cancelGiftCodeText: {
    color: '#666',
    fontSize: 14,
  },
  languageSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  languageButton: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  languageButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  languageButtonSubtext: {
    fontSize: 14,
    color: '#666',
  },
});
