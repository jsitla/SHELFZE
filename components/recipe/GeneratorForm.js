// components/recipe/GeneratorForm.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { useLanguage } from '../../contexts/LanguageContext';
import { t } from '../../contexts/translations';

const GeneratorForm = ({
  pantryItems,
  selectedIngredients,
  generateRecipeSuggestions,
  generatingRecipes,
  usageData,
}) => {
  const { language } = useLanguage();
  const [selectedDishCategory, setSelectedDishCategory] = useState(null);
  const [userGuidance, setUserGuidance] = useState('');
  const [showGuidanceInput, setShowGuidanceInput] = useState(false);

  const dishCategories = [
    { id: 'mainCourse', label: t('mainCourse', language), emoji: '🍽️' },
    { id: 'appetizer', label: t('appetizer', language), emoji: '🥗' },
    { id: 'dessert', label: t('dessert', language), emoji: '🍰' },
    { id: 'breakfast', label: t('breakfast', language), emoji: '🍳' },
    { id: 'soupSalad', label: t('soupSalad', language), emoji: '🥣' },
    { id: 'snack', label: t('snack', language), emoji: '🍿' },
  ];

  const handleGenerate = () => {
    generateRecipeSuggestions({
      selectedDishCategory,
      userGuidance,
    });
  };

  return (
    <View>
      {/* Usage Counter */}
      {usageData && (
        <View style={styles.usageCounterBadge}>
          <Text style={styles.usageCounterIcon}>🍲</Text>
          <Text style={styles.usageCounterText}>
            {t('recipesRemaining', language, { count: usageData.recipesRemaining })}
          </Text>
        </View>
      )}

      {/* Dish Category Selection */}
      <View style={styles.categorySection}>
        <Text style={styles.categorySectionTitle}>
          {t('whatToCook', language)}
        </Text>
        <View style={styles.categoryGrid}>
          {dishCategories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryButton,
                selectedDishCategory === category.id && styles.categoryButtonSelected,
              ]}
              onPress={() => setSelectedDishCategory(category.id)}
            >
              <Text style={styles.categoryEmoji}>{category.emoji}</Text>
              <Text style={[
                styles.categoryLabel,
                selectedDishCategory === category.id && styles.categoryLabelSelected,
              ]}>
                {category.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* User Guidance Input */}
      <View style={styles.ingredientSelectorContainer}>
        <TouchableOpacity
          style={styles.ingredientSelectorHeader}
          onPress={() => setShowGuidanceInput(!showGuidanceInput)}
        >
          <Text style={styles.ingredientSelectorTitle}>
            {t('addInstructions', language)}
          </Text>
          <Text style={styles.ingredientSelectorIcon}>
            {showGuidanceInput ? '▲' : '▼'}
          </Text>
        </TouchableOpacity>

        {showGuidanceInput && (
          <View style={styles.ingredientSelectorContent}>
            <TextInput
              style={styles.guidanceInput}
              placeholder={t('guidancePlaceholder', language)}
              value={userGuidance}
              onChangeText={setUserGuidance}
              multiline
            />
            <TouchableOpacity
              style={styles.clearGuidanceButton}
              onPress={() => setUserGuidance('')}
            >
              <Text style={styles.clearGuidanceButtonText}>{t('clear', language)}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Generate Button */}
      <TouchableOpacity
        style={[
          styles.generateButton,
          (generatingRecipes || !selectedDishCategory) && styles.generateButtonDisabled,
        ]}
        onPress={handleGenerate}
        disabled={generatingRecipes || !selectedDishCategory}
      >
        <Text style={styles.generateButtonText}>
          {generatingRecipes ? t('generating', language) : t('generateRecipes', language)}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  generateButton: {
    backgroundColor: '#DD6B20', // Warm orange
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
  categorySection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  categorySectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
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
    borderColor: '#E11D48', // Vibrant red
    backgroundColor: '#FED7D7', // Light red background
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
    color: '#E11D48', // Vibrant red text
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
  ingredientSelectorContent: {
    marginTop: 10,
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
  usageCounterBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FDBA74',
    zIndex: 1,
  },
  usageCounterIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  usageCounterText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#DD6B20',
  },
});

export default GeneratorForm;
