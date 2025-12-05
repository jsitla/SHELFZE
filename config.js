// Centralized configuration for the Shelfze app

export const config = {
  // Cloud Function URLs
  analyzeImage: 'https://analyzeimage-awiyk42b4q-uc.a.run.app',
  generateRecipes: 'https://generaterecipes-awiyk42b4q-uc.a.run.app',
  getRecipeDetails: 'https://getrecipedetails-awiyk42b4q-uc.a.run.app',
  initializeUsage: 'https://us-central1-pantryai-3d396.cloudfunctions.net/initializeUsage',
  checkMonthlyBonus: 'https://us-central1-pantryai-3d396.cloudfunctions.net/checkMonthlyBonus',
  upgradeTier: 'https://us-central1-pantryai-3d396.cloudfunctions.net/upgradeTier',
  redeemGiftCode: 'https://us-central1-pantryai-3d396.cloudfunctions.net/redeemGiftCode',
  recordLegalConsent: 'https://us-central1-pantryai-3d396.cloudfunctions.net/recordLegalConsent',
  rateRecipe: 'https://us-central1-pantryai-3d396.cloudfunctions.net/rateRecipe',
  checkIngredients: 'https://checkingredients-awiyk42b4q-uc.a.run.app',
  matchPantryToRecipes: 'https://matchpantrytorecipes-awiyk42b4q-uc.a.run.app',
  
  // RevenueCat API Keys
  revenueCat: {
    ios: 'appl_mhVIozZXkZvAnHbOlkAvqbyJrbq',
    android: 'goog_REPLACE_WITH_YOUR_ANDROID_KEY',
    entitlementId: 'Shelfze / M-AI d.o.o. Pro', // Matches your RevenueCat Entitlement Identifier
  },
};
