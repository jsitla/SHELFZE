import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform, Alert } from 'react-native';
import Purchases from 'react-native-purchases';
import { config } from '../config';
import { auth } from '../firebase.config';
import { getUserUsage } from '../utils/usageTracking';

const PurchaseContext = createContext();

export const usePurchase = () => useContext(PurchaseContext);

export const PurchaseProvider = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const [offerings, setOfferings] = useState(null);
  const [customerInfo, setCustomerInfo] = useState(null);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    const initRevenueCat = async () => {
      try {
        if (Platform.OS === 'ios') {
          Purchases.configure({ apiKey: config.revenueCat.ios });
        } else if (Platform.OS === 'android') {
          Purchases.configure({ apiKey: config.revenueCat.android });
        }

        // Set user ID if logged in
        if (auth.currentUser) {
          await Purchases.logIn(auth.currentUser.uid);
        }

        const info = await Purchases.getCustomerInfo();
        setCustomerInfo(info);
        checkEntitlements(info);

        try {
          const offerings = await Purchases.getOfferings();
          if (offerings.current !== null) {
            setOfferings(offerings.current);
          }
        } catch (e) {
          console.log('Error fetching offerings:', e);
        }

        setIsReady(true);
      } catch (e) {
        console.error('Error initializing RevenueCat:', e);
        setIsReady(true); // Still mark as ready so app doesn't hang
      }
    };

    initRevenueCat();

    // Listen for auth changes to identify user in RevenueCat
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (user) {
        await Purchases.logIn(user.uid);
      } else {
        try {
          const isAnonymous = await Purchases.isAnonymous();
          if (!isAnonymous) {
            await Purchases.logOut();
          }
        } catch (e) {
          // Ignore error if already anonymous or check fails
          console.log('RevenueCat logout info:', e.message);
        }
      }
      // Refresh info after auth change
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);
      checkEntitlements(info);
    });

    // Listen for purchase updates
    const unsubscribePurchases = Purchases.addCustomerInfoUpdateListener((info) => {
      setCustomerInfo(info);
      checkEntitlements(info);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribePurchases && typeof unsubscribePurchases.remove === 'function') {
        unsubscribePurchases.remove();
      }
    };
  }, []);

  const checkEntitlements = async (info) => {
    if (!info) return;
    
    const entitlementId = config.revenueCat.entitlementId || 'premium';
    
    // Check if the specific entitlement is active, OR if any entitlement is active (fallback)
    const activeEntitlements = Object.keys(info.entitlements.active);
    const hasPremium = activeEntitlements.length > 0;
    
    if (activeEntitlements.length > 0 && !info.entitlements.active[entitlementId]) {
      console.warn('Entitlement ID mismatch. Configured:', entitlementId, 'Found:', activeEntitlements);
    }
    
    setIsPremium(hasPremium);
    
    // Sync with our backend
    if (auth.currentUser) {
      if (hasPremium) {
        // Always ensure backend knows we are premium
        syncSubscriptionStatus('premium');
      } else {
        // If not premium locally, check if backend thinks we are
        try {
          const usage = await getUserUsage(auth.currentUser.uid);
          if (usage && usage.tier === 'premium') {
            console.log('Detected expired subscription, syncing downgrade to free');
            syncSubscriptionStatus('free');
          }
        } catch (error) {
          console.error('Error checking usage for downgrade:', error);
        }
      }
    }
  };

  const syncSubscriptionStatus = async (tier) => {
    try {
      const token = await auth.currentUser.getIdToken();
      await fetch(config.upgradeTier, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ newTier: tier }),
      });
    } catch (error) {
      console.error('Error syncing subscription status:', error);
    }
  };

  const purchasePackage = async (pack) => {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pack);
      checkEntitlements(customerInfo);
      return { success: true };
    } catch (e) {
      if (!e.userCancelled) {
        Alert.alert('Purchase Error', e.message);
      }
      return { success: false, error: e };
    }
  };

  const restorePurchases = async () => {
    try {
      const info = await Purchases.restorePurchases();
      checkEntitlements(info);
      
      const hasActiveEntitlements = Object.keys(info.entitlements.active).length > 0;
      
      if (hasActiveEntitlements) {
        Alert.alert('Success', 'Purchases restored successfully!');
      } else {
        Alert.alert('No Purchases', 'No active subscriptions found to restore.');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to restore purchases: ' + e.message);
    }
  };

  return (
    <PurchaseContext.Provider
      value={{
        isReady,
        offerings,
        customerInfo,
        isPremium,
        purchasePackage,
        restorePurchases,
      }}
    >
      {children}
    </PurchaseContext.Provider>
  );
};
