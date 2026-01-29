import React, { useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Searchbar, FAB, Text, ActivityIndicator, Chip } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useContacts } from '../../hooks/useContacts';
import ContactCard from '../../components/contacts/ContactCard';
import type { RelationshipTier } from '../../components/contacts/TierBadge';

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

export default function ContactListScreen() {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState<RelationshipTier | 'ALL'>('ALL');
  const [page, setPage] = useState(1);

  const { contacts, pagination, isLoading, isError, refetch } = useContacts({
    filters: {
      search: searchQuery || undefined,
      tier: selectedTier !== 'ALL' ? selectedTier : undefined,
    },
    page,
    limit: 20,
  });

  const handleRefresh = () => {
    setPage(1);
    refetch();
  };

  const handleLoadMore = () => {
    if (pagination && page < pagination.totalPages && !isLoading) {
      setPage(page + 1);
    }
  };

  const handleContactPress = (contactId: string) => {
    navigation.navigate('ContactDetail' as never, { id: contactId } as never);
  };

  const handleAddContact = () => {
    navigation.navigate('AddEditContact' as never, {} as never);
  };

  if (isLoading && contacts.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading contacts...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Failed to load contacts</Text>
        <Text style={styles.errorSubtext}>Please try again</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search contacts..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
      />

      <View style={styles.tierContainer}>
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
          contentContainerStyle={styles.tierList}
        />
      </View>

      {contacts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text variant="headlineSmall" style={styles.emptyText}>
            No contacts found
          </Text>
          <Text variant="bodyMedium" style={styles.emptySubtext}>
            {searchQuery || selectedTier !== 'ALL'
              ? 'Try adjusting your search or filters'
              : 'Add your first contact to get started'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={contacts}
          renderItem={({ item }) => (
            <ContactCard contact={item} onPress={() => handleContactPress(item.id)} />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isLoading && contacts.length > 0 ? (
              <ActivityIndicator style={styles.footerLoader} />
            ) : null
          }
        />
      )}

      <FAB icon="plus" style={styles.fab} onPress={handleAddContact} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorSubtext: {
    opacity: 0.6,
  },
  searchbar: {
    margin: 16,
    marginBottom: 8,
  },
  tierContainer: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tierList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    marginRight: 8,
  },
  listContent: {
    paddingVertical: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    marginBottom: 8,
    opacity: 0.7,
  },
  emptySubtext: {
    textAlign: 'center',
    opacity: 0.5,
  },
  footerLoader: {
    paddingVertical: 20,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
