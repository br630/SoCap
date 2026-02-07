import React from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, Avatar, Badge } from 'react-native-paper';
import { ContactNeedingAttention } from '../../services/dashboardService';

interface ContactAvatarScrollProps {
  contacts: ContactNeedingAttention[];
  onContactPress: (contactId: string) => void;
}

export default function ContactAvatarScroll({
  contacts,
  onContactPress,
}: ContactAvatarScrollProps) {
  // Format the time since last contact
  const formatTimeSince = (days: number, neverContacted?: boolean): string => {
    if (neverContacted) {
      return 'Never';
    }
    if (days === 0) {
      return 'Today';
    }
    if (days === 1) {
      return '1 day';
    }
    if (days < 7) {
      return `${days} days`;
    }
    if (days < 30) {
      const weeks = Math.floor(days / 7);
      return `${weeks} wk${weeks > 1 ? 's' : ''}`;
    }
    if (days < 365) {
      const months = Math.floor(days / 30);
      return `${months} mo${months > 1 ? 's' : ''}`;
    }
    const years = Math.floor(days / 365);
    return `${years} yr${years > 1 ? 's' : ''}`;
  };

  const renderContact = ({ item }: { item: ContactNeedingAttention }) => {
    const daysSince = item.daysSince ?? item.daysOverdue; // Fallback to daysOverdue for backwards compatibility
    const timeText = formatTimeSince(daysSince, item.neverContacted);
    
    return (
      <TouchableOpacity
        style={styles.contactItem}
        onPress={() => onContactPress(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          {item.profileImage ? (
            <Avatar.Image size={56} source={{ uri: item.profileImage }} />
          ) : (
            <Avatar.Text
              size={56}
              label={item.name.charAt(0).toUpperCase()}
            />
          )}
          <Badge style={styles.badge} visible={daysSince > 0 || item.neverContacted}>
            {item.neverContacted ? '!' : daysSince > 99 ? '99+' : daysSince}
          </Badge>
        </View>
        <Text style={styles.name} numberOfLines={1}>
          {item.name.split(' ')[0]}
        </Text>
        <Text style={styles.daysText}>
          {timeText}
        </Text>
      </TouchableOpacity>
    );
  };

  if (contacts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>All contacts are up to date! 🎉</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={contacts}
        renderItem={renderContact}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  contactItem: {
    alignItems: 'center',
    width: 80,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#F44336',
  },
  name: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
    textAlign: 'center',
  },
  daysText: {
    fontSize: 11,
    color: '#F44336',
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
  },
});
