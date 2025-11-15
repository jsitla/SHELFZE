# Enable Email/Password Authentication

## Firebase Console Setup

1. **Go to Firebase Console:**
   - Visit: https://console.firebase.google.com/project/pantryai-3d396/authentication/providers

2. **Enable Email/Password:**
   - Click on "Email/Password" provider
   - Toggle "Enable" to ON
   - Click "Save"

3. **Optional - Enable Email Link (passwordless):**
   - Toggle "Email link (passwordless sign-in)" if you want this feature
   - Click "Save"

## Features Implemented

### ✅ For Anonymous Users (Guest Accounts):
- Automatic anonymous sign-in when app opens
- Warning that data is device-only
- **Upgrade to Permanent Account** option
  - Converts anonymous account to email/password account
  - Keeps all existing pantry data
  - Allows login from other devices

### ✅ For New Users:
- Create account with email and password
- Optional display name
- Data syncs across devices

### ✅ For Existing Email Users:
- Log in with email and password
- Access pantry from any device
- Sign out functionality

### ✅ Profile Screen Features:
- View account type (Guest vs Permanent)
- View email and display name
- View user ID
- Upgrade account (for guest users)
- Sign out

## User Flow

### First Time User:
1. App opens → Anonymous account created automatically
2. User can start using app immediately
3. Profile tab shows "Guest Account" with upgrade option
4. User can upgrade by adding email/password (data is preserved)

### Returning User (with email):
1. App opens → Auto-login if previously logged in
2. Profile shows email and permanent account status
3. Can sign out to switch accounts

### Multi-Device User:
1. Device A: Create account with email/password
2. Device B: Log in with same email/password
3. Both devices show same pantry data (real-time sync)

## Security

- Passwords must be at least 6 characters
- User data is scoped to userId (Firestore rules already implemented)
- Anonymous users can only access their own data
- Email users can access their data from any device

## Testing

1. **Test Anonymous Account:**
   - Open app on fresh device/emulator
   - Should create anonymous account automatically
   - Add pantry items
   - Go to Profile tab → Shows "Guest Account"

2. **Test Account Upgrade:**
   - Click "Upgrade Now" in Profile
   - Enter email, password, optional name
   - Click "Upgrade Account"
   - All pantry data should remain
   - Profile shows permanent account

3. **Test Sign Out/In:**
   - Sign out from Profile
   - Log in with email/password
   - Pantry data should be same

4. **Test Multi-Device:**
   - Device A: Create email account, add items
   - Device B: Log in with same email
   - Both devices should show same items
