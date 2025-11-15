// components/recipe/IngredientSelector.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useLanguage } from '../../contexts/LanguageContext';
import { t } from '../../contexts/translations';

const IngredientSelector = ({
  pantryItems,
  selectedIngredients,
  onSelectionChange,
}) => {
  const { language } = useLanguage();
  const [showIngredientSelector, setShowIngredientSelector] = useState(false);

  const toggleIngredient = (ingredientName) => {
    const newSelection = selectedIngredients.includes(ingredientName)
      ? selectedIngredients.filter((name) => name !== ingredientName)
      : [...selectedIngredients, ingredientName];
    onSelectionChange(newSelection);
  };

  const toggleAllIngredients = () => {
    if (selectedIngredients.length === pantryItems.length) {
      onSelectionChange([]);
    } else {
      const allNames = pantryItems
        .map((item) => item.itemName || item.name)
        .filter((name) => name);
      onSelectionChange(allNames);
    }
  };

  return (
    <View style={styles.ingredientSelectorContainer}>
      <TouchableOpacity
        style={styles.ingredientSelectorHeader}
        onPress={() => setShowIngredientSelector(!showIngredientSelector)}
      >
        <Text style={styles.ingredientSelectorTitle}>
          {t('selectIngredients', language)} ({selectedIngredients.length}/{pantryItems.length})
        </Text>
        <Text style={styles.ingredientSelectorIcon}>
          {showIngredientSelector ? '▲' : '▼'}
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
                ? t('deselectAll', language)
                : t('selectAll', language)}
            </Text>
          </TouchableOpacity>
          <ScrollView style={styles.ingredientCheckboxList} nestedScrollEnabled>
            {pantryItems.map((item) => {
              const itemName = item.itemName || item.name;
              if (!itemName) return null;

              const isSelected = selectedIngredients.includes(itemName);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.ingredientCheckbox}
                  onPress={() => toggleIngredient(itemName)}
                >
                  <Text style={styles.checkbox}>
                    {isSelected ? '✅' : '🔲'}
                  </Text>
                  <Text
                    style={isSelected ? styles.ingredientCheckboxText : styles.ingredientCheckboxTextDisabled}
                  >
                    {itemName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
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
  selectAllButton: {
    backgroundColor: '#E53E3E',
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
    maxHeight: 200, // Limit height to prevent taking too much space
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
});

export default IngredientSelector;
