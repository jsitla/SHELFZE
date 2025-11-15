// components/recipe/SavedRecipes.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useLanguage } from '../../contexts/LanguageContext';
import { t } from '../../contexts/translations';

const SavedRecipes = ({ savedRecipes, onSelectRecipe, onRemoveFromCollection }) => {
  const { language } = useLanguage();
  const [savedRecipesExpanded, setSavedRecipesExpanded] = useState(false);
  const [selectedCollectionFilter, setSelectedCollectionFilter] = useState('all');

  if (savedRecipes.length === 0) {
    return null;
  }

  const filteredRecipes = savedRecipes.filter(recipe => 
    selectedCollectionFilter === 'all' || recipe.collectionType === selectedCollectionFilter
  );

  return (
    <View style={styles.savedRecipesSection}>
      <TouchableOpacity
        style={styles.savedRecipesHeader}
        onPress={() => setSavedRecipesExpanded(!savedRecipesExpanded)}
      >
        <Text style={styles.savedRecipesTitle}>{t('mySavedRecipes', language)}</Text>
        <Text style={styles.dropdownArrow}>{savedRecipesExpanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {savedRecipesExpanded && (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.collectionFilterContainer}>
            {['all', 'favorite', 'cooked', 'wantToTry'].map(filter => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.collectionFilterTab,
                  selectedCollectionFilter === filter && styles.collectionFilterTabActive,
                ]}
                onPress={() => setSelectedCollectionFilter(filter)}
              >
                <Text style={[
                  styles.collectionFilterText,
                  selectedCollectionFilter === filter && styles.collectionFilterTextActive,
                ]}>
                  {t(filter, language)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.savedRecipesList}>
            {filteredRecipes.map(recipe => (
              <TouchableOpacity
                key={recipe.id}
                style={styles.savedRecipeCard}
                onPress={() => onSelectRecipe(recipe.recipeData)}
              >
                <View style={styles.savedRecipeCardContent}>
                  <Text style={styles.savedRecipeEmoji}>{recipe.recipeData.emoji || '🍽️'}</Text>
                  <View style={styles.savedRecipeInfo}>
                    <View style={styles.savedRecipeNameRow}>
                      <Text style={styles.savedRecipeName} numberOfLines={1}>
                        {recipe.recipeName}
                      </Text>
                      {recipe.collectionType === 'favorite' && (
                        <Text style={styles.savedRecipeBadge}>❤️</Text>
                      )}
                      {recipe.collectionType === 'cooked' && (
                        <Text style={styles.savedRecipeBadge}>✅</Text>
                      )}
                      {recipe.collectionType === 'wantToTry' && (
                        <Text style={styles.savedRecipeBadge}>⭐</Text>
                      )}
                    </View>
                    <Text style={styles.savedRecipeDescription} numberOfLines={1}>
                      {recipe.recipeData.description}
                    </Text>
                    <Text style={styles.savedRecipeMeta}>
                      {recipe.recipeData.cuisine} • {recipe.recipeData.difficulty}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.savedRecipeRemoveButton}
                  onPress={() => onRemoveFromCollection(recipe.id)}
                >
                  <Text style={styles.savedRecipeRemoveButtonText}>🗑️</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
    savedRecipesSection: {
        paddingHorizontal: 20,
        paddingVertical: 20,
        backgroundColor: '#FFF9F5',
        borderTopWidth: 1,
        borderTopColor: '#FFE5D9',
        marginTop: 20,
      },
      savedRecipesHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      },
      savedRecipesTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
      },
      dropdownArrow: {
        fontSize: 18,
        color: '#E53E3E',
        fontWeight: 'bold',
      },
      collectionFilterContainer: {
        marginTop: 15,
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
        backgroundColor: '#E53E3E',
        borderColor: '#E53E3E',
      },
      collectionFilterText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
      },
      collectionFilterTextActive: {
        color: '#FFF',
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
        color: '#333',
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
      savedRecipeRemoveButton: {
        padding: 8,
      },
      savedRecipeRemoveButtonText: {
        fontSize: 22,
      },
});

export default SavedRecipes;
