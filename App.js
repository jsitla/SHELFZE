// Required for React Navigation gestures - MUST be at the top
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// 1. Import necessary components from React, React Native, and Expo
import React, { useState, useEffect, Component, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, ActivityIndicator, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CameraScanner from './components/CameraScanner';
import PantryList from './components/PantryList';
import RecipeGenerator from './components/RecipeGenerator';
import ManualEntry from './components/ManualEntry';
import Profile from './components/Profile';
import PremiumPlansScreen from './components/PremiumPlansScreen';
import WelcomeScreen from './components/WelcomeScreen';
import AuthScreen from './components/AuthScreen';
import LanguageSelector from './components/LanguageSelector';
import ShoppingList from './components/ShoppingList';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { t } from './contexts/translations';
import { getFirestore, collection, query, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { app, auth } from './firebase.config';
import { checkAndApplyMonthlyBonus, initializeUsageTracking, syncLegalConsent, checkUserLegalConsent } from './utils/usageTracking';
import LegalConsentScreen, { storeLegalConsent, getStoredLegalConsent } from './components/LegalConsentScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Error Boundary Component - Catches React errors and prevents blank screen
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error for debugging (only in development)
    if (__DEV__) {
      console.error('App Error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
          <Text style={styles.errorMessage}>Please restart the app to continue</Text>
          <TouchableOpacity
            style={styles.restartButton}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={styles.restartButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

// Recipe wrapper to count ingredients
function RecipeWrapper() {
  const [ingredientCount, setIngredientCount] = React.useState(0);
  const { language } = useLanguage();
  const db = getFirestore(app);

  React.useEffect(() => {
    let unsubscribeSnapshot = null;

    // Wait for auth to be ready
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      // Unsubscribe from previous listener if it exists
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      if (!user) {
        console.log('RecipeWrapper: Waiting for user authentication...');
        setIngredientCount(0);
        return;
      }

      const userId = user.uid;
      console.log('RecipeWrapper: Querying pantry for user:', userId);

      // Query user-specific pantry collection
      const q = query(collection(db, `users/${userId}/pantry`));
      unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        setIngredientCount(snapshot.size);
      }, (error) => {
        console.log('RecipeWrapper snapshot error (likely logout):', error.code);
      });
    });

    return () => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
      unsubscribeAuth();
    };
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.recipeSubheader}>
        <Text style={styles.recipeSubheaderText}>
          {ingredientCount} {t('ingredientsAvailable', language)}
        </Text>
      </View>
      <RecipeGenerator />
    </View>
  );
}

// Unified header style for ALL screens
const UNIFIED_HEADER = {
  headerStyle: { 
    backgroundColor: '#4A7C59', // Sage Green - SAME everywhere
    height: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  headerTintColor: '#FFFFFF',
  headerTitleStyle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
};

// Main App Navigator Component
function AppNavigator() {
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const { getLanguageBadge, language } = useLanguage();

  return (
    <>
      <Tab.Navigator
        screenOptions={{
          headerShown: true,
          ...UNIFIED_HEADER,
          tabBarStyle: { 
            backgroundColor: '#FFFFFF',
            borderTopWidth: 0,
            paddingTop: 8,
            paddingBottom: 28,
            height: 88,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.08,
            shadowRadius: 12,
            elevation: 20,
          },
          tabBarActiveTintColor: '#4A7C59', // Sage Green
          tabBarInactiveTintColor: '#94A3B8',
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '700',
            marginTop: 2,
          },
          tabBarIconStyle: {
            marginTop: 0,
          },
        }}
      >
        <Tab.Screen 
          name="Pantry" 
          component={PantryStack}
          options={{
            tabBarLabel: t('pantry', language),
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 26 }}>🥫</Text>
            ),
            headerShown: false,
          }}
        />
        <Tab.Screen 
          name="Scanner" 
          component={CameraScanner}
          options={{
            title: t('scanItem', language),
            tabBarLabel: t('scan', language),
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 26 }}>📸</Text>
            ),
          }}
        />
        <Tab.Screen 
          name="Recipes" 
          component={RecipeWrapper}
          options={{
            title: t('recipeIdeas', language),
            tabBarLabel: t('recipes', language),
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 26 }}>🍳</Text>
            ),
          }}
        />
        <Tab.Screen 
          name="ShoppingList" 
          component={ShoppingList}
          options={{
            title: t('shoppingList', language),
            tabBarLabel: t('shoppingList', language),
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 26 }}>🛒</Text>
            ),
          }}
        />
      </Tab.Navigator>
      
      <LanguageSelector 
        visible={languageModalVisible} 
        onClose={() => setLanguageModalVisible(false)} 
      />
    </>
  );
}

// Pantry Stack with Manual Entry and Profile
function PantryStack() {
  const { language, getLanguageBadge } = useLanguage();
  
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="PantryList" 
        component={PantryList}
        options={({ navigation }) => ({
          title: t('myPantry', language),
          ...UNIFIED_HEADER,
          headerLeft: () => (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => navigation.navigate('ManualEntry')}
            >
              <Text style={styles.addButtonText}>+ {t('add', language)}</Text>
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              style={styles.languageButton}
              onPress={() => navigation.navigate('ProfileScreen')}
            >
              <Text style={styles.languageButtonText}>⚙️</Text>
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen 
        name="ManualEntry" 
        component={ManualEntry}
        options={{
          title: t('addItemManually', language),
          ...UNIFIED_HEADER,
        }}
      />
      <Stack.Screen 
        name="ProfileScreen" 
        component={Profile}
        options={{
          title: t('account', language),
          ...UNIFIED_HEADER,
        }}
      />
      <Stack.Screen
        name="PremiumPlans"
        component={PremiumPlansScreen}
        options={{
          title: t('upgradeToPremium', language),
          ...UNIFIED_HEADER,
        }}
      />
    </Stack.Navigator>
  );
}

// 2. Create the main App component
export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showLegalConsent, setShowLegalConsent] = useState(false);
  const [pendingAuthAction, setPendingAuthAction] = useState(null); // 'guest' | 'signup' | 'login'
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const [checkingFirstLaunch, setCheckingFirstLaunch] = useState(true);
  const [hasLegalConsent, setHasLegalConsent] = useState(false);
  const justAgreedRef = useRef(false);

  // Check if this is first launch
  useEffect(() => {
    const checkFirstLaunch = async () => {
      try {
        const hasLaunched = await AsyncStorage.getItem('hasLaunchedBefore');
        if (hasLaunched === null) {
          // First launch - show welcome screen
          setShowWelcome(true);
        }
      } catch (error) {
        console.error('Error checking first launch:', error);
      } finally {
        setCheckingFirstLaunch(false);
      }
    };

    checkFirstLaunch();
  }, []);

  // Handle welcome screen choices
  const handleContinueAsGuest = async () => {
    // Guest flow: Welcome -> Terms -> App
    // We always require terms for a new Guest session (starting from Welcome screen)
    // regardless of previous device state, to ensure "One agreement per account".
    // If the user was already logged in, they wouldn't see the Welcome screen.
    
    if (!hasLegalConsent) {
      setPendingAuthAction('guest');
      setShowWelcome(false);
      setShowLegalConsent(true);
    } else {
      performGuestLogin();
    }
  };

  const performGuestLogin = async () => {
    try {
      await AsyncStorage.setItem('hasLaunchedBefore', 'true');
      setShowWelcome(false);
      setShowLegalConsent(false);
      setAuthLoading(true);
      // Sign in anonymously immediately
      await signInAnonymously(auth);
      // Auth listener will handle the rest
    } catch (error) {
      console.error('Error with guest sign-in:', error);
      setAuthLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    // Create Account flow: Welcome -> Auth (Enter Data) -> Terms -> App
    // We do NOT check consent here. We let them go to Auth screen first.
    proceedToAuth('signup');
  };

  const handleLogin = async () => {
    // Login flow: Welcome -> Auth (Enter Data) -> Terms (if needed) -> App
    proceedToAuth('login');
  };

  const proceedToAuth = async (mode) => {
    try {
      await AsyncStorage.setItem('hasLaunchedBefore', 'true');
      setShowWelcome(false);
      setShowLegalConsent(false);
      setAuthMode(mode);
      setShowAuth(true);
    } catch (error) {
      console.error('Error with auth flow:', error);
    }
  };

  const handleLegalAccepted = async () => {
    justAgreedRef.current = true;
    if (user) {
      const now = new Date().toISOString();
      await syncLegalConsent(user.uid, now);
      setHasLegalConsent(true);
    }
    setShowLegalConsent(false);
    
    if (pendingAuthAction === 'guest') {
      performGuestLogin();
    } else {
      // For signup/login, we are already authenticated (or about to be),
      // so we just need to clear the blocking state.
      // The useEffect listener will see user + hasLegalConsent and show the app.
    }
    setPendingAuthAction(null);
  };

  const handleAuthSuccess = async (actualMode) => {
    // If user logged in (not signed up), we skip the terms check
    // by marking it as accepted locally AND syncing to DB so they aren't asked later.
    const mode = actualMode || authMode;
    if (mode === 'login') {
      setHasLegalConsent(true);
      storeLegalConsent();
      
      // Backfill consent to Firestore so they aren't asked on next launch (different device/session)
      if (auth.currentUser) {
        const now = new Date().toISOString();
        await syncLegalConsent(auth.currentUser.uid, now);
      }
    }
    setShowAuth(false);
    // Auth listener will handle the rest
  };

  const handleAuthBack = () => {
    setShowAuth(false);
    setShowWelcome(true);
  };

  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setAuthLoading(true);
      if (currentUser) {
        // User is signed in
        console.log('User signed in:', currentUser.uid);
        setUser(currentUser);
        // Ensure we hide welcome/auth screens when user is detected
        setShowWelcome(false);
        setShowAuth(false);
        
        // Check legal consent from DB (Source of Truth)
        // If user just agreed in this session (e.g. Guest flow), trust that.
        let agreed = false;
        if (justAgreedRef.current) {
          agreed = true;
          // Ensure it's synced for Guest flow
          const now = new Date().toISOString();
          await syncLegalConsent(currentUser.uid, now);
          justAgreedRef.current = false; // Reset
        } else {
          agreed = await checkUserLegalConsent(currentUser.uid);
        }
        
        setHasLegalConsent(agreed);
        
        // Initialize usage tracking if needed and check monthly bonus
        try {
          await initializeUsageTracking(currentUser.uid, currentUser.isAnonymous ? 'anonymous' : 'free');
          
          // Removed automatic sync here to avoid overwriting with AsyncStorage data
          // await syncLegalConsent(currentUser.uid);

          const bonusResult = await checkAndApplyMonthlyBonus(currentUser.uid);
          
          // Don't show alert here - Profile screen will handle it
          if (bonusResult.bonusApplied) {
            console.log(`✅ Monthly bonus applied: +${bonusResult.bonusAmount} scans and recipes`);
          }
        } catch (error) {
          console.log('Note: Usage tracking initialization/bonus check:', error.message);
          // Don't block app if usage tracking fails
        }
      } else {
        // No user signed in
        // Always show welcome screen to let user choose their auth method
        // instead of auto-creating anonymous accounts
        console.log('No user found, showing welcome screen');
        setShowWelcome(true);
        // Reset legal consent state so next guest session requires agreement
        setHasLegalConsent(false);
        justAgreedRef.current = false; // Ensure ref is reset
      }
      setAuthLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  let content = null;

  if (checkingFirstLaunch) {
    content = (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A7C59" />
      </View>
    );
  } else if (showWelcome) {
    content = (
      <LanguageProvider>
        <WelcomeScreen
          onContinueAsGuest={handleContinueAsGuest}
          onCreateAccount={handleCreateAccount}
          onLogin={handleLogin}
        />
      </LanguageProvider>
    );
  } else if (showLegalConsent) {
    content = (
      <LanguageProvider>
        <LegalConsentScreen onAccepted={handleLegalAccepted} />
      </LanguageProvider>
    );
  } else if (showAuth) {
    content = (
      <LanguageProvider>
        <AuthScreen
          mode={authMode}
          onBack={handleAuthBack}
          onSuccess={handleAuthSuccess}
        />
      </LanguageProvider>
    );
  } else if (authLoading) {
    content = (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A7C59" />
        <Text style={styles.loadingText}>Loading Shelfze...</Text>
      </View>
    );
  } else if (!user) {
    content = (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>⚠️ Authentication Error</Text>
        <Text style={styles.errorSubtext}>Please restart the app</Text>
      </View>
    );
  } else if (!hasLegalConsent) {
    // Post-Auth Gate: If user is logged in but hasn't agreed, show consent screen
    content = (
      <LanguageProvider>
        <LegalConsentScreen onAccepted={handleLegalAccepted} />
      </LanguageProvider>
    );
  } else {
    content = (
      <ErrorBoundary>
        <LanguageProvider>
          <NavigationContainer>
            <View style={styles.container}>
              <StatusBar style="auto" />
              <AppNavigator />
            </View>
          </NavigationContainer>
        </LanguageProvider>
      </ErrorBoundary>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {content}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1DE', // Alabaster
  },
  addButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)', // Transparent white overlay
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    marginRight: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  languageButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)', // Transparent white overlay
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  languageButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  recipeSubheader: {
    backgroundColor: '#E07A5F', // Terracotta
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  recipeSubheaderText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F1DE',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#3D405B',
    fontWeight: '600',
  },
  errorText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E07A5F',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#999',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F1DE',
    padding: 20,
  },
  errorEmoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#3D405B',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  restartButton: {
    backgroundColor: '#4A7C59',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  restartButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
