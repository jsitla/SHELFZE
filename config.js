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
};
