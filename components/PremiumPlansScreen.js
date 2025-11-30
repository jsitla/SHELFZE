import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation } from '../contexts/translations';
import { getPremiumPricing, formatPrice, isIntroPeriod, INTRO_PRICING_END } from '../utils/premiumPricing';

export default function PremiumPlansScreen() {
  const { language } = useLanguage();
  const t = useTranslation(language);

  const currency = Platform.OS === 'ios' ? 'EUR' : 'EUR'; // Adjust later if needed
  const pricing = getPremiumPricing(currency);
  const intro = isIntroPeriod();

  const introNote = intro
    ? t('premiumIntroNote') ||
      `Intro pricing until ${INTRO_PRICING_END.toLocaleDateString()}`
    : t('premiumStandardNote') || 'Standard pricing in effect';

  const monthlyLabel = `${formatPrice(pricing.monthly, pricing.currency)}/${t('perMonth') || 'month'}`;
  const annualLabel = `${formatPrice(pricing.annual, pricing.currency)}/${t('perYear') || 'year'}`;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('premiumTitle') || 'Upgrade to Premium'}</Text>
      <Text style={styles.subtitle}>
        {t('premiumDescription') || 'Get 500 scans and 500 recipes every month.'}
      </Text>

      <Text style={styles.introNote}>{introNote}</Text>

      <View style={styles.planRow}>
        <View style={styles.planCard}>
          <Text style={styles.planName}>{t('premiumMonthly') || 'Monthly'}</Text>
          <Text style={styles.planPrice}>{monthlyLabel}</Text>
          <Text style={styles.planDetail}>
            {t('premiumPlanDetail') || '500 scans · 500 recipes/month'}
          </Text>
          <TouchableOpacity style={styles.subscribeButton} disabled>
            <Text style={styles.subscribeText}>
              {Platform.OS === 'ios'
                ? t('subscribeWithApple') || 'Subscribe with Apple'
                : t('subscribeWithGoogle') || 'Subscribe with Google Play'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.comingSoon}>{t('comingSoon') || 'Coming soon'}</Text>
        </View>

        <View style={styles.planCard}>
          <Text style={styles.planName}>{t('premiumAnnual') || 'Annual'}</Text>
          <Text style={styles.planPrice}>{annualLabel}</Text>
          <Text style={styles.planDetail}>
            {t('premiumPlanDetail') || '500 scans · 500 recipes/month'}
          </Text>
          <TouchableOpacity style={styles.subscribeButton} disabled>
            <Text style={styles.subscribeText}>
              {Platform.OS === 'ios'
                ? t('subscribeWithApple') || 'Subscribe with Apple'
                : t('subscribeWithGoogle') || 'Subscribe with Google Play'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.comingSoon}>{t('comingSoon') || 'Coming soon'}</Text>
        </View>
      </View>

      <Text style={styles.footerText}>
        {t('premiumFooter') ||
          'Payments will be processed via the Apple App Store or Google Play Store once enabled.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1DE', // Alabaster
    padding: 20,
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
  introNote: {
    fontSize: 12,
    color: '#E07A5F', // Terracotta
    marginBottom: 16,
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
    backgroundColor: '#E0E0E0',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  subscribeText: {
    color: '#999',
    fontSize: 13,
    fontWeight: '600',
  },
  comingSoon: {
    marginTop: 6,
    fontSize: 11,
    color: '#E07A5F', // Terracotta
    textAlign: 'center',
  },
  footerText: {
    marginTop: 16,
    fontSize: 12,
    color: '#999',
  },
});
