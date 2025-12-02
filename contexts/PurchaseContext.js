import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform, Alert } from 'react-native';
import Purchases from 'react-native-purchases';
import { config } from '../config';
import { auth } from '../firebase.config';

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
          await Purchases.logOut();
        } catch (e) {
          // Ignore error if already anonymous
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
      unsubscribePurchases.remove();
    };
  }, []);

  const checkEntitlements = (info) => {
    if (!info) return;
    
    // Use the entitlement ID from config
    const entitlementId = config.revenueCat.entitlementId || 'premium';
    const hasPremium = typeof info.entitlements.active[entitlementId] !== 'undefined';
    
    setIsPremium(hasPremium);
    
    // Sync with our backend if premium is active but Firestore might not be
    if (hasPremium && auth.currentUser) {
      syncPremiumStatus();
    }
  };

  const syncPremiumStatus = async () => {
    try {
      const token = await auth.currentUser.getIdToken();
      await fetch(config.upgradeTier, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ newTier: 'premium' }),
      });
    } catch (error) {
      console.error('Error syncing premium status:', error);
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
      
      const entitlementId = config.revenueCat.entitlementId || 'premium';
      
      if (info.entitlements.active[entitlementId]) {
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
