import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  TextInput,
  Share,
  Modal
} from 'react-native';
import { getFirestore, collection, query, onSnapshot, addDoc, doc, deleteDoc, getDoc, getDocs, writeBatch } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { app, auth } from '../firebase.config';
import { useLanguage } from '../contexts/LanguageContext';
import { t } from '../contexts/translations';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { config } from '../config';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import { scaleIngredient } from '../utils/ingredientScaler';
import { Ionicons } from '@expo/vector-icons';

// Helper function to validate emoji - returns default if not a valid emoji
const getValidEmoji = (emoji) => {
  if (!emoji || typeof emoji !== 'string') return '🍽️';
  const emojiRegex = /^[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
  if (emojiRegex.test(emoji) && emoji.length <= 4) {
    return emoji;
  }
  return '🍽️';
};

export default function SavedRecipesScreen() {
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [userRatings, setUserRatings] = useState({});
  const [loading, setLoading] = useState(true);
  const [pantryItems, setPantryItems] = useState([]);
  const [householdId, setHouseholdId] = useState(null);
  const [householdChecked, setHouseholdChecked] = useState(false);
  const [migrationDone, setMigrationDone] = useState(false);
  
  // Detail View State
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [recipeDetails, setRecipeDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [servings, setServings] = useState(4);
  const [userRating, setUserRating] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isCooked, setIsCooked] = useState(false);
  const [wantToTry, setWantToTry] = useState(false);
  const [wouldMakeAgain, setWouldMakeAgain] = useState(false);
  
  // Pantry Check State
  const [showPantryCheckModal, setShowPantryCheckModal] = useState(false);
  const [pantryCheckResult, setPantryCheckResult] = useState(null);
  const [checkingPantry, setCheckingPantry] = useState(false);
  const [itemsToShop, setItemsToShop] = useState([]);

  // Filtering & Sorting State
  const [savedRecipesSearchText, setSavedRecipesSearchText] = useState('');
  const [savedRecipesSortBy, setSavedRecipesSortBy] = useState('date'); // 'date', 'rating', 'name'
  const [savedRecipesSortOrder, setSavedRecipesSortOrder] = useState('desc'); // 'asc', 'desc'
  const [savedRecipesRatingFilter, setSavedRecipesRatingFilter] = useState(0); // 0 = all
  const [showSavedRecipesFilters, setShowSavedRecipesFilters] = useState(false);
  const [onlyCookable, setOnlyCookable] = useState(false);
  const [selectedCollectionFilter, setSelectedCollectionFilter] = useState('all');
  
  // AI Matching State
  const [aiMatchResults, setAiMatchResults] = useState({});
  const [isMatchingPantry, setIsMatchingPantry] = useState(false);

  const { language } = useLanguage();
  const navigation = useNavigation();
  const db = getFirestore(app);

  // Get the correct path based on household membership
  const getRecipeCollectionsPath = useCallback(() => {
    if (householdId) {
      return `households/${householdId}/recipeCollections`;
    }
    return `users/${auth.currentUser?.uid}/recipeCollections`;
  }, [householdId]);

  // Check for household membership when screen is focused
  useFocusEffect(
    useCallback(() => {
      const checkHousehold = async () => {
        const user = auth.currentUser;
        if (!user) return;
        
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const userData = userDoc.data();
          const newHouseholdId = userData?.householdId || null;
          console.log('🏠 SavedRecipes - Household check:', newHouseholdId);
          setHouseholdId(newHouseholdId);
          setHouseholdChecked(true);
        } catch (error) {
          console.error('Error checking household:', error);
          setHouseholdChecked(true);
        }
      };
      
      checkHousehold();
    }, [])
  );

  // Migrate personal recipes to household (one-time migration)
  useEffect(() => {
    const migrateRecipesToHousehold = async () => {
      if (!householdChecked || !householdId || migrationDone) return;
      
      const user = auth.currentUser;
      if (!user) return;

      try {
        // Check if user has personal recipes that need migration
        const personalRecipesRef = collection(db, `users/${user.uid}/recipeCollections`);
        const personalRecipesSnapshot = await getDocs(personalRecipesRef);
        
        if (personalRecipesSnapshot.empty) {
          console.log('📚 No personal recipes to migrate');
          setMigrationDone(true);
          return;
        }

        console.log(`📚 Migrating ${personalRecipesSnapshot.size} personal recipes to household...`);
        
        const batch = writeBatch(db);
        const householdRecipesRef = collection(db, `households/${householdId}/recipeCollections`);
        
        personalRecipesSnapshot.forEach((docSnapshot) => {
          const recipeData = docSnapshot.data();
          // Add to household collection
          const newRecipeRef = doc(householdRecipesRef);
          batch.set(newRecipeRef, {
            ...recipeData,
            migratedFrom: user.uid,
            migratedAt: new Date().toISOString(),
          });
          // Delete from personal collection
          batch.delete(docSnapshot.ref);
        });

        await batch.commit();
        console.log('✅ Recipe migration complete!');
        setMigrationDone(true);
      } catch (error) {
        console.error('❌ Error migrating recipes:', error);
        setMigrationDone(true); // Don't retry on error
      }
    };

    migrateRecipesToHousehold();
  }, [householdChecked, householdId, migrationDone]);

  // Fetch saved recipes, ratings, and pantry items
  useEffect(() => {
    console.log('📚 SavedRecipes useEffect - householdChecked:', householdChecked, 'householdId:', householdId);
    if (!householdChecked) {
      console.log('📚 SavedRecipes - Waiting for household check...');
      return;
    }
    
    let unsubscribeSnapshot = null;
    let unsubscribeRatings = null;
    let unsubscribePantry = null;
    
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      console.log('📚 SavedRecipes - onAuthStateChanged, user:', user?.uid);
      if (unsubscribeSnapshot) unsubscribeSnapshot();
      if (unsubscribeRatings) unsubscribeRatings();
      if (unsubscribePantry) unsubscribePantry();
      
      if (!user) {
        console.log('📚 SavedRecipes - No user, setting loading false');
        setLoading(false);
        return;
      }
      
      const userId = user.uid;

      // Fetch saved recipes (using household path if in household)
      const recipesPath = getRecipeCollectionsPath();
      console.log('📚 SavedRecipes - Fetching from path:', recipesPath);
      const q = query(collection(db, recipesPath));
      unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        console.log('📚 SavedRecipes - Got', snapshot.docs.length, 'recipes');
        const recipes = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setSavedRecipes(recipes);
        setLoading(false);
      }, (error) => {
        console.error('❌ Error fetching saved recipes:', error.code, error.message);
        setLoading(false);
      });

      // Fetch user ratings
      const ratingsQuery = query(collection(db, `users/${userId}/recipeRatings`));
      unsubscribeRatings = onSnapshot(ratingsQuery, (snapshot) => {
        const ratings = {};
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.recipeName && data.rating) {
            ratings[data.recipeName] = data.rating;
          }
        });
        setUserRatings(ratings);
      }, (error) => {
        console.error('Error fetching user ratings:', error);
      });

      // Fetch pantry items (for cookable filter) - use household path if in household
      const pantryPath = householdId ? `households/${householdId}/pantry` : `users/${userId}/pantry`;
      const pantryQuery = query(collection(db, pantryPath));
      unsubscribePantry = onSnapshot(pantryQuery, (snapshot) => {
        const items = [];
        snapshot.forEach((doc) => {
          items.push({
            id: doc.id,
            ...doc.data()
          });
        });
        setPantryItems(items);
      });
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
      if (unsubscribeRatings) unsubscribeRatings();
      if (unsubscribePantry) unsubscribePantry();
    };
  }, [householdChecked, householdId, getRecipeCollectionsPath]);

  // Update header when recipe is selected
  useEffect(() => {
    if (selectedRecipe) {
      if (recipeDetails?.servings) {
        const match = recipeDetails.servings.toString().match(/(\d+)/);
        const parsed = match ? parseInt(match[1]) : 4;
        setServings(parsed);
      } else {
        setServings(4);
      }

      navigation.setOptions({
        headerLeft: () => (
          <TouchableOpacity 
            onPress={goBack}
            style={{ marginLeft: 16 }}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        ),
        title: '',
      });
    } else {
      navigation.setOptions({
        headerLeft: () => (
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={{ marginLeft: 16 }}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        ),
        title: t('savedRecipes', language) || 'Saved Recipes',
      });
    }
  }, [selectedRecipe, recipeDetails, navigation, language]);

  const goBack = () => {
    setSelectedRecipe(null);
    setRecipeDetails(null);
    setUserRating(0);
    setWouldMakeAgain(false);
    setIsFavorite(false);
    setIsCooked(false);
    setWantToTry(false);
  };

  const adjustServings = (delta) => {
    setServings(prev => Math.max(1, prev + delta));
  };

  const getStepText = (step) => {
    if (!step) return '';
    if (typeof step === 'string') return step;
    if (typeof step === 'object') {
      if (typeof step.description === 'string') return step.description;
      if (typeof step.step === 'string') return step.step;
      if (typeof step.text === 'string') return step.text;
      if (step.description && typeof step.description === 'object') return getStepText(step.description);
      return '';
    }
    return String(step);
  };

  const getStepWhy = (step) => {
    if (!step || typeof step !== 'object') return null;
    if (typeof step.why === 'string') return step.why;
    return null;
  };

  const removeFromCollection = async (recipeId) => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const recipesPath = getRecipeCollectionsPath();
      await deleteDoc(doc(db, recipesPath, recipeId));
      // If currently viewing this recipe, go back
      if (selectedRecipe && selectedRecipe.id === recipeId) {
        goBack();
      }
      Alert.alert(t('removed', language), t('recipeRemoved', language));
    } catch (error) {
      console.error('Error removing recipe:', error);
      Alert.alert(t('error', language), t('failedToRemove', language));
    }
  };

  const toggleCollection = async (collectionType) => {
    if (!selectedRecipe) return;

    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const collectionData = {
        recipeName: selectedRecipe.name,
        collectionType: collectionType,
        timestamp: new Date().toISOString(),
        addedBy: userId,
        recipeData: {
          emoji: selectedRecipe.emoji,
          description: selectedRecipe.description,
          cuisine: recipeDetails?.cuisine || selectedRecipe.cuisine,
          difficulty: recipeDetails?.difficulty || selectedRecipe.difficulty,
          prepTime: recipeDetails?.prepTime || selectedRecipe.prepTime,
          cookTime: recipeDetails?.cookTime || selectedRecipe.cookTime,
          servings: recipeDetails?.servings || selectedRecipe.servings,
          ingredients: recipeDetails?.ingredients || [],
          instructions: recipeDetails?.instructions || [],
          tips: recipeDetails?.tips || [],
          nutrition: recipeDetails?.nutrition || null,
        }
      };

      const recipesPath = getRecipeCollectionsPath();
      console.log('📚 SavedRecipes - Saving to path:', recipesPath, 'householdId:', householdId);
      await addDoc(collection(db, recipesPath), collectionData);
      console.log('✅ SavedRecipes - Recipe saved successfully');
      
      if (collectionType === 'favorite') setIsFavorite(!isFavorite);
      if (collectionType === 'cooked') setIsCooked(!isCooked);
      if (collectionType === 'wantToTry') setWantToTry(!wantToTry);
      if (collectionType === 'wouldMakeAgain') setWouldMakeAgain(!wouldMakeAgain);

      Alert.alert(t('collectionUpdated', language), t('success', language));
    } catch (error) {
      console.error('Error updating collection:', error);
      console.error('Error code:', error.code, 'Message:', error.message);
      Alert.alert(t('error', language), t('failedToUpdateCollection', language));
    }
  };

  const saveRecipeRating = async (rating) => {
    if (!selectedRecipe) return;

    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const ratingData = {
        recipeName: selectedRecipe.name,
        rating: rating,
        timestamp: new Date().toISOString(),
        recipeData: {
          emoji: selectedRecipe.emoji,
          description: selectedRecipe.description,
          cuisine: recipeDetails?.cuisine || selectedRecipe.cuisine,
          difficulty: recipeDetails?.difficulty || selectedRecipe.difficulty,
        }
      };

      await addDoc(collection(db, `users/${userId}/recipeRatings`), ratingData);
      Alert.alert(t('ratingSaved', language), t('thankYouFeedback', language));
    } catch (error) {
      console.error('Error saving rating:', error);
      Alert.alert(t('error', language), t('failedToSaveRating', language));
    }
  };

  const shareRecipe = async () => {
    if (!recipeDetails || !recipeDetails.ingredients || !recipeDetails.instructions) {
      Alert.alert(t('error', language), 'Recipe information is incomplete');
      return;
    }

    try {
      const ingredientsText = recipeDetails.ingredients.map((ing) => `• ${ing}`).join('\n');
      const instructionsText = recipeDetails.instructions.map((step, i) => {
        const text = getStepText(step);
        const why = getStepWhy(step);
        const whyText = why ? `\n   💡 ${why}` : '';
        return `${i + 1}. ${text}${whyText}`;
      }).join('\n');

      const message = `
${t('checkOutThisRecipe', language)}: ${recipeDetails.name} ${getValidEmoji(recipeDetails.emoji)}

📝 *${t('ingredients', language)}:*
${ingredientsText}

👨‍🍳 *${t('instructions', language)}:*
${instructionsText}

${recipeDetails.tips && recipeDetails.tips.length > 0 ? `\n💡 *${t('chefsTips', language)}:*\n${recipeDetails.tips.map((tip) => `• ${getStepText(tip)}`).join('\n')}` : ''}

${t('sharedFromShelfze', language)}
      `.trim();

      await Share.share({
        message,
        title: `${t('recipeTitle', language)}: ${recipeDetails.name}`,
      });
    } catch (error) {
      console.error('Error sharing recipe:', error);
      Alert.alert(t('error', language), t('failedToShare', language));
    }
  };

  const checkPantryForIngredients = async () => {
    if (!recipeDetails || !recipeDetails.ingredients) return;

    setCheckingPantry(true);
    setPantryCheckResult(null);
    setShowPantryCheckModal(true);

    try {
      const pantryNames = pantryItems.map(item => item.itemName || item.name);
      const idToken = await auth.currentUser.getIdToken();
      
      const response = await fetchWithTimeout(config.checkIngredients, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          recipeIngredients: recipeDetails.ingredients,
          pantryItems: pantryNames,
          language
        })
      }, 30000);

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to check pantry');

      setPantryCheckResult(result);
      setItemsToShop(result.missing || []);
    } catch (error) {
      console.error('Error checking pantry:', error);
      Alert.alert(t('error', language), t('failedToCheckPantry', language));
      setShowPantryCheckModal(false);
    } finally {
      setCheckingPantry(false);
    }
  };

  const addToShoppingList = async () => {
    if (itemsToShop.length === 0) {
      setShowPantryCheckModal(false);
      return;
    }

    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      // Use household path if in a household
      const shoppingListPath = householdId 
        ? `households/${householdId}/shoppingList`
        : `users/${userId}/shoppingList`;

      const batchPromises = itemsToShop.map(item => 
        addDoc(collection(db, shoppingListPath), {
          name: item,
          checked: false,
          createdAt: new Date()
        })
      );

      await Promise.all(batchPromises);
      Alert.alert(t('success', language), t('itemsAddedToShoppingList', language));
      setShowPantryCheckModal(false);
    } catch (error) {
      console.error('Error adding to shopping list:', error);
      Alert.alert(t('error', language), t('failedToAddToShoppingList', language));
    }
  };

  const matchPantryWithAI = async () => {
    if (savedRecipes.length === 0) return;
    if (pantryItems.length === 0) {
      Alert.alert(t('pantryEmpty', language) || 'Pantry Empty', t('addItemsToPantry', language) || 'Add items to your pantry first!');
      setOnlyCookable(false);
      return;
    }

    setIsMatchingPantry(true);
    try {
      const idToken = await auth.currentUser.getIdToken();
      const pantryNames = pantryItems.map(item => item.itemName || item.name);
      
      // Prepare recipes payload (lightweight)
      const recipesPayload = savedRecipes.map(r => ({
        id: r.id,
        name: r.recipeName,
        ingredients: r.recipeData?.ingredients || []
      }));

      const response = await fetchWithTimeout(config.matchPantryToRecipes, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          recipes: recipesPayload,
          pantryItems: pantryNames,
          language
        })
      }, 60000); // Longer timeout for AI

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to match recipes');

      setAiMatchResults(result);
    } catch (error) {
      console.error('Error matching pantry:', error);
      Alert.alert(t('error', language), t('failedToMatchPantry', language) || 'Failed to match pantry. Please try again.');
      setOnlyCookable(false);
    } finally {
      setIsMatchingPantry(false);
    }
  };

  const toggleCookableFilter = () => {
    const newValue = !onlyCookable;
    setOnlyCookable(newValue);
    
    if (newValue && Object.keys(aiMatchResults).length === 0) {
      matchPantryWithAI();
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4A7C59" />
        <Text style={styles.loadingText}>{t('loading', language)}</Text>
      </View>
    );
  }

  // Detail View
  if (selectedRecipe && recipeDetails) {
    return (
      <SafeAreaView style={styles.detailSafeArea} edges={['left', 'right']}>
        <ScrollView style={styles.detailScroll} contentContainerStyle={styles.detailScrollContent}>
          <View style={styles.recipeHeader}>
            <Text style={styles.recipeTitle}>{selectedRecipe.name}</Text>
            {recipeDetails.nutrition && (
              <View style={styles.nutritionCard}>
                <Text style={styles.nutritionTitle}>🔥 {t('nutrition', language)}</Text>
                <View style={styles.nutritionGrid}>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionValue}>{recipeDetails.nutrition.calories}</Text>
                    <Text style={styles.nutritionLabel}>{t('calories', language)}</Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionValue}>{recipeDetails.nutrition.protein}</Text>
                    <Text style={styles.nutritionLabel}>{t('protein', language)}</Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionValue}>{recipeDetails.nutrition.carbs}</Text>
                    <Text style={styles.nutritionLabel}>{t('carbs', language)}</Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionValue}>{recipeDetails.nutrition.fat}</Text>
                    <Text style={styles.nutritionLabel}>{t('fat', language)}</Text>
                  </View>
                </View>
                <Text style={styles.perServingText}>
                  {t('perServing', language)} ({servings} {t('servings', language)})
                </Text>
              </View>
            )}
            <View style={styles.recipeMetaRow}>
              {recipeDetails.cuisine && (
                <View style={styles.metaChip}>
                  <Text style={styles.metaChipText}>🍴 {recipeDetails.cuisine}</Text>
                </View>
              )}
              {recipeDetails.difficulty && (
                <View style={styles.metaChip}>
                  <Text style={styles.metaChipText}>⚡ {recipeDetails.difficulty}</Text>
                </View>
              )}
            </View>
            <Text style={styles.recipeTime}>
              🕒 {t('prepTime', language)}: {recipeDetails.prepTime || '—'}
            </Text>
            <Text style={styles.recipeTime}>
              ⏱️ {t('cookTime', language)}: {recipeDetails.cookTime || '30 minutes'}
            </Text>
            
            <View style={styles.servingsControl}>
              <Text style={styles.recipeServings}>
                👥 {t('servings', language)}:
              </Text>
              <View style={styles.servingsAdjuster}>
                <TouchableOpacity 
                  style={styles.servingsButton} 
                  onPress={() => adjustServings(-1)}
                  hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                >
                  <Text style={styles.servingsButtonText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.servingsValue}>{servings}</Text>
                <TouchableOpacity 
                  style={styles.servingsButton} 
                  onPress={() => adjustServings(1)}
                  hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                >
                  <Text style={styles.servingsButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10}}>
              <Text style={[styles.sectionTitle, {marginBottom: 0}]}>📝 {t('ingredients', language)}</Text>
              <TouchableOpacity 
                style={{
                  backgroundColor: '#E8F5E9', 
                  paddingHorizontal: 12, 
                  paddingVertical: 6, 
                  borderRadius: 15,
                  borderWidth: 1,
                  borderColor: '#4A7C59'
                }}
                onPress={checkPantryForIngredients}
              >
                <Text style={{color: '#4A7C59', fontWeight: '600', fontSize: 12}}>
                  🔍 {t('checkPantry', language) || 'Check Pantry'}
                </Text>
              </TouchableOpacity>
            </View>
            {recipeDetails.ingredients && recipeDetails.ingredients.map((ingredient, index) => (
              <Text key={index} style={styles.ingredient}>
                • {scaleIngredient(ingredient, parseInt(recipeDetails.servings) || 4, servings)}
              </Text>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👨‍🍳 {t('instructions', language)}</Text>
            {recipeDetails.instructions && recipeDetails.instructions.map((step, index) => {
              const stepText = getStepText(step);
              const stepWhy = getStepWhy(step);
              return (
                <View key={index} style={styles.stepContainer}>
                  <Text style={styles.stepNumber}>{t('step', language)} {index + 1}</Text>
                  <Text style={styles.stepText}>
                    {stepText}
                  </Text>
                  {stepWhy && (
                    <Text style={styles.stepWhy}>💡 {stepWhy}</Text>
                  )}
                </View>
              );
            })}
          </View>

          {recipeDetails.tips && recipeDetails.tips.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>💡 {t('chefsTips', language)}</Text>
              {recipeDetails.tips.map((tip, index) => (
                <Text key={index} style={styles.tip}>
                  • {getStepText(tip)}
                </Text>
              ))}
            </View>
          )}

          {/* Rating Section */}
          <View style={styles.ratingSection}>
            <Text style={styles.ratingSectionTitle}>⭐ {t('rateThisRecipe', language)}</Text>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setUserRating(star)}
                  hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
                >
                  <Text style={styles.star}>
                    {star <= userRating ? '⭐' : '☆'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {userRating > 0 && (
              <TouchableOpacity
                style={styles.saveRatingButton}
                onPress={() => saveRecipeRating(userRating)}
              >
                <Text style={styles.saveRatingButtonText}>{t('saveRating', language)}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Collections Section */}
          <View style={styles.collectionsSection}>
            <Text style={styles.collectionsSectionTitle}>📚 {t('addToCollection', language)}</Text>
            <View style={styles.collectionButtonsRow}>
              <TouchableOpacity
                style={[styles.collectionButton, styles.favoriteButton, isFavorite && styles.favoriteButtonActive]}
                onPress={() => toggleCollection('favorite')}
              >
                <Text style={styles.collectionButtonEmoji}>{isFavorite ? '❤️' : '🤍'}</Text>
                <Text style={[styles.collectionButtonText, isFavorite && styles.collectionButtonTextActive]}>{t('favorite', language)}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.collectionButton, styles.cookedButton, isCooked && styles.cookedButtonActive]}
                onPress={() => toggleCollection('cooked')}
              >
                <Text style={styles.collectionButtonEmoji}>{isCooked ? '✅' : '☑️'}</Text>
                <Text style={[styles.collectionButtonText, isCooked && styles.collectionButtonTextActive]}>{t('cooked', language)}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.collectionButton, styles.wantToTryButton, wantToTry && styles.wantToTryButtonActive]}
                onPress={() => toggleCollection('wantToTry')}
              >
                <Text style={styles.collectionButtonEmoji}>{wantToTry ? '⭐' : '☆'}</Text>
                <Text style={[styles.collectionButtonText, wantToTry && styles.collectionButtonTextActive]}>{t('wantToTry', language)}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.collectionButton, styles.wouldMakeAgainButton, wouldMakeAgain && styles.wouldMakeAgainButtonActive]}
                onPress={() => toggleCollection('wouldMakeAgain')}
              >
                <Text style={styles.collectionButtonEmoji}>{wouldMakeAgain ? '🔁' : '🔄'}</Text>
                <Text style={[styles.collectionButtonText, wouldMakeAgain && styles.collectionButtonTextActive]}>{t('wouldMakeAgain', language) || 'Again'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* AI Footer Notice */}
          <View style={styles.aiFooterNoticeContainer}>
            <Text style={styles.aiFooterNoticeText}>
              {t('aiDisclaimer', language) || 'Recipe was generated by AI and could make mistakes.'}
            </Text>
          </View>

          <TouchableOpacity style={styles.bottomShareButton} onPress={shareRecipe}>
            <Text style={styles.bottomShareButtonText}>🔗 {t('share', language)}</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Pantry Check Modal */}
        <Modal
          visible={showPantryCheckModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowPantryCheckModal(false)}
        >
          <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20}}>
            <View style={{backgroundColor: '#fff', borderRadius: 20, padding: 20, maxHeight: '80%'}}>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15}}>
                <Text style={{fontSize: 20, fontWeight: 'bold', color: '#3D405B'}}>
                  {checkingPantry ? (t('checkingPantry', language) || 'Checking Pantry...') : (t('pantryCheck', language) || 'Pantry Check')}
                </Text>
                {!checkingPantry && (
                  <TouchableOpacity onPress={() => setShowPantryCheckModal(false)}>
                    <Text style={{fontSize: 24, color: '#999'}}>×</Text>
                  </TouchableOpacity>
                )}
              </View>

              {checkingPantry ? (
                <View style={{padding: 20, alignItems: 'center'}}>
                  <ActivityIndicator size="large" color="#4A7C59" />
                  <Text style={{marginTop: 15, color: '#666', textAlign: 'center'}}>
                    {t('aiComparingIngredients', language) || 'AI is comparing recipe ingredients with your pantry...'}
                  </Text>
                </View>
              ) : (
                <ScrollView style={{marginBottom: 15}}>
                  {pantryCheckResult && (
                    <>
                      <View style={{marginBottom: 20}}>
                        <Text style={{fontSize: 16, fontWeight: '600', color: '#4A7C59', marginBottom: 10}}>
                          ✅ {t('youHave', language) || 'You Have'} ({pantryCheckResult.available?.length || 0})
                        </Text>
                        {pantryCheckResult.available?.length > 0 ? (
                          pantryCheckResult.available.map((item, i) => (
                            <Text key={i} style={{fontSize: 14, color: '#333', marginLeft: 10, marginBottom: 4}}>• {item}</Text>
                          ))
                        ) : (
                          <Text style={{fontSize: 14, color: '#999', fontStyle: 'italic', marginLeft: 10}}>
                            {t('noMatchingItems', language) || 'No matching items found'}
                          </Text>
                        )}
                      </View>

                      <View>
                        <Text style={{fontSize: 16, fontWeight: '600', color: '#E07A5F', marginBottom: 10}}>
                          ❌ {t('missing', language) || 'Missing'} ({pantryCheckResult.missing?.length || 0})
                        </Text>
                        {pantryCheckResult.missing?.length > 0 ? (
                          pantryCheckResult.missing.map((item, i) => (
                            <TouchableOpacity 
                              key={i} 
                              style={{flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginLeft: 5}}
                              onPress={() => {
                                if (itemsToShop.includes(item)) {
                                  setItemsToShop(itemsToShop.filter(i => i !== item));
                                } else {
                                  setItemsToShop([...itemsToShop, item]);
                                }
                              }}
                            >
                              <Text style={{fontSize: 18, marginRight: 10}}>
                                {itemsToShop.includes(item) ? '☑️' : '☐'}
                              </Text>
                              <Text style={{fontSize: 14, color: '#333'}}>{item}</Text>
                            </TouchableOpacity>
                          ))
                        ) : (
                          <Text style={{fontSize: 14, color: '#999', fontStyle: 'italic', marginLeft: 10}}>
                            {t('youHaveEverything', language) || 'You have everything!'}
                          </Text>
                        )}
                      </View>
                    </>
                  )}
                </ScrollView>
              )}

              {!checkingPantry && pantryCheckResult && (
                <TouchableOpacity 
                  style={{
                    backgroundColor: itemsToShop.length > 0 ? '#4A7C59' : '#ccc',
                    padding: 15,
                    borderRadius: 12,
                    alignItems: 'center'
                  }}
                  disabled={itemsToShop.length === 0}
                  onPress={addToShoppingList}
                >
                  <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 16}}>
                    {itemsToShop.length > 0 
                      ? `${t('addToShoppingList', language) || 'Add to Shopping List'} (${itemsToShop.length})`
                      : (t('nothingToAdd', language) || 'Nothing to Add')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // List View
  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContentContainer}>
        <View style={styles.savedRecipesSection}>
          {/* Collection Filter Tabs */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.collectionFilterContainer}
          >
            {['all', 'favorite', 'cooked', 'wantToTry', 'wouldMakeAgain'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.collectionFilterTab,
                  selectedCollectionFilter === type && styles.collectionFilterTabActive
                ]}
                onPress={() => setSelectedCollectionFilter(type)}
              >
                <Text style={[
                  styles.collectionFilterText,
                  selectedCollectionFilter === type && styles.collectionFilterTextActive
                ]}>
                  {type === 'all' && `🍽️ ${t('all', language)}`}
                  {type === 'favorite' && `❤️ ${t('favorites', language)}`}
                  {type === 'cooked' && `✅ ${t('cooked', language)}`}
                  {type === 'wantToTry' && `⭐ ${t('wantToTry', language)}`}
                  {type === 'wouldMakeAgain' && `🔁 ${t('wouldMakeAgain', language) || 'Again'}`}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Search and Sort Controls */}
          <View style={styles.savedRecipesControls}>
            <View style={styles.searchRow}>
              <View style={styles.searchContainer}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder={t('searchRecipes', language) || 'Search recipes...'}
                  value={savedRecipesSearchText}
                  onChangeText={setSavedRecipesSearchText}
                  placeholderTextColor="#999"
                />
                {savedRecipesSearchText.length > 0 && (
                  <TouchableOpacity onPress={() => setSavedRecipesSearchText('')}>
                    <Text style={styles.clearSearchIcon}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity 
                style={[
                  styles.aiFilterButton,
                  onlyCookable && styles.aiFilterButtonActive
                ]}
                onPress={toggleCookableFilter}
                disabled={isMatchingPantry}
              >
                {isMatchingPantry ? (
                  <ActivityIndicator size="small" color="#0284C7" />
                ) : (
                  <Text style={styles.aiFilterIcon}>✨</Text>
                )}
                <Text style={[
                  styles.aiFilterText,
                  onlyCookable && styles.aiFilterTextActive
                ]}>
                  {isMatchingPantry ? (t('matching', language) || 'Matching...') : (t('cookNow', language) || 'Match Pantry')}
                </Text>
              </TouchableOpacity>
            </View>

            {onlyCookable && (
              <View style={styles.activeFilterBanner}>
                <Text style={styles.activeFilterBannerText}>
                  ℹ️ {t('matchPantryExplanation', language) || 'Showing recipes matching your pantry ingredients'}
                </Text>
              </View>
            )}

            <TouchableOpacity 
              style={styles.filterToggleHeader}
              onPress={() => setShowSavedRecipesFilters(!showSavedRecipesFilters)}
            >
              <Text style={styles.filterToggleText}>
                {t('filters', language) || 'Filters'}
              </Text>
              <Text style={styles.filterToggleArrow}>
                {showSavedRecipesFilters ? '▼' : '▶'}
              </Text>
            </TouchableOpacity>

            {showSavedRecipesFilters && (
              <View style={styles.collapsibleFilters}>
                {(savedRecipesSortBy !== 'date' || savedRecipesRatingFilter > 0 || selectedCollectionFilter !== 'all' || savedRecipesSearchText.length > 0 || onlyCookable) && (
                  <View style={styles.activeFiltersHeader}>
                    <Text style={styles.activeFiltersText}>
                      {t('activeFilters', language) || 'Active Filters'}
                    </Text>
                    <TouchableOpacity 
                      onPress={() => {
                        setSavedRecipesSearchText('');
                        setSavedRecipesSortBy('date');
                        setSavedRecipesSortOrder('desc');
                        setSavedRecipesRatingFilter(0);
                        setSelectedCollectionFilter('all');
                        setOnlyCookable(false);
                      }}
                      style={styles.resetButton}
                    >
                      <Text style={styles.resetButtonText}>{t('resetAll', language) || 'Reset All'}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>{t('sortBy', language) || 'Sort By'}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                    {['date', 'rating', 'name'].map((sortType) => (
                      <TouchableOpacity
                        key={sortType}
                        style={[
                          styles.sortChip,
                          savedRecipesSortBy === sortType && styles.sortChipActive
                        ]}
                        onPress={() => {
                          if (savedRecipesSortBy === sortType) {
                            setSavedRecipesSortOrder(savedRecipesSortOrder === 'desc' ? 'asc' : 'desc');
                          } else {
                            setSavedRecipesSortBy(sortType);
                            setSavedRecipesSortOrder(sortType === 'name' ? 'asc' : 'desc');
                          }
                        }}
                      >
                        <Text style={[
                          styles.sortChipText,
                          savedRecipesSortBy === sortType && styles.sortChipTextActive
                        ]}>
                          {sortType === 'date' && '📅 Date'}
                          {sortType === 'rating' && '⭐ Rating'}
                          {sortType === 'name' && 'Aa Name'}
                          {savedRecipesSortBy === sortType && (savedRecipesSortOrder === 'asc' ? ' ↑' : ' ↓')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>{t('filterByRating', language) || 'Filter by Rating'}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                    {[5, 4, 3, 2, 1].map((star) => (
                      <TouchableOpacity
                        key={star}
                        style={[
                          styles.ratingChip,
                          savedRecipesRatingFilter === star && styles.ratingChipActive
                        ]}
                        onPress={() => setSavedRecipesRatingFilter(savedRecipesRatingFilter === star ? 0 : star)}
                      >
                        <Text style={[
                          styles.ratingChipText,
                          savedRecipesRatingFilter === star && styles.ratingChipTextActive
                        ]}>
                          {star} ★ {savedRecipesRatingFilter === star && 'Only'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            )}
          </View>

          <View style={styles.savedRecipesList}>
            {savedRecipes
              .filter(recipe => {
                if (selectedCollectionFilter !== 'all' && recipe.collectionType !== selectedCollectionFilter) return false;
                
                if (savedRecipesSearchText) {
                  const searchLower = savedRecipesSearchText.toLowerCase();
                  const nameMatch = recipe.recipeName?.toLowerCase().includes(searchLower);
                  const descMatch = recipe.recipeData?.description?.toLowerCase().includes(searchLower);
                  if (!nameMatch && !descMatch) return false;
                }

                if (savedRecipesRatingFilter > 0) {
                  const rating = userRatings[recipe.recipeName] || 0;
                  if (Math.floor(rating) !== savedRecipesRatingFilter) return false;
                }

                if (onlyCookable) {
                  // AI Matching Logic
                  if (Object.keys(aiMatchResults).length > 0) {
                    const match = aiMatchResults[recipe.id];
                    // Show COOK_NOW and ALMOST
                    return match && (match.status === 'COOK_NOW' || match.status === 'ALMOST');
                  }

                  // Fallback: Local String Matching (Strict)
                  const ingredients = recipe.recipeData?.ingredients || [];
                  if (ingredients.length === 0) return false;
                  
                  const pantryNames = pantryItems.map(item => (item.itemName || item.name || '').toLowerCase());
                  
                  const allIngredientsCovered = ingredients.every(ing => {
                    const ingLower = ing.toLowerCase();
                    if (['salt', 'pepper', 'water', 'oil', 'sugar', 'flour', 'butter'].some(s => ingLower.includes(s))) return true;

                    return pantryNames.some(pantryItem => {
                      if (!pantryItem) return false;
                      return ingLower.includes(pantryItem);
                    });
                  });
                  
                  if (!allIngredientsCovered) return false;
                }

                return true;
              })
              .sort((a, b) => {
                let comparison = 0;
                switch (savedRecipesSortBy) {
                  case 'date':
                    const dateA = a.timestamp ? new Date(a.timestamp) : new Date(0);
                    const dateB = b.timestamp ? new Date(b.timestamp) : new Date(0);
                    comparison = dateA - dateB;
                    break;
                  case 'rating':
                    const ratingA = userRatings[a.recipeName] || 0;
                    const ratingB = userRatings[b.recipeName] || 0;
                    comparison = ratingA - ratingB;
                    break;
                  case 'name':
                    const nameA = a.recipeName || '';
                    const nameB = b.recipeName || '';
                    comparison = nameA.localeCompare(nameB);
                    break;
                }
                return savedRecipesSortOrder === 'asc' ? comparison : -comparison;
              })
              .map((recipe) => (
                <TouchableOpacity
                  key={recipe.id}
                  style={styles.savedRecipeCard}
                  onPress={() => {
                    setSelectedRecipe({
                      id: recipe.id,
                      name: recipe.recipeName,
                      emoji: recipe.recipeData?.emoji,
                      description: recipe.recipeData?.description,
                      cuisine: recipe.recipeData?.cuisine,
                      difficulty: recipe.recipeData?.difficulty,
                      prepTime: recipe.recipeData?.prepTime,
                      cookTime: recipe.recipeData?.cookTime,
                      servings: recipe.recipeData?.servings,
                    });
                    setRecipeDetails({
                      ingredients: recipe.recipeData?.ingredients || [],
                      instructions: recipe.recipeData?.instructions || [],
                      tips: recipe.recipeData?.tips || [],
                      nutrition: recipe.recipeData?.nutrition || null,
                      cuisine: recipe.recipeData?.cuisine,
                      difficulty: recipe.recipeData?.difficulty,
                      prepTime: recipe.recipeData?.prepTime,
                      cookTime: recipe.recipeData?.cookTime,
                      servings: recipe.recipeData?.servings,
                    });
                    // Set initial state for collection buttons
                    setIsFavorite(recipe.collectionType === 'favorite');
                    setIsCooked(recipe.collectionType === 'cooked');
                    setWantToTry(recipe.collectionType === 'wantToTry');
                    setWouldMakeAgain(recipe.collectionType === 'wouldMakeAgain');
                    setUserRating(userRatings[recipe.recipeName] || 0);
                  }}
                >
                  <View style={styles.savedRecipeCardContent}>
                    <Text style={styles.savedRecipeEmoji}>
                      {getValidEmoji(recipe.recipeData?.emoji)}
                    </Text>
                    <View style={styles.savedRecipeInfo}>
                      <View style={styles.savedRecipeNameRow}>
                        <Text style={styles.savedRecipeName}>
                          {recipe.recipeName}
                        </Text>
                        <Text style={styles.savedRecipeBadge}>
                          {recipe.collectionType === 'favorite' && '❤️'}
                          {recipe.collectionType === 'cooked' && '✅'}
                          {recipe.collectionType === 'wantToTry' && '⭐'}
                          {recipe.collectionType === 'wouldMakeAgain' && '🔁'}
                        </Text>
                      </View>
                      
                      {onlyCookable && aiMatchResults[recipe.id] && (
                        <View style={{marginBottom: 6}}>
                          {aiMatchResults[recipe.id].status === 'COOK_NOW' ? (
                            <Text style={{color: '#22C55E', fontWeight: 'bold', fontSize: 12}}>
                              ✅ {t('readyToCook', language) || 'Ready to Cook!'}
                            </Text>
                          ) : (
                            <Text style={{color: '#EAB308', fontWeight: 'bold', fontSize: 12}}>
                              ⚠️ {t('missing', language) || 'Missing'}: {aiMatchResults[recipe.id].missingIngredients?.join(', ')}
                            </Text>
                          )}
                        </View>
                      )}

                      {recipe.recipeData?.description && (
                        <Text style={styles.savedRecipeDescription} numberOfLines={1}>
                          {getStepText(recipe.recipeData.description)}
                        </Text>
                      )}
                      <Text style={styles.savedRecipeMeta}>
                        {userRatings[recipe.recipeName] && `⭐ ${userRatings[recipe.recipeName]} • `}
                        {recipe.recipeData?.prepTime && `🕒 ${recipe.recipeData.prepTime}`}
                        {recipe.recipeData?.prepTime && recipe.recipeData?.cookTime && ' • '}
                        {recipe.recipeData?.cookTime && `⏱️ ${recipe.recipeData.cookTime}`}
                      </Text>
                    </View>
                    <View style={styles.savedRecipeActions}>
                      <TouchableOpacity
                        style={styles.savedRecipeRemoveButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          Alert.alert(
                            t('confirmRemove', language) || 'Remove Recipe?',
                            t('confirmRemoveMessage', language) || 'Are you sure you want to remove this recipe from your collection?',
                            [
                              { text: t('cancel', language) || 'Cancel', style: 'cancel' },
                              { 
                                text: t('remove', language) || 'Remove', 
                                style: 'destructive',
                                onPress: () => removeFromCollection(recipe.id)
                              }
                            ]
                          );
                        }}
                      >
                        <Text style={styles.savedRecipeRemoveButtonText}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={styles.recipeCardArrow}>→</Text>
                </TouchableOpacity>
              ))}
            {savedRecipes.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>{t('noSavedRecipes', language) || 'No saved recipes yet'}</Text>
                <Text style={styles.emptySubText}>{t('saveRecipesToSeeThemHere', language) || 'Save recipes from the Recipes tab to see them here!'}</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1DE',
  },
  centerContainer: {
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
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 20,
  },
  savedRecipesSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  collectionFilterContainer: {
    marginBottom: 15,
  },
  collectionFilterTab: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  collectionFilterTabActive: {
    backgroundColor: '#4A7C59',
    borderColor: '#4A7C59',
  },
  collectionFilterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  collectionFilterTextActive: {
    color: '#FFF',
  },
  savedRecipesControls: {
    marginBottom: 10,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 14,
    color: '#333',
  },
  clearSearchIcon: {
    fontSize: 16,
    color: '#999',
    padding: 4,
  },
  aiFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    gap: 6,
  },
  aiFilterButtonActive: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0EA5E9',
    borderWidth: 2,
  },
  aiFilterIcon: {
    fontSize: 18,
  },
  aiFilterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  aiFilterTextActive: {
    color: '#0284C7',
    fontWeight: 'bold',
  },
  filterToggleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 5,
  },
  filterToggleText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '600',
  },
  filterToggleArrow: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: 'bold',
  },
  collapsibleFilters: {
    marginTop: 5,
  },
  activeFiltersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  activeFiltersText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
  },
  resetButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
  },
  resetButtonText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },
  filterSection: {
    marginBottom: 15,
  },
  filterSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipsScroll: {
    flexDirection: 'row',
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
  },
  sortChipActive: {
    backgroundColor: '#E0F2FE',
    borderColor: '#7DD3FC',
  },
  sortChipText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  sortChipTextActive: {
    color: '#0369A1',
    fontWeight: '600',
  },
  ratingChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
  },
  ratingChipActive: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
  },
  ratingChipText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  ratingChipTextActive: {
    color: '#B45309',
    fontWeight: '600',
  },
  savedRecipesList: {
    marginTop: 5,
  },
  savedRecipeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  savedRecipeCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  savedRecipeEmoji: {
    fontSize: 40,
    marginRight: 15,
  },
  savedRecipeInfo: {
    flex: 1,
  },
  savedRecipeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  savedRecipeName: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3D405B',
    marginRight: 8,
  },
  savedRecipeBadge: {
    fontSize: 20,
  },
  savedRecipeDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  savedRecipeMeta: {
    fontSize: 13,
    color: '#999',
  },
  savedRecipeActions: {
    marginLeft: 10,
  },
  savedRecipeRemoveButton: {
    padding: 8,
  },
  savedRecipeRemoveButtonText: {
    fontSize: 22,
  },
  recipeCardArrow: {
    fontSize: 24,
    color: '#E07A5F',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3D405B',
    marginBottom: 10,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  // Detail View Styles
  detailSafeArea: {
    flex: 1,
    backgroundColor: '#F4F1DE',
  },
  detailScroll: {
    flex: 1,
  },
  detailScrollContent: {
    paddingTop: 10,
    paddingBottom: 40,
  },
  recipeHeader: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  recipeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  recipeEmoji: {
    fontSize: 60,
    marginBottom: 15,
  },
  nutritionCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 15,
    marginVertical: 15,
    borderWidth: 2,
    borderColor: '#FEE2E2',
    width: '100%',
  },
  nutritionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E11D48',
    marginBottom: 12,
    textAlign: 'center',
  },
  nutritionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  nutritionItem: {
    alignItems: 'center',
  },
  nutritionValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E11D48',
    marginBottom: 4,
  },
  nutritionLabel: {
    fontSize: 11,
    color: '#666',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  perServingText: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  recipeMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginVertical: 15,
  },
  metaChip: {
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  metaChipText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },
  recipeTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  servingsControl: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  recipeServings: {
    fontSize: 14,
    color: '#666',
    marginRight: 10,
  },
  servingsAdjuster: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 5,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  servingsButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  servingsButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4A7C59',
  },
  servingsValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    minWidth: 24,
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  ingredient: {
    fontSize: 16,
    color: '#555',
    marginBottom: 8,
    lineHeight: 24,
  },
  stepContainer: {
    marginBottom: 20,
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E11D48',
    marginBottom: 5,
  },
  stepText: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
  },
  stepWhy: {
    fontSize: 14,
    color: '#666',
    marginTop: 6,
    fontStyle: 'italic',
    backgroundColor: '#F9FAFB',
    padding: 8,
    borderRadius: 6,
  },
  tip: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  ratingSection: {
    backgroundColor: '#FFFBEB',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FEF3C7',
    alignItems: 'center',
  },
  ratingSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#92400E',
    marginBottom: 15,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  star: {
    fontSize: 40,
  },
  saveRatingButton: {
    backgroundColor: '#E11D48',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  saveRatingButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  collectionsSection: {
    backgroundColor: '#F0F9FF',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#DBEAFE',
  },
  collectionsSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 15,
    textAlign: 'center',
  },
  collectionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 10,
  },
  collectionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: '#fff',
  },
  favoriteButton: {
    borderColor: '#FCA5A5',
  },
  favoriteButtonActive: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
  },
  cookedButton: {
    borderColor: '#86EFAC',
  },
  cookedButtonActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#22C55E',
  },
  wantToTryButton: {
    borderColor: '#FDE047',
  },
  wantToTryButtonActive: {
    backgroundColor: '#FEF9C3',
    borderColor: '#EAB308',
  },
  wouldMakeAgainButton: {
    borderColor: '#A78BFA',
  },
  wouldMakeAgainButtonActive: {
    backgroundColor: '#EDE9FE',
    borderColor: '#8B5CF6',
  },
  collectionButtonEmoji: {
    fontSize: 28,
    marginBottom: 5,
  },
  collectionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
  collectionButtonTextActive: {
    color: '#1F2937',
    fontWeight: 'bold',
  },
  bottomShareButton: {
    marginHorizontal: 20,
    marginBottom: 15,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  bottomShareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  activeFilterBanner: {
    backgroundColor: '#E0F2FE',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#0EA5E9',
  },
  activeFilterBannerText: {
    fontSize: 13,
    color: '#0369A1',
    fontWeight: '500',
    textAlign: 'center',
  },
  aiFooterNoticeContainer: {
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  aiFooterNoticeText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
