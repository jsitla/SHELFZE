import React, { useState, useEffect, useCallback } from 'react';
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
  Linking,
  Share,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { 
  signOut, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  linkWithCredential,
  EmailAuthProvider,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../firebase.config';
import { doc, getDoc } from 'firebase/firestore';
import { useLanguage } from '../contexts/LanguageContext';
import { t } from '../contexts/translations';
import LanguageSelector from './LanguageSelector';
import PremiumPlansScreen from './PremiumPlansScreen';
import { getUserUsage, redeemGiftCode, checkAndApplyMonthlyBonus } from '../utils/usageTracking';
import { config } from '../config';

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
  // Household state
  const [householdInfo, setHouseholdInfo] = useState(null);
  const [loadingHousehold, setLoadingHousehold] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [householdAction, setHouseholdAction] = useState(null); // 'creating', 'joining', 'leaving'
  // Nickname state
  const [nickname, setNickname] = useState('');
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const [savingNickname, setSavingNickname] = useState(false);
  const { language, getLanguageBadge } = useLanguage();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setLoading(false);
      
      // Load usage data when user changes
      if (currentUser) {
        loadUsageData(currentUser.uid);
        checkMonthlyBonus(currentUser.uid);
        loadHouseholdInfo();
        loadNickname();
      }
    });
    return unsubscribe;
  }, []);

  // Reload usage data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadUsageData(user.uid);
        loadHouseholdInfo();
        loadNickname();
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

  // Load nickname from Firestore
  const loadNickname = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists() && userDoc.data().nickname) {
        setNickname(userDoc.data().nickname);
        setNicknameInput(userDoc.data().nickname);
      }
    } catch (error) {
      console.error('Error loading nickname:', error);
    }
  };

  // Save nickname
  const handleSaveNickname = async () => {
    const trimmed = nicknameInput.trim();
    
    if (!trimmed) {
      Alert.alert(t('error', language), t('nicknameRequired', language) || 'Nickname cannot be empty');
      return;
    }
    
    if (trimmed.length > 20) {
      Alert.alert(t('error', language), t('nicknameTooLong', language) || 'Nickname must be 20 characters or less');
      return;
    }

    try {
      setSavingNickname(true);
      const token = await auth.currentUser?.getIdToken();

      const response = await fetch(config.updateNickname, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ nickname: trimmed }),
      });

      const data = await response.json();

      if (response.ok) {
        setNickname(data.nickname);
        setNicknameInput(data.nickname);
        setEditingNickname(false);
        // Reload household info to see updated name in members list
        if (householdInfo) {
          await loadHouseholdInfo();
        }
        Alert.alert(t('success', language), t('nicknameSaved', language) || 'Nickname saved!');
      } else {
        Alert.alert(t('error', language), data.error || t('failedToSave', language));
      }
    } catch (error) {
      console.error('Error saving nickname:', error);
      Alert.alert(t('error', language), t('networkError', language));
    } finally {
      setSavingNickname(false);
    }
  };

  // Load household info
  const loadHouseholdInfo = async () => {
    try {
      setLoadingHousehold(true);
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        setHouseholdInfo(null);
        return;
      }

      const response = await fetch(config.getHouseholdInfo, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      
      if (response.ok) {
        // Check if user is actually in a household
        if (data.inHousehold) {
          setHouseholdInfo(data);
        } else {
          setHouseholdInfo(null);
        }
      } else if (response.status === 404) {
        // Not in a household
        setHouseholdInfo(null);
      } else {
        console.error('Error loading household info:', data.error);
        setHouseholdInfo(null);
      }
    } catch (error) {
      console.error('Error loading household info:', error);
      setHouseholdInfo(null);
    } finally {
      setLoadingHousehold(false);
    }
  };

  // Create household
  const handleCreateHousehold = async () => {
    if (householdAction) return;
    
    try {
      setHouseholdAction('creating');
      const token = await auth.currentUser?.getIdToken();
      
      const response = await fetch(config.createHousehold, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      
      if (response.ok) {
        // Small delay to ensure Firestore has written the data
        await new Promise(resolve => setTimeout(resolve, 500));
        // Reload full household info to get proper structure
        await loadHouseholdInfo();
        Alert.alert(
          t('success', language),
          t('householdCreated', language) || 'Household created successfully!'
        );
      } else {
        Alert.alert(t('error', language), data.error || t('failedToCreate', language));
      }
    } catch (error) {
      console.error('Error creating household:', error);
      // Check if household was actually created despite the error
      await loadHouseholdInfo();
      Alert.alert(t('error', language), t('networkError', language));
    } finally {
      setHouseholdAction(null);
    }
  };

  // Join household
  const handleJoinHousehold = async () => {
    if (!joinCode.trim()) {
      Alert.alert(t('error', language), t('enterInviteCode', language) || 'Please enter an invite code');
      return;
    }

    try {
      setHouseholdAction('joining');
      const token = await auth.currentUser?.getIdToken();
      
      const response = await fetch(config.joinHousehold, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ inviteCode: joinCode.trim().toUpperCase() }),
      });

      const data = await response.json();
      
      if (response.ok) {
        // Reload full household info to get proper structure
        await loadHouseholdInfo();
        setShowJoinModal(false);
        setJoinCode('');
        Alert.alert(
          t('success', language),
          t('joinedHousehold', language) || 'Joined household successfully!'
        );
      } else {
        Alert.alert(t('error', language), data.error || t('invalidInviteCode', language));
      }
    } catch (error) {
      console.error('Error joining household:', error);
      Alert.alert(t('error', language), t('networkError', language));
    } finally {
      setHouseholdAction(null);
    }
  };

  // Leave household
  const handleLeaveHousehold = async () => {
    const memberCount = householdInfo?.members?.length || 0;
    const isLastMember = memberCount <= 1;
    
    const message = isLastMember
      ? (t('lastMemberWarning', language) || 'You are the last member. Leaving will delete the household and all shared items.')
      : (t('leaveWarning', language) || 'Are you sure you want to leave this household?');

    Alert.alert(
      t('leaveHousehold', language) || 'Leave Household',
      message,
      [
        { text: t('cancel', language), style: 'cancel' },
        {
          text: t('leave', language) || 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              setHouseholdAction('leaving');
              const token = await auth.currentUser?.getIdToken();
              
              const response = await fetch(config.leaveHousehold, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
              });

              const data = await response.json();
              
              if (response.ok) {
                setHouseholdInfo(null);
                Alert.alert(
                  t('success', language),
                  t('leftHousehold', language) || 'You have left the household.'
                );
              } else {
                Alert.alert(t('error', language), data.error);
              }
            } catch (error) {
              console.error('Error leaving household:', error);
              Alert.alert(t('error', language), t('networkError', language));
            } finally {
              setHouseholdAction(null);
            }
          },
        },
      ]
    );
  };

  // Copy invite code (uses Share API since Clipboard needs native build)
  const handleCopyInviteCode = async () => {
    if (householdInfo?.inviteCode) {
      try {
        await Share.share({
          message: householdInfo.inviteCode,
        });
      } catch (error) {
        // User cancelled or error - show the code in alert as fallback
        Alert.alert(t('inviteCode', language), householdInfo.inviteCode);
      }
    }
  };

  // Share invite code
  const handleShareInviteCode = async () => {
    if (householdInfo?.inviteCode) {
      try {
        await Share.share({
          message: `${t('joinMyHousehold', language) || 'Join my Shelfze household!'} ${t('useCode', language) || 'Use code:'} ${householdInfo.inviteCode}`,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
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

  const performSignOut = async () => {
    try {
      // Clear first-launch flag so App.js shows welcome flow instead of auto re-authenticating
      await AsyncStorage.removeItem('hasLaunchedBefore');
      // Clear legal consent flag so next guest session requires agreement
      await AsyncStorage.removeItem('legalConsent_v5');
      
      await signOut(auth);
      // Don't show success alert - let App.js handle re-auth
      // Navigate to Pantry tab after sign out
      if (navigation) {
        navigation.navigate('Pantry');
      }
    } catch (error) {
      Alert.alert(t('error', language), error.message);
    }
  };

  const handleSignOut = async () => {
    if (user?.isAnonymous) {
      Alert.alert(
        t('warning', language),
        t('guestSignOutWarning', language),
        [
          { text: t('cancel', language), style: 'cancel' },
          {
            text: t('signOutAnyway', language),
            style: 'destructive',
            onPress: performSignOut
          },
        ]
      );
    } else {
      Alert.alert(
        t('signOut', language),
        t('signOutConfirm', language),
        [
          { text: t('cancel', language), style: 'cancel' },
          {
            text: t('signOut', language),
            style: 'destructive',
            onPress: performSignOut,
          },
        ]
      );
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(t('error', language), t('fillAllFields', language));
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert(t('error', language), t('invalidEmail', language) || 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
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

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert(t('error', language), t('invalidEmail', language) || 'Please enter a valid email address');
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
      
      // Update display name if provided (sanitized)
      if (displayName && displayName.trim()) {
        const sanitizedName = displayName.trim().replace(/[<>{}]/g, '').slice(0, 50);
        await updateProfile(userCredential.user, {
          displayName: sanitizedName,
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

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert(t('error', language), t('enterEmailForPasswordReset', language));
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      Alert.alert(
        t('success', language),
        t('forgotPasswordEmailSent', language)
      );
    } catch (error) {
      Alert.alert(t('error', language), getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('https://apps.apple.com/account/subscriptions');
    } else {
      Linking.openURL('https://play.google.com/store/account/subscriptions');
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
      // Sign in directly – Firebase will replace the anonymous session automatically
      await signInWithEmailAndPassword(auth, email.trim(), password);
      
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
        <ActivityIndicator size="large" color="#4A7C59" />
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
              <TouchableOpacity style={styles.forgotPasswordButton} onPress={handleForgotPassword}>
                <Text style={styles.forgotPasswordText}>{t('forgotPassword', language)}</Text>
              </TouchableOpacity>
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
          {t('userId', language)}: {user.uid}
        </Text>

        {/* Nickname Section */}
        <View style={styles.nicknameSection}>
          <Text style={styles.nicknameLabel}>
            {t('nickname', language) || 'Nickname'}
          </Text>
          {editingNickname ? (
            <View style={styles.nicknameEditRow}>
              <TextInput
                style={styles.nicknameInput}
                value={nicknameInput}
                onChangeText={setNicknameInput}
                placeholder={t('enterNickname', language) || 'Enter nickname'}
                maxLength={20}
                autoFocus
              />
              <TouchableOpacity
                style={styles.nicknameSaveButton}
                onPress={handleSaveNickname}
                disabled={savingNickname}
              >
                {savingNickname ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.nicknameSaveText}>✓</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.nicknameCancelButton}
                onPress={() => {
                  setEditingNickname(false);
                  setNicknameInput(nickname);
                }}
              >
                <Text style={styles.nicknameCancelText}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.nicknameDisplayRow}
              onPress={() => setEditingNickname(true)}
            >
              <Text style={styles.nicknameValue}>
                {nickname || (t('notSet', language) || 'Not set')}
              </Text>
              <Text style={styles.nicknameEditIcon}>✏️</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.nicknameHint}>
            {t('nicknameHint', language) || 'Displayed to household members'}
          </Text>
        </View>
      </View>

      {/* Usage & Tier Info */}
      <View style={styles.tierCard}>
        <View style={styles.tierHeader}>
          <Text style={styles.tierTitle}>{t('tier', language)}</Text>
          {loadingUsage ? (
            <ActivityIndicator size="small" color="#4A7C59" />
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
                    `${usageData.scansRemaining}/500` : 
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
                    `${usageData.recipesRemaining}/500` : 
                    usageData.recipesRemaining}
                </Text>
              </View>
            </View>
          </View>
        )}

        {usageData?.tier !== 'premium' ? (
          <TouchableOpacity 
            style={styles.upgradePremiumButton}
            onPress={() => {
              if (navigation && navigation.navigate) {
                navigation.navigate('PremiumPlans');
              } else {
                Alert.alert(
                  '👑 ' + t('premium', language),
                  t('upgradeToPremiumMessage', language)
                );
              }
            }}
          >
            <Text style={styles.upgradePremiumText}>⬆️ {t('upgradeToPremium', language)}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.manageSubscriptionButton}
            onPress={handleManageSubscription}
          >
            <Text style={styles.manageSubscriptionText}>⚙️ {t('manageSubscription', language) || 'Manage Subscription'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Household Section */}
      <View style={styles.householdCard}>
        <View style={styles.householdHeader}>
          <Text style={styles.householdIcon}>🏠</Text>
          <Text style={styles.householdTitle}>{t('household', language) || 'Household'}</Text>
          {loadingHousehold && <ActivityIndicator size="small" color="#4A7C59" style={{ marginLeft: 8 }} />}
        </View>

        {householdInfo ? (
          // User is in a household
          <View style={styles.householdContent}>
            {/* Members */}
            <View style={styles.membersSection}>
              <Text style={styles.membersLabel}>{t('members', language) || 'Members'} ({householdInfo.members?.length || 0}/10)</Text>
              <View style={styles.membersList}>
                {householdInfo.members?.map((member, index) => (
                  <View key={member.id || index} style={styles.memberItem}>
                    <Text style={styles.memberAvatar}>👤</Text>
                    <Text style={styles.memberName}>{member.name || member.displayName || member.email || t('unnamed', language)}</Text>
                    {member.isPremium && <Text style={styles.memberPremium}>👑</Text>}
                  </View>
                ))}
              </View>
            </View>

            {/* Premium Status */}
            {householdInfo.hasPremium && (
              <View style={styles.householdPremiumBanner}>
                <Text style={styles.householdPremiumText}>👑 {t('householdPremium', language) || 'Premium Household'}</Text>
              </View>
            )}

            {/* Invite Code */}
            <View style={styles.inviteCodeSection}>
              <Text style={styles.inviteCodeLabel}>{t('inviteCode', language) || 'Invite Code'}</Text>
              <View style={styles.inviteCodeContainer}>
                <Text style={styles.inviteCodeText}>{householdInfo.inviteCode}</Text>
                <TouchableOpacity style={styles.copyButton} onPress={handleCopyInviteCode}>
                  <Text style={styles.copyButtonText}>📋</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.shareButton} onPress={handleShareInviteCode}>
                  <Text style={styles.shareButtonText}>📤</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Leave Button */}
            <TouchableOpacity 
              style={styles.leaveHouseholdButton}
              onPress={handleLeaveHousehold}
              disabled={householdAction === 'leaving'}
            >
              {householdAction === 'leaving' ? (
                <ActivityIndicator size="small" color="#E07A5F" />
              ) : (
                <Text style={styles.leaveHouseholdText}>🚪 {t('leaveHousehold', language) || 'Leave Household'}</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          // User is not in a household
          <View style={styles.householdContent}>
            <Text style={styles.householdDescription}>
              {t('householdDescription', language) || 'Share your pantry with family members. One premium subscription covers everyone!'}
            </Text>

            <View style={styles.householdActions}>
              <TouchableOpacity 
                style={styles.createHouseholdButton}
                onPress={handleCreateHousehold}
                disabled={householdAction === 'creating'}
              >
                {householdAction === 'creating' ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.createHouseholdText}>🏠 {t('createHousehold', language) || 'Create Household'}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.joinHouseholdButton}
                onPress={() => setShowJoinModal(true)}
                disabled={householdAction === 'joining'}
              >
                {householdAction === 'joining' ? (
                  <ActivityIndicator size="small" color="#4A7C59" />
                ) : (
                  <Text style={styles.joinHouseholdText}>🔗 {t('joinHousehold', language) || 'Join Household'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Join Household Modal */}
      <Modal
        visible={showJoinModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowJoinModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.joinModalContent}>
            <Text style={styles.joinModalTitle}>{t('joinHousehold', language) || 'Join Household'}</Text>
            
            <View style={styles.joinWarningBox}>
              <Text style={styles.joinWarningTitle}>⚠️ {t('importantNote', language) || 'Important'}</Text>
              <Text style={styles.joinWarningText}>
                {t('joinHouseholdWarning', language) || 'Your personal pantry, shopping list, and saved recipes will be removed. You will see the data already in the household you are joining.'}
              </Text>
            </View>
            
            <Text style={styles.joinModalDescription}>
              {t('enterInviteCodeDesc', language) || 'Enter the invite code shared by a household member.'}
            </Text>
            
            <TextInput
              style={styles.joinCodeInput}
              placeholder={t('inviteCodePlaceholder', language) || 'Enter 6-character code'}
              value={joinCode}
              onChangeText={(text) => setJoinCode(text.toUpperCase())}
              autoCapitalize="characters"
              maxLength={6}
            />

            <View style={styles.joinModalButtons}>
              <TouchableOpacity 
                style={styles.joinModalCancelButton}
                onPress={() => {
                  setShowJoinModal(false);
                  setJoinCode('');
                }}
              >
                <Text style={styles.joinModalCancelText}>{t('cancel', language)}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.joinModalConfirmButton}
                onPress={handleJoinHousehold}
                disabled={householdAction === 'joining' || joinCode.length < 6}
              >
                {householdAction === 'joining' ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.joinModalConfirmText}>{t('join', language) || 'Join'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Gift Code Section - HIDDEN FOR APP STORE COMPLIANCE */}
      {false && (
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
      )}

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
              <TouchableOpacity style={styles.forgotPasswordButton} onPress={handleForgotPassword}>
                <Text style={styles.forgotPasswordText}>{t('forgotPassword', language)}</Text>
              </TouchableOpacity>
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

      {/* Legal Links */}
      <View style={styles.legalSection}>
        <Text style={styles.sectionTitle}>📄 Legal</Text>
        <TouchableOpacity 
          style={styles.legalLink}
          onPress={() => {
            const url = 'https://m-ai.info/privacy-policy.html';
            if (Platform.OS === 'web') {
              window.open(url, '_blank');
            } else {
              Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open URL.'));
            }
          }}
        >
          <Text style={styles.legalLinkText}>🔒 Privacy Policy</Text>
          <Text style={styles.legalLinkSubtext}>How we handle your data</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.legalLink}
          onPress={() => {
            const url = 'https://m-ai.info/terms-of-service.html';
            if (Platform.OS === 'web') {
              window.open(url, '_blank');
            } else {
              Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open URL.'));
            }
          }}
        >
          <Text style={styles.legalLinkText}>📋 Terms of Service</Text>
          <Text style={styles.legalLinkSubtext}>Usage terms and conditions</Text>
        </TouchableOpacity>

        <View style={styles.versionInfo}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
          <Text style={styles.supportText}>support@shelfze.app</Text>
        </View>


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
    backgroundColor: '#F4F1DE', // Alabaster
  },
  scrollContent: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F1DE',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#3D405B',
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
    color: '#3D405B', // Charcoal
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 22,
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
    color: '#3D405B',
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
    color: '#4A7C59', // Sage Green
    marginBottom: 10,
  },
  accountWarning: {
    fontSize: 14,
    color: '#E07A5F', // Terracotta
    marginBottom: 10,
  },
  userId: {
    fontSize: 12,
    color: '#999',
  },
  // Nickname styles
  nicknameSection: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  nicknameLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3D405B',
    marginBottom: 8,
  },
  nicknameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nicknameInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#4A7C59',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  nicknameSaveButton: {
    backgroundColor: '#4A7C59',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  nicknameSaveText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  nicknameCancelButton: {
    backgroundColor: '#ccc',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  nicknameCancelText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  nicknameDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
  },
  nicknameValue: {
    fontSize: 16,
    color: '#3D405B',
  },
  nicknameEditIcon: {
    fontSize: 14,
  },
  nicknameHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
    fontStyle: 'italic',
  },
  upgradeSection: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 22,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#4A7C59', // Sage Green
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3D405B',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  upgradeButton: {
    backgroundColor: '#4A7C59', // Sage Green
    padding: 15,
    borderRadius: 14,
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginExistingButton: {
    backgroundColor: '#3D405B', // Charcoal
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
    borderRadius: 22,
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
    color: '#3D405B',
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#3D405B',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    marginBottom: 15,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 15,
    paddingVertical: 5,
  },
  forgotPasswordText: {
    color: '#4A7C59', // Sage Green
    fontSize: 14,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#4A7C59', // Sage Green
    padding: 15,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#F1F5F9',
    padding: 15,
    borderRadius: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  signOutButton: {
    backgroundColor: '#E07A5F', // Terracotta
    padding: 15,
    borderRadius: 14,
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
    borderRadius: 22,
    padding: 22,
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
    color: '#3D405B',
  },
  tierBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tierBadgeFree: {
    backgroundColor: '#E8F5E9', // Light Green
  },
  tierBadgePremium: {
    backgroundColor: '#FFF3E0',
    borderWidth: 2,
    borderColor: '#FFB74D',
  },
  tierBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3D405B',
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
    color: '#4A7C59', // Sage Green
  },
  upgradePremiumButton: {
    backgroundColor: '#E07A5F', // Terracotta
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  upgradePremiumText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  manageSubscriptionButton: {
    backgroundColor: '#F1F5F9',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  manageSubscriptionText: {
    color: '#3D405B',
    fontSize: 16,
    fontWeight: 'bold',
  },
  giftCodeSection: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 22,
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
    backgroundColor: '#F1F5F9',
    padding: 15,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    fontSize: 15,
    fontWeight: '600',
    marginRight: 10,
  },
  redeemButton: {
    backgroundColor: '#4A7C59', // Sage Green
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 14,
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
    backgroundColor: '#F1F5F9',
    padding: 15,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#4A7C59', // Sage Green
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  showGiftCodeText: {
    color: '#4A7C59', // Sage Green
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
    borderRadius: 22,
    padding: 22,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  languageButton: {
    backgroundColor: '#F1F5F9',
    padding: 15,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  languageButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3D405B',
    marginBottom: 5,
  },
  languageButtonSubtext: {
    fontSize: 14,
    color: '#666',
  },
  legalSection: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 22,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  legalLink: {
    backgroundColor: '#F1F5F9',
    padding: 15,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  legalLinkText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3D405B',
    marginBottom: 4,
  },
  legalLinkSubtext: {
    fontSize: 13,
    color: '#666',
  },
  versionInfo: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'center',
  },
  versionText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  supportText: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  devResetButton: {
    marginTop: 15,
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#EF4444',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  devResetButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ff6b6b',
    marginBottom: 2,
  },
  devResetSubtext: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
  // Household Styles
  householdCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 22,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  householdHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  householdIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  householdTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3D405B',
  },
  householdContent: {
    marginTop: 5,
  },
  householdDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 20,
  },
  membersSection: {
    marginBottom: 15,
  },
  membersLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3D405B',
    marginBottom: 10,
  },
  membersList: {
    gap: 8,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 10,
  },
  memberAvatar: {
    fontSize: 20,
    marginRight: 10,
  },
  memberName: {
    flex: 1,
    fontSize: 14,
    color: '#3D405B',
  },
  memberPremium: {
    fontSize: 16,
  },
  householdPremiumBanner: {
    backgroundColor: '#FFF3E0',
    borderWidth: 2,
    borderColor: '#FFB74D',
    borderRadius: 12,
    padding: 12,
    marginBottom: 15,
    alignItems: 'center',
  },
  householdPremiumText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E07A5F',
  },
  inviteCodeSection: {
    marginBottom: 15,
  },
  inviteCodeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3D405B',
    marginBottom: 8,
  },
  inviteCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 12,
  },
  inviteCodeText: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4A7C59',
    letterSpacing: 4,
    textAlign: 'center',
  },
  copyButton: {
    padding: 8,
    marginLeft: 8,
  },
  copyButtonText: {
    fontSize: 20,
  },
  shareButton: {
    padding: 8,
  },
  shareButtonText: {
    fontSize: 20,
  },
  leaveHouseholdButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#E07A5F',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  leaveHouseholdText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E07A5F',
  },
  householdActions: {
    gap: 12,
  },
  createHouseholdButton: {
    backgroundColor: '#4A7C59',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  createHouseholdText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  joinHouseholdButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#4A7C59',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  joinHouseholdText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A7C59',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  joinModalContent: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  joinModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#3D405B',
    marginBottom: 10,
    textAlign: 'center',
  },
  joinModalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
  },
  joinWarningBox: {
    backgroundColor: '#FFF3CD',
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#FFECB5',
  },
  joinWarningTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 5,
  },
  joinWarningText: {
    fontSize: 13,
    color: '#856404',
    lineHeight: 18,
  },
  joinCodeInput: {
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 4,
    marginBottom: 20,
  },
  joinModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  joinModalCancelButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  joinModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  joinModalConfirmButton: {
    flex: 1,
    backgroundColor: '#4A7C59',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  joinModalConfirmText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});
