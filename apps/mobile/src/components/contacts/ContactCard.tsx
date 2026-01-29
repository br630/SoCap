import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Avatar, Text, useTheme } from 'react-native-paper';
import { Contact } from '../../services/contactService';
import TierBadge from './TierBadge';

interface ContactCardProps {
  contact: Contact;
  onPress: () => void;
}

export default function ContactCard({ contact, onPress }: ContactCardProps) {
  const theme = useTheme();
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
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card style={styles.card}>
        <Card.Content style={styles.content}>
          <Avatar.Image
            size={56}
            source={contact.profileImage ? { uri: contact.profileImage } : undefined}
            label={!contact.profileImage ? initials : undefined}
            style={styles.avatar}
          />
          <View style={styles.info}>
            <View style={styles.header}>
              <Text variant="titleMedium" style={styles.name}>
                {contact.name}
              </Text>
              {contact.relationship && (
                <TierBadge tier={contact.relationship.tier} size="small" />
              )}
            </View>
            {contact.phone && (
              <Text variant="bodyMedium" style={styles.phone}>
                {contact.phone}
              </Text>
            )}
            {contact.email && (
              <Text variant="bodySmall" style={styles.email} numberOfLines={1}>
                {contact.email}
              </Text>
            )}
            {lastContactDate && (
              <Text variant="bodySmall" style={styles.lastContact}>
                Last contact: {formatLastContact(lastContactDate)}
              </Text>
            )}
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 6,
  },
  content: {
    flexDirection: 'row',
    padding: 12,
  },
  avatar: {
    marginRight: 12,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  name: {
    flex: 1,
    fontWeight: '600',
  },
  phone: {
    marginTop: 2,
    opacity: 0.7,
  },
  email: {
    marginTop: 2,
    opacity: 0.6,
  },
  lastContact: {
    marginTop: 4,
    opacity: 0.5,
    fontSize: 11,
  },
});
