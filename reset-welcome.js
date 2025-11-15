// Run this script to clear the "hasLaunchedBefore" flag
// This will make the welcome screen appear again on next app launch

const AsyncStorage = require('@react-native-async-storage/async-storage');

async function resetWelcomeScreen() {
  try {
    await AsyncStorage.default.removeItem('hasLaunchedBefore');
    console.log('✅ Welcome screen reset! The welcome screen will appear on next app launch.');
  } catch (error) {
    console.error('❌ Error resetting welcome screen:', error);
  }
}

resetWelcomeScreen();
