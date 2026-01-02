import React, { useState, useEffect, useRef } from 'react';
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
  KeyboardAvoidingView,
  Keyboard
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

export default function CustomRecipeGenerator() {
  // --- State from RecipeGenerator ---
  const [pantryItems, setPantryItems] = useState([]); // Needed for "Check Pantry" feature
  const [loading, setLoading] = useState(true);
  const [generatingRecipes, setGeneratingRecipes] = useState(false);
  const [suggestedRecipes, setSuggestedRecipes] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [recipeDetails, setRecipeDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [householdId, setHouseholdId] = useState(null);
  
  // Rating & Collection State
  const [userRating, setUserRating] = useState(0);
  const [wouldMakeAgain, setWouldMakeAgain] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isCooked, setIsCooked] = useState(false);
  const [wantToTry, setWantToTry] = useState(false);
  
  // Pantry Check State
  const [showPantryCheckModal, setShowPantryCheckModal] = useState(false);
  const [pantryCheckResult, setPantryCheckResult] = useState(null);
  const [checkingPantry, setCheckingPantry] = useState(false);
  const [itemsToShop, setItemsToShop] = useState([]);
  
  const [servings, setServings] = useState(4);
  const [usageData, setUsageData] = useState(null);
  const [loadingUsage, setLoadingUsage] = useState(false);

  // --- Custom Generator Specific State ---
  const [prompt, setPrompt] = useState('');
  const [modifying, setModifying] = useState(false);
  const [modificationPrompt, setModificationPrompt] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  
  const { language } = useLanguage();
  const navigation = useNavigation();
  const db = getFirestore(app);
  const scrollViewRef = useRef();

  // Initial suggestions
  const suggestions = [
    t('suggestion_tacos', language),
    t('suggestion_cake', language),
    t('suggestion_pasta', language),
    t('suggestion_salad', language),
    t('suggestion_smoothie', language)
  ];

  // --- Effects ---

  // Update header
  useEffect(() => {
    const handleBack = () => {
      if (selectedRecipe) {
        setSelectedRecipe(null);
        setRecipeDetails(null);
        setChatHistory([]);
      } else {
        navigation.goBack();
      }
    };

    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={handleBack} style={{ marginLeft: 16 }}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      ),
      headerTitle: t('chefsTable', language),
      headerRight: () => null,
    });
  }, [navigation, language, selectedRecipe]);

  // Fetch pantry items (Background - for "Check Pantry" feature)
  useEffect(() => {
    let unsubscribeSnapshot = null;
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubscribeSnapshot) unsubscribeSnapshot();
      
      if (!user) {
        setLoading(false);
        return;
      }
      
      // Check if user is in a household
      let pantryPath = `users/${user.uid}/pantry`;
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.exists() ? userDoc.data() : null;
        if (userData?.householdId) {
          setHouseholdId(userData.householdId);
          pantryPath = `households/${userData.householdId}/pantry`;
        } else {
          setHouseholdId(null);
        }
      } catch (error) {
        console.error('Error checking household:', error);
      }

      const q = query(collection(db, pantryPath));
      unsubscribeSnapshot = onSnapshot(q, (querySnapshot) => {
        const items = [];
        querySnapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() });
        });
        setPantryItems(items);
        setLoading(false);
      });
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  // Load usage data
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

  // --- Logic ---

  const handleGenerate = async (initialPrompt = prompt) => {
    if (!initialPrompt.trim()) return;

    // Check usage limits
    if (usageData && usageData.recipesRemaining <= 0) {
      const tierText = usageData.tier === 'anonymous' 
        ? t('createAccountToGetMore', language)
        : t('upgradeToPremium', language);
      Alert.alert(t('recipesLimitReached', language), tierText);
      return;
    }
    
    Keyboard.dismiss();
    setGeneratingRecipes(true);
    setSuggestedRecipes([]);
    setSelectedRecipe(null);
    setRecipeDetails(null);
    setChatHistory([{ type: 'user', text: initialPrompt }]);
    
    try {
      const response = await fetchWithTimeout(config.generateCustomRecipe, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await auth.currentUser.getIdToken()}`
        },
        body: JSON.stringify({
          prompt: initialPrompt,
          language
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate recipe');
      }

      const data = await response.json();
      
      // Set as selected immediately
      setSelectedRecipe(data);
      setRecipeDetails(data);
      
      // Reset ratings
      setUserRating(0);
      setWouldMakeAgain(false);
      setIsFavorite(false);
      setIsCooked(false);
      setWantToTry(false);

      // Refresh usage
      if (auth.currentUser) loadUsageData(auth.currentUser.uid);

    } catch (error) {
      console.error('Error generating custom recipe:', error);
      Alert.alert('Error', t('failedToGenerateRecipe', language) || 'Failed to generate recipe. Please try again.');
    } finally {
      setGeneratingRecipes(false);
    }
  };

  const handleModify = async () => {
    if (!modificationPrompt.trim() || !selectedRecipe) return;

    Keyboard.dismiss();
    setModifying(true);
    const currentRequest = modificationPrompt;
    setModificationPrompt('');
    
    // Add to chat history
    setChatHistory(prev => [...prev, { type: 'user', text: currentRequest }]);

    try {
      const response = await fetchWithTimeout(config.modifyRecipe, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await auth.currentUser.getIdToken()}`
        },
        body: JSON.stringify({
          currentRecipe: selectedRecipe,
          modificationRequest: currentRequest,
          language
        })
      });

      if (!response.ok) {
        throw new Error('Failed to modify recipe');
      }

      const updatedRecipe = await response.json();
      setSelectedRecipe(updatedRecipe);
      setRecipeDetails(updatedRecipe);
      setChatHistory(prev => [...prev, { type: 'ai', text: 'Recipe updated!' }]);
      
      // Scroll to top to see changes
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    } catch (error) {
      console.error('Error modifying recipe:', error);
      Alert.alert('Error', 'Failed to update recipe. Please try again.');
    } finally {
      setModifying(false);
    }
  };

  const adjustServings = (delta) => {
    setServings(prev => Math.max(1, prev + delta));
  };

  // --- Shared Logic from RecipeGenerator ---
  
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
      await addDoc(collection(db, `users/${userId}/recipeRatings`), ratingData);
      
      if (selectedRecipe.id) {
        const idToken = await auth.currentUser.getIdToken();
        fetchWithTimeout(config.rateRecipe, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
          body: JSON.stringify({ recipeId: selectedRecipe.id, rating: rating })
        }, 10000).catch(err => console.log("Global rating update failed:", err));
      }
      Alert.alert(t('ratingSaved', language) || 'Rating Saved!', t('thankYouFeedback', language) || 'Thank you for your feedback!', [{ text: 'OK' }]);
    } catch (error) {
      console.error('Error saving rating:', error);
      Alert.alert(t('error', language), t('failedToSaveRating', language));
    }
  };

  const toggleCollection = async (collectionType) => {
    if (!selectedRecipe) return;
    try {
      const userId = auth.currentUser?.uid;
      const collectionData = {
        recipeName: selectedRecipe.name,
        collectionType: collectionType,
        timestamp: new Date().toISOString(),
        recipeData: {
          ...selectedRecipe,
          ...recipeDetails
        }
      };
      await addDoc(collection(db, `users/${userId}/recipeCollections`), collectionData);
      
      if (collectionType === 'favorite') setIsFavorite(!isFavorite);
      if (collectionType === 'cooked') setIsCooked(!isCooked);
      if (collectionType === 'wantToTry') setWantToTry(!wantToTry);
      if (collectionType === 'wouldMakeAgain') setWouldMakeAgain(!wouldMakeAgain);

      Alert.alert(t('collectionUpdated', language) || 'Collection Updated!', '', [{ text: 'OK' }]);
    } catch (error) {
      console.error('Error updating collection:', error);
      Alert.alert(t('error', language), t('failedToUpdateCollection', language));
    }
  };

  const shareRecipe = async () => {
    if (!recipeDetails) return;
    try {
      const ingredientsText = recipeDetails.ingredients.map((ing) => `• ${ing}`).join('\n');
      const instructionsText = recipeDetails.instructions.map((step, i) => `${i + 1}. ${step}`).join('\n');
      const message = `${t('checkOutThisRecipe', language)}: ${recipeDetails.name} ${getValidEmoji(recipeDetails.emoji)}\n\n📝 *${t('ingredients', language)}:*\n${ingredientsText}\n\n👨‍🍳 *${t('instructions', language)}:*\n${instructionsText}\n\n${t('sharedFromShelfze', language)}`;
      await Share.share({ message, title: recipeDetails.name });
    } catch (error) {
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
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body: JSON.stringify({ recipeIngredients: recipeDetails.ingredients, pantryItems: pantryNames, language })
      }, 30000);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Server Error');
      setPantryCheckResult(result);
      setItemsToShop(result.missing || []);
    } catch (error) {
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
        addDoc(collection(db, shoppingListPath), { name: item, checked: false, createdAt: new Date() })
      );
      await Promise.all(batchPromises);
      Alert.alert(t('success', language), `${itemsToShop.length} ${t('itemsAddedToShoppingList', language)}`, [{ text: 'OK', onPress: () => setShowPantryCheckModal(false) }]);
    } catch (error) {
      Alert.alert(t('error', language), t('failedToAddToShoppingList', language));
    }
  };

  // --- Render Helper: The Rich Recipe View ---
  const renderRichRecipe = () => {
    if (!recipeDetails) return null;
    return (
      <View style={styles.richRecipeContainer}>
        <View style={styles.recipeHeader}>
          <Text style={styles.recipeTitle}>{recipeDetails.name}</Text>
          <Text style={styles.recipeEmoji}>{getValidEmoji(recipeDetails.emoji)}</Text>
          
          {/* AI Generated Notice */}
          <View style={styles.aiNoticeContainer}>
            <Text style={styles.aiNoticeText}>✨ {t('aiGeneratedRecipe', language) || 'AI Generated Recipe'}</Text>
          </View>
          
          {/* Meta Row */}
          <View style={styles.recipeMetaRow}>
            {recipeDetails.cuisine && <View style={styles.metaChip}><Text style={styles.metaChipText}>🍴 {recipeDetails.cuisine}</Text></View>}
            {recipeDetails.difficulty && <View style={styles.metaChip}><Text style={styles.metaChipText}>⚡ {recipeDetails.difficulty}</Text></View>}
            <View style={styles.metaChip}><Text style={styles.metaChipText}>👥 {servings} {t('servings', language)}</Text></View>
          </View>

          <Text style={styles.recipeTime}>🕒 {t('prepTime', language)}: {recipeDetails.prepTime || '—'}</Text>
          <Text style={styles.recipeTime}>⏱️ {t('cookTime', language)}: {recipeDetails.cookTime || '—'}</Text>
          
          {/* Servings Control */}
          <View style={styles.servingsControl}>
            <Text style={styles.recipeServings}>👥 {t('servings', language)}:</Text>
            <View style={styles.servingsAdjuster}>
              <TouchableOpacity style={styles.servingsButton} onPress={() => adjustServings(-1)}><Text style={styles.servingsButtonText}>-</Text></TouchableOpacity>
              <Text style={styles.servingsValue}>{servings}</Text>
              <TouchableOpacity style={styles.servingsButton} onPress={() => adjustServings(1)}><Text style={styles.servingsButtonText}>+</Text></TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Ingredients */}
        <View style={styles.section}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10}}>
            <Text style={[styles.sectionTitle, {marginBottom: 0}]}>📝 {t('ingredients', language)}</Text>
            <TouchableOpacity 
              style={styles.checkPantryButton}
              onPress={checkPantryForIngredients}
            >
              <Text style={styles.checkPantryButtonText}>🔍 {t('checkPantry', language) || 'Check Pantry'}</Text>
            </TouchableOpacity>
          </View>
          {recipeDetails.ingredients && recipeDetails.ingredients.map((ingredient, index) => (
            <Text key={index} style={styles.ingredient}>
              • {scaleIngredient(ingredient, parseInt(recipeDetails.servings) || 4, servings)}
            </Text>
          ))}
        </View>

        {/* Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👨‍🍳 {t('instructions', language)}</Text>
          {recipeDetails.instructions && recipeDetails.instructions.map((step, index) => (
            <View key={index} style={styles.stepContainer}>
              <Text style={styles.stepNumber}>{t('step', language)} {index + 1}</Text>
              <Text style={styles.stepText}>{typeof step === 'string' ? step : (step.text || step.step || '')}</Text>
            </View>
          ))}
        </View>

        {/* Tips */}
        {recipeDetails.tips && recipeDetails.tips.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💡 {t('chefsTips', language)}</Text>
            {recipeDetails.tips.map((tip, index) => (
              <Text key={index} style={styles.tip}>• {typeof tip === 'string' ? tip : (tip.text || '')}</Text>
            ))}
          </View>
        )}

        {/* Rating */}
        <View style={styles.ratingSection}>
          <Text style={styles.ratingSectionTitle}>⭐ {t('rateThisRecipe', language)}</Text>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setUserRating(star)}>
                <Text style={styles.star}>{star <= userRating ? '⭐' : '☆'}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {userRating > 0 && (
            <TouchableOpacity style={styles.saveRatingButton} onPress={() => saveRecipeRating(userRating)}>
              <Text style={styles.saveRatingButtonText}>{t('saveRating', language)}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Collections */}
        <View style={styles.collectionsSection}>
          <Text style={styles.collectionsSectionTitle}>📚 {t('addToCollection', language)}</Text>
          <View style={styles.collectionButtonsRow}>
            <TouchableOpacity style={[styles.collectionButton, styles.favoriteButton, isFavorite && styles.favoriteButtonActive]} onPress={() => toggleCollection('favorite')}>
              <Text style={styles.collectionButtonEmoji}>{isFavorite ? '❤️' : '🤍'}</Text>
              <Text style={[styles.collectionButtonText, isFavorite && styles.collectionButtonTextActive]}>{t('favorite', language)}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.collectionButton, styles.cookedButton, isCooked && styles.cookedButtonActive]} onPress={() => toggleCollection('cooked')}>
              <Text style={styles.collectionButtonEmoji}>{isCooked ? '✅' : '☑️'}</Text>
              <Text style={[styles.collectionButtonText, isCooked && styles.collectionButtonTextActive]}>{t('cooked', language)}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.collectionButton, styles.wantToTryButton, wantToTry && styles.wantToTryButtonActive]} onPress={() => toggleCollection('wantToTry')}>
              <Text style={styles.collectionButtonEmoji}>{wantToTry ? '⭐' : '☆'}</Text>
              <Text style={[styles.collectionButtonText, wantToTry && styles.collectionButtonTextActive]}>{t('wantToTry', language)}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.collectionButton, styles.wouldMakeAgainButton, wouldMakeAgain && styles.wouldMakeAgainButtonActive]} onPress={() => toggleCollection('wouldMakeAgain')}>
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
      </View>
    );
  };

  // --- Main Render ---

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView 
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {!selectedRecipe && !generatingRecipes && (
            <View style={styles.welcomeContainer}>
              <Text style={styles.welcomeEmoji}>👨‍🍳</Text>
              <Text style={styles.welcomeTitle}>{t('whatAreYouCraving', language) || 'What are you craving?'}</Text>
              <Text style={styles.welcomeSubtitle}>
                {t('askForAnyDish', language) || 'Ask for any dish, and I\'ll create a custom recipe just for you.'}
              </Text>
              
              <View style={styles.suggestionsContainer}>
                {suggestions.map((s, i) => (
                  <TouchableOpacity 
                    key={i} 
                    style={styles.suggestionChip}
                    onPress={() => setPrompt(s)}
                  >
                    <Text style={styles.suggestionText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {generatingRecipes ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4A7C59" />
              <Text style={styles.loadingText}>{t('creatingMasterpiece', language) || 'Creating your masterpiece...'}</Text>
            </View>
          ) : (
            renderRichRecipe()
          )}
          
        </ScrollView>

        {/* Input Area */}
        <View style={styles.inputContainer}>
          {!selectedRecipe ? (
            // Initial Generation Input
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder={t('enterCravingPlaceholder', language) || "e.g., Spicy Tacos, Vegan Cake..."}
                value={prompt}
                onChangeText={setPrompt}
                multiline={true}
                onSubmitEditing={() => handleGenerate()}
                returnKeyType="go"
              />
              <TouchableOpacity 
                style={[styles.sendButton, !prompt.trim() && styles.disabledButton]} 
                onPress={() => handleGenerate()}
                disabled={!prompt.trim() || generatingRecipes}
              >
                <Ionicons name="restaurant" size={28} color="#FFF" />
              </TouchableOpacity>
            </View>
          ) : (
            // Modification Input
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder={t('modifyRecipePlaceholder', language) || "Modify recipe (e.g., 'Make it spicy')..."}
                value={modificationPrompt}
                onChangeText={setModificationPrompt}
                multiline={true}
                onSubmitEditing={handleModify}
                returnKeyType="send"
              />
              <TouchableOpacity 
                style={[styles.sendButton, (!modificationPrompt.trim() || modifying) && styles.disabledButton]} 
                onPress={handleModify}
                disabled={!modificationPrompt.trim() || modifying}
              >
                {modifying ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Ionicons name="send" size={24} color="#FFF" />
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Pantry Check Modal */}
        <Modal visible={showPantryCheckModal} transparent={true} animationType="slide" onRequestClose={() => setShowPantryCheckModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{checkingPantry ? (t('checkingPantry', language) || 'Checking Pantry...') : (t('pantryCheck', language) || 'Pantry Check')}</Text>
                {!checkingPantry && <TouchableOpacity onPress={() => setShowPantryCheckModal(false)}><Text style={styles.closeModalText}>×</Text></TouchableOpacity>}
              </View>
              {checkingPantry ? (
                <View style={styles.modalLoading}>
                  <ActivityIndicator size="large" color="#4A7C59" />
                  <Text style={styles.modalLoadingText}>{t('aiComparingIngredients', language) || 'AI is comparing...'}</Text>
                </View>
              ) : (
                <ScrollView style={{marginBottom: 15}}>
                  {pantryCheckResult && (
                    <>
                      <View style={{marginBottom: 20}}>
                        <Text style={styles.modalSectionTitle}>✅ {t('youHave', language)} ({pantryCheckResult.available?.length || 0})</Text>
                        {pantryCheckResult.available?.map((item, i) => <Text key={i} style={styles.modalItemText}>• {item}</Text>)}
                      </View>
                      <View>
                        <Text style={[styles.modalSectionTitle, {color: '#E07A5F'}]}>❌ {t('missing', language)} ({pantryCheckResult.missing?.length || 0})</Text>
                        {pantryCheckResult.missing?.map((item, i) => (
                          <TouchableOpacity key={i} style={styles.missingItemRow} onPress={() => setItemsToShop(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item])}>
                            <Text style={{fontSize: 18, marginRight: 10}}>{itemsToShop.includes(item) ? '☑️' : '☐'}</Text>
                            <Text style={styles.modalItemText}>{item}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  )}
                </ScrollView>
              )}
              {!checkingPantry && pantryCheckResult && (
                <TouchableOpacity style={[styles.addToShoppingListButton, {backgroundColor: itemsToShop.length > 0 ? '#4A7C59' : '#ccc'}]} disabled={itemsToShop.length === 0} onPress={addToShoppingList}>
                  <Text style={styles.addToShoppingListText}>{itemsToShop.length > 0 ? `${t('addToShoppingList', language)} (${itemsToShop.length})` : t('nothingToAdd', language)}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F1DE' },
  content: { flex: 1, flexDirection: 'column' },
  scrollContent: { flexGrow: 1, paddingBottom: 100 },
  
  // Welcome / Input Styles
  welcomeContainer: { alignItems: 'center', marginTop: 40, marginBottom: 40 },
  welcomeEmoji: { fontSize: 64, marginBottom: 16 },
  welcomeTitle: { fontSize: 24, fontWeight: 'bold', color: '#3D405B', marginBottom: 8, textAlign: 'center' },
  welcomeSubtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 32, paddingHorizontal: 32 },
  suggestionsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  suggestionChip: { backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#4A7C59' },
  suggestionText: { color: '#4A7C59', fontWeight: '500' },
  
  loadingContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  loadingText: { marginTop: 16, fontSize: 16, color: '#3D405B' },

  // Input Bar Styles
  inputContainer: {
    backgroundColor: '#FFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 16,
    color: '#000000',
    maxHeight: 120,
    minHeight: 50,
    textAlignVertical: 'center',
  },
  sendButton: {
    width: 50,
    height: 50,
    backgroundColor: '#4A7C59',
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: { backgroundColor: '#BDBDBD' },

  // Rich Recipe Styles (Matched to SavedRecipesScreen)
  richRecipeContainer: { flex: 1 },
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
  
  aiNoticeContainer: {
    backgroundColor: 'rgba(74, 124, 89, 0.1)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(74, 124, 89, 0.2)',
  },
  aiNoticeText: {
    fontSize: 12,
    color: '#4A7C59',
    fontWeight: '600',
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
  checkPantryButton: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#4A7C59'
  },
  checkPantryButtonText: {
    color: '#4A7C59',
    fontWeight: '600',
    fontSize: 12
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
    color: '#FFD700'
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
  favoriteButton: { borderColor: '#FCA5A5' },
  favoriteButtonActive: { backgroundColor: '#FEE2E2', borderColor: '#EF4444' },
  cookedButton: { borderColor: '#86EFAC' },
  cookedButtonActive: { backgroundColor: '#DCFCE7', borderColor: '#22C55E' },
  wantToTryButton: { borderColor: '#FDE047' },
  wantToTryButtonActive: { backgroundColor: '#FEF9C3', borderColor: '#EAB308' },
  wouldMakeAgainButton: { borderColor: '#A78BFA' },
  wouldMakeAgainButtonActive: { backgroundColor: '#EDE9FE', borderColor: '#8B5CF6' },
  collectionButtonTextActive: { color: '#1F2937', fontWeight: 'bold' },
  
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

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#3D405B' },
  closeModalText: { fontSize: 24, color: '#999' },
  modalLoading: { padding: 20, alignItems: 'center' },
  modalLoadingText: { marginTop: 15, color: '#666', textAlign: 'center' },
  modalSectionTitle: { fontSize: 16, fontWeight: '600', color: '#4A7C59', marginBottom: 10 },
  modalItemText: { fontSize: 14, color: '#333', marginLeft: 10, marginBottom: 4 },
  missingItemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginLeft: 5 },
  addToShoppingListButton: { padding: 15, borderRadius: 12, alignItems: 'center' },
  addToShoppingListText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  
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
