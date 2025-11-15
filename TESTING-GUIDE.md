# 🧪 Shelfze Testing Guide

**Date:** October 30, 2025  
**Version:** 1.0.0  
**Status:** Pre-Production Testing

---

## 📱 Testing Platforms

### Available Options:
1. **Expo Go App** (Fastest - recommended for quick testing)
2. **iOS Simulator** (Mac only)
3. **Android Emulator** (Requires Android Studio)
4. **Physical Device** (Most realistic testing)
5. **Web Browser** (Limited camera functionality)

---

## 🚀 Quick Start Testing

### Current Status:
✅ **Expo Dev Server is RUNNING** (`npm start`)

### Next Steps:

#### Option 1: Test on Physical Device (RECOMMENDED)
1. **Install Expo Go:**
   - iOS: https://apps.apple.com/app/expo-go/id982107779
   - Android: https://play.google.com/store/apps/details?id=host.exp.exponent

2. **Scan QR Code:**
   - Look at your terminal - you should see a QR code
   - iOS: Open Camera app → Scan QR → Tap notification
   - Android: Open Expo Go app → Scan QR code

3. **Start Testing!**

#### Option 2: Test on Android Emulator
```powershell
# Make sure Android Studio and emulator are installed
npm run android
```

#### Option 3: Test on Web (Limited)
```powershell
npm run web
```
**Note:** Camera scanning won't work well on web - use manual entry instead

---

## ✅ Complete Testing Checklist

### Phase 1: Initial Launch & Authentication

- [ ] **App Launches Successfully**
  - [ ] Welcome screen appears
  - [ ] No crash on startup
  - [ ] Branding shows "Shelfze" (not PantryAI)
  
- [ ] **Anonymous Authentication**
  - [ ] User is automatically logged in
  - [ ] No login screen required
  - [ ] User ID is created (check Profile tab)

- [ ] **UI/UX Verification**
  - [ ] Bottom navigation visible
  - [ ] 4 tabs present: Pantry, Scanner, Recipes, Profile
  - [ ] Icons render correctly
  - [ ] No visual glitches

---

### Phase 2: Camera Scanning (CRITICAL)

#### Photo Mode Testing

- [ ] **Camera Permission**
  - [ ] App requests camera permission
  - [ ] Permission dialog shows correct message
  - [ ] Camera preview loads after granting permission
  
- [ ] **Basic Scanning**
  - [ ] Camera preview is clear and responsive
  - [ ] Capture button is visible and clickable
  - [ ] Flash toggle works (if device has flash)
  
- [ ] **AI Detection Test Cases**

**Test Case 1: Fresh Food Item**
- [ ] Scan a packaged food item (e.g., cereal box)
- [ ] AI detects food name correctly
- [ ] Processing indicator appears
- [ ] Results show within 5-10 seconds

**Test Case 2: Expiry Date Detection**
- [ ] Scan a product with visible expiry date
- [ ] AI attempts to extract date
- [ ] Date format is readable
- [ ] Can manually correct if wrong

**Test Case 3: Multiple Items**
- [ ] Scan 3-5 different food items
- [ ] Each item processes independently
- [ ] No app crashes or freezes
- [ ] All items appear in Pantry list

**Test Case 4: Poor Lighting**
- [ ] Try scanning in dim lighting
- [ ] AI should still attempt detection
- [ ] Manual entry option available if detection fails

**Test Case 5: Invalid Items**
- [ ] Scan non-food item (e.g., book, pen)
- [ ] AI should handle gracefully
- [ ] No crash, reasonable response

#### Video Mode Testing (Mobile Only)

- [ ] **Video Recording**
  - [ ] Switch to video mode
  - [ ] Record button starts recording
  - [ ] Recording indicator visible
  - [ ] Can stop recording successfully
  
- [ ] **Video Processing**
  - [ ] Video uploads for AI analysis
  - [ ] Processing time is reasonable (<15 seconds)
  - [ ] Results extracted from video frames
  - [ ] Items added to pantry

---

### Phase 3: Manual Entry

- [ ] **Form Validation**
  - [ ] "Add Item Manually" button works
  - [ ] Food name field accepts text
  - [ ] Expiry date picker appears
  - [ ] Quantity field accepts numbers
  
- [ ] **Data Entry**
  - [ ] Enter item: "Milk"
  - [ ] Select expiry date: Tomorrow
  - [ ] Set quantity: 1
  - [ ] Choose category (if available)
  - [ ] Save button works
  
- [ ] **Verification**
  - [ ] Item appears in Pantry list immediately
  - [ ] All data is correct
  - [ ] Item is sorted by expiry date

---

### Phase 4: Pantry Management

#### Viewing Items

- [ ] **Pantry List Display**
  - [ ] All scanned items appear
  - [ ] Items sorted by expiry date (nearest first)
  - [ ] Color coding works:
    - [ ] Red = Expired/Expiring today
    - [ ] Orange = Expiring within 3 days
    - [ ] Yellow = Expiring within 7 days
    - [ ] Green = Fresh (>7 days)
  
- [ ] **Item Details**
  - [ ] Tap item to view details
  - [ ] Food name visible
  - [ ] Expiry date visible
  - [ ] Quantity visible
  - [ ] Storage location (if implemented)

#### Editing Items

- [ ] **Edit Functionality**
  - [ ] Find edit button/icon
  - [ ] Tap to edit existing item
  - [ ] Modify food name
  - [ ] Change expiry date
  - [ ] Update quantity
  - [ ] Save changes
  
- [ ] **Verification**
  - [ ] Changes persist after saving
  - [ ] List re-sorts if expiry date changed
  - [ ] No data loss

#### Deleting Items

- [ ] **Delete Single Item**
  - [ ] Swipe to delete (or tap delete button)
  - [ ] Confirmation dialog appears (if implemented)
  - [ ] Item removed from list
  - [ ] Firestore updated (item gone on app restart)
  
- [ ] **Delete Multiple Items**
  - [ ] Delete 3-5 items
  - [ ] List updates correctly
  - [ ] No orphaned data

---

### Phase 5: Recipe Generation (AI Feature)

#### Basic Recipe Generation

- [ ] **Access Recipe Tab**
  - [ ] Navigate to Recipes tab
  - [ ] UI loads without errors
  - [ ] "Generate Recipe" button visible
  
- [ ] **Ingredient Selection**
  - [ ] Can select ingredients from pantry
  - [ ] Select at least 3 ingredients
  - [ ] Selected items highlighted
  - [ ] Can deselect items
  
- [ ] **Generate Recipe**
  - [ ] Tap "Generate Recipe" button
  - [ ] Loading indicator appears
  - [ ] Wait for AI response (10-30 seconds)
  - [ ] Recipe appears on screen

#### Recipe Content Verification

- [ ] **Recipe Structure**
  - [ ] Recipe has a title/name
  - [ ] Ingredients list is present
  - [ ] Instructions are provided
  - [ ] Cooking time mentioned (if applicable)
  - [ ] Servings specified
  
- [ ] **Recipe Quality**
  - [ ] Recipe makes logical sense
  - [ ] Uses selected ingredients
  - [ ] Instructions are clear
  - [ ] No obvious AI errors (gibberish)

#### Advanced Recipe Features

- [ ] **Recipe Filters** (if implemented)
  - [ ] Filter by cuisine type
  - [ ] Filter by meal type (breakfast, lunch, dinner)
  - [ ] Filter by dietary restrictions
  
- [ ] **Save Recipe**
  - [ ] "Save" or "Favorite" button works
  - [ ] Recipe appears in saved recipes
  - [ ] Can access later
  
- [ ] **Recipe Details**
  - [ ] View full recipe details
  - [ ] Scroll through instructions
  - [ ] Print/share options (if available)

---

### Phase 6: Multi-Language Support

- [ ] **Language Selection**
  - [ ] Navigate to Profile/Settings
  - [ ] Find language selector
  - [ ] See all 18 languages listed
  
- [ ] **Language Switching**

**Test Languages:**
- [ ] **English** (default) - Verify all text
- [ ] **Spanish** - Check UI translations
- [ ] **French** - Check UI translations
- [ ] **German** - Check UI translations
- [ ] **Portuguese** - Check UI translations
- [ ] **Italian** - Check UI translations
- [ ] **Japanese** - Check character rendering
- [ ] **Chinese (Simplified)** - Check character rendering
- [ ] **Arabic** - Check RTL (right-to-left) layout
- [ ] **Hindi** - Check character rendering

**Verify:**
- [ ] All buttons translated
- [ ] All labels translated
- [ ] Tab names translated
- [ ] Error messages translated
- [ ] No missing translations (English fallback works)

---

### Phase 7: Notifications & Alerts

- [ ] **Expiry Notifications** (if implemented)
  - [ ] Set item to expire tomorrow
  - [ ] Check if notification received
  - [ ] Notification text is clear
  - [ ] Tapping notification opens app
  
- [ ] **In-App Alerts**
  - [ ] Warning for items expiring soon
  - [ ] Alert badges on tabs (if implemented)
  - [ ] Color coding on pantry items

---

### Phase 8: Data Persistence

- [ ] **Firestore Integration**
  - [ ] Add 5 items to pantry
  - [ ] Force close the app
  - [ ] Reopen the app
  - [ ] Verify all 5 items still present
  
- [ ] **Cross-Device Sync** (if applicable)
  - [ ] Note your anonymous user ID
  - [ ] Sign out (if possible)
  - [ ] Check if data persists

---

### Phase 9: Error Handling

#### Network Errors

- [ ] **Offline Mode**
  - [ ] Turn off WiFi/mobile data
  - [ ] Try to scan an item
  - [ ] Error message should appear
  - [ ] App doesn't crash
  
- [ ] **Cloud Function Errors**
  - [ ] If AI service is down, error is handled gracefully
  - [ ] User sees helpful error message
  - [ ] Can retry or use manual entry

#### Invalid Data

- [ ] **Edge Cases**
  - [ ] Leave food name empty → Validation error
  - [ ] Enter past expiry date → Warning or rejection
  - [ ] Enter quantity as 0 → Validation error
  - [ ] Enter extremely long food name (100+ chars) → Truncated or error

---

### Phase 10: Performance Testing

- [ ] **Loading Times**
  - [ ] App launches in <3 seconds
  - [ ] Camera opens in <2 seconds
  - [ ] Pantry list loads in <1 second
  - [ ] Recipe generation completes in <30 seconds
  
- [ ] **Memory Usage**
  - [ ] Scan 10+ items without crash
  - [ ] Switch between tabs rapidly (no crash)
  - [ ] App responsive after 10+ minutes of use
  
- [ ] **Large Dataset**
  - [ ] Add 50+ items to pantry
  - [ ] List scrolls smoothly
  - [ ] Search/filter works (if implemented)
  - [ ] No performance degradation

---

### Phase 11: Security Testing

- [ ] **Authentication**
  - [ ] User cannot access data without authentication
  - [ ] Anonymous ID is unique
  - [ ] User can only see their own data
  
- [ ] **Data Privacy**
  - [ ] Camera images not stored permanently
  - [ ] No sensitive data in logs
  - [ ] HTTPS connections to Cloud Functions

---

### Phase 12: UI/UX Polish

- [ ] **Visual Design**
  - [ ] Consistent color scheme
  - [ ] Proper spacing and alignment
  - [ ] Readable fonts (size, color)
  - [ ] Icons are clear and intuitive
  
- [ ] **User Flow**
  - [ ] Navigation is intuitive
  - [ ] Back buttons work correctly
  - [ ] Can complete tasks without confusion
  - [ ] Help text where needed

- [ ] **Accessibility**
  - [ ] Text is readable (contrast ratio)
  - [ ] Buttons are large enough to tap
  - [ ] Color-blind friendly (if possible)

---

### Phase 13: Edge Cases & Stress Testing

- [ ] **Extreme Scenarios**
  - [ ] Scan 100 items (stress test)
  - [ ] Rotate device while scanning
  - [ ] Minimize app during AI processing
  - [ ] Low battery mode
  - [ ] Background app refresh
  
- [ ] **Unusual Input**
  - [ ] Scan in complete darkness
  - [ ] Scan text-only labels
  - [ ] Scan handwritten dates
  - [ ] Use special characters in food names

---

## 🐛 Bug Reporting Template

When you find issues, document them:

```markdown
### Bug Report

**Date:** [Date]
**Platform:** [iOS/Android/Web]
**Device:** [e.g., iPhone 14, Samsung Galaxy S23]
**OS Version:** [e.g., iOS 17, Android 14]

**Steps to Reproduce:**
1. Open app
2. Navigate to X
3. Tap Y
4. Observe Z

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happened]

**Screenshots/Videos:**
[Attach if possible]

**Severity:**
- [ ] Critical (app crashes, data loss)
- [ ] High (feature broken, workaround exists)
- [ ] Medium (minor issue, annoying but usable)
- [ ] Low (cosmetic, typo, nice-to-have)
```

---

## 📊 Test Results Summary

### Overall Status:
- [ ] All critical features working
- [ ] No crashes or data loss
- [ ] Ready for production

### Pass Rate:
- [ ] Camera Scanning: __/10 tests passed
- [ ] Manual Entry: __/5 tests passed
- [ ] Pantry Management: __/8 tests passed
- [ ] Recipe Generation: __/7 tests passed
- [ ] Multi-Language: __/10 tests passed
- [ ] Performance: __/5 tests passed

### Critical Issues Found:
1. [List any critical bugs]
2. [List any critical bugs]

### Minor Issues Found:
1. [List minor issues]
2. [List minor issues]

---

## 🎯 Production Readiness Criteria

### Must Have (Before App Store Submission):
- [ ] No crashes during normal use
- [ ] Camera scanning works reliably (>80% accuracy)
- [ ] Data persists correctly
- [ ] All 4 main tabs functional
- [ ] AI recipe generation works
- [ ] Multi-language switching works
- [ ] Privacy Policy and ToS accessible
- [ ] Anonymous authentication working

### Nice to Have:
- [ ] 100% translation coverage
- [ ] Offline mode graceful handling
- [ ] Advanced filters and search
- [ ] Recipe sharing
- [ ] Export/import data

---

## 📱 Testing Platforms Details

### iOS Testing
```bash
# If you have a Mac with Xcode
npm run ios
```

### Android Testing
```bash
# Requires Android Studio
npm run android
```

### Web Testing
```bash
npm run web
# Then open: http://localhost:8081
```

---

## 🔧 Troubleshooting

### Common Issues:

**Issue:** QR code not scanning
- **Solution:** Make sure Expo Go is installed and updated

**Issue:** Camera permission denied
- **Solution:** Go to device settings → Apps → Expo Go → Permissions → Enable Camera

**Issue:** Firebase errors
- **Solution:** Check `firebase.config.js` exists and has correct credentials

**Issue:** Cloud Functions timeout
- **Solution:** Check internet connection, verify function URLs in `config.js`

**Issue:** App won't load
- **Solution:** Clear Expo cache: `npx expo start -c`

---

## ✅ Final Pre-Launch Test

### Day Before Submission:
1. [ ] Fresh install on clean device
2. [ ] Complete full user journey:
   - [ ] Open app → Welcome screen
   - [ ] Scan first item → Works
   - [ ] Add manual item → Works
   - [ ] Generate recipe → Works
   - [ ] Switch language → Works
   - [ ] Close and reopen → Data persists
3. [ ] No crashes, no errors
4. [ ] Ready to submit! 🚀

---

**Happy Testing! 🧪**

*Remember: Better to find bugs now than after App Store submission!*
