// Recipe Generator Component - Suggests dishes based on pantry items

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Platform,
  TextInput,
  Share,
  Modal,
  Linking
} from 'react-native';
import { getFirestore, collection, query, onSnapshot, addDoc, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { app, auth } from '../firebase.config';
import { useLanguage } from '../contexts/LanguageContext';
import { t } from '../contexts/translations';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getUserUsage } from '../utils/usageTracking';
import { config } from '../config';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import { scaleIngredient } from '../utils/ingredientScaler';

const USDA_NUTRITION_URL = 'https://fdc.nal.usda.gov/';

// Helper function to validate emoji - returns default if not a valid emoji
const getValidEmoji = (emoji) => {
  if (!emoji || typeof emoji !== 'string') return '🍽️';
  // Emoji regex - matches most common food emojis and other emojis
  const emojiRegex = /^[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
  // Check if it starts with an emoji (allow emoji followed by other chars)
  if (emojiRegex.test(emoji) && emoji.length <= 4) {
    return emoji;
  }
  return '🍽️';
};

export default function RecipeGenerator() {
  const [pantryItems, setPantryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingRecipes, setGeneratingRecipes] = useState(false);
  const [suggestedRecipes, setSuggestedRecipes] = useState([]);
  const [allRecipes, setAllRecipes] = useState([]); // Store all recipes before filtering
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [recipeDetails, setRecipeDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedDishCategory, setSelectedDishCategory] = useState(null);
  const [selectedTimeFilter, setSelectedTimeFilter] = useState('all');
  const [selectedDietaryFilter, setSelectedDietaryFilter] = useState('all');
  const [userRating, setUserRating] = useState(0);
  const [wouldMakeAgain, setWouldMakeAgain] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isCooked, setIsCooked] = useState(false);
  const [wantToTry, setWantToTry] = useState(false);
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [showIngredientSelector, setShowIngredientSelector] = useState(false);
  const [userGuidance, setUserGuidance] = useState('');
  const [showGuidanceInput, setShowGuidanceInput] = useState(false);
  const [householdId, setHouseholdId] = useState(null);
  
  const [usageData, setUsageData] = useState(null);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [showPantryCheckModal, setShowPantryCheckModal] = useState(false);
  const [pantryCheckResult, setPantryCheckResult] = useState(null);
  const [checkingPantry, setCheckingPantry] = useState(false);
  const [itemsToShop, setItemsToShop] = useState([]);
  const [servings, setServings] = useState(4);
  const { language } = useLanguage();
  const navigation = useNavigation();

  // Update header when recipe is selected
  useEffect(() => {
    if (selectedRecipe) {
      if (recipeDetails?.servings) {
        // Handle range like "4-6" or text like "Makes 4" by extracting first number
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
            style={{ marginLeft: 16, flexDirection: 'row', alignItems: 'center' }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 18, marginRight: 4 }}>←</Text>
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
              {t('back', language) || 'Back'}
            </Text>
          </TouchableOpacity>
        ),
        headerRight: () => null,
      });
    } else {
      navigation.setOptions({
        headerLeft: () => (
          <TouchableOpacity
            style={[styles.languageButton, { marginRight: 0, marginLeft: 16 }]}
            onPress={() => navigation.navigate('CustomRecipeGenerator')}
          >
            <Text style={styles.languageButtonText}>👨‍🍳</Text>
          </TouchableOpacity>
        ),
        headerRight: () => (
          <TouchableOpacity
            style={styles.languageButton}
            onPress={() => navigation.navigate('SavedRecipes')}
          >
            <Text style={styles.languageButtonText}>📚</Text>
          </TouchableOpacity>
        ),
      });
    }
  }, [selectedRecipe, recipeDetails, navigation, language]);

  const adjustServings = (delta) => {
    setServings(prev => Math.max(1, prev + delta));
  };

  const db = getFirestore(app);

  // Define dietary preference filters
  const dietaryFilters = [
    { id: 'all', label: t('allDiets', language), emoji: '🍽️' },
    { id: 'vegetarian', label: t('vegetarian', language), emoji: '🥬' },
    { id: 'vegan', label: t('vegan', language), emoji: '🌱' },
    { id: 'glutenFree', label: t('glutenFree', language), emoji: '🌾' },
    { id: 'lowCalorie', label: t('lowCalorie', language), emoji: '🔥' },
  ];

  // Define time filters
  const timeFilters = [
    { id: 'all', label: t('allTime', language), emoji: '⏰' },
    { id: 'quick', label: t('quickRecipes', language), emoji: '⚡', max: 30 },
    { id: 'medium', label: t('mediumRecipes', language), emoji: '🕐', min: 30, max: 60 },
    { id: 'long', label: t('longRecipes', language), emoji: '🕰️', min: 60 },
  ];

  // Define dish categories
  const dishCategories = [
    { id: 'mainCourse', label: t('mainCourse', language), emoji: '🍽️' },
    { id: 'salad', label: t('salad', language), emoji: '🥗' },
    { id: 'dessert', label: t('dessert', language), emoji: '🍰' },
    { id: 'breakfast', label: t('breakfast', language), emoji: '🍳' },
    { id: 'soup', label: t('soup', language), emoji: '🥣' },
    { id: 'snack', label: t('snack', language), emoji: '🍿' },
  ];

  // Fetch pantry items
  useEffect(() => {
    let unsubscribeSnapshot = null;
    
    // Wait for authentication
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      // Cleanup previous snapshot listener if it exists
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }
      
      if (!user) {
        if (__DEV__) {
          console.log('Waiting for user authentication for pantry items...');
        }
        setLoading(false);
        return;
      }
      
      const userId = user.uid;
      if (__DEV__) {
        console.log('Loading pantry items for user:', userId);
      }

      // Check if user is in a household
      let pantryPath = `users/${userId}/pantry`;
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        const userData = userDoc.exists() ? userDoc.data() : null;
        if (userData?.householdId) {
          setHouseholdId(userData.householdId);
          pantryPath = `households/${userData.householdId}/pantry`;
          if (__DEV__) {
            console.log('Using household pantry:', pantryPath);
          }
        } else {
          setHouseholdId(null);
        }
      } catch (error) {
        console.error('Error checking household:', error);
      }

      const q = query(collection(db, pantryPath));

      unsubscribeSnapshot = onSnapshot(
        q,
        (querySnapshot) => {
          const items = [];
          querySnapshot.forEach((doc) => {
            items.push({
              id: doc.id,
              ...doc.data()
            });
          });
          setPantryItems(items);
          setLoading(false);
          
          // Initialize selected ingredients with all items
          const itemNames = items
            .map(item => item.itemName || item.name)
            .filter(name => name);
          setSelectedIngredients(itemNames);
        },
        (error) => {
          // Silently handle permission errors during auth transitions
          if (error.code === 'permission-denied') {
            if (__DEV__) {
              console.log('Permission denied - user may be signing out');
            }
            setPantryItems([]);
            setLoading(false);
            return;
          }
          console.error('Error fetching pantry items:', error);
          Alert.alert('Error', 'Failed to load pantry items');
          setLoading(false);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, []);

  // Load usage data
  useEffect(() => {
    if (auth.currentUser) {
      loadUsageData(auth.currentUser.uid);
    }
  }, [auth.currentUser?.uid]);

  // Reload usage data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (auth.currentUser) {
        loadUsageData(auth.currentUser.uid);
      }
    }, [])
  );

  const loadUsageData = async (userId) => {
    try {
      setLoadingUsage(true);
      const usage = await getUserUsage(userId);
      setUsageData(usage);
    } catch (error) {
      console.error('Error loading usage data:', error);
    } finally {
      setLoadingUsage(false);
    }
  };

  // Generate recipe suggestions
  const generateRecipeSuggestions = async () => {
    // Check if user has recipes remaining
    if (usageData && usageData.recipesRemaining <= 0) {
      const tierText = usageData.tier === 'anonymous' 
        ? t('createAccountToGetMore', language)
        : t('upgradeToPremium', language);
      
      Alert.alert(
        t('recipesLimitReached', language),
        tierText,
        [
          { text: t('cancel', language), style: 'cancel' },
          { 
            text: usageData.tier === 'anonymous' ? t('createAccount', language) : t('upgradeToPremium', language),
          }
        ]
      );
      return;
    }

    if (pantryItems.length === 0) {
      Alert.alert(t('emptyPantry', language), t('addItemsFirst', language));
      return;
    }

    if (!selectedDishCategory) {
      Alert.alert(t('selectDishType', language), t('pleaseSelectDishCategory', language));
      return;
    }

    setGeneratingRecipes(true);
    setSuggestedRecipes([]);
    setSelectedRecipe(null);
    setRecipeDetails(null);

    try {
      // Use only selected ingredients, filter out beverages
      const ingredients = selectedIngredients.filter(itemName => {
        if (!itemName) return false;
        
        const name = itemName.toLowerCase();
        const item = pantryItems.find(i => (i.itemName || i.name) === itemName);
        const category = item?.category?.toLowerCase() || '';
        
        // Exclude beverages category entirely, except milk/cream products
        if (category === 'beverages' || category === 'beverage') {
          return name.includes('milk') || name.includes('cream');
        }
        
        return true;
      });
      
      if (ingredients.length === 0) {
        Alert.alert(t('noCookingIngredients', language), t('addFoodIngredients', language));
        setGeneratingRecipes(false);
        return;
      }

      const userId = auth.currentUser.uid;

      // Create a new request document (Job-Based Approach)
      const requestData = {
        ingredients,
        language,
        dishCategory: selectedDishCategory,
        maxRecipes: 7,
        userGuidance: userGuidance.trim(),
        status: 'pending',
        createdAt: new Date(),
      };

      const docRef = await addDoc(collection(db, `users/${userId}/recipe_requests`), requestData);
      
      // Listen for updates on this specific request
      const unsubscribe = onSnapshot(doc(db, `users/${userId}/recipe_requests`, docRef.id), (docSnapshot) => {
        const data = docSnapshot.data();
        if (!data) return;

        if (data.status === 'completed') {
          unsubscribe(); // Stop listening
          
          const recipes = Array.isArray(data.recipes) ? data.recipes : [];
          const noteMessage = data.noteCode ? t(data.noteCode, language) : data.note;
          
          const sanitizedRecipes = recipes.map((recipe) => ({
            ...recipe,
            prepTime: recipe.prepTime || '',
            cookTime: recipe.cookTime || '',
          }));

          setAllRecipes(sanitizedRecipes);
          setSuggestedRecipes(sanitizedRecipes);
          setSelectedTimeFilter('all');
          setSelectedDietaryFilter('all');
          setGeneratingRecipes(false);

          if (sanitizedRecipes.length > 0) {
            // Refresh usage data
            if (auth.currentUser) {
              loadUsageData(auth.currentUser.uid);
            }

            const successMessage =
              `${t('found', language)} ${sanitizedRecipes.length} ${t('deliciousRecipes', language)}` +
              (noteMessage ? `\n\n${noteMessage}` : '');

            Alert.alert(
              t('recipesReady', language),
              successMessage,
              [{ text: 'OK' }]
            );
          } else {
            const emptyMessage = noteMessage || t('tryAddingMore', language);
            Alert.alert(t('noRecipesFound', language), emptyMessage);
          }
        } else if (data.status === 'error') {
          unsubscribe();
          setGeneratingRecipes(false);
          const errorMessage = data.details 
            ? `${data.error}: ${data.details}`
            : (data.error || 'Failed to generate recipes');
          Alert.alert(t('error', language), errorMessage);
        }
      });

    } catch (error) {
      console.error('Error initiating recipe generation:', error);
      Alert.alert(t('error', language), `${t('failedToGenerate', language)}: ${error.message}`);
      setGeneratingRecipes(false);
    }
  };

  // Toggle ingredient selection
  const toggleIngredient = (ingredientName) => {
    setSelectedIngredients(prev => {
      if (prev.includes(ingredientName)) {
        return prev.filter(name => name !== ingredientName);
      } else {
        return [...prev, ingredientName];
      }
    });
  };

  // Select/Deselect all ingredients
  const toggleAllIngredients = () => {
    if (selectedIngredients.length === pantryItems.length) {
      setSelectedIngredients([]);
    } else {
      const allNames = pantryItems
        .map(item => item.itemName || item.name)
        .filter(name => name);
      setSelectedIngredients(allNames);
    }
  };

  // Filter recipes by time
  const filterRecipesByTime = (timeFilterId) => {
    setSelectedTimeFilter(timeFilterId);
    
    // Get base recipes (apply dietary filter if active)
    let baseRecipes = allRecipes;
    if (selectedDietaryFilter !== 'all') {
      const dietaryFilterId = selectedDietaryFilter;
      baseRecipes = allRecipes.filter(recipe => {
        const name = recipe.name?.toLowerCase() || '';
        const description = recipe.description?.toLowerCase() || '';
        const ingredientsArray = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
        const ingredients = ingredientsArray.map(i => 
          typeof i === 'string' ? i.toLowerCase() : ''
        ).join(' ');
        const fullText = `${name} ${description} ${ingredients}`;

        switch (dietaryFilterId) {
          case 'vegetarian':
            return !/(meat|beef|pork|chicken|turkey|fish|salmon|tuna|shrimp|lamb|bacon|ham)/i.test(fullText);
          case 'vegan':
            return !/(meat|beef|pork|chicken|turkey|fish|salmon|tuna|shrimp|lamb|bacon|ham|egg|dairy|milk|cheese|butter|cream|yogurt|honey)/i.test(fullText);
          case 'glutenFree':
            return !/(wheat|flour|bread|pasta|noodle|barley|rye|beer|soy sauce)/i.test(fullText);
          case 'lowCalorie':
            const calories = recipe.nutrition?.calories || 999;
            return calories < 400;
          default:
            return true;
        }
      });
    }
    
    if (timeFilterId === 'all') {
      setSuggestedRecipes(baseRecipes);
      return;
    }

    const filter = timeFilters.find(f => f.id === timeFilterId);
    if (!filter) return;

    const filtered = baseRecipes.filter(recipe => {
      // Extract total minutes from prepTime and cookTime
      const getTotalMinutes = (recipe) => {
        const extractMinutes = (timeStr) => {
          if (!timeStr) return 0;
          const match = timeStr.match(/(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        };
        
        const prepMins = extractMinutes(recipe.prepTime);
        const cookMins = extractMinutes(recipe.cookTime);
        return prepMins + cookMins;
      };

      const totalMins = getTotalMinutes(recipe);
      
      if (filter.max && filter.min) {
        return totalMins >= filter.min && totalMins <= filter.max;
      } else if (filter.max) {
        return totalMins <= filter.max;
      } else if (filter.min) {
        return totalMins >= filter.min;
      }
      
      return true;
    });

    setSuggestedRecipes(filtered);
  };

  // Filter recipes by dietary preference
  const filterRecipesByDietary = (dietaryFilterId) => {
    setSelectedDietaryFilter(dietaryFilterId);
    
    if (dietaryFilterId === 'all') {
      // Apply time filter if active, otherwise show all
      filterRecipesByTime(selectedTimeFilter);
      return;
    }

    // Start with time-filtered recipes or all recipes
    const baseRecipes = selectedTimeFilter === 'all' ? allRecipes : suggestedRecipes;

    const filtered = baseRecipes.filter(recipe => {
      const name = recipe.name?.toLowerCase() || '';
      const description = recipe.description?.toLowerCase() || '';
      const ingredientsArray = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
      const ingredients = ingredientsArray.map(i => 
        typeof i === 'string' ? i.toLowerCase() : ''
      ).join(' ');
      const fullText = `${name} ${description} ${ingredients}`;

      switch (dietaryFilterId) {
        case 'vegetarian':
          // No meat, poultry, fish
          return !/(meat|beef|pork|chicken|turkey|fish|salmon|tuna|shrimp|lamb|bacon|ham)/i.test(fullText);
        
        case 'vegan':
          // No animal products
          return !/(meat|beef|pork|chicken|turkey|fish|salmon|tuna|shrimp|lamb|bacon|ham|egg|dairy|milk|cheese|butter|cream|yogurt|honey)/i.test(fullText);
        
        case 'glutenFree':
          // No gluten sources
          return !/(wheat|flour|bread|pasta|noodle|barley|rye|beer|soy sauce)/i.test(fullText);
        
        case 'lowCalorie':
          // Under 400 calories
          const calories = recipe.nutrition?.calories || 999;
          return calories < 400;
        
        default:
          return true;
      }
    });

    setSuggestedRecipes(filtered);
  };

  // Save recipe rating to Firestore
  const saveRecipeRating = async (rating) => {
    if (!selectedRecipe) return;

    try {
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

      const userId = auth.currentUser?.uid;
      
      if (!userId) {
        Alert.alert(t('error', language), t('pleaseRestart', language));
        return;
      }

      await addDoc(collection(db, `users/${userId}/recipeRatings`), ratingData);
      
      // Update global rating if recipe has an ID (Hybrid Engine)
      if (selectedRecipe.id) {
        try {
          const idToken = await auth.currentUser.getIdToken();
          // Fire and forget - don't await the result to block UI
          fetchWithTimeout(config.rateRecipe, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({
              recipeId: selectedRecipe.id,
              rating: rating
            })
          }, 10000).catch(err => console.log("Global rating update failed:", err));
        } catch (e) {
          console.log("Error initiating global rating update:", e);
        }
      }

      Alert.alert(
        t('ratingSaved', language) || 'Rating Saved!',
        t('thankYouFeedback', language) || 'Thank you for your feedback!',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error saving rating:', error);
      Alert.alert(t('error', language), t('failedToSaveRating', language) || 'Failed to save rating');
    }
  };

  // Toggle recipe collection (Favorite, Cooked, Want to Try)
  const toggleCollection = async (collectionType) => {
    if (!selectedRecipe) return;

    try {
      const userId = auth.currentUser?.uid;
      
      if (!userId) {
        Alert.alert(t('error', language), t('pleaseRestart', language));
        return;
      }

      const collectionData = {
        recipeName: selectedRecipe.name,
        collectionType: collectionType, // 'favorite', 'cooked', 'wantToTry'
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
          // Save full recipe details
          ingredients: recipeDetails?.ingredients || [],
          instructions: recipeDetails?.instructions || [],
          tips: recipeDetails?.tips || [],
          nutrition: recipeDetails?.nutrition || null,
        }
      };

      // Use household path if in a household, otherwise personal path
      const recipesPath = householdId 
        ? `households/${householdId}/recipeCollections`
        : `users/${userId}/recipeCollections`;
      console.log('📚 Saving recipe to path:', recipesPath, 'householdId:', householdId);
      await addDoc(collection(db, recipesPath), collectionData);
      console.log('✅ Recipe saved successfully');
      
      // Update local state
      if (collectionType === 'favorite') setIsFavorite(!isFavorite);
      if (collectionType === 'cooked') setIsCooked(!isCooked);
      if (collectionType === 'wantToTry') setWantToTry(!wantToTry);
      if (collectionType === 'wouldMakeAgain') setWouldMakeAgain(!wouldMakeAgain);

      const messages = {
        favorite: isFavorite ? t('removedFromFavorites', language) : t('addedToFavorites', language),
        cooked: isCooked ? t('removedFromCooked', language) : t('markedAsCooked', language),
        wantToTry: wantToTry ? t('removedFromWantToTry', language) : t('addedToWantToTry', language),
        wouldMakeAgain: wouldMakeAgain ? (t('removedFromWouldMakeAgain', language) || 'Removed from Would Make Again') : (t('addedToWouldMakeAgain', language) || 'Added to Would Make Again'),
      };

      Alert.alert(
        t('collectionUpdated', language) || 'Collection Updated!',
        messages[collectionType] || 'Collection updated successfully',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error updating collection:', error);
      console.error('Error details:', error.code, error.message);
      Alert.alert(t('error', language), t('failedToUpdateCollection', language) || 'Failed to update collection');
    }
  };

  // Get detailed recipe
  const getRecipeDetails = async (recipeName) => {
    setLoadingDetails(true);
    setRecipeDetails(null);

    try {
      // Use currently selected ingredients to ensure consistency with generation
      const ingredients = selectedIngredients.join(', ');
      
      const idToken = await auth.currentUser.getIdToken();
      
      const response = await fetchWithTimeout(config.getRecipeDetails, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ 
          recipeName,
          availableIngredients: ingredients,
          language
        }),
      }, 90000); // 90 second timeout for recipe details

      const result = await response.json();
      
      if (!response.ok) {
        const errorMessage = result.details 
          ? `${result.error}: ${result.details}`
          : (result.error || result.message || 'Failed to get recipe details');
        throw new Error(errorMessage);
      }

      setRecipeDetails(result);
    } catch (error) {
      if (__DEV__) console.error('Error getting recipe details:', error);
      Alert.alert('Error', 'Failed to get recipe details: ' + error.message);
    } finally {
      setLoadingDetails(false);
    }
  };

  const selectRecipe = (recipe) => {
    setSelectedRecipe(recipe);
    
    // Check if we have full details (ingredients and instructions)
    const hasDetails = recipe.ingredients && 
                       Array.isArray(recipe.ingredients) && 
                       recipe.ingredients.length > 0 &&
                       recipe.instructions && 
                       Array.isArray(recipe.instructions) && 
                       recipe.instructions.length > 0;

    if (hasDetails) {
      // Use the full recipe data we already have
      setRecipeDetails(recipe);
    } else {
      // Fetch details if missing
      getRecipeDetails(recipe.name);
    }
    
    setUserRating(0);
    setWouldMakeAgain(false);
    setIsFavorite(false);
    setIsCooked(false);
    setWantToTry(false);
  };

  const goBack = () => {
    setSelectedRecipe(null);
    setRecipeDetails(null);
    setUserRating(0);
    setWouldMakeAgain(false);
    setIsFavorite(false);
    setIsCooked(false);
    setWantToTry(false);
  };

  // Helper to safely extract text from instruction step
  const getStepText = (step) => {
    if (!step) return '';
    if (typeof step === 'string') return step;
    if (typeof step === 'object') {
      // Handle nested objects or direct properties
      if (typeof step.description === 'string') return step.description;
      if (typeof step.step === 'string') return step.step;
      if (typeof step.text === 'string') return step.text;
      // Recursive check if description is an object (edge case)
      if (step.description && typeof step.description === 'object') return getStepText(step.description);
      return '';
    }
    return String(step);
  };

  // Helper to safely extract 'why' from instruction step
  const getStepWhy = (step) => {
    if (!step || typeof step !== 'object') return null;
    if (typeof step.why === 'string') return step.why;
    return null;
  };

  // Share recipe to social media
  const shareRecipe = async () => {
    // Comprehensive null checks to prevent crashes
    if (!recipeDetails) {
      Alert.alert(t('error', language), 'Recipe data not available');
      return;
    }
    
    if (!recipeDetails.ingredients || !recipeDetails.instructions) {
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

      const result = await Share.share({
        message,
        title: `${t('recipeTitle', language)}: ${recipeDetails.name}`,
      });

      if (result.action === Share.sharedAction) {
        if (result.activityType && __DEV__) {
          console.log('Shared via:', result.activityType);
        }
      } else if (result.action === Share.dismissedAction && __DEV__) {
        console.log('Share dismissed');
      }
    } catch (error) {
      if (__DEV__) console.error('Error sharing recipe:', error);
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

      const textResponse = await response.text();
      console.log('Raw Server Response:', textResponse);

      let result;
      try {
        result = JSON.parse(textResponse);
      } catch (e) {
        throw new Error(`Server returned non-JSON: ${textResponse.substring(0, 100)}...`);
      }
      
      if (!response.ok) {
        const details = result.details || JSON.stringify(result);
        throw new Error(`${result.error || 'Server Error'}: ${details}`);
      }

      setPantryCheckResult(result);
      setItemsToShop(result.missing || []);
    } catch (error) {
      console.error('Error checking pantry:', error);
      Alert.alert(t('error', language), t('failedToCheckPantry', language) || 'Failed to check pantry');
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

      Alert.alert(
        t('success', language),
        `${itemsToShop.length} ${t('itemsAddedToShoppingList', language) || 'items added to shopping list'}`,
        [{ text: 'OK', onPress: () => setShowPantryCheckModal(false) }]
      );
    } catch (error) {
      console.error('Error adding to shopping list:', error);
      Alert.alert(t('error', language), t('failedToAddToShoppingList', language) || 'Failed to add items');
    }
  };

  const resetGenerator = () => {
    setSelectedRecipe(null);
    setRecipeDetails(null);
    setSuggestedRecipes([]);
    setSelectedDishCategory(null);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4A7C59" />
        <Text style={styles.loadingText}>{t('loading', language)}</Text>
      </View>
    );
  }

  // Show detailed recipe view
  if (selectedRecipe && recipeDetails) {
    return (
      <SafeAreaView style={styles.detailSafeArea} edges={['left', 'right']}>
        <ScrollView style={styles.detailScroll} contentContainerStyle={styles.detailScrollContent}>
        <View style={styles.recipeHeader}>
          <Text style={styles.recipeTitle}>{recipeDetails.name}</Text>
          <Text style={styles.recipeEmoji}>{getValidEmoji(recipeDetails.emoji)}</Text>
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
              <View style={styles.nutritionCitation}>
                <Text style={styles.citationText}>{t('nutritionDisclaimer', language)}</Text>
                <Text 
                  style={styles.citationLink}
                  onPress={() => Linking.openURL(USDA_NUTRITION_URL)}
                >
                  {t('usdaDatabase', language)}
                </Text>
              </View>
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
            {recipeDetails.skillLevel && (
              <View style={styles.metaChip}>
                <Text style={styles.metaChipText}>👨‍🍳 {recipeDetails.skillLevel}</Text>
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
          
          {/* Star Rating */}
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

          {/* Save Rating Button */}
          {userRating > 0 && (
            <TouchableOpacity
              style={styles.saveRatingButton}
              onPress={() => saveRecipeRating(userRating)}
            >
              <Text style={styles.saveRatingButtonText}>{t('saveRating', language)}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Recipe Collections Section */}
        <View style={styles.collectionsSection}>
          <Text style={styles.collectionsSectionTitle}>📚 {t('addToCollection', language)}</Text>
          
          <View style={styles.collectionButtonsRow}>
            {/* Favorite Button */}
            <TouchableOpacity
              style={[
                styles.collectionButton,
                styles.favoriteButton,
                isFavorite && styles.favoriteButtonActive
              ]}
              onPress={() => toggleCollection('favorite')}
            >
              <Text style={styles.collectionButtonEmoji}>
                {isFavorite ? '❤️' : '🤍'}
              </Text>
              <Text style={[
                styles.collectionButtonText,
                isFavorite && styles.collectionButtonTextActive
              ]}>
                {t('favorite', language)}
              </Text>
            </TouchableOpacity>

            {/* Cooked Button */}
            <TouchableOpacity
              style={[
                styles.collectionButton,
                styles.cookedButton,
                isCooked && styles.cookedButtonActive
              ]}
              onPress={() => toggleCollection('cooked')}
            >
              <Text style={styles.collectionButtonEmoji}>
                {isCooked ? '✅' : '☑️'}
              </Text>
              <Text style={[
                styles.collectionButtonText,
                isCooked && styles.collectionButtonTextActive
              ]}>
                {t('cooked', language)}
              </Text>
            </TouchableOpacity>

            {/* Want to Try Button */}
            <TouchableOpacity
              style={[
                styles.collectionButton,
                styles.wantToTryButton,
                wantToTry && styles.wantToTryButtonActive
              ]}
              onPress={() => toggleCollection('wantToTry')}
            >
              <Text style={styles.collectionButtonEmoji}>
                {wantToTry ? '⭐' : '☆'}
              </Text>
              <Text style={[
                styles.collectionButtonText,
                wantToTry && styles.collectionButtonTextActive
              ]}>
                {t('wantToTry', language)}
              </Text>
            </TouchableOpacity>

            {/* Would Make Again Button */}
            <TouchableOpacity
              style={[
                styles.collectionButton,
                styles.wouldMakeAgainButton,
                wouldMakeAgain && styles.wouldMakeAgainButtonActive
              ]}
              onPress={() => toggleCollection('wouldMakeAgain')}
            >
              <Text style={styles.collectionButtonEmoji}>
                {wouldMakeAgain ? '🔁' : '🔄'}
              </Text>
              <Text style={[
                styles.collectionButtonText,
                wouldMakeAgain && styles.collectionButtonTextActive
              ]}>
                {t('wouldMakeAgain', language) || 'Again'}
              </Text>
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

  // Show loading state for recipe details
  if (selectedRecipe && loadingDetails) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4A7C59" />
        <Text style={styles.loadingText}>{t('preparingRecipe', language)}</Text>
      </View>
    );
  }

  // Main recipe suggestions view
  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContentContainer}
      >
        {/* Dish Category Selection */}
        <View style={styles.categorySection}>
          <Text style={styles.categorySectionTitle}>{t('selectDishType', language)}</Text>
          <View style={styles.categoryGrid}>
            {dishCategories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryButton,
                  selectedDishCategory === category.id && styles.categoryButtonSelected
                ]}
                onPress={() => setSelectedDishCategory(category.id)}
              >
                <Text style={styles.categoryEmoji}>{category.emoji}</Text>
                <Text style={[
                  styles.categoryLabel,
                  selectedDishCategory === category.id && styles.categoryLabelSelected
                ]}>
                  {category.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {pantryItems.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>{t('emptyPantry', language)}</Text>
            <Text style={styles.emptySubText}>
              {t('emptyPantrySubtitle', language)}
            </Text>
          </View>
        )}

        {pantryItems.length > 0 && (
          <View style={styles.ingredientSelectorContainer}>
            <TouchableOpacity 
              style={styles.ingredientSelectorHeader}
              onPress={() => setShowIngredientSelector(!showIngredientSelector)}
            >
              <Text style={styles.ingredientSelectorTitle}>
                🥘 {t('ingredientsAvailableForRecipe', language)} ({selectedIngredients.length}/{pantryItems.length})
              </Text>
              <Text style={styles.ingredientSelectorIcon}>
                {showIngredientSelector ? '▼' : '▶'}
              </Text>
            </TouchableOpacity>

            {showIngredientSelector && (
              <View style={styles.ingredientSelectorContent}>
                <TouchableOpacity 
                  style={styles.selectAllButton}
                  onPress={toggleAllIngredients}
                >
                  <Text style={styles.selectAllButtonText}>
                    {selectedIngredients.length === pantryItems.length 
                      ? `☑️ ${t('deselectAll', language)}` 
                      : `☐ ${t('selectAll', language)}`}
                  </Text>
                </TouchableOpacity>

                <View style={styles.ingredientCheckboxList}>
                  {pantryItems.map((item) => {
                    const itemName = item.itemName || item.name;
                    const isSelected = selectedIngredients.includes(itemName);
                    
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.ingredientCheckbox}
                        onPress={() => toggleIngredient(itemName)}
                      >
                        <Text style={styles.checkbox}>
                          {isSelected ? '✅' : '⬜'}
                        </Text>
                        <Text style={isSelected ? styles.ingredientCheckboxText : styles.ingredientCheckboxTextDisabled}>
                          {itemName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        )}

        {pantryItems.length > 0 && (
          <View style={styles.ingredientSelectorContainer}>
            <TouchableOpacity 
              style={styles.ingredientSelectorHeader}
              onPress={() => setShowGuidanceInput(!showGuidanceInput)}
            >
              <Text style={styles.ingredientSelectorTitle}>
                💭 {t('additionalGuidance', language)}
              </Text>
              <Text style={styles.ingredientSelectorIcon}>
                {showGuidanceInput ? '▼' : '▶'}
              </Text>
            </TouchableOpacity>

            {showGuidanceInput && (
              <View style={styles.ingredientSelectorContent}>
                <TextInput
                  style={styles.guidanceInput}
                  placeholder={t('guidancePlaceholder', language)}
                  placeholderTextColor="#999"
                  value={userGuidance}
                  onChangeText={setUserGuidance}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                {userGuidance.length > 0 && (
                  <TouchableOpacity 
                    style={styles.clearGuidanceButton}
                    onPress={() => setUserGuidance('')}
                  >
                    <Text style={styles.clearGuidanceButtonText}>
                      🗑️ {t('clearGuidance', language)}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        {/* AI Disclaimer */}
        <View style={styles.aiDisclaimerContainer}>
          <Text style={styles.aiDisclaimerText}>
            🤖 {t('aiDisclaimerRecipes', language)}
          </Text>
          <View style={styles.nutritionCitationContainer}>
            <Text style={styles.aiDisclaimerSubtext}>
              {t('nutritionDisclaimer', language) || '* AI-estimated values based on'}{' '}
            </Text>
            <Text 
              style={styles.citationLink} 
              onPress={() => Linking.openURL('https://fdc.nal.usda.gov/')}
            >
              {t('usdaDatabase', language) || 'USDA FoodData Central'}
            </Text>
            <Text style={styles.aiDisclaimerSubtext}>
              {'. '}{t('notMedicalAdvice', language) || 'Not for medical use.'}
            </Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[
            styles.generateButton,
            (!selectedDishCategory || generatingRecipes || pantryItems.length === 0) && styles.generateButtonDisabled
          ]}
          onPress={generateRecipeSuggestions}
          disabled={!selectedDishCategory || generatingRecipes || pantryItems.length === 0}
        >
          {generatingRecipes ? (
            <View style={styles.generatingContainer}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.generatingText}>
                {t('aiBuildingRecipes', language)}
              </Text>
              <Text style={styles.generatingSubText}>
                {t('readySoon', language)}
              </Text>
            </View>
          ) : (
            <Text style={styles.generateButtonText}>
              ✨ {t('generateRecipeIdeas', language)}
            </Text>
          )}
        </TouchableOpacity>

        {/* Recipe usage counter badge */}
        {!loadingUsage && usageData && (
          <View style={styles.usageCounterBadge}>
            <Text style={styles.usageCounterIcon}>🍳</Text>
            <Text style={styles.usageCounterText}>
              {usageData.tier === 'premium' 
                ? `${usageData.recipesRemaining}/500 ${t('recipesRemaining', language)}`
                : `${usageData.recipesRemaining} ${t('recipesRemaining', language)}`
              }
            </Text>
          </View>
        )}

        {allRecipes.length > 0 && (
          <View style={styles.recipesContainer}>
            <Text style={styles.recipesTitle}>{t('suggestedRecipes', language)}:</Text>
            
            {/* Time Filter Buttons */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.timeFilterContainer}
            >
              {timeFilters.map((filter) => (
                <TouchableOpacity
                  key={filter.id}
                  style={[
                    styles.timeFilterChip,
                    selectedTimeFilter === filter.id && styles.timeFilterChipActive
                  ]}
                  onPress={() => filterRecipesByTime(filter.id)}
                >
                  <Text style={[
                    styles.timeFilterText,
                    selectedTimeFilter === filter.id && styles.timeFilterTextActive
                  ]}>
                    {filter.emoji} {filter.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Dietary Filter Buttons */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.dietaryFilterContainer}
            >
              {dietaryFilters.map((filter) => (
                <TouchableOpacity
                  key={filter.id}
                  style={[
                    styles.dietaryFilterChip,
                    selectedDietaryFilter === filter.id && styles.dietaryFilterChipActive
                  ]}
                  onPress={() => filterRecipesByDietary(filter.id)}
                >
                  <Text style={[
                    styles.dietaryFilterText,
                    selectedDietaryFilter === filter.id && styles.dietaryFilterTextActive
                  ]}>
                    {filter.emoji} {filter.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* No Results Message */}
            {suggestedRecipes.length === 0 && (
              <View style={styles.noResultsContainer}>
                <Text style={styles.noResultsEmoji}>🔍</Text>
                <Text style={styles.noResultsTitle}>{t('noRecipesMatchFilter', language)}</Text>
                <Text style={styles.noResultsText}>
                  {t('tryDifferentFilter', language)}
                </Text>
                <TouchableOpacity
                  style={styles.clearFiltersButton}
                  onPress={() => {
                    setSelectedTimeFilter('all');
                    setSelectedDietaryFilter('all');
                    setSuggestedRecipes(allRecipes);
                  }}
                >
                  <Text style={styles.clearFiltersButtonText}>
                    ↺ {t('clearFilters', language)}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {suggestedRecipes.map((item, index) => (
              <TouchableOpacity 
                key={index}
                style={styles.recipeCard}
                onPress={() => selectRecipe(item)}
              >
                <Text style={styles.recipeCardEmoji}>{getValidEmoji(item.emoji)}</Text>
                <View style={styles.recipeCardContent}>
                  <Text style={styles.recipeCardTitle}>{item.name}</Text>
                  <Text style={styles.recipeCardDescription}>
                    {item.description}
                  </Text>
                  {item.nutrition && (
                    <View style={styles.nutritionRow}>
                      <Text style={styles.nutritionBadge}>
                        🔥 {item.nutrition.calories} cal
                      </Text>
                      <Text style={styles.nutritionDetail}>
                        {t('protein', language)}: {item.nutrition.protein}
                      </Text>
                      <Text style={styles.nutritionDetail}>
                        {t('carbs', language)}: {item.nutrition.carbs}
                      </Text>
                      <Text style={styles.nutritionDetail}>
                        {t('fat', language)}: {item.nutrition.fat}
                      </Text>
                    </View>
                  )}
                  <View style={styles.metaBadgesRow}>
                    {item.cuisine && (
                      <Text style={styles.cuisineBadge}>
                        🍴 {item.cuisine}
                      </Text>
                    )}
                    {item.skillLevel && (
                      <Text style={styles.skillBadge}>
                        {item.skillLevel}
                      </Text>
                    )}
                    {item.difficulty && (
                      <Text style={styles.difficultyBadge}>
                        {item.difficulty}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.recipeCardMeta}>
                    {`🕒 ${t('prepTime', language)}: ${item.prepTime || '—'} • ⏱️ ${t('cookTime', language)}: ${item.cookTime || '—'} • 👥 ${item.servings || '4'}`}
                  </Text>
                </View>
                <Text style={styles.recipeCardArrow}>→</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1DE', // Alabaster
  },
  aiDisclaimerContainer: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFF9E6',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#F5A623',
  },
  aiDisclaimerText: {
    fontSize: 11,
    color: '#8B6914',
    textAlign: 'center',
    lineHeight: 16,
  },
  aiDisclaimerSubtext: {
    fontSize: 9,
    color: '#8B6914',
    fontStyle: 'italic',
  },
  nutritionCitationContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  citationLink: {
    fontSize: 9,
    color: '#4A7C59',
    fontStyle: 'italic',
    textDecorationLine: 'underline',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F1DE',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 20,
  },
  generateButton: {
    backgroundColor: '#4A7C59', // Sage Green
    margin: 20,
    marginTop: 10,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  generateButtonDisabled: {
    backgroundColor: '#CCC',
    opacity: 0.6,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  generatingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  generatingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
    textAlign: 'center',
  },
  generatingSubText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  categorySection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  categorySectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3D405B', // Charcoal
    marginBottom: 15,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryButton: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryButtonSelected: {
    borderColor: '#4A7C59', // Sage Green
    backgroundColor: '#E8F5E9', // Light Green
  },
  categoryEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  categoryLabelSelected: {
    color: '#4A7C59', // Sage Green
    fontWeight: 'bold',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#3D405B',
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
  timeFilterContainer: {
    marginVertical: 15,
    flexDirection: 'row',
  },
  timeFilterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  timeFilterChipActive: {
    backgroundColor: '#4A7C59', // Sage Green
    borderColor: '#4A7C59',
  },
  timeFilterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  timeFilterTextActive: {
    color: '#fff',
  },
  dietaryFilterContainer: {
    marginBottom: 15,
    flexDirection: 'row',
  },
  dietaryFilterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: '#FEF3E7',
    borderWidth: 1,
    borderColor: '#F9D7B0',
  },
  dietaryFilterChipActive: {
    backgroundColor: '#E07A5F', // Terracotta
    borderColor: '#E07A5F',
  },
  dietaryFilterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9C4A00',
  },
  dietaryFilterTextActive: {
    color: '#fff',
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noResultsEmoji: {
    fontSize: 48,
    marginBottom: 15,
  },
  noResultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
  },
  clearFiltersButton: {
    backgroundColor: '#E07A5F', // Terracotta
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  clearFiltersButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  ingredientSelectorContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  ingredientSelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 15,
  },
  ingredientSelectorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  ingredientSelectorIcon: {
    fontSize: 14,
    color: '#666',
  },
  servingsControl: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
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
  recipeServings: {
    fontSize: 14,
    color: '#666',
    marginRight: 10,
  },
  ingredientSelectorContent: {
    marginTop: 10,
  },
  selectAllButton: {
    backgroundColor: '#4A7C59', // Sage Green
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  selectAllButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  ingredientCheckboxList: {
    marginTop: 5,
  },
  ingredientCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    marginBottom: 8,
  },
  checkbox: {
    fontSize: 20,
    marginRight: 10,
  },
  ingredientCheckboxText: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  ingredientCheckboxTextDisabled: {
    fontSize: 15,
    color: '#999',
    flex: 1,
  },
  guidanceInput: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 15,
    fontSize: 15,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minHeight: 100,
    marginBottom: 10,
  },
  clearGuidanceButton: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearGuidanceButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
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
  usageCounterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    marginTop: 5,
  },
  usageCounterIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  usageCounterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
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
  nutritionCitation: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#FEE2E2',
    alignItems: 'center',
  },
  citationText: {
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 2,
  },
  citationLink: {
    fontSize: 10,
    color: '#3B82F6',
    textDecorationLine: 'underline',
    textAlign: 'center',
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

  // List View Styles
  recipesContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  recipesTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3D405B',
    marginBottom: 15,
  },
  recipeCard: {
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
  recipeCardEmoji: {
    fontSize: 40,
    marginRight: 15,
  },
  recipeCardContent: {
    flex: 1,
  },
  recipeCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3D405B',
    marginBottom: 4,
  },
  recipeCardDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  nutritionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  nutritionBadge: {
    backgroundColor: '#FEE2E2',
    color: '#E11D48',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
    overflow: 'hidden',
  },
  nutritionDetail: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
  },
  metaBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  cuisineBadge: {
    backgroundColor: '#E0F2FE',
    color: '#0284C7',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 6,
    overflow: 'hidden',
  },
  skillBadge: {
    backgroundColor: '#F3F4F6',
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 6,
    overflow: 'hidden',
  },
  difficultyBadge: {
    backgroundColor: '#FEF3C7',
    color: '#D97706',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  recipeCardMeta: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  recipeCardArrow: {
    fontSize: 24,
    color: '#E07A5F',
    marginLeft: 10,
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

