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
        {t('premiumDescription') || 'Get 1000 scans and 1000 recipes every month.'}
      </Text>

      <Text style={styles.introNote}>{introNote}</Text>

      <View style={styles.planRow}>
        <View style={styles.planCard}>
          <Text style={styles.planName}>{t('premiumMonthly') || 'Monthly'}</Text>
          <Text style={styles.planPrice}>{monthlyLabel}</Text>
          <Text style={styles.planDetail}>
            {t('premiumPlanDetail') || '1000 scans · 1000 recipes/month'}
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
            {t('premiumPlanDetail') || '1000 scans · 1000 recipes/month'}
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
    backgroundColor: '#0B1015',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#B0B8C4',
    marginBottom: 12,
  },
  introNote: {
    fontSize: 12,
    color: '#FBBF24',
    marginBottom: 16,
  },
  planRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  planCard: {
    flex: 1,
    backgroundColor: '#151A22',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
  },
  planName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#63B3ED',
    marginBottom: 6,
  },
  planDetail: {
    fontSize: 12,
    color: '#CBD5F5',
    marginBottom: 12,
  },
  subscribeButton: {
    backgroundColor: '#4A5568',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  subscribeText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
  },
  comingSoon: {
    marginTop: 6,
    fontSize: 11,
    color: '#A0AEC0',
    textAlign: 'center',
  },
  footerText: {
    marginTop: 16,
    fontSize: 12,
    color: '#A0AEC0',
  },
});
