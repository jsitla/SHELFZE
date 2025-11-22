// Required for React Navigation gestures - MUST be at the top
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// 1. Import necessary components from React, React Native, and Expo
import React, { useState, useEffect, Component } from 'react';
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
import { checkAndApplyMonthlyBonus, initializeUsageTracking } from './utils/usageTracking';
import LegalConsentScreen, { getStoredLegalConsent } from './components/LegalConsentScreen';

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
    // Wait for auth to be ready
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        console.log('RecipeWrapper: Waiting for user authentication...');
        return;
      }

      const userId = user.uid;
      console.log('RecipeWrapper: Querying pantry for user:', userId);

      // Query user-specific pantry collection
      const q = query(collection(db, `users/${userId}/pantry`));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setIngredientCount(snapshot.size);
      });
      
      return () => unsubscribe();
    });

    return () => unsubscribeAuth();
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
    backgroundColor: '#E53E3E', // Vibrant red - SAME everywhere
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
            paddingTop: 12,
            paddingBottom: 20,
            height: 75,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.08,
            shadowRadius: 12,
            elevation: 20,
          },
          tabBarActiveTintColor: '#E53E3E', // Vibrant red
          tabBarInactiveTintColor: '#9CA3AF',
          tabBarLabelStyle: {
            fontSize: 13,
            fontWeight: '700',
            marginTop: 4,
          },
          tabBarIconStyle: {
            marginTop: 4,
          },
        }}
      >
        <Tab.Screen 
          name="Pantry" 
          component={PantryStack}
          options={{
            tabBarLabel: t('pantry', language),
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 24 }}>🥫</Text>
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
              <Text style={{ fontSize: 24 }}>📸</Text>
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
              <Text style={{ fontSize: 24 }}>🛒</Text>
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
              <Text style={{ fontSize: 24 }}>🍳</Text>
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
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const [checkingFirstLaunch, setCheckingFirstLaunch] = useState(true);
  const [hasLegalConsent, setHasLegalConsent] = useState(false);
  const [checkingLegalConsent, setCheckingLegalConsent] = useState(true);

  // Check stored legal consent (per device / session)
  useEffect(() => {
    const checkLegal = async () => {
      const consentDate = await getStoredLegalConsent();
      setHasLegalConsent(!!consentDate);
      setCheckingLegalConsent(false);
    };
    checkLegal();
  }, []);

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

  const handleLegalAccepted = () => {
    setHasLegalConsent(true);
  };

  // Handle welcome screen choices
  const handleContinueAsGuest = async () => {
    try {
      await AsyncStorage.setItem('hasLaunchedBefore', 'true');
      setShowWelcome(false);
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
    try {
      await AsyncStorage.setItem('hasLaunchedBefore', 'true');
      setShowWelcome(false);
      setAuthMode('signup');
      setShowAuth(true);
    } catch (error) {
      console.error('Error with create account flow:', error);
    }
  };

  const handleLogin = async () => {
    try {
      await AsyncStorage.setItem('hasLaunchedBefore', 'true');
      setShowWelcome(false);
      setAuthMode('login');
      setShowAuth(true);
    } catch (error) {
      console.error('Error with login flow:', error);
    }
  };

  const handleAuthSuccess = () => {
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
      if (currentUser) {
        // User is signed in
        console.log('User signed in:', currentUser.uid);
        setUser(currentUser);
        setAuthLoading(false);
        
        // Initialize usage tracking if needed and check monthly bonus
        try {
          await initializeUsageTracking(currentUser.uid, currentUser.isAnonymous ? 'anonymous' : 'free');
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
        setAuthLoading(false);
      }
    });
    
    return () => unsubscribe();
  }, []);

  let content = null;

  if (checkingLegalConsent || checkingFirstLaunch) {
    content = (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E53E3E" />
      </View>
    );
  } else if (!hasLegalConsent) {
    content = (
      <LanguageProvider>
        <LegalConsentScreen onAccepted={handleLegalAccepted} />
      </LanguageProvider>
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
        <ActivityIndicator size="large" color="#E53E3E" />
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
    backgroundColor: '#F8FAFC',
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
    backgroundColor: '#C53030', // Darker red
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
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  errorText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E53E3E',
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
    backgroundColor: '#F5F5F5',
    padding: 20,
  },
  errorEmoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
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
    backgroundColor: '#E53E3E',
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
