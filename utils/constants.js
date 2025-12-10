export const CATEGORIES = [
  { id: 'Dairy', label: '🥛 Dairy', emoji: '🥛', translationKey: 'dairy' },
  { id: 'Meat & Poultry', label: '🥩 Meat & Poultry', emoji: '🥩', translationKey: 'meatPoultry' },
  { id: 'Fruits', label: '🍎 Fruits', emoji: '🍎', translationKey: 'fruits' },
  { id: 'Vegetables', label: '🥬 Vegetables', emoji: '🥬', translationKey: 'vegetables' },
  { id: 'Beverages', label: '🥤 Beverages', emoji: '🥤', translationKey: 'beverages' },
  { id: 'Packaged Food', label: '📦 Packaged Food', emoji: '📦', translationKey: 'packagedFood' },
  { id: 'Bakery', label: '🍞 Bakery', emoji: '🍞', translationKey: 'bakery' },
  { id: 'Condiments', label: '🧂 Condiments', emoji: '🧂', translationKey: 'condiments' },
  { id: 'Spices', label: '🌶️ Spices', emoji: '🌶️', translationKey: 'spices' },
  { id: 'Other', label: '🏷️ Other', emoji: '🏷️', translationKey: 'other' },
];

export const UNITS = [
  { id: 'pcs', label: 'pieces (pcs)', translationKey: 'pcs' },
  { id: 'kg', label: 'kilograms (kg)', translationKey: 'kg' },
  { id: 'g', label: 'grams (g)', translationKey: 'g' },
  { id: 'l', label: 'liters (L)', translationKey: 'L' },
  { id: 'ml', label: 'milliliters (mL)', translationKey: 'ml' },
  { id: 'oz', label: 'ounces (oz)', translationKey: 'oz' },
  { id: 'lb', label: 'pounds (lb)', translationKey: 'lb' },
  { id: 'cups', label: 'cups', translationKey: 'cups' },
  { id: 'tbsp', label: 'tablespoons', translationKey: 'tbsp' },
  { id: 'tsp', label: 'teaspoons', translationKey: 'tsp' },
  { id: 'packs', label: 'packs', translationKey: 'packs' },
  { id: 'bottles', label: 'bottles', translationKey: 'bottles' },
  { id: 'cans', label: 'cans', translationKey: 'cans' },
  { id: 'boxes', label: 'boxes', translationKey: 'boxes' },
];

export const CATEGORY_KEY_MAP = CATEGORIES.reduce((acc, cat) => {
  acc[cat.id] = cat.translationKey;
  return acc;
}, {});

export const normalizeCategory = (category) => {
  if (!category) return 'Other';
  
  // Direct match (case-insensitive check)
  const directMatch = CATEGORIES.find(c => c.id.toLowerCase() === category.toLowerCase());
  if (directMatch) return directMatch.id;

  // Common mappings
  const map = {
    'Meat': 'Meat & Poultry',
    'meat': 'Meat & Poultry',
    'Poultry': 'Meat & Poultry',
    'poultry': 'Meat & Poultry',
    'Drink': 'Beverages',
    'drink': 'Beverages',
    'Drinks': 'Beverages',
    'drinks': 'Beverages',
    'Produce': 'Vegetables',
    'produce': 'Vegetables',
    'Fruit': 'Fruits',
    'fruit': 'Fruits',
    'Vegetable': 'Vegetables',
    'vegetable': 'Vegetables',
    'Bread': 'Bakery',
    'bread': 'Bakery',
    'Spice': 'Spices',
    'spice': 'Spices',
    'Condiment': 'Condiments',
    'condiment': 'Condiments',
    'Package': 'Packaged Food',
    'package': 'Packaged Food',
    'Packaged': 'Packaged Food',
    'packaged': 'Packaged Food',
    'Snack': 'Packaged Food',
    'snack': 'Packaged Food',
    'Snacks': 'Packaged Food',
    'snacks': 'Packaged Food',
  };

  return map[category] || 'Other';
};
