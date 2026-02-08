import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { Contact } from '../../services/contactService';
import TierBadge from './TierBadge';
import { colors, shadows, radii, spacing } from '../../theme/paperTheme';

interface ContactCardProps {
  contact: Contact;
  onPress: () => void;
}

export default function ContactCard({ contact, onPress }: ContactCardProps) {
  const initials = contact.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const lastContactDate = contact.relationship?.lastContactDate
    ? new Date(contact.relationship.lastContactDate)
    : null;

  const formatLastContact = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''}`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''}`;
    return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) > 1 ? 's' : ''}`;
  };

  const isOverdue = lastContactDate && (() => {
    const diffDays = Math.floor((new Date().getTime() - lastContactDate.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 21; // 3 weeks
  })();

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View style={styles.card}>
        {/* Avatar — Design System: Small Avatar */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{contact.name}</Text>
          {contact.relationship && (
            <TierBadge tier={contact.relationship.tier} size="small" />
          )}
          {lastContactDate && (
            <View style={styles.lastContactRow}>
              <Text style={[styles.lastContact, isOverdue && styles.lastContactOverdue]}>
                Last contact: {formatLastContact(lastContactDate)}
              </Text>
              {isOverdue && (
                <Ionicons name="warning" size={14} color={colors.warning} style={{ marginLeft: 4 }} />
              )}
            </View>
          )}
        </View>

        {/* Phone Icon */}
        <TouchableOpacity style={styles.phoneIcon} activeOpacity={0.6}>
          <Ionicons name="call-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xs,
    padding: spacing.lg,
    borderRadius: radii.lg,
    ...shadows.light,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  info: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.xs,
  },
  name: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
    color: colors.textPrimary,
  },
  lastContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  lastContact: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  lastContactOverdue: {
    color: colors.warning,
    fontWeight: '500',
  },
  phoneIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
});
