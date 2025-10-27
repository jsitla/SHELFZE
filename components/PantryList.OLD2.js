import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  Platform,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
} from 'firebase/firestore';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { app } from '../firebase.config';
import { useLanguage } from '../contexts/LanguageContext';
import { t } from '../contexts/translations';
import { Button, Card, Chip } from './ui';
import {
  Colors,
  Spacing,
  Typography,
  BorderRadius,
} from '../styles/designTokens';

const CATEGORY_CONFIG = [
  { id: 'All', icon: '📦' },
  { id: 'Dairy', icon: '🥛' },
  { id: 'Meat & Poultry', icon: '🥩' },
  { id: 'Fruits', icon: '🍎' },
  { id: 'Vegetables', icon: '🥬' },
  { id: 'Beverages', icon: '🧃' },
  { id: 'Packaged Food', icon: '🥫' },
  { id: 'Bakery', icon: '🍞' },
  { id: 'Condiments', icon: '🧂' },
  { id: 'Spices', icon: '🌶️' },
  { id: 'Other', icon: '📋' },
];

const UNIT_OPTIONS = ['pcs', 'kg', 'g', 'L', 'ml', 'oz', 'lb'];

const CATEGORY_TRANSLATIONS = {
  All: 'all',
  Dairy: 'dairy',
  'Meat & Poultry': 'meatPoultry',
  Fruits: 'fruits',
  Vegetables: 'vegetables',
  Beverages: 'beverages',
  'Packaged Food': 'packagedFood',
  Bakery: 'bakery',
  Condiments: 'condiments',
  Spices: 'spices',
  Other: 'other',
};

const normalizeCategory = (category = '') => {
  const normalized = category.toLowerCase().replace(/[^a-z]/g, '');
  const map = {
    dairy: 'dairy',
    meat: 'meatpoultry',
    meatpoultry: 'meatpoultry',
    meatpoultrys: 'meatpoultry',
    fruit: 'fruits',
    fruits: 'fruits',
    vegetable: 'vegetables',
    vegetables: 'vegetables',
    beverage: 'beverages',
    beverages: 'beverages',
    packaged: 'packagedfood',
    packagedfood: 'packagedfood',
    condiments: 'condiments',
    spices: 'spices',
    bakery: 'bakery',
    other: 'other',
  };
  return map[normalized] || normalized;
};

const statusStyles = {
  fresh: {
    accent: Colors.fresh,
    border: Colors.freshBorder,
    text: Colors.freshText,
  },
  expiring: {
    accent: Colors.expiringSoon,
    border: Colors.expiringSoonBorder,
    text: Colors.expiringSoonText,
  },
  expired: {
    accent: Colors.expired,
    border: Colors.expiredBorder,
    text: Colors.expiredText,
  },
};

export default function PantryList() {
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('Other');
  const [editQuantity, setEditQuantity] = useState('1');
  const [editUnit, setEditUnit] = useState('pcs');
  const [editExpiryDate, setEditExpiryDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const { language } = useLanguage();

  const db = getFirestore(app);

  useFocusEffect(
    React.useCallback(() => {
      console.log('📱 PantryList screen focused');
      return () => console.log('📱 PantryList screen unfocused');
    }, [])
  );

  useEffect(() => {
    const pantryQuery = query(collection(db, 'pantry'), orderBy('expiryDate', 'asc'));

    const unsubscribe = onSnapshot(
      pantryQuery,
      (snapshot) => {
        const pantryItems = snapshot.docs.map((docSnapshot) => ({
          id: docSnapshot.id,
          ...docSnapshot.data(),
        }));

        setItems(pantryItems);
        setFilteredItems(pantryItems);
        setLoading(false);
      },
      (error) => {
        console.error('❌ Error fetching pantry items:', error);
        Alert.alert(t('error', language), t('failedToLoadPantry', language));
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedCategory === 'All') {
      setFilteredItems(items);
      return;
    }

    const normalizedSelected = normalizeCategory(selectedCategory);
    const filtered = items.filter((item) => {
      const normalizedItem = normalizeCategory(item.category || '');
      return normalizedItem === normalizedSelected;
    });

    setFilteredItems(filtered);
  }, [selectedCategory, items]);

  const clearAllInventory = async () => {
    const performDelete = async () => {
      try {
        const deleteOps = items.map((item) => deleteDoc(doc(db, 'pantry', item.id)));
        await Promise.all(deleteOps);
        Alert.alert(t('success', language), t('inventoryCleared', language));
      } catch (error) {
        console.error('❌ Error clearing items:', error);
        Alert.alert(t('error', language), t('failedToClear', language));
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(t('clearAllMessage', language))) {
        await performDelete();
      }
      return;
    }

    Alert.alert(
      t('clearAllWarning', language),
      t('clearAllMessage', language),
      [
        { text: t('cancel', language), style: 'cancel' },
        { text: t('clearAll', language), style: 'destructive', onPress: performDelete },
      ]
    );
  };

  const deleteItem = async (itemId) => {
    try {
      await deleteDoc(doc(db, 'pantry', itemId));
    } catch (error) {
      console.error('❌ Error deleting item:', error);
      Alert.alert(t('error', language), t('failedToDelete', language));
    }
  };

  const confirmDelete = (item) => {
    const name = item.name || item.itemName;
    if (Platform.OS === 'web') {
      if (window.confirm(`${t('deleteItem', language)}: "${name}"?`)) {
        deleteItem(item.id);
      }
      return;
    }

    Alert.alert(
      t('deleteItem', language),
      `${t('deleteItemMessage', language)} "${name}"?`,
      [
        { text: t('cancel', language), style: 'cancel' },
        { text: t('delete', language), style: 'destructive', onPress: () => deleteItem(item.id) },
      ]
    );
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setEditName(item.name || item.itemName || '');
    setEditCategory(item.category || 'Other');
    setEditQuantity(item.quantity ? String(item.quantity) : '1');
    setEditUnit(item.unit || 'pcs');
    setEditExpiryDate(item.expiryDate ? new Date(item.expiryDate) : new Date());
    setEditModalVisible(true);
  };

  const saveEdit = async () => {
    if (!editingItem) return;

    if (!editName.trim()) {
      Alert.alert(t('error', language), t('pleaseEnterName', language));
      return;
    }

    const quantityValue = parseFloat(editQuantity);
    if (Number.isNaN(quantityValue) || quantityValue <= 0) {
      Alert.alert(t('error', language), t('pleaseEnterValidQuantity', language));
      return;
    }

    try {
      const itemRef = doc(db, 'pantry', editingItem.id);
      await updateDoc(itemRef, {
        name: editName.trim(),
        itemName: editName.trim(),
        category: editCategory,
        quantity: quantityValue,
        unit: editUnit,
        expiryDate: editExpiryDate.toISOString(),
      });

      setEditModalVisible(false);
      Alert.alert(t('updated', language), t('updateSuccess', language));
    } catch (error) {
      console.error('❌ Error updating item:', error);
      Alert.alert(t('error', language), t('failedToUpdate', language));
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setEditExpiryDate(selectedDate);
    }
  };

  const formatDate = (date) =>
    date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  const getExpiryStatus = (expiryDate) => {
    if (!expiryDate) return 'fresh';
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diff = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

    if (diff < 0) return 'expired';
    if (diff <= 7) return 'expiring';
    return 'fresh';
  };

  const getExpiryLabel = (expiryDate) => {
    if (!expiryDate) return t('noExpiry', language);

    const expiry = new Date(expiryDate);
    const today = new Date();
    const diff = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

    if (diff < 0) return t('expiredDaysAgo', language).replace('{days}', Math.abs(diff));
    if (diff === 0) return t('expiresToday', language);
    if (diff === 1) return t('expiresTomorrow', language);
    return t('daysLeft', language).replace('{days}', diff);
  };

  const renderPantryItem = ({ item }) => {
    const status = getExpiryStatus(item.expiryDate);
    const palette = statusStyles[status];

    return (
      <Card
        variant="elevated"
        padding="large"
        style={[styles.itemCard, { borderLeftColor: palette.border }]}
      >
        <View style={styles.itemHeader}>
          <View>
            <Text style={styles.itemName}>{item.name || item.itemName || t('unknownItem', language)}</Text>
            <Text style={[styles.statusText, { color: palette.text }]}>
              {getExpiryLabel(item.expiryDate)}
            </Text>
          </View>
          <View style={styles.badgeRow}>
            {item.detectionSource && (
              <Text style={styles.sourceBadge}>
                {item.detectionSource === 'Gemini AI' ? '🤖 AI' : '✏️ Manual'}
              </Text>
            )}
            {item.category && (
              <Chip variant="neutral" size="small" style={styles.inlineChip}>
                {item.category}
              </Chip>
            )}
          </View>
        </View>

        <View style={styles.itemDetails}>
          {item.quantity && (
            <Text style={styles.detailText}>
              📦 {item.quantity} {item.unit || 'pcs'}
            </Text>
          )}
          {item.expiryDate && (
            <Text style={styles.detailText}>
              📅 {formatDate(new Date(item.expiryDate))}
            </Text>
          )}
          {item.confidence && (
            <Text style={styles.subtleText}>
              {t('confidence', language)} {Math.round(item.confidence * 100)}%
            </Text>
          )}
        </View>

        <View style={styles.itemActions}>
          <Button
            variant="outline"
            size="small"
            onPress={() => openEditModal(item)}
            style={styles.actionButton}
          >
            ✏️ {t('edit', language)}
          </Button>
          <Button
            variant="danger"
            size="small"
            onPress={() => confirmDelete(item)}
            style={styles.actionButton}
          >
            🗑️ {t('delete', language)}
          </Button>
        </View>
      </Card>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyEmoji}>🥫</Text>
      <Text style={styles.emptyTitle}>{t('emptyPantry', language)}</Text>
      <Text style={styles.emptySubtitle}>{t('emptyPantrySubtitle', language)}</Text>
      <Button
        variant="primary"
        size="medium"
        onPress={() => Alert.alert(t('addItemManually', language), t('useAddButton', language))}
        style={styles.emptyButton}
      >
        ✨ {t('addYourFirstItem', language)}
      </Button>
    </View>
  );

  return (
    <View style={styles.screen}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>{t('pantryOverview', language)}</Text>
        <Text style={styles.heroSubtitle}>
          {t('pantryIntro', language)}
        </Text>
        <Card variant="default" padding="medium" style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{filteredItems.length}</Text>
          <Text style={styles.summaryLabel}>
            {filteredItems.length === 1 ? t('item', language) : t('items', language)}
            {selectedCategory !== 'All'
              ? ` ${t('in', language)} ${t(CATEGORY_TRANSLATIONS[selectedCategory], language)}`
              : ''}
          </Text>
        </Card>
      </View>

      <View style={styles.filterSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {CATEGORY_CONFIG.map((category) => (
            <Chip
              key={category.id}
              variant={selectedCategory === category.id ? 'primary' : 'neutral'}
              selected={selectedCategory === category.id}
              onPress={() => setSelectedCategory(category.id)}
              size="large"
              style={styles.filterChip}
            >
              {category.icon} {t(CATEGORY_TRANSLATIONS[category.id], language)}
            </Chip>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loadingState}>
          <Text style={styles.loadingText}>⏳ {t('loading', language)}</Text>
        </View>
      ) : filteredItems.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          renderItem={renderPantryItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {items.length > 0 && (
        <View style={styles.clearAllContainer}>
          <Button
            variant="danger"
            size="large"
            onPress={clearAllInventory}
            icon="🧹"
            fullWidth
          >
            {t('clearAll', language)}
          </Button>
        </View>
      )}

      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Card variant="elevated" padding="large" style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('editItem', language)}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>{t('itemName', language)} *</Text>
                <TextInput
                  style={styles.input}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder={t('foodNamePlaceholder', language)}
                  placeholderTextColor={Colors.textSecondary}
                />
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>{t('category', language)}</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.inlineChips}
                >
                  {CATEGORY_CONFIG.filter((cat) => cat.id !== 'All').map((cat) => (
                    <Chip
                      key={cat.id}
                      variant={editCategory === cat.id ? 'primary' : 'neutral'}
                      selected={editCategory === cat.id}
                      onPress={() => setEditCategory(cat.id)}
                      size="medium"
                      style={styles.inlineChip}
                    >
                      {cat.icon} {t(CATEGORY_TRANSLATIONS[cat.id], language)}
                    </Chip>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>{t('quantity', language)} *</Text>
                <View style={styles.quantityRow}>
                  <TextInput
                    style={[styles.input, styles.quantityInput]}
                    value={editQuantity}
                    onChangeText={setEditQuantity}
                    keyboardType="decimal-pad"
                  />
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.inlineChips}
                  >
                    {UNIT_OPTIONS.map((unit) => (
                      <Chip
                        key={unit}
                        variant={editUnit === unit ? 'secondary' : 'neutral'}
                        selected={editUnit === unit}
                        onPress={() => setEditUnit(unit)}
                        size="small"
                        style={styles.inlineChip}
                      >
                        {unit}
                      </Chip>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>{t('expiryDate', language)}</Text>
                <Button
                  variant="outline"
                  size="medium"
                  onPress={() => setShowDatePicker(true)}
                  style={styles.dateButton}
                >
                  📅 {formatDate(editExpiryDate)}
                </Button>
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

              <View style={styles.modalActions}>
                <Button
                  variant="ghost"
                  size="large"
                  onPress={() => setEditModalVisible(false)}
                  style={styles.actionButton}
                >
                  {t('cancel', language)}
                </Button>
                <Button
                  variant="success"
                  size="large"
                  onPress={saveEdit}
                  icon="💾"
                  style={styles.actionButton}
                >
                  {t('save', language)}
                </Button>
              </View>
            </ScrollView>
          </Card>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  hero: {
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.base,
    backgroundColor: Colors.surface,
  },
  heroTitle: {
    fontSize: Typography.fontSize.xxxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    marginTop: Spacing.xs,
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
  },
  summaryCard: {
    marginTop: Spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  summaryValue: {
    fontSize: Typography.fontSize.xxxl,
    fontWeight: Typography.fontWeight.extrabold,
    color: Colors.primaryDark,
  },
  summaryLabel: {
    marginTop: Spacing.xs,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  filterSection: {
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  filterScroll: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
  },
  filterChip: {
    marginRight: Spacing.sm,
  },
  listContent: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxxl,
  },
  itemCard: {
    marginBottom: Spacing.base,
    borderLeftWidth: 6,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
  },
  statusText: {
    marginTop: Spacing.xs,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  sourceBadge: {
    backgroundColor: Colors.secondary,
    color: Colors.textInverse,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  inlineChip: {
    marginRight: Spacing.sm,
  },
  itemDetails: {
    marginTop: Spacing.base,
    gap: Spacing.xs,
  },
  detailText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  subtleText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  itemActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  actionButton: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
  },
  emptyEmoji: {
    fontSize: 72,
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
  },
  emptySubtitle: {
    marginTop: Spacing.sm,
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: Spacing.xl,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: Typography.fontSize.lg,
    color: Colors.textSecondary,
  },
  clearAllContainer: {
    position: 'absolute',
    left: Spacing.base,
    right: Spacing.base,
    bottom: Spacing.xl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.base,
  },
  modalCard: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  formSection: {
    marginBottom: Spacing.lg,
  },
  formLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  input: {
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
  },
  inlineChips: {
    gap: Spacing.sm,
  },
  quantityRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  quantityInput: {
    flex: 1,
  },
  dateButton: {
    marginTop: Spacing.sm,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
  },
});
