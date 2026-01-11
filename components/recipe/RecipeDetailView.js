// components/recipe/RecipeDetailView.js
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Share, Alert, Linking } from 'react-native';

const USDA_NUTRITION_URL = 'https://fdc.nal.usda.gov/';
import { useLanguage } from '../../contexts/LanguageContext';
import { t } from '../../contexts/translations';
import { SafeAreaView } from 'react-native-safe-area-context';
import { scaleIngredient } from '../../utils/ingredientScaler';

const RecipeDetailView = ({
  recipeDetails,
  onGoBack,
  onResetGenerator,
  onSaveRating,
  onToggleCollection,
}) => {
  const { language } = useLanguage();
  const [userRating, setUserRating] = useState(0);
  const [wouldMakeAgain, setWouldMakeAgain] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false); // These should be managed from parent
  const [isCooked, setIsCooked] = useState(false);
  const [wantToTry, setWantToTry] = useState(false);
  const [servings, setServings] = useState(4);

  useEffect(() => {
    if (recipeDetails?.servings) {
      // Handle range like "4-6" or text like "Makes 4" by extracting first number
      const match = recipeDetails.servings.toString().match(/(\d+)/);
      const parsed = match ? parseInt(match[1]) : 4;
      setServings(parsed);
    }
  }, [recipeDetails]);

  const adjustServings = (delta) => {
    setServings(prev => Math.max(1, prev + delta));
  };

  const shareRecipe = async () => {
    if (!recipeDetails) return;

    try {
      const ingredientsText = recipeDetails.ingredients.map((ing) => `• ${ing}`).join('\n');
      const instructionsText = recipeDetails.instructions.map((step, i) => `${i + 1}. ${step}`).join('\n');

      const message = `
${t('checkOutThisRecipe', language)}: ${recipeDetails.name} ${recipeDetails.emoji || ''}

📝 *${t('ingredients', language)}:*
${ingredientsText}

👨‍🍳 *${t('instructions', language)}:*
${instructionsText}

${recipeDetails.tips && recipeDetails.tips.length > 0 ? `\n💡 *${t('chefsTips', language)}:*\n${recipeDetails.tips.map((tip) => `• ${tip}`).join('\n')}` : ''}

${t('sharedFromShelfze', language)}
      `.trim();

      await Share.share({
        message,
        title: `${t('recipeTitle', language)}: ${recipeDetails.name}`,
      });
    } catch (error) {
      Alert.alert(t('error', language), t('failedToShare', language));
    }
  };

  const handleSaveRating = () => {
    onSaveRating(userRating, wouldMakeAgain);
  };

  return (
    <SafeAreaView style={styles.detailSafeArea} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.detailScroll} contentContainerStyle={styles.detailScrollContent}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onGoBack}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <Text style={styles.backButtonText}>← {t('backToRecipes', language)}</Text>
        </TouchableOpacity>

        <View style={styles.recipeHeader}>
          <TouchableOpacity style={styles.shareButton} onPress={shareRecipe}>
            <Text style={styles.shareButtonText}>🔗 {t('share', language)}</Text>
          </TouchableOpacity>
          <Text style={styles.recipeTitle}>{recipeDetails.name}</Text>
          <Text style={styles.recipeEmoji}>{recipeDetails.emoji || '🍽️'}</Text>
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
          <Text style={styles.sectionTitle}>📝 {t('ingredients', language)}</Text>
          {recipeDetails.ingredients && recipeDetails.ingredients.map((ingredient, index) => (
            <Text key={index} style={styles.ingredient}>
              • {scaleIngredient(ingredient, parseInt(recipeDetails.servings) || 4, servings)}
            </Text>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👨‍🍳 {t('instructions', language)}</Text>
          {recipeDetails.instructions && recipeDetails.instructions.map((step, index) => (
            <View key={index} style={styles.stepContainer}>
              <Text style={styles.stepNumber}>{t('step', language)} {index + 1}</Text>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        {recipeDetails.tips && recipeDetails.tips.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💡 {t('chefsTips', language)}</Text>
            {recipeDetails.tips.map((tip, index) => (
              <Text key={index} style={styles.tip}>
                • {tip}
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

          <TouchableOpacity
            style={[
              styles.makeAgainButton,
              wouldMakeAgain && styles.makeAgainButtonActive
            ]}
            onPress={() => setWouldMakeAgain(!wouldMakeAgain)}
          >
            <Text style={[
              styles.makeAgainButtonText,
              wouldMakeAgain && styles.makeAgainButtonTextActive
            ]}>
              {wouldMakeAgain ? '✓ ' : ''}{t('wouldMakeAgain', language)}
            </Text>
          </TouchableOpacity>

          {(userRating > 0 || wouldMakeAgain) && (
            <TouchableOpacity
              style={styles.saveRatingButton}
              onPress={handleSaveRating}
            >
              <Text style={styles.saveRatingButtonText}>{t('saveRating', language)}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Recipe Collections Section */}
        <View style={styles.collectionsSection}>
          <Text style={styles.collectionsSectionTitle}>📚 {t('addToCollection', language)}</Text>
          
          <View style={styles.collectionButtonsRow}>
            <TouchableOpacity
              style={[
                styles.collectionButton,
                styles.favoriteButton,
                isFavorite && styles.favoriteButtonActive
              ]}
              onPress={() => {
                onToggleCollection('favorite');
                setIsFavorite(!isFavorite);
              }}
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

            <TouchableOpacity
              style={[
                styles.collectionButton,
                styles.cookedButton,
                isCooked && styles.cookedButtonActive
              ]}
              onPress={() => {
                onToggleCollection('cooked');
                setIsCooked(!isCooked);
              }}
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

            <TouchableOpacity
              style={[
                styles.collectionButton,
                styles.wantToTryButton,
                wantToTry && styles.wantToTryButtonActive
              ]}
              onPress={() => {
                onToggleCollection('wantToTry');
                setWantToTry(!wantToTry);
              }}
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
          </View>
        </View>

        {/* AI Footer Notice */}
        <View style={styles.aiFooterNoticeContainer}>
          <Text style={styles.aiFooterNoticeText}>
            {t('aiDisclaimer', language) || 'Recipe was generated by AI and could make mistakes.'}
          </Text>
        </View>

        <TouchableOpacity style={styles.newRecipeButton} onPress={onResetGenerator}>
          <Text style={styles.newRecipeButtonText}>↺ {t('generateNewRecipes', language)}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
    detailSafeArea: {
        flex: 1,
        backgroundColor: '#f5f5f5',
      },
      detailScroll: {
        flex: 1,
      },
      detailScrollContent: {
        paddingBottom: 40,
      },
      backButton: {
        paddingHorizontal: 20,
        paddingVertical: 14,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
      },
      backButtonText: {
        fontSize: 16,
        color: '#E11D48',
        fontWeight: '600',
      },
      recipeHeader: {
        backgroundColor: '#fff',
        padding: 20,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        position: 'relative',
      },
      shareButton: {
        position: 'absolute',
        top: 15,
        right: 15,
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        zIndex: 10,
      },
      shareButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
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
      recipeServings: {
        fontSize: 14,
        color: '#666',
        marginRight: 10,
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
        color: '#E11D48',
      },
      servingsValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#374151',
        minWidth: 24,
        textAlign: 'center',
      },
      section: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
      },
      sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 15,
      },
      ingredient: {
        fontSize: 16,
        color: '#666',
        lineHeight: 24,
      },
      stepContainer: {
        flexDirection: 'row',
        marginBottom: 15,
      },
      stepNumber: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#E11D48',
        marginRight: 10,
        width: 50,
      },
      stepText: {
        fontSize: 16,
        color: '#666',
        flex: 1,
        lineHeight: 24,
      },
      tip: {
        fontSize: 16,
        color: '#666',
        lineHeight: 24,
        fontStyle: 'italic',
      },
      ratingSection: {
        backgroundColor: '#fff',
        margin: 15,
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
      },
      ratingSectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
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
      makeAgainButton: {
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#D1D5DB',
        borderRadius: 25,
        paddingVertical: 12,
        paddingHorizontal: 24,
        marginBottom: 15,
      },
      makeAgainButtonActive: {
        backgroundColor: '#10B981',
        borderColor: '#10B981',
      },
      makeAgainButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6B7280',
      },
      makeAgainButtonTextActive: {
        color: '#fff',
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
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 12,
        borderWidth: 2,
        flex: 1,
      },
      collectionButtonEmoji: {
        fontSize: 24,
        marginBottom: 5,
      },
      collectionButtonText: {
        fontSize: 13,
        fontWeight: '600',
      },
      collectionButtonTextActive: {
        color: '#fff',
      },
      favoriteButton: {
        borderColor: '#FCA5A5',
        backgroundColor: '#FFF1F2',
      },
      favoriteButtonActive: {
        backgroundColor: '#EF4444',
        borderColor: '#EF4444',
      },
      cookedButton: {
        borderColor: '#A7F3D0',
        backgroundColor: '#ECFDF5',
      },
      cookedButtonActive: {
        backgroundColor: '#10B981',
        borderColor: '#10B981',
      },
      wantToTryButton: {
        borderColor: '#FDE68A',
        backgroundColor: '#FFFBEB',
      },
      wantToTryButtonActive: {
        backgroundColor: '#F59E0B',
        borderColor: '#F59E0B',
      },
      newRecipeButton: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginTop: 10,
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#DD6B20',
      },
      newRecipeButtonText: {
        color: '#DD6B20',
        fontSize: 16,
        fontWeight: 'bold',
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

export default RecipeDetailView;
