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
import { app, auth } from '../firebase.config';
import { useLanguage } from '../contexts/LanguageContext';
import { t } from '../contexts/translations';
import { formatDate } from '../utils/dateHelpers';

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

const categoryKeyMap = {
  'Dairy': 'dairy',
  'Meat & Poultry': 'meatPoultry',
  'Fruits': 'fruits',
  'Vegetables': 'vegetables',
  'Beverages': 'beverages',
  'Packaged Food': 'packagedFood',
  'Bakery': 'bakery',
  'Condiments': 'condiments',
  'Spices': 'spices',
  'Other': 'other'
};

export default function ManualEntry({ navigation, onItemAdded }) {
  const { language } = useLanguage();
  const [foodName, setFoodName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Other');
  const [quantity, setQuantity] = useState('1');
  const [selectedUnit, setSelectedUnit] = useState('pcs');
  const [expiryDate, setExpiryDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const MAX_NAME_LENGTH = 100;
  const MAX_QUANTITY = 10000;

  const handleDateChange = (event, selectedDate) => {
    // On Android, hide picker after selection
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    // On iOS, keep picker open until user clicks Done
    
    if (selectedDate) {
      setExpiryDate(selectedDate);
    }
  };

  const handleAddItem = async () => {
    if (__DEV__) console.log('🔵 handleAddItem called');
    
    // Validation
    if (!foodName.trim()) {
      if (__DEV__) console.log('❌ Validation failed: No food name');
      Alert.alert(t('missingInformation', language), t('pleaseEnterName', language));
      return;
    }

    if (foodName.trim().length > MAX_NAME_LENGTH) {
      Alert.alert(t('invalidInput', language), `Name must be less than ${MAX_NAME_LENGTH} characters`);
      return;
    }

    const quantityNum = parseFloat(quantity);
    if (!quantity || isNaN(quantityNum) || quantityNum <= 0 || quantityNum > MAX_QUANTITY) {
      if (__DEV__) console.log('❌ Validation failed: Invalid quantity');
      Alert.alert(t('invalidQuantity', language), `Please enter a valid quantity (1-${MAX_QUANTITY})`);
      return;
    }

    if (__DEV__) console.log('✅ Validation passed, setting loading state');
    setLoading(true);

    try {
      // Get authenticated user ID
      const userId = auth.currentUser?.uid;
      
      if (!userId) {
        if (__DEV__) console.error('❌ No authenticated user found');
        Alert.alert(t('error', language), t('pleaseRestart', language));
        setLoading(false);
        return;
      }

      if (__DEV__) console.log('🔵 Getting Firestore instance for user:', userId);
      const db = getFirestore(app);
      const pantryRef = collection(db, `users/${userId}/pantry`);

      const newItem = {
        name: foodName.trim(),
        itemName: foodName.trim(), // Add itemName for consistency with scanned items
        category: selectedCategory,
        quantity: quantityNum,
        unit: selectedUnit,
        addedDate: new Date().toISOString(),
        detectionSource: 'Manual Entry',
        confidence: 1.0,
      };

      // Only add expiry date if user has set one (not default date)
      if (expiryDate) {
        newItem.expiryDate = expiryDate.toISOString();
      }

      if (__DEV__) console.log('📝 Adding item to Firestore:', newItem);
      const docRef = await addDoc(pantryRef, newItem);
      if (__DEV__) console.log('✅ Item added successfully with ID:', docRef.id);

      // Success feedback
      Alert.alert(
        t('itemAdded', language),
        `${foodName} ${t('addedToPantry', language)}`,
        [
          {
            text: t('addAnother', language),
            onPress: () => {
              if (__DEV__) console.log('➕ User chose to add another item');
              setFoodName('');
              setQuantity('1');
              setExpiryDate(null);
            },
          },
          {
            text: t('done', language),
            onPress: () => {
              if (__DEV__) console.log('✅ User chose done, navigating back');
              if (onItemAdded) onItemAdded();
              if (navigation) navigation.goBack();
            },
          },
        ]
      );

      // Reset form if callback provided but no navigation
      if (!navigation) {
        if (__DEV__) console.log('🔄 No navigation, resetting form');
        setFoodName('');
        setQuantity('1');
        setExpiryDate(null);
      }
    } catch (error) {
      if (__DEV__) {
        console.error('❌ Error adding item:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          stack: error.stack
        });
      }
      Alert.alert(
        t('error', language), 
        `${t('failedToAddItem', language)}\n\nError: ${error.message}`
      );
    } finally {
      if (__DEV__) console.log('🔵 Resetting loading state');
      setLoading(false);
    }
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
          onChangeText={(text) => {
            // Sanitize input: remove special characters that could cause issues
            const sanitized = text.replace(/[<>{}]/g, '');
            setFoodName(sanitized);
          }}
          maxLength={MAX_NAME_LENGTH}
          autoFocus
        />
        <Text style={styles.charCount}>{foodName.length}/{MAX_NAME_LENGTH}</Text>
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
                {t(categoryKeyMap[cat.id] || 'other', language)}
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
            onChangeText={(text) => {
              // Only allow positive numbers and decimal point
              const sanitized = text.replace(/[^0-9.]/g, '');
              // Prevent multiple decimal points
              const parts = sanitized.split('.');
              if (parts.length > 2) {
                setQuantity(parts[0] + '.' + parts.slice(1).join(''));
              } else {
                setQuantity(sanitized);
              }
            }}
            keyboardType="decimal-pad"
            maxLength={10}
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
                    {t(unit.id === 'l' ? 'L' : unit.id, language)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </View>

      {/* Expiry Date */}
      <View style={styles.section}>
        <Text style={styles.label}>{t('expiryDate', language)} ({t('optional', language)})</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => {
            // Initialize with today's date if not set
            if (!expiryDate) {
              setExpiryDate(new Date());
            }
            setShowDatePicker(!showDatePicker);
          }}
        >
          <Text style={styles.dateButtonText}>
            📅 {expiryDate ? formatDate(expiryDate, language) : t('notSet', language)}
          </Text>
        </TouchableOpacity>

        {showDatePicker && (
          <View style={styles.datePickerContainer}>
            <DateTimePicker
              value={expiryDate || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={styles.datePickerDone}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.datePickerDoneText}>✓ Done</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.datePickerDone, { backgroundColor: '#999', marginTop: 5 }]}
              onPress={() => {
                setExpiryDate(null);
                setShowDatePicker(false);
              }}
            >
              <Text style={styles.datePickerDoneText}>✗ {t('clearDate', language)}</Text>
            </TouchableOpacity>
          </View>
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
        <Text style={styles.tipsTitle}>💡 {t('quickTips', language)}</Text>
        <Text style={styles.tipText}>• {t('tipTapCategory', language)}</Text>
        <Text style={styles.tipText}>• {t('tipSwipeUnits', language)}</Text>
        <Text style={styles.tipText}>• {t('tipExpiryDate', language)}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1DE', // Alabaster
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
    color: '#3D405B', // Charcoal
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
    color: '#3D405B', // Charcoal
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
    borderColor: '#4A7C59', // Sage Green
    backgroundColor: '#E8F5E9', // Light Green
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
    color: '#4A7C59', // Sage Green
    fontWeight: 'bold',
  },
  quantityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quantityInput: {
    flex: 1,
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 5,
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
    backgroundColor: '#4A7C59', // Sage Green
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
  datePickerContainer: {
    marginTop: 10,
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  datePickerDone: {
    backgroundColor: '#4A7C59', // Sage Green
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  datePickerDoneText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#E07A5F', // Terracotta
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
    backgroundColor: '#E8F5E9', // Light Green
    borderRadius: 10,
    padding: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#4A7C59', // Sage Green
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4A7C59', // Sage Green
    marginBottom: 8,
  },
  tipText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
});
