// components/recipe/RecipeList.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLanguage } from '../../contexts/LanguageContext';
import { t } from '../../contexts/translations';

const RecipeList = ({ recipes, onSelectRecipe }) => {
  const { language } = useLanguage();

  if (recipes.length === 0) {
    return (
      <View style={styles.noResultsContainer}>
        <Text style={styles.noResultsEmoji}>🤷‍♀️</Text>
        <Text style={styles.noResultsTitle}>{t('noRecipesMatch', language)}</Text>
        <Text style={styles.noResultsText}>{t('tryDifferentFilters', language)}</Text>
      </View>
    );
  }

  return (
    <View>
      {recipes.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={styles.recipeCard}
          onPress={() => onSelectRecipe(item)}
        >
          <Text style={styles.recipeCardEmoji}>{item.emoji || '🍽️'}</Text>
          <View style={styles.recipeCardContent}>
            <Text style={styles.recipeCardTitle}>{item.name}</Text>
            <Text style={styles.recipeCardDescription}>{item.description}</Text>
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
  );
};

const styles = StyleSheet.create({
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
        color: '#333',
        marginBottom: 5,
      },
      recipeCardDescription: {
        fontSize: 14,
        color: '#666',
        marginBottom: 5,
      },
      nutritionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
        flexWrap: 'wrap',
      },
      nutritionBadge: {
        backgroundColor: '#FEE2E2',
        color: '#E11D48',
        fontSize: 12,
        fontWeight: 'bold',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
      },
      nutritionDetail: {
        fontSize: 11,
        color: '#666',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
        fontWeight: '600',
      },
      metaBadgesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 8,
      },
      cuisineBadge: {
        fontSize: 11,
        color: '#DD6B20',
        backgroundColor: '#FFF7ED',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        fontWeight: '600',
        borderWidth: 1,
        borderColor: '#FDBA74',
      },
      skillBadge: {
        fontSize: 11,
        color: '#7C3AED',
        backgroundColor: '#F3E8FF',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        fontWeight: '600',
        borderWidth: 1,
        borderColor: '#C4B5FD',
      },
      difficultyBadge: {
        fontSize: 11,
        color: '#059669',
        backgroundColor: '#D1FAE5',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        fontWeight: '600',
        borderWidth: 1,
        borderColor: '#6EE7B7',
      },
      recipeCardMeta: {
        fontSize: 12,
        color: '#999',
      },
      recipeCardArrow: {
        fontSize: 24,
        color: '#E11D48',
      },
});

export default RecipeList;
