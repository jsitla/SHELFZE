# Gift Code System Documentation

## Overview
Shelfze supports gift codes that can be redeemed by users to receive premium subscriptions, extra scans, or extra recipes. This allows users to gift premium features to friends or use promotional codes.

## Firestore Schema

Gift codes are stored in the `giftCodes` collection:

```javascript
giftCodes/{codeId} {
  code: string,              // The actual code (e.g., "GIFT2025")
  type: string,              // 'premium', 'scans', 'recipes', or 'bundle'
  
  // Premium type fields
  durationMonths: number,    // For 'premium' type: duration in months
  
  // Scans/Recipes type fields
  scansAmount: number,       // For 'scans' or 'bundle' type
  recipesAmount: number,     // For 'recipes' or 'bundle' type
  
  // Usage tracking
  used: boolean,             // Whether code has been redeemed
  usedBy: string,            // User ID who redeemed it (if used)
  usedAt: timestamp,         // When it was redeemed (if used)
  
  // Expiration
  expiresAt: timestamp,      // Optional: when code expires
  createdAt: timestamp,      // When code was created
  createdBy: string,         // Admin ID who created it
}
```

## Gift Code Types

### 1. Premium Subscription
Grants premium tier access for a specified duration.

```javascript
{
  code: "PREMIUM30",
  type: "premium",
  durationMonths: 1,  // 1 month of premium
  used: false,
  createdAt: serverTimestamp(),
}
```

### 2. Extra Scans
Adds a specified number of scans to user's account.

```javascript
{
  code: "SCAN50",
  type: "scans",
  scansAmount: 50,
  used: false,
  createdAt: serverTimestamp(),
}
```

### 3. Extra Recipes
Adds a specified number of recipes to user's account.

```javascript
{
  code: "RECIPE50",
  type: "recipes",
  recipesAmount: 50,
  used: false,
  createdAt: serverTimestamp(),
}
```

### 4. Bundle
Adds both scans and recipes.

```javascript
{
  code: "BUNDLE100",
  type: "bundle",
  scansAmount: 50,
  recipesAmount: 50,
  used: false,
  createdAt: serverTimestamp(),
}
```

## Creating Gift Codes

### Option 1: Firebase Console
1. Go to Firestore Database
2. Navigate to `giftCodes` collection
3. Add a new document
4. Set the document ID as the gift code (e.g., "NEWYEAR2026")
5. Add the required fields

### Option 2: Cloud Function (Recommended for Admin Panel)

```javascript
// functions/src/createGiftCode.js
exports.createGiftCode = functions.https.onCall(async (data, context) => {
  // Check if user is admin
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can create gift codes');
  }
  
  const { code, type, durationMonths, scansAmount, recipesAmount, expiresAt } = data;
  
  const giftCodeData = {
    code: code.toUpperCase(),
    type,
    used: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: context.auth.uid,
  };
  
  if (type === 'premium') {
    giftCodeData.durationMonths = durationMonths || 1;
  }
  if (type === 'scans' || type === 'bundle') {
    giftCodeData.scansAmount = scansAmount;
  }
  if (type === 'recipes' || type === 'bundle') {
    giftCodeData.recipesAmount = recipesAmount;
  }
  if (expiresAt) {
    giftCodeData.expiresAt = admin.firestore.Timestamp.fromDate(new Date(expiresAt));
  }
  
  await admin.firestore().collection('giftCodes').doc(code.toUpperCase()).set(giftCodeData);
  
  return { success: true, code: code.toUpperCase() };
});
```

## Usage in App

Users can redeem gift codes from the Profile screen:

1. Tap "Have a gift code?" button
2. Enter the code (auto-converted to uppercase)
3. Tap "Redeem"
4. System validates and applies benefits

## Example Gift Codes

### For Testing (Create these manually in Firestore):

```javascript
// 1 month premium
giftCodes/WELCOME2026 {
  code: "WELCOME2026",
  type: "premium",
  durationMonths: 1,
  used: false,
  createdAt: <timestamp>,
}

// 50 extra scans
giftCodes/SCAN50 {
  code: "SCAN50",
  type: "scans",
  scansAmount: 50,
  used: false,
  createdAt: <timestamp>,
}

// 100 scans + 100 recipes bundle
giftCodes/BUNDLE100 {
  code: "BUNDLE100",
  type: "bundle",
  scansAmount: 100,
  recipesAmount: 100,
  used: false,
  createdAt: <timestamp>,
}

// Early bird premium (12 months)
giftCodes/EARLYBIRD2026 {
  code: "EARLYBIRD2026",
  type: "premium",
  durationMonths: 12,
  used: false,
  expiresAt: <2026-01-01 timestamp>,
  createdAt: <timestamp>,
}
```

## Security Rules

Add these Firestore security rules:

```javascript
match /giftCodes/{code} {
  // Only authenticated users can read gift codes (to redeem)
  allow read: if request.auth != null;
  
  // Only admins can create/update/delete gift codes
  allow write: if request.auth != null && 
                  get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}
```

## Best Practices

1. **Code Format**: Use uppercase, alphanumeric codes (e.g., "NEWYEAR2026", "FRIEND50")
2. **Expiration**: Set expiration dates for promotional codes
3. **Tracking**: Monitor usage via `used`, `usedBy`, and `usedAt` fields
4. **Validation**: Check code exists, not used, and not expired before redeeming
5. **User Communication**: Show clear success/error messages when redeeming

## Future Enhancements

- **Referral Codes**: Generate unique codes for each user to share
- **Multi-Use Codes**: Allow codes to be used N times instead of just once
- **Analytics**: Track redemption rates and most popular codes
- **Admin Panel**: Web interface for creating and managing gift codes
- **Bulk Generation**: Create multiple codes at once for promotions
