# 🧪 Monetization System - Testing Guide

## Overview
This guide provides step-by-step testing procedures for the complete monetization system including welcome screen, usage tracking, gift codes, and tier management.

## 🛠️ Pre-Testing Setup

### 1. Start the Development Environment
```powershell
# Terminal 1: Start Expo
cd C:\Users\denis\Pantryai
npx expo start

# Choose your platform:
# - Press 'w' for web browser
# - Press 'a' for Android emulator
# - Press 'i' for iOS simulator
# - Scan QR code for physical device
```

### 2. Clear App Data (Fresh Start)
To test first-launch experience:

**On Web:**
- Open browser DevTools (F12)
- Application tab → Clear storage → Clear site data

**On iOS Simulator:**
```bash
# Reset simulator completely
xcrun simctl erase all
```

**On Android Emulator:**
```bash
# Clear app data
adb shell pm clear host.exp.exponent
```

**On Physical Device:**
- Delete app and reinstall

### 3. Access Firebase Console
Open: https://console.firebase.google.com/
- Navigate to your project: `pantryai-3d396`
- Keep Firestore tab open for monitoring data

---

## 📋 Test Suite

### TEST 1: Welcome Screen (First Launch)
**Goal**: Verify welcome screen shows only on first launch

**Steps:**
1. ✅ Clear app data (see Pre-Testing Setup)
2. ✅ Launch app
3. ✅ Verify welcome screen appears
4. ✅ Check UI elements:
   - Title: "Welcome to Shelfze"
   - Two option cards visible
   - "Try It First" button (grey)
   - "Create Free Account" button (orange/recommended)
   - Benefit lists displayed correctly

**Expected Results:**
- ✅ Welcome screen shows before auth/main app
- ✅ Both options clearly explained with icons
- ✅ UI is polished and professional

**How to Verify:**
- Take screenshot for documentation
- Verify translations if using non-English language

---

### TEST 2: Anonymous User Journey (Guest)
**Goal**: Test anonymous user with 10-scan limit

**Steps:**
1. ✅ On welcome screen, tap **"Try It First"**
2. ✅ Wait for anonymous sign-in
3. ✅ Verify navigation to main app (Pantry tab)

**Verify Firestore Setup:**
- Open Firebase Console → Firestore
- Check: `users/{userId}/usage/current` document exists
- Verify fields:
  ```
  tier: "anonymous"
  scansRemaining: 10
  recipesRemaining: 10
  totalScansUsed: 0
  totalRecipesUsed: 0
  createdAt: [timestamp]
  ```

**Test Scanner Usage:**
4. ✅ Navigate to Scanner tab
5. ✅ Check counter badge shows "10" (top-right on mobile, visible on web)
6. ✅ Take a photo of food item (use test image or real food)
7. ✅ Wait for processing
8. ✅ Verify item saved to pantry
9. ✅ Check counter updates to "9"
10. ✅ Repeat scan 9 more times until 0 remaining

**Test Limit Reached:**
11. ✅ Try to scan with 0 scans remaining
12. ✅ Verify alert appears:
    - Title: "Scans Limit Reached"
    - Message: "Create an account to get 30 scans..."
    - Buttons: "Cancel", "Create Account"
13. ✅ Tap "Create Account"
14. ✅ Verify navigation to Profile/Account screen

**Expected Results:**
- ✅ Counter decrements after each successful scan
- ✅ Limit enforced at 0 scans
- ✅ Upgrade prompt clear and actionable

---

### TEST 3: Account Upgrade (Anonymous → Free)
**Goal**: Test account upgrade flow

**Steps:**
1. ✅ Starting from TEST 2 (anonymous user with 0 scans)
2. ✅ Navigate to Pantry tab
3. ✅ Tap Account icon (⚙️) in header
4. ✅ Scroll to Login/Create Account section
5. ✅ Tap "Create Account" tab
6. ✅ Enter email: `test@example.com`
7. ✅ Enter password: `Test123!`
8. ✅ Tap "Create Account" button
9. ✅ Verify success message

**Verify Firestore Update:**
- Check Firestore: `users/{userId}/usage/current`
- Verify tier upgraded:
  ```
  tier: "free"
  scansRemaining: 30
  recipesRemaining: 30
  lastMonthlyBonusDate: [timestamp]
  ```

**Verify Profile UI:**
10. ✅ Check tier badge shows "✨ Free"
11. ✅ Verify usage stats:
    - "📸 Scans remaining: 30"
    - "🍳 Recipes remaining: 30"
12. ✅ Upgrade button shows: "⬆️ Upgrade to Premium"

**Expected Results:**
- ✅ Account upgraded seamlessly
- ✅ New limits applied immediately
- ✅ UI reflects new tier

---

### TEST 4: Recipe Generation Limits
**Goal**: Test recipe generation with usage tracking

**Pre-requisites:**
- Have at least 3-5 items in pantry

**Steps:**
1. ✅ Navigate to Recipes tab
2. ✅ Check recipe counter badge:
   - Shows "30 recipes remaining" (for free user)
   - Yellow/gold card style
3. ✅ Tap to select ingredients (check at least 3 items)
4. ✅ Select dish category (e.g., "Main Course")
5. ✅ Tap "✨ Generate Recipe Ideas"
6. ✅ Wait for generation
7. ✅ Verify recipes displayed
8. ✅ Check counter updates to "29 recipes remaining"

**Test Recipe Limit:**
9. ✅ Generate recipes 29 more times (you can do 5-10 for testing)
10. ✅ When recipesRemaining = 0, try to generate
11. ✅ Verify alert appears:
    - Title: "Recipes Limit Reached"
    - Message: "Upgrade to Premium..."
    - Buttons: "Cancel", "Upgrade to Premium"

**Expected Results:**
- ✅ Counter decrements after each generation
- ✅ Limit enforced at 0 recipes
- ✅ Counter updates immediately in UI

---

### TEST 5: Gift Code Redemption
**Goal**: Test gift code system with different code types

**Setup - Create Test Gift Codes:**
Open Firebase Console → Firestore → Create documents in `giftCodes` collection:

**Code 1: Premium Gift Code**
```
Collection: giftCodes
Document ID: PREMIUM1MONTH

Fields:
code: "PREMIUM1MONTH"
type: "premium"
durationMonths: 1
used: false
createdAt: [current timestamp]
expiresAt: [timestamp 30 days in future]
```

**Code 2: Scans Gift Code**
```
Document ID: SCAN50

Fields:
code: "SCAN50"
type: "scans"
scansAmount: 50
used: false
createdAt: [current timestamp]
```

**Code 3: Bundle Gift Code**
```
Document ID: BUNDLE100

Fields:
code: "BUNDLE100"
type: "bundle"
scansAmount: 100
recipesAmount: 100
used: false
createdAt: [current timestamp]
```

**Test Redemption:**
1. ✅ Navigate to Pantry → Account (⚙️)
2. ✅ Scroll to "🎁 Have a gift code?" section
3. ✅ Tap to expand
4. ✅ Enter code: `SCAN50`
5. ✅ Tap "Redeem" button
6. ✅ Verify success alert: "🎁 Gift code redeemed! +50 scans added..."
7. ✅ Check usage stats updated immediately
8. ✅ Verify in Firestore:
   - `scansRemaining` increased by 50
   - Gift code marked as `used: true`
   - `usedBy: [userId]`, `usedAt: [timestamp]`

**Test Invalid Code:**
9. ✅ Try to redeem same code again (SCAN50)
10. ✅ Verify error: "This gift code has already been used"

**Test Premium Code:**
11. ✅ Redeem code: `PREMIUM1MONTH`
12. ✅ Verify success alert
13. ✅ Check tier badge changed to "👑 Premium"
14. ✅ Verify usage stats show "X/1000" format
15. ✅ Firestore check:
    ```
    tier: "premium"
    scansRemaining: 1000
    recipesRemaining: 1000
    resetDate: [timestamp 1 month in future]
    ```

**Expected Results:**
- ✅ All code types redeem correctly
- ✅ Balances update immediately
- ✅ Used codes can't be redeemed twice
- ✅ Error messages are clear

---

### TEST 6: Monthly Bonus (Free Users)
**Goal**: Test monthly bonus system for free tier

**Setup:**
1. ✅ Ensure user is on Free tier
2. ✅ Manually update Firestore to simulate time passing:
   - Go to Firestore: `users/{userId}/usage/current`
   - Edit `lastMonthlyBonusDate`
   - Set to 35 days ago: `[timestamp - 35 days]`
   - Save document

**Test Bonus Application:**
3. ✅ Close app completely
4. ✅ Reopen app (simulates user returning after a month)
5. ✅ Check console logs for: "✅ Monthly bonus applied: +5 scans and recipes"
6. ✅ Navigate to Profile → Check usage stats
7. ✅ Verify scans and recipes both increased by 5
8. ✅ Firestore check:
   - `scansRemaining` += 5
   - `recipesRemaining` += 5
   - `lastMonthlyBonusDate` updated to today

**Test Bonus Doesn't Apply Too Early:**
9. ✅ Close and reopen app again immediately
10. ✅ Verify no second bonus applied
11. ✅ Check console: No bonus message

**Expected Results:**
- ✅ Bonus applies after 30+ days
- ✅ Bonus doesn't apply twice in same month
- ✅ Works automatically on app launch

---

### TEST 7: Premium User Monthly Reset
**Goal**: Test premium quota reset (future testing)

**Note:** This requires waiting 30 days or manually manipulating timestamps.

**Manual Testing Steps:**
1. ✅ User has premium tier
2. ✅ Use some scans/recipes (e.g., 200 scans)
3. ✅ Manually update Firestore:
   - `resetDate` to 35 days ago
4. ✅ Reopen app
5. ✅ Verify quota resets to 1000/1000

**Expected Results:**
- ✅ Monthly reset to full quota (1000)
- ✅ Previous usage cleared

---

### TEST 8: Multi-Device Sync
**Goal**: Verify usage tracking syncs across devices

**Requirements:** Two devices or web + mobile

**Steps:**
1. ✅ Device 1: Sign in with email/password
2. ✅ Check usage: e.g., 25 scans remaining
3. ✅ Device 2: Sign in with same credentials
4. ✅ Verify same usage shows: 25 scans remaining
5. ✅ Device 1: Scan an item (counter → 24)
6. ✅ Device 2: Refresh or navigate away and back
7. ✅ Verify counter synced to 24

**Expected Results:**
- ✅ Usage data syncs in real-time
- ✅ Limits enforced across all devices
- ✅ No duplicate decrements

---

### TEST 9: Edge Cases & Error Handling

#### Test A: Network Offline
1. ✅ Turn off WiFi/data
2. ✅ Try to scan
3. ✅ Verify graceful error message
4. ✅ Turn network back on
5. ✅ Retry scan successfully

#### Test B: Invalid Gift Code
1. ✅ Enter random code: `INVALID123`
2. ✅ Tap Redeem
3. ✅ Verify error: "Invalid gift code"

#### Test C: Expired Gift Code
1. ✅ Create gift code with `expiresAt` in the past
2. ✅ Try to redeem
3. ✅ Verify error: "This gift code has expired"

#### Test D: Rapid Scanning
1. ✅ Tap camera button multiple times quickly
2. ✅ Verify only one scan processed
3. ✅ Counter decrements only once

#### Test E: Sign Out and Sign In
1. ✅ Note current usage: e.g., 18 scans
2. ✅ Sign out
3. ✅ Sign in again
4. ✅ Verify usage preserved: 18 scans

**Expected Results:**
- ✅ All errors handled gracefully
- ✅ No crashes or data loss
- ✅ User-friendly error messages

---

### TEST 10: Translations
**Goal**: Verify all monetization features work in all languages

**Languages to Test:** English, Spanish, Czech, Polish, Ukrainian

**For Each Language:**
1. ✅ Open app → Pantry → Account (⚙️)
2. ✅ Change language
3. ✅ Verify translations for:
   - Tier names (Anonymous, Free, Premium)
   - "Scans remaining", "Recipes remaining"
   - Limit reached alerts
   - Gift code section
   - Upgrade button text
4. ✅ Test one complete flow (scan → limit → alert)
5. ✅ Verify all text displays correctly

**Expected Results:**
- ✅ All UI text translated
- ✅ No missing translation keys
- ✅ Text fits in UI elements

---

## 📊 Testing Checklist Summary

### Core Functionality
- [ ] Welcome screen shows on first launch
- [ ] Anonymous user gets 10/10 limits
- [ ] Free user gets 30/30 limits
- [ ] Premium user gets 1000/1000 limits
- [ ] Scan counter decrements correctly
- [ ] Recipe counter decrements correctly
- [ ] Limits enforced (can't scan/generate at 0)
- [ ] Upgrade prompts work
- [ ] Account upgrade (anonymous → free) works

### Gift Code System
- [ ] Premium gift code works
- [ ] Scans gift code works
- [ ] Recipes gift code works
- [ ] Bundle gift code works
- [ ] Used codes rejected
- [ ] Invalid codes rejected
- [ ] Expired codes rejected

### Monthly Features
- [ ] Free user monthly bonus (+5) works
- [ ] Premium monthly reset (1000) works
- [ ] Bonuses don't apply too frequently

### UI/UX
- [ ] Counter badges visible and update
- [ ] Tier badges show correct tier
- [ ] Usage stats accurate
- [ ] Alerts clear and actionable
- [ ] Translations work in all languages

### Data Integrity
- [ ] Firestore documents created correctly
- [ ] Usage syncs across devices
- [ ] No duplicate decrements
- [ ] Data persists after sign out/in

---

## 🐛 Known Issues to Watch For

### Potential Issues:
1. **Race Conditions**: Multiple rapid scans might cause double-decrement
   - Solution: Add debouncing or loading state
2. **Network Delays**: Slow Firestore writes might show stale counts
   - Solution: Optimistic UI updates (already implemented)
3. **Timezone Issues**: Monthly bonus might apply at wrong time for some users
   - Solution: Use UTC timestamps consistently
4. **Gift Code Case Sensitivity**: Codes must be uppercase
   - Solution: Auto-convert input to uppercase (already implemented)

---

## 📈 Success Criteria

### Minimum Viable Product (MVP)
- ✅ All tier limits enforced correctly
- ✅ Usage tracking accurate within 1 count
- ✅ Gift codes redeem successfully 100% of time
- ✅ No crashes during normal usage
- ✅ Data syncs across devices within 5 seconds

### Production Ready
- ✅ All tests pass on iOS, Android, and Web
- ✅ Translations complete and accurate
- ✅ Edge cases handled gracefully
- ✅ Performance acceptable (<2s for all operations)
- ✅ Security rules prevent unauthorized access

---

## 📝 Bug Report Template

When you find issues, document them like this:

```markdown
### Bug: [Short Description]
**Severity**: Critical / High / Medium / Low
**Platform**: iOS / Android / Web
**Steps to Reproduce**:
1. 
2. 
3. 

**Expected Result**:

**Actual Result**:

**Screenshots**:

**Firestore State**: (paste relevant document)

**Console Logs**: (paste errors)
```

---

## 🚀 Next Steps After Testing

1. **Fix Critical Bugs**: Address any crashes or data loss issues
2. **Optimize Performance**: Improve loading times if needed
3. **Refine UX**: Adjust wording, colors, layout based on feedback
4. **Add Analytics**: Track conversion rates, usage patterns
5. **Payment Integration**: Implement Apple/Google subscriptions
6. **Marketing**: Prepare app store assets, promotional materials

---

**Last Updated**: January 2025
**Tester**: _____________
**Platform Tested**: iOS ☐ Android ☐ Web ☐
**Status**: In Progress / Complete / Blocked
