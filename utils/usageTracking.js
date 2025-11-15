import { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';
import { app } from '../firebase.config';

const db = getFirestore(app);

/**
 * Initialize usage tracking for a new user
 * @param {string} userId - The user's Firebase UID
 * @param {string} tier - 'anonymous', 'free', or 'premium'
 */
export async function initializeUsageTracking(userId, tier = 'anonymous') {
  const usageRef = doc(db, `users/${userId}/usage/current`);
  
  try {
    // Check if usage data already exists
    const existingDoc = await getDoc(usageRef);
    
    if (existingDoc.exists()) {
      const usage = existingDoc.data();

      // Automatically upgrade tier if the stored tier is lower than requested
      if (tier && tier !== usage.tier) {
        const updates = { tier };

        if (tier === 'free' && usage.tier === 'anonymous') {
          updates.scansRemaining = Math.max(usage.scansRemaining ?? 0, 30);
          updates.recipesRemaining = Math.max(usage.recipesRemaining ?? 0, 30);
          updates.lastMonthlyBonusDate = usage.lastMonthlyBonusDate || serverTimestamp();
        } else if (tier === 'premium' && usage.tier !== 'premium') {
          updates.scansRemaining = 1000;
          updates.recipesRemaining = 1000;
          updates.resetDate = serverTimestamp();
        }

        await updateDoc(usageRef, updates);
        console.log(`✅ Usage tier auto-upgraded from ${usage.tier} to ${tier} for user:`, userId);
        return { ...usage, ...updates };
      }

      console.log('✅ Usage tracking already exists for user:', userId);
      return usage;
    }
    
    // Only initialize if it doesn't exist
    const initialData = {
      tier,
      scansRemaining: tier === 'anonymous' ? 10 : tier === 'free' ? 30 : 1000,
      recipesRemaining: tier === 'anonymous' ? 10 : tier === 'free' ? 30 : 1000,
      totalScansUsed: 0,
      totalRecipesUsed: 0,
      lastMonthlyBonusDate: serverTimestamp(),
      createdAt: serverTimestamp(),
      resetDate: tier === 'premium' ? serverTimestamp() : null, // Only premium has monthly reset
    };

    await setDoc(usageRef, initialData);
    console.log('✅ Usage tracking initialized for user:', userId, 'Tier:', tier);
    return initialData;
  } catch (error) {
    console.error('❌ Error initializing usage tracking:', error);
    throw error;
  }
}

/**
 * Get usage data for a user
 * @param {string} userId - The user's Firebase UID
 * @returns {Object} Usage data
 */
export async function getUserUsage(userId) {
  const usageRef = doc(db, `users/${userId}/usage/current`);
  
  try {
    const usageDoc = await getDoc(usageRef);
    
    if (!usageDoc.exists()) {
      // Initialize if doesn't exist
      console.log('No usage data found, initializing...');
      return await initializeUsageTracking(userId, 'anonymous');
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
  const usageRef = doc(db, `users/${userId}/usage/current`);
  
  try {
    const usageDoc = await getDoc(usageRef);
    
    if (!usageDoc.exists()) {
      return { bonusApplied: false, message: 'No usage data' };
    }
    
    const usage = usageDoc.data();
    
    // Only free tier gets monthly bonus
    if (usage.tier !== 'free') {
      return { bonusApplied: false, message: 'Not a free tier user' };
    }
    
    const now = new Date();
    const lastBonus = usage.lastMonthlyBonusDate?.toDate() || new Date(0);
    
    // Calculate months since last bonus
    const monthsDiff = Math.floor((now - lastBonus) / (30 * 24 * 60 * 60 * 1000));
    
    if (monthsDiff >= 1) {
      // Apply bonus
      const bonusAmount = monthsDiff * 5; // 5 per month
      const newScansRemaining = usage.scansRemaining + bonusAmount;
      const newRecipesRemaining = usage.recipesRemaining + bonusAmount;
      
      await updateDoc(usageRef, {
        scansRemaining: newScansRemaining,
        recipesRemaining: newRecipesRemaining,
        lastMonthlyBonusDate: serverTimestamp(),
      });
      
      console.log(`✅ Monthly bonus applied! +${bonusAmount} scans and recipes`);
      
      return {
        bonusApplied: true,
        bonusAmount,
        newScansRemaining,
        newRecipesRemaining,
        monthsMissed: monthsDiff,
      };
    }
    
    return { bonusApplied: false, message: 'Bonus already applied this month' };
  } catch (error) {
    console.error('❌ Error checking monthly bonus:', error);
    throw error;
  }
}

/**
 * Decrement scan count using atomic operations to prevent race conditions
 * @param {string} userId - The user's Firebase UID
 * @returns {Object} Result with success status and remaining count
 */
export async function decrementScanCount(userId) {
  const usageRef = doc(db, `users/${userId}/usage/current`);
  
  try {
    const usageDoc = await getDoc(usageRef);
    
    if (!usageDoc.exists()) {
      throw new Error('Usage data not found');
    }
    
    const usage = usageDoc.data();
    
    // Check if user has scans remaining
    if (usage.scansRemaining <= 0) {
      return {
        success: false,
        message: 'No scans remaining',
        tier: usage.tier,
        scansRemaining: 0,
      };
    }
    
    // Use atomic increment operations to prevent race conditions
    await updateDoc(usageRef, {
      scansRemaining: increment(-1),
      totalScansUsed: increment(1),
    });
    
    const newScansRemaining = usage.scansRemaining - 1;
    if (__DEV__) {
      console.log(`📸 Scan used. Remaining: ${newScansRemaining}`);
    }
    
    return {
      success: true,
      scansRemaining: newScansRemaining,
      totalScansUsed: (usage.totalScansUsed || 0) + 1,
    };
  } catch (error) {
    console.error('❌ Error decrementing scan count:', error);
    throw error;
  }
}

/**
 * Decrement recipe count using atomic operations to prevent race conditions
 * @param {string} userId - The user's Firebase UID
 * @returns {Object} Result with success status and remaining count
 */
export async function decrementRecipeCount(userId) {
  const usageRef = doc(db, `users/${userId}/usage/current`);
  
  try {
    const usageDoc = await getDoc(usageRef);
    
    if (!usageDoc.exists()) {
      throw new Error('Usage data not found');
    }
    
    const usage = usageDoc.data();
    
    // Check if user has recipes remaining
    if (usage.recipesRemaining <= 0) {
      return {
        success: false,
        message: 'No recipes remaining',
        tier: usage.tier,
        recipesRemaining: 0,
      };
    }
    
    // Use atomic increment operations to prevent race conditions
    await updateDoc(usageRef, {
      recipesRemaining: increment(-1),
      totalRecipesUsed: increment(1),
    });
    
    const newRecipesRemaining = usage.recipesRemaining - 1;
    if (__DEV__) {
      console.log(`🍳 Recipe generated. Remaining: ${newRecipesRemaining}`);
    }
    
    return {
      success: true,
      recipesRemaining: newRecipesRemaining,
      totalRecipesUsed: (usage.totalRecipesUsed || 0) + 1,
    };
  } catch (error) {
    console.error('❌ Error decrementing recipe count:', error);
    throw error;
  }
}

/**
 * Upgrade user tier (e.g., anonymous to free, free to premium)
 * @param {string} userId - The user's Firebase UID
 * @param {string} newTier - 'free' or 'premium'
 */
export async function upgradeTier(userId, newTier) {
  const usageRef = doc(db, `users/${userId}/usage/current`);
  
  try {
    const usageDoc = await getDoc(usageRef);
    
    if (!usageDoc.exists()) {
      // Initialize with new tier
      return await initializeUsageTracking(userId, newTier);
    }
    
    const usage = usageDoc.data();
    const updates = {
      tier: newTier,
    };
    
    // Set limits based on new tier
    if (newTier === 'free') {
      // Upgrading from anonymous to free
      updates.scansRemaining = 30;
      updates.recipesRemaining = 30;
      updates.lastMonthlyBonusDate = serverTimestamp();
    } else if (newTier === 'premium') {
      // Upgrading to premium
      updates.scansRemaining = 1000;
      updates.recipesRemaining = 1000;
      updates.resetDate = serverTimestamp();
    }
    
    await updateDoc(usageRef, updates);
    
    console.log(`✅ Tier upgraded to ${newTier} for user:`, userId);
    
    return { ...usage, ...updates };
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
  const codeRef = doc(db, `giftCodes/${code}`);
  const usageRef = doc(db, `users/${userId}/usage/current`);
  
  try {
    // Get gift code data
    const codeDoc = await getDoc(codeRef);
    
    if (!codeDoc.exists()) {
      return {
        success: false,
        message: 'Invalid gift code',
      };
    }
    
    const codeData = codeDoc.data();
    
    // Check if code is already used
    if (codeData.used) {
      return {
        success: false,
        message: 'This gift code has already been used',
        usedBy: codeData.usedBy,
        usedAt: codeData.usedAt,
      };
    }
    
    // Check if code is expired
    if (codeData.expiresAt && codeData.expiresAt.toDate() < new Date()) {
      return {
        success: false,
        message: 'This gift code has expired',
      };
    }
    
    // Get current usage
    const usageDoc = await getDoc(usageRef);
    if (!usageDoc.exists()) {
      return {
        success: false,
        message: 'User usage data not found',
      };
    }
    
    const usage = usageDoc.data();
    const updates = {};
    
    // Apply gift code benefits based on type
    if (codeData.type === 'premium') {
      // Grant premium tier
      updates.tier = 'premium';
      updates.scansRemaining = 1000;
      updates.recipesRemaining = 1000;
      updates.resetDate = serverTimestamp();
      
      // Store subscription info
      updates.subscription = {
        tier: 'premium',
        source: 'giftCode',
        giftCode: code,
        startDate: serverTimestamp(),
        // Duration based on gift code
        durationMonths: codeData.durationMonths || 1,
      };
    } else if (codeData.type === 'scans') {
      // Add scans
      updates.scansRemaining = usage.scansRemaining + (codeData.scansAmount || 0);
    } else if (codeData.type === 'recipes') {
      // Add recipes
      updates.recipesRemaining = usage.recipesRemaining + (codeData.recipesAmount || 0);
    } else if (codeData.type === 'bundle') {
      // Add both scans and recipes
      updates.scansRemaining = usage.scansRemaining + (codeData.scansAmount || 0);
      updates.recipesRemaining = usage.recipesRemaining + (codeData.recipesAmount || 0);
    }
    
    // Update usage
    await updateDoc(usageRef, updates);
    
    // Mark code as used
    await updateDoc(codeRef, {
      used: true,
      usedBy: userId,
      usedAt: serverTimestamp(),
    });
    
    console.log(`✅ Gift code redeemed: ${code} by user: ${userId}`);
    
    return {
      success: true,
      message: 'Gift code redeemed successfully!',
      benefits: codeData,
      newUsage: { ...usage, ...updates },
    };
  } catch (error) {
    console.error('❌ Error redeeming gift code:', error);
    throw error;
  }
}
