// Premium pricing helper for Shelfze
// NOTE: This only models prices and periods. Actual store products
// (Google Play / Apple) must be wired separately.

export const INTRO_PRICING_END = new Date('2026-02-01T00:00:00.000Z');

export function isIntroPeriod(now = new Date()) {
  return now < INTRO_PRICING_END;
}

export function getPremiumPricing(currency = 'EUR', now = new Date()) {
  const intro = isIntroPeriod(now);

  if (currency === 'USD') {
    return intro
      ? {
          currency: 'USD',
          monthly: 1.99,
          annual: 19.99,
        }
      : {
          currency: 'USD',
          monthly: 2.99,
          annual: 29.99,
        };
  }

  // Default to EUR
  return intro
    ? {
        currency: 'EUR',
        monthly: 1.99,
        annual: 19.99,
      }
    : {
        currency: 'EUR',
        monthly: 2.99,
        annual: 29.99,
      };
}

export function formatPrice(amount, currency = 'EUR') {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback if Intl or currency not available
    const symbol = currency === 'USD' ? '$' : '€';
    return `${symbol}${amount.toFixed(2)}`;
  }
}
