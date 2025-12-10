import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  primary: '#4A7C59', // Sage Green
  secondary: '#E07A5F', // Terracotta
  neutral: '#3D405B', // Charcoal
  white: '#FFFFFF',
  gray: '#E0E0E0',
  text: '#333333',
  disabled: '#BDBDBD',
};

export default function Button({
  label,
  onPress,
  variant = 'primary', // primary, secondary, outline, ghost
  size = 'md', // sm, md, lg
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
}) {
  const getBackgroundColor = () => {
    if (disabled) return COLORS.disabled;
    switch (variant) {
      case 'primary': return COLORS.primary;
      case 'secondary': return COLORS.secondary;
      case 'outline': return 'transparent';
      case 'ghost': return 'transparent';
      default: return COLORS.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return '#FFF';
    switch (variant) {
      case 'primary': return COLORS.white;
      case 'secondary': return COLORS.white;
      case 'outline': return COLORS.primary;
      case 'ghost': return COLORS.primary;
      default: return COLORS.white;
    }
  };

  const getBorderColor = () => {
    if (disabled) return 'transparent';
    if (variant === 'outline') return COLORS.primary;
    return 'transparent';
  };

  const getPadding = () => {
    switch (size) {
      case 'sm': return { paddingVertical: 6, paddingHorizontal: 12 };
      case 'lg': return { paddingVertical: 16, paddingHorizontal: 32 };
      default: return { paddingVertical: 12, paddingHorizontal: 24 }; // md
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'sm': return 14;
      case 'lg': return 18;
      default: return 16;
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderWidth: variant === 'outline' ? 1 : 0,
          ...getPadding(),
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <View style={styles.contentContainer}>
          {icon && <Ionicons name={icon} size={getFontSize() + 4} color={getTextColor()} style={styles.icon} />}
          <Text
            style={[
              styles.text,
              {
                color: getTextColor(),
                fontSize: getFontSize(),
              },
              textStyle,
            ]}
          >
            {label}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  icon: {
    marginRight: 8,
  },
});
