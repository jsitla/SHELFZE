// components/recipe/RecipeFilters.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useLanguage } from '../../contexts/LanguageContext';
import { t } from '../../contexts/translations';

const RecipeFilters = ({ onFilterChange }) => {
  const { language } = useLanguage();
  const [selectedTimeFilter, setSelectedTimeFilter] = useState('all');
  const [selectedDietaryFilter, setSelectedDietaryFilter] = useState('all');

  const dietaryFilters = [
    { id: 'all', label: t('allDiets', language), emoji: '🍽️' },
    { id: 'vegetarian', label: t('vegetarian', language), emoji: '🥬' },
    { id: 'vegan', label: t('vegan', language), emoji: '🌱' },
    { id: 'glutenFree', label: t('glutenFree', language), emoji: '🌾' },
    { id: 'lowCalorie', label: t('lowCalorie', language), emoji: '🔥' },
  ];

  const timeFilters = [
    { id: 'all', label: t('allTime', language), emoji: '⏰' },
    { id: 'quick', label: t('quickRecipes', language), emoji: '⚡', max: 30 },
    { id: 'medium', label: t('mediumRecipes', language), emoji: '🕐', min: 30, max: 60 },
    { id: 'long', label: t('longRecipes', language), emoji: '🕰️', min: 60 },
  ];

  const handleTimeFilterChange = (filterId) => {
    setSelectedTimeFilter(filterId);
    onFilterChange({ time: filterId, dietary: selectedDietaryFilter });
  };

  const handleDietaryFilterChange = (filterId) => {
    setSelectedDietaryFilter(filterId);
    onFilterChange({ time: selectedTimeFilter, dietary: filterId });
  };

  return (
    <View>
      {/* Time Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeFilterContainer}>
        {timeFilters.map(filter => (
          <TouchableOpacity
            key={filter.id}
            style={[
              styles.timeFilterChip,
              selectedTimeFilter === filter.id && styles.timeFilterChipActive,
            ]}
            onPress={() => handleTimeFilterChange(filter.id)}
          >
            <Text style={[
              styles.timeFilterText,
              selectedTimeFilter === filter.id && styles.timeFilterTextActive,
            ]}>
              {filter.emoji} {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Dietary Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dietaryFilterContainer}>
        {dietaryFilters.map(filter => (
          <TouchableOpacity
            key={filter.id}
            style={[
              styles.dietaryFilterChip,
              selectedDietaryFilter === filter.id && styles.dietaryFilterChipActive,
            ]}
            onPress={() => handleDietaryFilterChange(filter.id)}
          >
            <Text style={[
              styles.dietaryFilterText,
              selectedDietaryFilter === filter.id && styles.dietaryFilterTextActive,
            ]}>
              {filter.emoji} {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
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
    backgroundColor: '#E53E3E',
    borderColor: '#E53E3E',
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
    backgroundColor: '#DD6B20',
    borderColor: '#DD6B20',
  },
  dietaryFilterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9C4A00',
  },
  dietaryFilterTextActive: {
    color: '#fff',
  },
});

export default RecipeFilters;
