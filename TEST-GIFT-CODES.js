// Test Gift Codes Setup Script
// Run this in Firebase Console → Firestore → Run query
// Or use Firebase Admin SDK

/**
 * GIFT CODE TEST DATA
 * 
 * To create these gift codes, go to Firebase Console:
 * 1. Open Firestore Database
 * 2. Click "Start collection"
 * 3. Collection ID: "giftCodes"
 * 4. Add documents as shown below
 */

// ==========================================
// CODE 1: PREMIUM - 1 Month Premium Access
// ==========================================
// Document ID: PREMIUM1MONTH
const PREMIUM1MONTH = {
  code: "PREMIUM1MONTH",
  type: "premium",
  durationMonths: 1,
  used: false,
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
};

// ==========================================
// CODE 2: SCANS - 50 Extra Scans
// ==========================================
// Document ID: SCAN50
const SCAN50 = {
  code: "SCAN50",
  type: "scans",
  scansAmount: 50,
  used: false,
  createdAt: new Date(),
  // No expiration
};

// ==========================================
// CODE 3: RECIPES - 30 Extra Recipes
// ==========================================
// Document ID: RECIPE30
const RECIPE30 = {
  code: "RECIPE30",
  type: "recipes",
  recipesAmount: 30,
  used: false,
  createdAt: new Date(),
};

// ==========================================
// CODE 4: BUNDLE - 100 Scans + 100 Recipes
// ==========================================
// Document ID: BUNDLE100
const BUNDLE100 = {
  code: "BUNDLE100",
  type: "bundle",
  scansAmount: 100,
  recipesAmount: 100,
  used: false,
  createdAt: new Date(),
};

// ==========================================
// CODE 5: WELCOME - New User Welcome Gift
// ==========================================
// Document ID: WELCOME2025
const WELCOME2025 = {
  code: "WELCOME2025",
  type: "bundle",
  scansAmount: 20,
  recipesAmount: 20,
  used: false,
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
};

// ==========================================
// CODE 6: EXPIRED - Test Expired Code
// ==========================================
// Document ID: EXPIRED123
const EXPIRED123 = {
  code: "EXPIRED123",
  type: "scans",
  scansAmount: 10,
  used: false,
  createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
  expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Expired yesterday
};

// ==========================================
// STEP-BY-STEP: How to Create Gift Codes
// ==========================================

/*
1. Open Firebase Console: https://console.firebase.google.com/
2. Select project: pantryai-3d396
3. Click "Firestore Database" in left menu
4. Click "Start collection" button
5. Collection ID: giftCodes
6. Click "Next"
7. For each code above:
   a. Document ID: (use the code itself, e.g., "PREMIUM1MONTH")
   b. Add fields one by one:
      - Field: code, Type: string, Value: "PREMIUM1MONTH"
      - Field: type, Type: string, Value: "premium"
      - Field: durationMonths, Type: number, Value: 1
      - Field: used, Type: boolean, Value: false
      - Field: createdAt, Type: timestamp, Value: (click "Set to current time")
      - Field: expiresAt, Type: timestamp, Value: (set to future date)
   c. Click "Save"
8. Repeat for all codes

QUICK TIP: After creating the first code, you can duplicate it:
- Click the 3 dots next to the document
- Click "Duplicate document"
- Edit the fields as needed
- Save
*/

// ==========================================
// TESTING CHECKLIST
// ==========================================

/*
Test Case 1: Valid Premium Code
- Code: PREMIUM1MONTH
- Expected: User upgraded to premium, 500/500 scans/recipes
- Verify: Tier badge shows "👑 Premium"

Test Case 2: Valid Scans Code
- Code: SCAN50
- Expected: +50 scans added to balance
- Verify: Counter updates immediately

Test Case 3: Valid Bundle Code
- Code: BUNDLE100
- Expected: +100 scans AND +100 recipes
- Verify: Both counters update

Test Case 4: Invalid Code
- Code: INVALID123 (don't create this)
- Expected: Error alert "Invalid gift code"

Test Case 5: Used Code
- Code: SCAN50 (redeem twice)
- Expected: Error alert "This gift code has already been used"

Test Case 6: Expired Code
- Code: EXPIRED123
- Expected: Error alert "This gift code has expired"

Test Case 7: Case Insensitive
- Code: scan50 (lowercase)
- Expected: Auto-converted to SCAN50 and works
*/
