import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { app } from '../firebase.config';
import { config } from '../config';

const db = getFirestore(app);

/**
 * Sync legal consent to backend
 * @param {string} userId - The user's Firebase UID
 * @param {string|null} dateStr - Optional date string. If null, reads from AsyncStorage.
 */
export async function syncLegalConsent(userId, dateStr = null) {
  try {
    const auth = getAuth();
    if (!auth.currentUser) return;
    
    const token = await auth.currentUser.getIdToken();
    const consentDate = dateStr || await AsyncStorage.getItem('legalConsent_v5'); // Updated key
    
    if (!consentDate) return; // No consent to sync

    // 1. Write directly to Firestore (Client-side) for immediate consistency
    // This ensures checkUserLegalConsent returns true immediately after this
    const userRef = doc(db, `users/${userId}`);
    await setDoc(userRef, {
      legalConsent: {
        consentDate: consentDate,
        termsVersion: '1.0',
        privacyVersion: '1.0',
        updatedAt: serverTimestamp()
      }
    }, { merge: true });
    console.log('✅ Legal consent saved to Firestore directly');

    // 2. Call Cloud Function (Legacy/Backup/Trigger)
    // We still call this in case there are other side effects (like emails, analytics)
    const response = await fetch(config.recordLegalConsent, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        consentDate: consentDate,
        termsVersion: '1.0',
        privacyVersion: '1.0'
      })
    });

    if (response.ok) {
      console.log('✅ Legal consent synced to cloud function for user:', userId);
    } else {
      console.warn('⚠️ Failed to sync legal consent via cloud function');
    }
  } catch (error) {
    console.error('❌ Error syncing legal consent:', error);
  }
}

/**
 * Check if user has agreed to legal consent in Firestore
 * @param {string} userId - The user's Firebase UID
 * @returns {Promise<boolean>} True if agreed
 */
export async function checkUserLegalConsent(userId) {
  try {
    const userRef = doc(db, `users/${userId}`);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const data = userDoc.data();
      // Check if legalConsent field exists and has a date
      // The cloud function likely writes 'legalConsent' object or fields
      // We check for the presence of consent data
      return !!(data.legalConsent?.consentDate || data.consentDate);
    }
    return false;
  } catch (error) {
    console.error('❌ Error checking legal consent from DB:', error);
    return false;
  }
}

/**
 * Initialize usage tracking for a new user
 * @param {string} userId - The user's Firebase UID
 * @param {string} tier - 'anonymous', 'free', or 'premium'
 */
export async function initializeUsageTracking(userId, tier = 'anonymous') {
  try {
    const auth = getAuth();
    if (!auth.currentUser) {
       console.warn('User not authenticated in initializeUsageTracking');
       return null;
    }
    const token = await auth.currentUser.getIdToken();

    // 1. Initialize (or get existing)
    const response = await fetch(config.initializeUsage, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({})
    });

    if (!response.ok) {
      throw new Error('Failed to initialize usage');
    }

    const usage = await response.json();

    // 2. Check for upgrade
    if (tier && tier !== usage.tier) {
        if ((tier === 'free' && usage.tier === 'anonymous') || 
            (tier === 'premium' && usage.tier !== 'premium')) {
            
            console.log(`Upgrading from ${usage.tier} to ${tier}`);
            return await upgradeTier(userId, tier);
        }
    }

    console.log('✅ Usage tracking initialized/verified for user:', userId);
    return usage;

  } catch (error) {
    console.error('❌ Error initializing usage tracking:', error);
    throw error;
  }
}

/**
 * Get usage data for a user (checks household membership)
 * @param {string} userId - The user's Firebase UID
 * @returns {Object} Usage data
 */
export async function getUserUsage(userId) {
  try {
    // First check if user is in a household
    const userRef = doc(db, `users/${userId}`);
    const userDoc = await getDoc(userRef);
    const userData = userDoc.exists() ? userDoc.data() : null;
    const householdId = userData?.householdId || null;

    // Determine which usage to fetch
    let usageRef;
    if (householdId) {
      usageRef = doc(db, `households/${householdId}/usage/current`);
      console.log('📊 Loading household usage for:', householdId);
    } else {
      usageRef = doc(db, `users/${userId}/usage/current`);
    }
    
    const usageDoc = await getDoc(usageRef);
    
    if (!usageDoc.exists()) {
      // Initialize if doesn't exist (only for personal usage)
      if (!householdId) {
        console.log('No usage data found, initializing...');
        return await initializeUsageTracking(userId, 'anonymous');
      }
      // For household, return default values
      return {
        tier: 'free',
        scansRemaining: 30,
        recipesRemaining: 30,
        totalScansUsed: 0,
        totalRecipesUsed: 0,
      };
    }
    
    return usageDoc.data();
  } catch (error) {
    console.error('❌ Error getting usage data:', error);
    throw error;
  }
}

/**
 * Check and apply monthly bonus for free tier users
 * @param {string} userId - The user's Firebase UID
 * @returns {Object} Updated usage data with bonus info
 */
export async function checkAndApplyMonthlyBonus(userId) {
  try {
    const auth = getAuth();
    if (!auth.currentUser) {
      throw new Error('User not authenticated');
    }
    const token = await auth.currentUser.getIdToken();
    
    const response = await fetch(config.checkMonthlyBonus, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({})
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to check monthly bonus');
    }

    const data = await response.json();
    if (data.bonusApplied) {
      console.log(`✅ Monthly bonus applied! +${data.bonusAmount} scans and recipes`);
    }
    
    return data;
  } catch (error) {
    console.error('❌ Error checking monthly bonus:', error);
    throw error;
  }
}


/**
 * Upgrade user tier (e.g., anonymous to free, free to premium)
 * @param {string} userId - The user's Firebase UID
 * @param {string} newTier - 'free' or 'premium'
 */
export async function upgradeTier(userId, newTier) {
  try {
    const auth = getAuth();
    if (!auth.currentUser) {
      throw new Error('User not authenticated');
    }
    const token = await auth.currentUser.getIdToken();
    
    // Use Cloud Function for secure upgrade
    const response = await fetch(config.upgradeTier, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ newTier })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to upgrade tier');
    }

    const data = await response.json();
    console.log(`✅ Tier upgraded to ${newTier} for user:`, userId);
    return data;
  } catch (error) {
    console.error('❌ Error upgrading tier:', error);
    throw error;
  }
}

/**
 * Redeem a gift code
 * @param {string} userId - The user's Firebase UID
 * @param {string} code - The gift code to redeem
 * @returns {Object} Result with success status and benefits
 */
export async function redeemGiftCode(userId, code) {
  try {
    const auth = getAuth();
    if (!auth.currentUser) {
      throw new Error('User not authenticated');
    }
    const token = await auth.currentUser.getIdToken();
    
    // Use Cloud Function for secure redemption
    const response = await fetch(config.redeemGiftCode, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ code })
    });

    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        message: data.error || data.message || 'Failed to redeem gift code'
      };
    }

    console.log(`✅ Gift code redeemed: ${code} by user: ${userId}`);
    return data;
  } catch (error) {
    console.error('❌ Error redeeming gift code:', error);
    return {
      success: false,
      message: error.message || 'Network error occurred'
    };
  }
}
