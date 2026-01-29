import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { IconButton, Text, useTheme } from 'react-native-paper';

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
      <View style={[styles.iconContainer, color && { backgroundColor: color + '20' }]}>
        <IconButton
          icon={icon}
          size={24}
          iconColor={color || theme.colors.primary}
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
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  icon: {
    margin: 0,
  },
  label: {
    textAlign: 'center',
    opacity: 0.7,
  },
});
