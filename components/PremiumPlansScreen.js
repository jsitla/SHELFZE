import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator, Alert } from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation } from '../contexts/translations';
import { usePurchase } from '../contexts/PurchaseContext';

export default function PremiumPlansScreen() {
  const { language } = useLanguage();
  const t = useTranslation(language);
  const { offerings, purchasePackage, restorePurchases, isPremium } = usePurchase();
  const [loading, setLoading] = useState(false);

  const handlePurchase = async (pkg) => {
    if (!pkg) return;
    setLoading(true);
    const { success, error } = await purchasePackage(pkg);
    setLoading(false);
    if (success) {
      Alert.alert(t('success') || 'Success', t('purchaseSuccess') || 'Thank you for subscribing!');
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    await restorePurchases();
    setLoading(false);
  };

  // Get packages from RevenueCat offerings
  // Assumes you have an offering named 'default' with 'monthly' and 'annual' packages
  const currentOffering = offerings;
  const monthlyPackage = currentOffering?.monthly;
  const annualPackage = currentOffering?.annual;

  if (!currentOffering) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4A7C59" />
        <Text style={styles.loadingText}>{t('loadingProducts') || 'Loading products...'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('premiumTitle') || 'Upgrade to Premium'}</Text>
      <Text style={styles.subtitle}>
        {t('premiumDescription') || 'Get 500 scans and 500 recipes every month.'}
      </Text>

      {isPremium && (
        <View style={styles.activeBadge}>
          <Text style={styles.activeText}>{t('premiumActive') || 'PREMIUM ACTIVE'}</Text>
        </View>
      )}

      <View style={styles.planRow}>
        {/* Monthly Plan */}
        <View style={[styles.planCard, isPremium && styles.disabledCard]}>
          <Text style={styles.planName}>{t('premiumMonthly') || 'Monthly'}</Text>
          <Text style={styles.planPrice}>
            {monthlyPackage?.product?.priceString || '...'}
          </Text>
          <Text style={styles.planDetail}>
            {t('premiumPlanDetail') || '500 scans · 500 recipes/month'}
          </Text>
          <TouchableOpacity 
            style={[styles.subscribeButton, (loading || isPremium) && styles.disabledButton]}
            onPress={() => handlePurchase(monthlyPackage)}
            disabled={loading || isPremium || !monthlyPackage}
          >
            <Text style={styles.subscribeText}>
              {isPremium 
                ? (t('active') || 'Active')
                : (t('subscribe') || 'Subscribe')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Annual Plan */}
        <View style={[styles.planCard, isPremium && styles.disabledCard]}>
          <Text style={styles.planName}>{t('premiumAnnual') || 'Annual'}</Text>
          <Text style={styles.planPrice}>
            {annualPackage?.product?.priceString || '...'}
          </Text>
          <Text style={styles.planDetail}>
            {t('premiumPlanDetail') || '500 scans · 500 recipes/month'}
          </Text>
          <TouchableOpacity 
            style={[styles.subscribeButton, (loading || isPremium) && styles.disabledButton]}
            onPress={() => handlePurchase(annualPackage)}
            disabled={loading || isPremium || !annualPackage}
          >
            <Text style={styles.subscribeText}>
              {isPremium 
                ? (t('active') || 'Active')
                : (t('subscribe') || 'Subscribe')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.restoreButton} 
        onPress={handleRestore}
        disabled={loading}
      >
        <Text style={styles.restoreText}>{t('restorePurchases') || 'Restore Purchases'}</Text>
      </TouchableOpacity>

      <Text style={styles.footerText}>
        {t('premiumFooter') ||
          'Payments will be processed via the Apple App Store or Google Play Store.'}
      </Text>
      
      {loading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1DE', // Alabaster
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3D405B', // Charcoal
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  activeBadge: {
    backgroundColor: '#4A7C59',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  activeText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  planRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  planCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledCard: {
    opacity: 0.7,
  },
  planName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3D405B', // Charcoal
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4A7C59', // Sage Green
    marginBottom: 6,
  },
  planDetail: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  subscribeButton: {
    backgroundColor: '#E07A5F', // Terracotta
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  subscribeText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  restoreButton: {
    marginTop: 20,
    alignSelf: 'center',
    padding: 10,
  },
  restoreText: {
    color: '#4A7C59',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  footerText: {
    marginTop: 16,
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
});

