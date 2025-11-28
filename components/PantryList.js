// PHASE 4: The UI (The "Face")

// 1. Create a new React Native component called 'PantryList'.
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity,
  Alert,
  Animated,
  Platform,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { getFirestore, collection, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { app, auth } from '../firebase.config';
import { useLanguage } from '../contexts/LanguageContext';
import { t } from '../contexts/translations';

export default function PantryList({ navigation }) {
  // 2. Use hooks to manage state for the list of items.
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('Other');
  const [editQuantity, setEditQuantity] = useState('');
  const [editUnit, setEditUnit] = useState('pcs');
  const [editExpiryDate, setEditExpiryDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const { language } = useLanguage();

  // Helper for safe date parsing
  const parseDate = (dateInput) => {
    if (!dateInput) return new Date();
    if (dateInput instanceof Date) return dateInput;
    
    const date = new Date(dateInput);
    // Check if valid date
    if (!isNaN(date.getTime())) {
      return date;
    }
    
    console.warn('Invalid date encountered:', dateInput);
    return new Date(); // Fallback to today
  };

  // Food categories for filtering
  const categories = [
    'All',
    'Dairy',
    'Meat & Poultry',
    'Fruits',
    'Vegetables',
    'Beverages',
    'Packaged Food',
    'Bakery',
    'Condiments',
    'Spices',
    'Other'
  ];

  // Helper to get translated category name
  const getCategoryTranslation = (category) => {
    const categoryKeyMap = {
      'All': 'all',
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
    return t(categoryKeyMap[category] || 'other', language);
  };

  // 3. Import and configure your Firebase connection details for the client-side app.
  const db = getFirestore(app);

  // Add focus effect to log when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      console.log('📱 PantryList screen focused');
      return () => {
        console.log('📱 PantryList screen unfocused');
      };
    }, [])
  );

  // 4. Write a useEffect hook that sets up a real-time listener to the 'pantry' collection in Firestore.
  useEffect(() => {
    if (__DEV__) {
      console.log('🔵 Setting up Firestore listener for pantry items');
    }
    
    let unsubscribeSnapshot = null;
    
    // Wait for authentication state to be ready
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      // Cleanup previous snapshot listener if it exists
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }
      
      if (!user) {
        if (__DEV__) {
          console.log('⏳ Waiting for user authentication...');
        }
        setLoading(false);
        return;
      }
      
      const userId = user.uid;
      if (__DEV__) {
        console.log('👤 Loading pantry for user:', userId);
      }
      
      // The query should order items by 'expiryDate' in ascending order.
      // NOW USING USER-SPECIFIC PATH: users/{userId}/pantry
      // REMOVED orderBy('expiryDate') to ensure items without expiry date are also fetched
      const q = query(
        collection(db, `users/${userId}/pantry`)
      );

      // Use the onSnapshot() method.
      unsubscribeSnapshot = onSnapshot(
        q,
        (querySnapshot) => {
          if (__DEV__) {
            console.log('📦 Received pantry snapshot, items count:', querySnapshot.size);
          }
          
          // In the callback, map the query snapshot to an array of objects and update the 'items' state.
          const pantryItems = [];
          querySnapshot.forEach((doc) => {
            pantryItems.push({
              id: doc.id,
              ...doc.data()
            });
          });

          // Sort items client-side: items with expiry date first (asc), then items without
          pantryItems.sort((a, b) => {
            if (a.expiryDate && b.expiryDate) {
              return new Date(a.expiryDate) - new Date(b.expiryDate);
            }
            if (a.expiryDate) return -1; // a has date, b doesn't -> a comes first
            if (b.expiryDate) return 1;  // b has date, a doesn't -> b comes first
            return 0; // neither has date
          });
          
          if (__DEV__) {
            console.log('✅ Pantry items updated:', pantryItems.length);
            
            // Log unique categories for debugging
            const uniqueCategories = [...new Set(pantryItems.map(item => item.category))];
            console.log('📊 Unique categories in data:', uniqueCategories);
          }
          
          setItems(pantryItems);
          setFilteredItems(pantryItems);
          setLoading(false);
        },
        (error) => {
          // Silently handle permission errors during auth transitions
          if (error.code === 'permission-denied') {
            if (__DEV__) {
              console.log('Permission denied - user may be signing out');
            }
            setItems([]);
            setFilteredItems([]);
            setLoading(false);
            return;
          }
          console.error('❌ Error fetching pantry items:', error);
          Alert.alert('Error', 'Failed to load pantry items');
          setLoading(false);
        }
      );
    });

    // Remember to return the unsubscribe function from useEffect to prevent memory leaks.
    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, []);

  // Filter items by category
  useEffect(() => {
    console.log('🔍 Filtering - Selected Category:', selectedCategory);
    console.log('🔍 Total items:', items.length);
    
    if (selectedCategory === 'All') {
      setFilteredItems(items);
      console.log('✅ Showing all items:', items.length);
    } else {
      const filtered = items.filter(item => {
        const itemCategory = (item.category || '').trim();
        const selectedCat = selectedCategory.trim();
        
        // Normalize categories for better matching
        const normalizeCategory = (cat) => {
          // Map both old (lowercase) and new (Title Case) formats
          const categoryMap = {
            'dairy': 'dairy',
            'meat': 'meatpoultry',
            'meatpoultry': 'meatpoultry',
            'meat&poultry': 'meatpoultry',
            'fruit': 'fruits',
            'fruits': 'fruits',
            'vegetable': 'vegetables',
            'vegetables': 'vegetables',
            'beverage': 'beverages',
            'beverages': 'beverages',
            'packaged': 'packagedfood',
            'packagedfood': 'packagedfood',
            'spices': 'spices',
            'condiments': 'condiments',
            'bakery': 'bakery',
            'other': 'other',
          };
          const normalized = cat.toLowerCase().replace(/[^a-z]/g, '');
          return categoryMap[normalized] || normalized;
        };
        
        // Compare normalized versions
        const match = normalizeCategory(itemCategory) === normalizeCategory(selectedCat);
        
        if (!match) {
          console.log(`  ❌ Item: "${item.name}" | Category: "${itemCategory}" (${normalizeCategory(itemCategory)}) | Filter: "${selectedCat}" (${normalizeCategory(selectedCat)})`);
        }
        
        return match;
      });
      setFilteredItems(filtered);
      console.log('✅ Filtered items:', filtered.length, 'for category:', selectedCategory);
    }
  }, [selectedCategory, items]);

  const deleteItem = async (itemId) => {
    try {
      const userId = auth.currentUser?.uid;
      
      if (!userId) {
        Alert.alert(t('error', language), 'You must be logged in to delete items');
        return;
      }
      
      await deleteDoc(doc(db, `users/${userId}/pantry`, itemId));
      // Success feedback is shown in UI update
    } catch (error) {
      console.error('Error deleting item:', error);
      Alert.alert(t('error', language), t('failedToDelete', language));
    }
  };

  const confirmDelete = (itemId, itemName) => {
    if (Platform.OS === 'web') {
      // On web, use browser confirm
      if (window.confirm(`${t('deleteItem', language)}: "${itemName}"?`)) {
        deleteItem(itemId);
      }
    } else {
      // On mobile, use Alert
      Alert.alert(
        t('deleteItem', language),
        `${t('deleteItemMessage', language)} "${itemName}"?`,
        [
          { text: t('cancel', language), style: 'cancel' },
          { 
            text: t('delete', language), 
            style: 'destructive', 
            onPress: () => deleteItem(itemId) 
          }
        ]
      );
    }
  };

  const clearAllInventory = async () => {
    const userId = auth.currentUser?.uid;
    
    if (!userId) {
      Alert.alert(t('error', language), 'You must be logged in');
      return;
    }
    
    if (Platform.OS === 'web') {
      if (!window.confirm(t('clearAllMessage', language))) {
        return;
      }
    } else {
      Alert.alert(
        t('clearAllWarning', language),
        t('clearAllMessage', language),
        [
          { text: t('cancel', language), style: 'cancel' },
          { 
            text: t('clearAll', language), 
            style: 'destructive', 
            onPress: async () => {
              try {
                // Delete all items from user-specific collection
                const deletePromises = items.map(item => 
                  deleteDoc(doc(db, `users/${userId}/pantry`, item.id))
                );
                await Promise.all(deletePromises);
                Alert.alert(t('success', language), t('inventoryCleared', language));
              } catch (error) {
                console.error('Error clearing inventory:', error);
                Alert.alert(t('error', language), t('failedToClear', language));
              }
            }
          }
        ]
      );
      return;
    }

    // Web path
    try {
      const deletePromises = items.map(item => 
        deleteDoc(doc(db, `users/${userId}/pantry`, item.id))
      );
      await Promise.all(deletePromises);
      alert(t('inventoryCleared', language));
    } catch (error) {
      console.error('Error clearing inventory:', error);
      alert(`${t('error', language)}: ${t('failedToClear', language)}`);
    }
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setEditName(item.name || item.itemName || '');
    setEditCategory(item.category || 'Other');
    setEditQuantity(item.quantity ? item.quantity.toString() : '1');
    setEditUnit(item.unit || 'pcs');
    setEditExpiryDate(parseDate(item.expiryDate));
    setEditModalVisible(true);
  };

  const saveEdit = async () => {
    if (!editingItem) return;

    // Validation
    if (!editName.trim()) {
      Alert.alert(t('error', language), t('pleaseEnterName', language));
      return;
    }

    if (!editQuantity || parseFloat(editQuantity) <= 0) {
      Alert.alert(t('error', language), t('pleaseEnterValidQuantity', language));
      return;
    }

    try {
      const userId = auth.currentUser?.uid;
      
      if (!userId) {
        Alert.alert(t('error', language), 'You must be logged in');
        return;
      }
      
      const itemRef = doc(db, `users/${userId}/pantry`, editingItem.id);
      await updateDoc(itemRef, {
        name: editName.trim(),
        itemName: editName.trim(),
        category: editCategory,
        quantity: parseFloat(editQuantity) || 1,
        unit: editUnit,
        expiryDate: editExpiryDate.toISOString(),
      });
      setEditModalVisible(false);
      Alert.alert(t('updated', language), t('updateSuccess', language));
    } catch (error) {
      console.error('Error updating item:', error);
      Alert.alert(t('error', language), t('failedToUpdate', language));
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setEditExpiryDate(selectedDate);
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Helper function to check if item is expiring soon
  const isExpiringSoon = (expiryDate) => {
    if (!expiryDate) return false;
    const expiry = parseDate(expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 7 && daysUntilExpiry >= 0;
  };

  const isExpired = (expiryDate) => {
    if (!expiryDate) return false;
    const expiry = parseDate(expiryDate);
    const today = new Date();
    return expiry < today;
  };

  const getDaysUntilExpiry = (expiryDate) => {
    if (!expiryDate) return null;
    const expiry = parseDate(expiryDate);
    const today = new Date();
    const days = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    
    if (days < 0) return `Expired ${Math.abs(days)} days ago`;
    if (days === 0) return 'Expires today!';
    if (days === 1) return 'Expires tomorrow';
    return `${days} days left`;
  };

  // 5. Render the data using a FlatList component.
  const renderItem = ({ item }) => {
    // Add styling to highlight items that are expiring soon (e.g., text color red).
    const itemStyle = isExpired(item.expiryDate) 
      ? styles.itemExpired 
      : isExpiringSoon(item.expiryDate) 
        ? styles.itemExpiringSoon 
        : styles.item;

    return (
      <View style={itemStyle}>
        <View style={styles.itemContent}>
          <View style={styles.itemInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.itemName}>{item.name || item.itemName || 'Unknown Item'}</Text>
              {item.detectionSource === 'Gemini AI' && (
                <Text style={styles.aiTag}>🤖 AI</Text>
              )}
              {item.detectionSource === 'Manual Entry' && (
                <Text style={styles.manualTag}>✏️ Manual</Text>
              )}
            </View>
            {item.category && (
              <Text style={styles.categoryTag}>{item.category}</Text>
            )}
            {item.quantity && (
              <Text style={styles.quantityText}>
                📦 {item.quantity} {item.unit || 'pcs'}
              </Text>
            )}
            {item.expiryDate && (
              <>
                <Text style={styles.expiryDate}>
                  📅 Expires: {formatDate(parseDate(item.expiryDate))}
                </Text>
                <Text style={[
                  styles.daysLeft,
                  isExpired(item.expiryDate) && styles.daysLeftExpired,
                  isExpiringSoon(item.expiryDate) && styles.daysLeftSoon
                ]}>
                  {getDaysUntilExpiry(item.expiryDate)}
                </Text>
              </>
            )}
            {item.confidence && (
              <Text style={styles.confidence}>
                Detection confidence: {Math.round(item.confidence * 100)}%
              </Text>
            )}
          </View>
          
          {/* Action Buttons on the Right */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => openEditModal(item)}
            >
              <Text style={styles.editButtonText}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={() => confirmDelete(item.id, item.name || item.itemName)}
            >
              <Text style={styles.deleteButtonText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>{t('loading', language)}</Text>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>{t('emptyPantry', language)}</Text>
        <Text style={styles.emptySubText}>{t('emptyPantrySubtitle', language)}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Category Filter */}
      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.filterButton,
                selectedCategory === category && styles.filterButtonActive
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[
                styles.filterButtonText,
                selectedCategory === category && styles.filterButtonTextActive
              ]}>
                {getCategoryTranslation(category)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Item Count */}
      <View style={styles.countContainer}>
        <Text style={styles.countText}>
          {filteredItems.length} {filteredItems.length === 1 ? t('item', language) : t('items', language)}
          {selectedCategory !== 'All' && ` ${t('in', language)} ${getCategoryTranslation(selectedCategory)}`}
        </Text>
      </View>

      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
      />

      {/* Clear All Button - Bottom Right */}
      {items.length > 0 && (
        <TouchableOpacity
          style={styles.clearAllButton}
          onPress={clearAllInventory}
        >
          <Text style={styles.clearAllButtonText}>🗑️</Text>
          <Text style={styles.clearAllButtonLabel}>{t('clearAll', language)}</Text>
        </TouchableOpacity>
      )}

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('editItem', language)}</Text>
            
            {editingItem && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Item Name */}
                <View style={styles.editSection}>
                  <Text style={styles.editLabel}>{t('itemName', language)} *</Text>
                  <TextInput
                    style={styles.editInput}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder={t('foodNamePlaceholder', language)}
                  />
                </View>

                {/* Category */}
                <View style={styles.editSection}>
                  <Text style={styles.editLabel}>{t('category', language)}</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.categoryScroll}
                  >
                    {['Dairy', 'Meat & Poultry', 'Fruits', 'Vegetables', 'Beverages', 'Packaged Food', 'Bakery', 'Condiments', 'Spices', 'Other'].map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.categoryChip,
                          editCategory === cat && styles.categoryChipSelected
                        ]}
                        onPress={() => setEditCategory(cat)}
                      >
                        <Text style={[
                          styles.categoryChipText,
                          editCategory === cat && styles.categoryChipTextSelected
                        ]}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Quantity and Unit */}
                <View style={styles.editSection}>
                  <Text style={styles.editLabel}>{t('quantity', language)} *</Text>
                  <View style={styles.quantityRow}>
                    <TextInput
                      style={[styles.editInput, { flex: 1, marginRight: 10 }]}
                      value={editQuantity}
                      onChangeText={setEditQuantity}
                      keyboardType="decimal-pad"
                      placeholder="1"
                    />
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.unitScroll}
                    >
                      {['pcs', 'kg', 'g', 'L', 'ml', 'oz', 'lb'].map((unit) => (
                        <TouchableOpacity
                          key={unit}
                          style={[
                            styles.unitChip,
                            editUnit === unit && styles.unitChipSelected
                          ]}
                          onPress={() => setEditUnit(unit)}
                        >
                          <Text style={[
                            styles.unitChipText,
                            editUnit === unit && styles.unitChipTextSelected
                          ]}>
                            {unit}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>

                {/* Expiry Date */}
                <View style={styles.editSection}>
                  <Text style={styles.editLabel}>{t('expiryDate', language)}</Text>
                  <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text style={styles.datePickerText}>
                      📅 {formatDate(editExpiryDate)}
                    </Text>
                  </TouchableOpacity>
                  
                  {showDatePicker && (
                    <DateTimePicker
                      value={editExpiryDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleDateChange}
                      minimumDate={new Date()}
                    />
                  )}
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setEditModalVisible(false)}
                  >
                    <Text style={styles.cancelButtonText}>{t('cancel', language)}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.saveButton]}
                    onPress={saveEdit}
                  >
                    <Text style={styles.saveButtonText}>💾 {t('save', language)}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1DE', // Alabaster
  },
  filterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterScrollContent: {
    paddingHorizontal: 10,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ddd',
    marginHorizontal: 4,
  },
  filterButtonActive: {
    backgroundColor: '#4A7C59', // Sage Green
    borderColor: '#4A7C59',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  countContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#F4F1DE',
  },
  countText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  listContainer: {
    padding: 10,
    paddingBottom: 80,
  },
  clearAllButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#E07A5F', // Terracotta
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  clearAllButtonText: {
    fontSize: 20,
  },
  clearAllButtonLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  item: {
    backgroundColor: '#fff',
    padding: 18,
    marginVertical: 8,
    borderRadius: 16, // Softer radius
    borderLeftWidth: 5,
    borderLeftColor: '#4A7C59', // Sage Green
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemExpiringSoon: {
    backgroundColor: '#fff',
    padding: 18,
    marginVertical: 8,
    borderRadius: 16,
    borderLeftWidth: 5,
    borderLeftColor: '#E07A5F', // Terracotta
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemExpired: {
    backgroundColor: '#ffebee',
    padding: 18,
    marginVertical: 8,
    borderRadius: 16,
    borderLeftWidth: 5,
    borderLeftColor: '#D62828', // Strong Red
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3D405B', // Charcoal
    marginRight: 8,
  },
  aiTag: {
    fontSize: 11,
    color: '#fff',
    backgroundColor: '#9C27B0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  manualTag: {
    fontSize: 11,
    color: '#fff',
    backgroundColor: '#E07A5F',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  quantityText: {
    fontSize: 14,
    color: '#E07A5F', // Terracotta
    fontWeight: '600',
    marginBottom: 5,
  },
  expiryDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  daysLeft: {
    fontSize: 13,
    color: '#E07A5F', // Terracotta
    fontWeight: '600',
  },
  daysLeftSoon: {
    color: '#E07A5F',
    fontWeight: 'bold',
  },
  daysLeftExpired: {
    color: '#D62828',
    fontWeight: 'bold',
  },
  categoryTag: {
    fontSize: 13,
    color: '#fff',
    backgroundColor: '#4A7C59', // Sage Green
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 5,
    overflow: 'hidden',
  },
  confidence: {
    fontSize: 11,
    color: '#999',
    marginTop: 3,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  editButton: {
    padding: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 45,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  editButtonText: {
    fontSize: 20,
  },
  deleteButton: {
    padding: 10,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 45,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  deleteButtonText: {
    fontSize: 20,
  },
  loadingText: {
    fontSize: 18,
    color: '#3D405B',
    textAlign: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3D405B',
    textAlign: 'center',
    marginTop: 100,
  },
  emptySubText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 25,
    width: '90%',
    maxWidth: 400,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3D405B',
    marginBottom: 20,
    textAlign: 'center',
  },
  editSection: {
    marginBottom: 20,
  },
  editLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3D405B',
    marginBottom: 8,
  },
  editInput: {
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  categoryScroll: {
    flexDirection: 'row',
    marginTop: 8,
  },
  categoryChip: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  categoryChipSelected: {
    backgroundColor: '#4A7C59', // Sage Green
    borderColor: '#4A7C59',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  categoryChipTextSelected: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unitScroll: {
    flex: 1,
    flexDirection: 'row',
  },
  unitChip: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    minWidth: 50,
    alignItems: 'center',
  },
  unitChipSelected: {
    backgroundColor: '#4A7C59', // Sage Green
    borderColor: '#4A7C59',
  },
  unitChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  unitChipTextSelected: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  datePickerButton: {
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  datePickerText: {
    fontSize: 16,
    color: '#3D405B',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 14,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#4A7C59', // Sage Green
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
