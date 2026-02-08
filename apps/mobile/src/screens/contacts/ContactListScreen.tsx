import React, { useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Searchbar, FAB, Text, ActivityIndicator, Chip } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useContacts } from '../../hooks/useContacts';
import ContactCard from '../../components/contacts/ContactCard';
import type { RelationshipTier } from '../../components/contacts/TierBadge';
import { ContactStackParamList } from '../../types/navigation';
import { colors, shadows, radii, spacing, typography } from '../../theme/paperTheme';

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
  const navigation = useNavigation<StackNavigationProp<ContactStackParamList>>();
  const route = useRoute();
  const { mode } = (route.params as { mode?: 'log-interaction' | 'ai-suggest' }) || {};
  const isLogInteractionMode = mode === 'log-interaction';
  const isAISuggestMode = mode === 'ai-suggest';
  
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

  const handleContactPress = (contactId: string, contactName?: string) => {
    if (isAISuggestMode) {
      navigation.navigate('ContactMessages', { 
        contactId,
        contactName: contactName || 'Contact',
      });
    } else {
      navigation.navigate('ContactDetail', { 
        id: contactId,
        openLogDialog: isLogInteractionMode,
      });
    }
  };

  const handleAddContact = () => {
    navigation.navigate('AddEditContact', {});
  };

  if (isLoading && contacts.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
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
      {(isLogInteractionMode || isAISuggestMode) && (
        <View style={[styles.modeHeader, isAISuggestMode && styles.aiModeHeader]}>
          <Text style={[styles.modeHeaderText, isAISuggestMode && styles.aiModeHeaderText]}>
            {isLogInteractionMode 
              ? 'Select a contact to log interaction' 
              : 'Select a contact for AI message suggestions'}
          </Text>
        </View>
      )}
      
      <Searchbar
        placeholder="Search contacts..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
        inputStyle={styles.searchbarInput}
        iconColor={colors.textSecondary}
        elevation={0}
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
              style={[
                styles.chip,
                selectedTier === item && styles.chipSelected,
              ]}
              textStyle={[
                styles.chipText,
                selectedTier === item && styles.chipTextSelected,
              ]}
              mode={selectedTier === item ? 'flat' : 'outlined'}
              selectedColor={selectedTier === item ? '#FFFFFF' : colors.textSecondary}
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
            <ContactCard contact={item} onPress={() => handleContactPress(item.id, item.name)} />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} tintColor={colors.primary} />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            isLoading && contacts.length > 0 ? (
              <ActivityIndicator style={styles.footerLoader} color={colors.primary} />
            ) : null
          }
        />
      )}

      {/* FAB — Design System: 56px, secondary color, full radius, medium shadow */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleAddContact}
        color="#FFFFFF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modeHeader: {
    backgroundColor: colors.secondary + '15',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  aiModeHeader: {
    backgroundColor: colors.primary + '15',
  },
  modeHeaderText: {
    color: colors.secondary,
    fontWeight: '600',
    fontSize: 15,
    textAlign: 'center',
  },
  aiModeHeaderText: {
    color: colors.primary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
  },
  errorText: {
    ...typography.h4,
    marginBottom: spacing.sm,
    color: colors.textPrimary,
  },
  errorSubtext: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  searchbar: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    ...shadows.subtle,
  },
  searchbarInput: {
    ...typography.bodySmall,
  },
  tierContainer: {
    paddingVertical: spacing.sm,
  },
  tierList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.full,
    height: 36,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  listContent: {
    paddingVertical: spacing.sm,
    paddingBottom: 80,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['3xl'],
  },
  emptyText: {
    marginBottom: spacing.sm,
    color: colors.textSecondary,
  },
  emptySubtext: {
    textAlign: 'center',
    color: colors.textSecondary,
  },
  footerLoader: {
    paddingVertical: spacing.xl,
  },
  fab: {
    position: 'absolute',
    margin: spacing.lg,
    right: 0,
    bottom: 0,
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.medium,
  },
});
