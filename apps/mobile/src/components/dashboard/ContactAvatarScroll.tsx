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
  const renderContact = ({ item }: { item: ContactNeedingAttention }) => {
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
          <Badge style={styles.badge} visible={item.daysOverdue > 0}>
            {item.daysOverdue}
          </Badge>
        </View>
        <Text style={styles.name} numberOfLines={1}>
          {item.name.split(' ')[0]}
        </Text>
        <Text style={styles.daysText}>
          {item.daysOverdue} day{item.daysOverdue !== 1 ? 's' : ''}
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
