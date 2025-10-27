// Required for React Navigation gestures - MUST be at the top
import 'react-native-gesture-handler';

// 1. Import necessary components from React, React Native, and Expo
import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import CameraScanner from './components/CameraScanner';
import PantryList from './components/PantryList';
import RecipeGenerator from './components/RecipeGenerator';
import ManualEntry from './components/ManualEntry';
import LanguageSelector from './components/LanguageSelector';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { t } from './contexts/translations';
import { getFirestore, collection, query, onSnapshot } from 'firebase/firestore';
import { app } from './firebase.config';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Recipe wrapper to count ingredients
function RecipeWrapper() {
  const [ingredientCount, setIngredientCount] = React.useState(0);
  const { language } = useLanguage();
  const db = getFirestore(app);

  React.useEffect(() => {
    const q = query(collection(db, 'pantry'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setIngredientCount(snapshot.size);
    });
    return () => unsubscribe();
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

// Pantry Stack with Manual Entry
function PantryStack() {
  const { language, getLanguageBadge } = useLanguage();
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  
  return (
    <>
      <Stack.Navigator>
        <Stack.Screen 
          name="PantryList" 
          component={PantryList}
          options={({ navigation }) => ({
            title: t('myPantry', language),
            ...UNIFIED_HEADER,
            headerLeft: () => (
              <TouchableOpacity
                style={styles.languageButton}
                onPress={() => setLanguageModalVisible(true)}
              >
                <Text style={styles.languageButtonText}>🌐 {getLanguageBadge()}</Text>
              </TouchableOpacity>
            ),
            headerRight: () => (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => navigation.navigate('ManualEntry')}
              >
                <Text style={styles.addButtonText}>+ {t('add', language)}</Text>
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
    </Stack.Navigator>
    
    <LanguageSelector 
      visible={languageModalVisible} 
      onClose={() => setLanguageModalVisible(false)} 
    />
    </>
  );
}

// 2. Create the main App component
export default function App() {
  return (
    <LanguageProvider>
      <NavigationContainer>
        <View style={styles.container}>
          <StatusBar style="auto" />
          <AppNavigator />
        </View>
      </NavigationContainer>
    </LanguageProvider>
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
});
