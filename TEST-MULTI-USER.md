# Multi-User Implementation Test Plan

## Testing Status: Ready for Manual Testing

## Test Environment
- **App**: Shelfze (Expo)
- **Date**: October 27, 2025
- **Server**: Running on port 8081

## Automated Pre-Flight Checks ✅

### 1. Code Changes Verified
- ✅ App.js: Authentication added
- ✅ PantryList.js: User-scoped queries
- ✅ ManualEntry.js: User-scoped saves
- ✅ CameraScanner.js: User-scoped operations
- ✅ RecipeGenerator.js: User-scoped collections
- ✅ Cloud Functions: userId validation
- ✅ Firestore Rules: User-based access control

### 2. File Integrity
- ✅ All imports updated with getAuth
- ✅ All Firestore paths use `users/${userId}/pantry`
- ✅ Security rules enforce authentication

## Manual Testing Checklist

### Test 1: Authentication Flow
**Steps**:
1. Open the Shelfze app on device/emulator
2. Observe loading screen with "Loading Shelfze..." message
3. Wait for authentication to complete (~500ms)

**Expected Results**:
- ✅ Loading screen appears briefly
- ✅ App loads successfully
- ✅ No error messages
- ✅ Console shows: "User authenticated: [userId]"

**Status**: ⏳ PENDING

---

### Test 2: User ID Generation
**Steps**:
1. Open browser developer console (web) or React Native debugger
2. Run: `console.log('User ID:', auth.currentUser?.uid)`
3. Note the userId (looks like: `AbC123dEf456...`)

**Expected Results**:
- ✅ userId is NOT null
- ✅ userId is a long alphanumeric string
- ✅ userId persists after refreshing app

**Status**: ⏳ PENDING

---

### Test 3: Pantry Item Addition (Manual Entry)
**Steps**:
1. Navigate to "Add Item" screen
2. Add item: "Test Banana"
3. Check browser console for: "Adding item to Firestore"
4. Verify console shows path: `users/[userId]/pantry`

**Expected Results**:
- ✅ Item saves successfully
- ✅ Console shows user-specific path
- ✅ Success message appears
- ✅ Item appears in pantry list

**Status**: ⏳ PENDING

---

### Test 4: Firestore Data Structure
**Steps**:
1. Open Firebase Console (https://console.firebase.google.com)
2. Go to Firestore Database
3. Navigate to: `users` → `[userId]` → `pantry`
4. Verify "Test Banana" exists

**Expected Results**:
- ✅ `users` collection exists
- ✅ User document with your userId exists
- ✅ `pantry` subcollection contains "Test Banana"
- ✅ NO root-level `pantry` collection created

**Status**: ⏳ PENDING

---

### Test 5: User Isolation (Multi-Device Test)
**Steps**:
1. **Device A**: Add pantry item "Apple"
2. **Device B**: Open app (new anonymous user created)
3. **Device B**: Check pantry list

**Expected Results**:
- ✅ Device B pantry is EMPTY (no "Apple" visible)
- ✅ Device B has different userId than Device A
- ✅ Device A still shows "Apple"

**Status**: ⏳ PENDING

---

### Test 6: Camera Scanning with User Isolation
**Steps**:
1. Navigate to Camera Scanner
2. Scan a food item or upload an image
3. Check browser console for Cloud Function request
4. Verify request body includes: `userId: "[your-user-id]"`

**Expected Results**:
- ✅ Cloud Function receives userId parameter
- ✅ Scanned item saves to `users/[userId]/pantry`
- ✅ Item appears in user's pantry only

**Status**: ⏳ PENDING

---

### Test 7: Recipe Collections (Saved Recipes)
**Steps**:
1. Generate recipes from pantry
2. Save a recipe as "Favorite"
3. Check Firestore Console: `users/[userId]/recipeCollections`
4. Verify recipe saved in user-specific collection

**Expected Results**:
- ✅ Recipe saves successfully
- ✅ Saved in `users/[userId]/recipeCollections`
- ✅ Recipe includes full data (ingredients, instructions)
- ✅ Other users cannot see this saved recipe

**Status**: ⏳ PENDING

---

### Test 8: Session Persistence
**Steps**:
1. Add pantry items as User A
2. Close the app completely
3. Reopen the app
4. Check pantry list

**Expected Results**:
- ✅ Same userId loads (anonymous ID persists)
- ✅ All pantry items from before still visible
- ✅ User session maintained

**Status**: ⏳ PENDING

---

### Test 9: Security Rules Validation
**Steps**:
1. Open Firebase Console → Firestore → Rules
2. Verify rules require authentication
3. Attempt to read another user's data (via console):
   ```javascript
   // This should FAIL
   db.collection('users').doc('OTHER_USER_ID').collection('pantry').get()
   ```

**Expected Results**:
- ✅ Rules require: `request.auth != null`
- ✅ Rules verify: `request.auth.uid == userId`
- ✅ Cross-user access blocked (permission denied error)

**Status**: ⏳ PENDING

---

### Test 10: Cloud Function Validation
**Steps**:
1. Open Firebase Console → Functions → Logs
2. Scan an item with camera
3. Check function logs for: "userId: [your-user-id]"

**Expected Results**:
- ✅ Function receives userId parameter
- ✅ Function validates userId exists
- ✅ Function saves to user-specific path
- ✅ No errors in function logs

**Status**: ⏳ PENDING

---

## Browser Console Tests (Quick Validation)

### Check Authentication Status
```javascript
// Run in browser console
import { getAuth } from 'firebase/auth';
import { app } from './firebase.config';

const auth = getAuth(app);
console.log('User:', auth.currentUser);
console.log('User ID:', auth.currentUser?.uid);
console.log('Anonymous:', auth.currentUser?.isAnonymous);
```

**Expected Output**:
```
User: {uid: "AbC123...", isAnonymous: true, ...}
User ID: "AbC123dEf456gHi789..."
Anonymous: true
```

---

## Known Issues to Watch For

### Issue 1: "No authenticated user found"
**Symptom**: Alert appears when trying to add items
**Cause**: Authentication not complete before user interaction
**Fix**: Loading screen should prevent this (already implemented)

### Issue 2: Items not appearing in pantry
**Symptom**: Items save but don't show in list
**Cause**: PantryList query might be loading before auth completes
**Fix**: Check App.js wraps components in auth check

### Issue 3: Cloud Function 400 error
**Symptom**: Camera scanning fails with "No userId provided"
**Cause**: CameraScanner not passing userId
**Fix**: Verify analyzeImageBase64 includes userId in request body

---

## Deployment Prerequisites

Before deploying to production, ensure:

- [ ] All manual tests passed
- [ ] Cloud Functions deployed: `firebase deploy --only functions`
- [ ] Security Rules deployed: `firebase deploy --only firestore:rules`
- [ ] Tested on iOS device/simulator
- [ ] Tested on Android device/emulator
- [ ] Tested on web browser
- [ ] Multi-user isolation verified
- [ ] No console errors

---

## Testing Tools

### Firebase Console
- **URL**: https://console.firebase.google.com
- **Project**: pantryai-3d396
- **Check**: Firestore → users collection

### React Native Debugger
- **URL**: http://localhost:8081/debugger-ui/
- **Check**: Console logs for userId, Firestore operations

### Expo Developer Tools
- **URL**: http://localhost:8081
- **Check**: Device logs, error messages

---

## Test Results Summary

### Critical Tests (Must Pass)
- [ ] Test 1: Authentication Flow
- [ ] Test 3: Manual Item Addition
- [ ] Test 4: Firestore Structure
- [ ] Test 5: User Isolation

### Important Tests (Should Pass)
- [ ] Test 2: User ID Generation
- [ ] Test 6: Camera Scanning
- [ ] Test 7: Recipe Collections
- [ ] Test 8: Session Persistence

### Security Tests (Must Pass)
- [ ] Test 9: Security Rules
- [ ] Test 10: Cloud Function Validation

---

## Next Steps After Testing

### If All Tests Pass ✅
1. Commit changes: `git commit -m "Multi-user implementation complete and tested"`
2. Push to GitHub: `git push origin main`
3. Deploy Cloud Functions: `firebase deploy --only functions`
4. Deploy Security Rules: `firebase deploy --only firestore:rules`
5. Update README with multi-user features
6. Proceed with App Store submission

### If Tests Fail ❌
1. Document which tests failed
2. Check console logs for error messages
3. Verify userId is present in all operations
4. Check Firebase Console for security rule errors
5. Review Cloud Function logs for validation errors
6. Fix issues and re-test

---

## Contact Information

**Firebase Project**: pantryai-3d396
**GitHub Repo**: https://github.com/jsitla/SHELFZE.git
**Test Date**: October 27, 2025

---

**Status**: Ready for manual testing
**Next Action**: Open app and follow Test 1-10 checklist
