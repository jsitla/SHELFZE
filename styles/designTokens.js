// Shelfze Design System - Professional Design Tokens v3.0
// Modern, rounded, and delightful design matching WelcomeScreen aesthetic

export const Colors = {
  // Primary Colors - Rose/Pink (Modern, Friendly, Appetite)
  primary: '#E11D48', // Rose 600 - matches WelcomeScreen
  primaryDark: '#BE123C', // Rose 700
  primaryLight: '#FB7185', // Rose 400
  primaryLighter: '#FECDD3', // Rose 200
  primaryGradient: ['#E11D48', '#BE123C'],
  
  // Secondary Colors - Deep Orange (Warmth, Energy)  
  secondary: '#DD6B20', // Warm orange
  secondaryDark: '#C05621',
  secondaryLight: '#F6AD55',
  secondaryLighter: '#FEEBC8',
  secondaryGradient: ['#DD6B20', '#C05621'],
  
  // Accent Colors - Amber
  accent: '#F59E0B', // Amber - for warnings/highlights
  accentDark: '#D97706',
  accentLight: '#FBBF24',
  accentLighter: '#FEF3C7',
  accentGradient: ['#F59E0B', '#D97706'],
  
  // Status Colors - Enhanced
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  info: '#3B82F6',
  infoLight: '#DBEAFE',
  
  // Neutral Colors - Professional palette
  background: '#F9FAFB', // Softer white
  backgroundDark: '#F3F4F6',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  
  // Text Colors - Better hierarchy
  textPrimary: '#111827', // Darker for better contrast
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textInverse: '#FFFFFF',
  textMuted: '#D1D5DB',
  
  // Border Colors
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  borderDark: '#CBD5E1',
  borderFocus: '#E11D48',
  
  // Semantic Colors for pantry items
  expired: '#FEE2E2',
  expiredBorder: '#EF4444',
  expiredText: '#991B1B',
  expiringSoon: '#FEF3C7',
  expiringSoonBorder: '#F59E0B',
  expiringSoonText: '#92400E',
  fresh: '#D1FAE5',
  freshBorder: '#10B981',
  freshText: '#065F46',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
};

export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 18,
  xl: 22,
  xxl: 24,
  full: 9999,
};

export const Typography = {
  // Font Sizes
  fontSize: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 28,
    display: 32,
    hero: 40,
  },
  
  // Font Weights
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
  
  // Line Heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
    loose: 2,
  },
};

export const Shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 1,
    elevation: 1,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const Animations = {
  // Animation durations
  duration: {
    fast: 150,
    normal: 250,
    slow: 350,
  },
  
  // Spring configs
  spring: {
    damping: 15,
    mass: 1,
    stiffness: 150,
  },
};

// Common component styles that can be reused
export const CommonStyles = {
  // Cards - Enhanced with better elevation
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 22,
    padding: 22,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardElevated: {
    backgroundColor: Colors.surface,
    borderRadius: 22,
    padding: 22,
    ...Shadows.md,
  },
  cardInteractive: {
    backgroundColor: Colors.surface,
    borderRadius: 22,
    padding: 22,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  
  // Buttons - Professional with better feedback
  buttonPrimary: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  buttonSecondary: {
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  buttonDanger: {
    backgroundColor: Colors.danger,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonGhost: {
    backgroundColor: 'transparent',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSmall: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: Colors.textInverse,
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
  },
  buttonTextSmall: {
    color: Colors.textInverse,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  
  // Input - Enhanced with focus states
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  inputFocused: {
    borderColor: Colors.borderFocus,
    ...Shadows.sm,
  },
  inputError: {
    borderColor: Colors.danger,
  },
  
  // Chips/Tags - Professional style
  chip: {
    backgroundColor: Colors.primaryLighter,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  chipText: {
    color: Colors.primary,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  
  // Text Styles - Better hierarchy
  h1: {
    fontSize: Typography.fontSize.display,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: Typography.fontSize.xxxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  body: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.regular,
    color: Colors.textPrimary,
    lineHeight: Typography.fontSize.base * Typography.lineHeight.normal,
  },
  bodySecondary: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.regular,
    color: Colors.textSecondary,
    lineHeight: Typography.fontSize.base * Typography.lineHeight.normal,
  },
  caption: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.regular,
    color: Colors.textSecondary,
  },
  small: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.regular,
    color: Colors.textTertiary,
  },
  
  // Badges - For status indicators
  badge: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
  },
  badgeSuccess: {
    backgroundColor: Colors.successLight,
  },
  badgeWarning: {
    backgroundColor: Colors.warningLight,
  },
  badgeDanger: {
    backgroundColor: Colors.dangerLight,
  },
  badgeInfo: {
    backgroundColor: Colors.infoLight,
  },
  badgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
};

