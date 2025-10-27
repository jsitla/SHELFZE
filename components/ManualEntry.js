import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { useLanguage } from '../contexts/LanguageContext';
import { t } from '../contexts/translations';

const CATEGORIES = [
  { id: 'Dairy', label: '🥛 Dairy', emoji: '🥛' },
  { id: 'Meat & Poultry', label: '🥩 Meat & Poultry', emoji: '🥩' },
  { id: 'Fruits', label: '🍎 Fruits', emoji: '🍎' },
  { id: 'Vegetables', label: '🥬 Vegetables', emoji: '🥬' },
  { id: 'Beverages', label: '🥤 Beverages', emoji: '🥤' },
  { id: 'Packaged Food', label: '📦 Packaged Food', emoji: '📦' },
  { id: 'Bakery', label: '🍞 Bakery', emoji: '🍞' },
  { id: 'Condiments', label: '🧂 Condiments', emoji: '🧂' },
  { id: 'Spices', label: '🌶️ Spices', emoji: '🌶️' },
  { id: 'Other', label: '🏷️ Other', emoji: '🏷️' },
];

const UNITS = [
  { id: 'pcs', label: 'pieces (pcs)' },
  { id: 'kg', label: 'kilograms (kg)' },
  { id: 'g', label: 'grams (g)' },
  { id: 'l', label: 'liters (L)' },
  { id: 'ml', label: 'milliliters (mL)' },
  { id: 'oz', label: 'ounces (oz)' },
  { id: 'lb', label: 'pounds (lb)' },
  { id: 'cups', label: 'cups' },
  { id: 'tbsp', label: 'tablespoons' },
  { id: 'tsp', label: 'teaspoons' },
];

export default function ManualEntry({ navigation, onItemAdded }) {
  const { language } = useLanguage();
  const [foodName, setFoodName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Other');
  const [quantity, setQuantity] = useState('1');
  const [selectedUnit, setSelectedUnit] = useState('pcs');
  const [expiryDate, setExpiryDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios'); // Keep picker open on iOS
    if (selectedDate) {
      setExpiryDate(selectedDate);
    }
  };

  const handleAddItem = async () => {
    console.log('🔵 handleAddItem called');
    
    // Validation
    if (!foodName.trim()) {
      console.log('❌ Validation failed: No food name');
      Alert.alert(t('missingInformation', language), t('pleaseEnterName', language));
      return;
    }

    if (!quantity || parseFloat(quantity) <= 0) {
      console.log('❌ Validation failed: Invalid quantity');
      Alert.alert(t('invalidQuantity', language), t('pleaseEnterValidQuantity', language));
      return;
    }

    console.log('✅ Validation passed, setting loading state');
    setLoading(true);

    try {
      console.log('🔵 Getting Firestore instance');
      const db = getFirestore();
      const pantryRef = collection(db, 'pantry');

      const newItem = {
        name: foodName.trim(),
        itemName: foodName.trim(), // Add itemName for consistency with scanned items
        category: selectedCategory,
        quantity: parseFloat(quantity),
        unit: selectedUnit,
        expiryDate: expiryDate.toISOString(),
        addedDate: new Date().toISOString(),
        detectionSource: 'Manual Entry',
        confidence: 1.0,
      };

      console.log('📝 Adding item to Firestore:', newItem);
      const docRef = await addDoc(pantryRef, newItem);
      console.log('✅ Item added successfully with ID:', docRef.id);

      // Success feedback
      Alert.alert(
        t('itemAdded', language),
        `${foodName} ${t('addedToPantry', language)}`,
        [
          {
            text: t('addAnother', language),
            onPress: () => {
              console.log('➕ User chose to add another item');
              setFoodName('');
              setQuantity('1');
              setExpiryDate(new Date());
            },
          },
          {
            text: t('done', language),
            onPress: () => {
              console.log('✅ User chose done, navigating back');
              if (onItemAdded) onItemAdded();
              if (navigation) navigation.goBack();
            },
          },
        ]
      );

      // Reset form if callback provided but no navigation
      if (!navigation) {
        console.log('🔄 No navigation, resetting form');
        setFoodName('');
        setQuantity('1');
        setExpiryDate(new Date());
      }
    } catch (error) {
      console.error('❌ Error adding item:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      Alert.alert(
        t('error', language), 
        `${t('failedToAddItem', language)}\n\nError: ${error.message}`
      );
    } finally {
      console.log('🔵 Resetting loading state');
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>➕ {t('addFoodItem', language)}</Text>
        <Text style={styles.headerSubtitle}>
          {t('manuallyAddItems', language)}
        </Text>
      </View>

      {/* Food Name */}
      <View style={styles.section}>
        <Text style={styles.label}>{t('foodName', language)} *</Text>
        <TextInput
          style={styles.input}
          placeholder={t('foodNamePlaceholder', language)}
          value={foodName}
          onChangeText={setFoodName}
          autoFocus
        />
      </View>

      {/* Category Selection */}
      <View style={styles.section}>
        <Text style={styles.label}>{t('category', language)}</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryButton,
                selectedCategory === cat.id && styles.categoryButtonSelected,
              ]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
              <Text
                style={[
                  styles.categoryLabel,
                  selectedCategory === cat.id && styles.categoryLabelSelected,
                ]}
              >
                {t(cat.id === 'meat' ? 'meatPoultry' : cat.id === 'grains' ? 'other' : cat.id, language)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Quantity and Unit */}
      <View style={styles.section}>
        <Text style={styles.label}>{t('quantity', language)} *</Text>
        <View style={styles.quantityRow}>
          <TextInput
            style={[styles.input, styles.quantityInput]}
            placeholder="1"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="decimal-pad"
          />
          <View style={styles.unitPicker}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.unitScroll}
            >
              {UNITS.map((unit) => (
                <TouchableOpacity
                  key={unit.id}
                  style={[
                    styles.unitButton,
                    selectedUnit === unit.id && styles.unitButtonSelected,
                  ]}
                  onPress={() => setSelectedUnit(unit.id)}
                >
                  <Text
                    style={[
                      styles.unitText,
                      selectedUnit === unit.id && styles.unitTextSelected,
                    ]}
                  >
                    {unit.id}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </View>

      {/* Expiry Date */}
      <View style={styles.section}>
        <Text style={styles.label}>{t('expiryDate', language)}</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.dateButtonText}>📅 {formatDate(expiryDate)}</Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={expiryDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            minimumDate={new Date()}
          />
        )}
      </View>

      {/* Add Button */}
      <TouchableOpacity
        style={[styles.addButton, loading && styles.addButtonDisabled]}
        onPress={handleAddItem}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <>
            <Text style={styles.addButtonText}>✨ {t('addToPantry', language)}</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Quick Tips */}
      <View style={styles.tipsContainer}>
        <Text style={styles.tipsTitle}>💡 Quick Tips</Text>
        <Text style={styles.tipText}>• Tap category icons to select</Text>
        <Text style={styles.tipText}>• Swipe units left/right to see more</Text>
        <Text style={styles.tipText}>• Expiry date helps track freshness</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 30,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginBottom: 25,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryButton: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    width: '30%',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#DDD',
  },
  categoryButtonSelected: {
    borderColor: '#E53E3E', // Vibrant red
    backgroundColor: '#FED7D7', // Light red background
  },
  categoryEmoji: {
    fontSize: 24,
    marginBottom: 5,
  },
  categoryLabel: {
    fontSize: 12,
    color: '#666',
  },
  categoryLabelSelected: {
    color: '#E53E3E', // Vibrant red
    fontWeight: 'bold',
  },
  quantityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quantityInput: {
    flex: 1,
  },
  unitPicker: {
    flex: 2,
  },
  unitScroll: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  unitButton: {
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderRightWidth: 1,
    borderRightColor: '#EEE',
  },
  unitButtonSelected: {
    backgroundColor: '#E53E3E', // Vibrant red
  },
  unitText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  unitTextSelected: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  dateButton: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
  },
  addButton: {
    backgroundColor: '#DD6B20', // Warm orange
    borderRadius: 15,
    padding: 18,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonDisabled: {
    backgroundColor: '#AAA',
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  tipsContainer: {
    marginTop: 30,
    backgroundColor: '#FFF9E6',
    borderRadius: 10,
    padding: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F57C00',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
});
