import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  primary: '#4A7C59', // Sage Green
  primaryLight: '#E8F5E9',
  neutral: '#F5F5F5',
  neutralText: '#666666',
  selected: '#4A7C59',
  selectedText: '#FFFFFF',
  border: '#E0E0E0',
};

export default function Chip({
  label,
  onPress,
  variant = 'filled', // filled, outline, neutral
  size = 'md', // sm, md
  selected = false,
  icon,
  onDelete,
  style,
  textStyle,
}) {
  const getBackgroundColor = () => {
    if (selected) return COLORS.selected;
    if (variant === 'neutral') return COLORS.neutral;
    if (variant === 'outline') return 'transparent';
    return COLORS.primaryLight;
  };

  const getTextColor = () => {
    if (selected) return COLORS.selectedText;
    if (variant === 'neutral') return COLORS.neutralText;
    return COLORS.primary;
  };

  const getBorderColor = () => {
    if (variant === 'outline') return COLORS.primary;
    return 'transparent';
  };

  const getPadding = () => {
    switch (size) {
      case 'sm': return { paddingVertical: 4, paddingHorizontal: 8 };
      default: return { paddingVertical: 8, paddingHorizontal: 16 }; // md
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'sm': return 12;
      default: return 14;
    }
  };

  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderWidth: variant === 'outline' ? 1 : 0,
          ...getPadding(),
        },
        style,
      ]}
    >
      {icon && <Ionicons name={icon} size={getFontSize() + 2} color={getTextColor()} style={styles.icon} />}
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
      {onDelete && (
        <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
          <Ionicons name="close-circle" size={16} color={getTextColor()} />
        </TouchableOpacity>
      )}
    </Container>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '500',
  },
  icon: {
    marginRight: 4,
  },
  deleteButton: {
    marginLeft: 4,
  },
});
