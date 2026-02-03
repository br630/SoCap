import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import {
  Searchbar,
  Text,
  Checkbox,
  Avatar,
  Chip,
  Button,
  ActivityIndicator,
} from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useContacts } from '../../hooks/useContacts';
import { useEventMutations } from '../../hooks/useEvents';
import { Contact } from '../../services/contactService';
import TierBadge from '../../components/contacts/TierBadge';

type RelationshipTier = 'INNER_CIRCLE' | 'CLOSE_FRIENDS' | 'FRIENDS' | 'ACQUAINTANCES' | 'PROFESSIONAL';

const TIERS: (RelationshipTier | 'ALL')[] = [
  'ALL',
  'INNER_CIRCLE',
  'CLOSE_FRIENDS',
  'FRIENDS',
  'ACQUAINTANCES',
  'PROFESSIONAL',
];

const tierLabels: Record<string, string> = {
  ALL: 'All',
  INNER_CIRCLE: 'Inner Circle',
  CLOSE_FRIENDS: 'Close Friends',
  FRIENDS: 'Friends',
  ACQUAINTANCES: 'Acquaintances',
  PROFESSIONAL: 'Professional',
};

export default function SelectAttendeesScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { eventId, preSelectedIds } = (route.params as {
    eventId: string;
    preSelectedIds?: string[];
  }) || {};

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState<RelationshipTier | 'ALL'>('ALL');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(preSelectedIds || [])
  );

  const { contacts, isLoading } = useContacts({
    filters: {
      search: searchQuery || undefined,
      tier: selectedTier !== 'ALL' ? selectedTier : undefined,
    },
    limit: 100,
  });

  const { addAttendeesAsync, isAddingAttendees } = useEventMutations();

  const toggleSelection = useCallback((contactId: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(contactId)) {
        newSet.delete(contactId);
      } else {
        newSet.add(contactId);
      }
      return newSet;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(contacts.map((c) => c.id)));
  }, [contacts]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleDone = useCallback(async () => {
    if (selectedIds.size === 0) {
      navigation.goBack();
      return;
    }

    try {
      await addAttendeesAsync({
        eventId,
        contactIds: Array.from(selectedIds),
      });
      navigation.goBack();
    } catch (error) {
      console.error('Failed to add attendees:', error);
    }
  }, [selectedIds, eventId, addAttendeesAsync, navigation]);

  const selectedContacts = useMemo(() => {
    return contacts.filter((c) => selectedIds.has(c.id));
  }, [contacts, selectedIds]);

  const renderContact = ({ item }: { item: Contact }) => {
    const isSelected = selectedIds.has(item.id);
    const initials = item.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return (
      <TouchableOpacity
        style={[styles.contactRow, isSelected && styles.contactRowSelected]}
        onPress={() => toggleSelection(item.id)}
        activeOpacity={0.7}
      >
        <Checkbox status={isSelected ? 'checked' : 'unchecked'} />

        {item.profileImage ? (
          <Avatar.Image size={44} source={{ uri: item.profileImage }} style={styles.avatar} />
        ) : (
          <Avatar.Text size={44} label={initials} style={styles.avatar} />
        )}

        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{item.name}</Text>
          {item.phone && <Text style={styles.contactDetail}>{item.phone}</Text>}
        </View>

        {item.relationship && (
          <TierBadge tier={item.relationship.tier} size="small" />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search */}
      <Searchbar
        placeholder="Search contacts..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
      />

      {/* Tier Filter */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          data={TIERS}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <Chip
              selected={selectedTier === item}
              onPress={() => setSelectedTier(item)}
              style={styles.chip}
              mode={selectedTier === item ? 'flat' : 'outlined'}
            >
              {tierLabels[item]}
            </Chip>
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
        />
      </View>

      {/* Selection Actions */}
      <View style={styles.selectionActions}>
        <Text style={styles.selectionCount}>
          {selectedIds.size} selected
        </Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity onPress={selectAll} style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Select All</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={clearSelection} style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Selected Preview */}
      {selectedIds.size > 0 && (
        <View style={styles.selectedPreview}>
          <FlatList
            horizontal
            data={selectedContacts.slice(0, 10)}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const initials = item.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);
              return (
                <TouchableOpacity
                  style={styles.selectedChip}
                  onPress={() => toggleSelection(item.id)}
                >
                  {item.profileImage ? (
                    <Avatar.Image size={24} source={{ uri: item.profileImage }} />
                  ) : (
                    <Avatar.Text size={24} label={initials} />
                  )}
                  <Text style={styles.selectedChipText} numberOfLines={1}>
                    {item.name.split(' ')[0]}
                  </Text>
                  <Ionicons name="close" size={14} color="#666" />
                </TouchableOpacity>
              );
            }}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.selectedList}
            ListFooterComponent={
              selectedIds.size > 10 ? (
                <View style={styles.moreChip}>
                  <Text style={styles.moreChipText}>+{selectedIds.size - 10}</Text>
                </View>
              ) : null
            }
          />
        </View>
      )}

      {/* Contact List */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading contacts...</Text>
        </View>
      ) : contacts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No contacts found</Text>
          <Text style={styles.emptySubtext}>
            {searchQuery || selectedTier !== 'ALL'
              ? 'Try adjusting your search or filters'
              : 'Add contacts first to invite them'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={contacts}
          renderItem={renderContact}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {/* Bottom Button */}
      <View style={styles.bottomBar}>
        <Button
          mode="contained"
          onPress={handleDone}
          loading={isAddingAttendees}
          disabled={isAddingAttendees}
          style={styles.doneButton}
        >
          {selectedIds.size > 0
            ? `Add ${selectedIds.size} Guest${selectedIds.size !== 1 ? 's' : ''}`
            : 'Done'}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchbar: {
    margin: 16,
    marginBottom: 8,
  },
  filterContainer: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    marginRight: 8,
  },
  selectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    padding: 4,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#007AFF',
  },
  selectedPreview: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 8,
  },
  selectedList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingVertical: 4,
    paddingHorizontal: 8,
    paddingRight: 6,
    borderRadius: 16,
    gap: 6,
    marginRight: 8,
  },
  selectedChipText: {
    fontSize: 12,
    color: '#1a1a1a',
    maxWidth: 60,
  },
  moreChip: {
    backgroundColor: '#e0e0e0',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
    justifyContent: 'center',
  },
  moreChipText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    opacity: 0.6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  listContent: {
    paddingVertical: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  contactRowSelected: {
    backgroundColor: '#E3F2FD',
  },
  avatar: {
    marginLeft: 8,
  },
  contactInfo: {
    flex: 1,
    marginLeft: 12,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  contactDetail: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginLeft: 80,
  },
  bottomBar: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  doneButton: {
    paddingVertical: 4,
  },
});
