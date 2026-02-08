import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { IconButton, Text, useTheme } from 'react-native-paper';
import { colors, shadows, radii, spacing } from '../../theme/paperTheme';

interface QuickActionButtonProps {
  icon: string;
  label: string;
  onPress: () => void;
  color?: string;
}

export default function QuickActionButton({ icon, label, onPress, color }: QuickActionButtonProps) {
  const theme = useTheme();

  return (
    <TouchableOpacity onPress={onPress} style={styles.container} activeOpacity={0.7}>
      <View style={styles.iconContainer}>
        <IconButton
          icon={icon}
          size={24}
          iconColor={color || colors.textSecondary}
          style={styles.icon}
        />
      </View>
      <Text variant="bodySmall" style={styles.label}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    ...shadows.light,
  },
  icon: {
    margin: 0,
  },
  label: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
});
