import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Searchbar, Text, ActivityIndicator, Chip } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useVenueSearch } from '../../hooks/useEvents';
import { VenueSuggestion } from '../../services/eventService';

const VENUE_TYPES = [
  { value: '', label: 'All' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'bar', label: 'Bar' },
  { value: 'cafe', label: 'Café' },
  { value: 'park', label: 'Park' },
  { value: 'event_venue', label: 'Event Venue' },
  { value: 'bowling_alley', label: 'Bowling' },
  { value: 'movie_theater', label: 'Theater' },
];

const PRICE_LEVELS = ['$', '$$', '$$$', '$$$$'];

export default function VenueSearchScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { onSelect } = (route.params as { onSelect?: (venue: VenueSuggestion) => void }) || {};

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('');

  const fullQuery = selectedType ? `${searchQuery} ${selectedType}` : searchQuery;
  const { venues, isSearching, error } = useVenueSearch(fullQuery);

  const handleSelectVenue = useCallback(
    (venue: VenueSuggestion) => {
      if (onSelect) {
        onSelect(venue);
      }
      navigation.goBack();
    },
    [onSelect, navigation]
  );

  const renderVenue = ({ item }: { item: VenueSuggestion }) => {
    return (
      <TouchableOpacity
        style={styles.venueCard}
        onPress={() => handleSelectVenue(item)}
        activeOpacity={0.7}
      >
        {/* Venue Photo */}
        {item.photos && item.photos.length > 0 ? (
          <Image source={{ uri: item.photos[0] }} style={styles.venueImage} />
        ) : (
          <View style={styles.venueImagePlaceholder}>
            <Ionicons name="location" size={32} color="#ccc" />
          </View>
        )}

        <View style={styles.venueInfo}>
          {/* Name & Rating */}
          <View style={styles.venueHeader}>
            <Text style={styles.venueName} numberOfLines={1}>
              {item.name}
            </Text>
            {item.rating && (
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={12} color="#FFB800" />
                <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
              </View>
            )}
          </View>

          {/* Address */}
          <Text style={styles.venueAddress} numberOfLines={2}>
            {item.address}
          </Text>

          {/* Meta Info */}
          <View style={styles.venueMeta}>
            {/* Price Level */}
            {item.priceLevel !== undefined && (
              <Text style={styles.priceLevel}>
                {PRICE_LEVELS[item.priceLevel - 1] || PRICE_LEVELS[0]}
              </Text>
            )}

            {/* Open Status */}
            {item.openNow !== undefined && (
              <View
                style={[
                  styles.openBadge,
                  { backgroundColor: item.openNow ? '#E8F5E9' : '#FFEBEE' },
                ]}
              >
                <Text
                  style={[
                    styles.openText,
                    { color: item.openNow ? '#34C759' : '#FF3B30' },
                  ]}
                >
                  {item.openNow ? 'Open' : 'Closed'}
                </Text>
              </View>
            )}

            {/* Types */}
            {item.types.slice(0, 2).map((type, index) => (
              <Text key={index} style={styles.typeTag}>
                {type.replace(/_/g, ' ')}
              </Text>
            ))}
          </View>
        </View>

        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <Searchbar
        placeholder="Search venues..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
        icon="search"
      />

      {/* Type Filter */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          data={VENUE_TYPES}
          keyExtractor={(item) => item.value}
          renderItem={({ item }) => (
            <Chip
              selected={selectedType === item.value}
              onPress={() => setSelectedType(item.value)}
              style={styles.chip}
              mode={selectedType === item.value ? 'flat' : 'outlined'}
            >
              {item.label}
            </Chip>
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
        />
      </View>

      {/* Results */}
      {isSearching ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Searching venues...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Ionicons name="warning-outline" size={48} color="#FF3B30" />
          <Text style={styles.errorText}>Search failed</Text>
          <Text style={styles.errorSubtext}>{error.message}</Text>
        </View>
      ) : searchQuery.length < 2 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="search-outline" size={48} color="#ccc" />
          <Text style={styles.hintText}>Search for a venue</Text>
          <Text style={styles.hintSubtext}>
            Enter at least 2 characters to search
          </Text>
        </View>
      ) : venues.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="location-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No venues found</Text>
          <Text style={styles.emptySubtext}>
            Try a different search term or location
          </Text>
        </View>
      ) : (
        <FlatList
          data={venues}
          renderItem={renderVenue}
          keyExtractor={(item) => item.placeId}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListHeaderComponent={
            <Text style={styles.resultsCount}>
              {venues.length} venue{venues.length !== 1 ? 's' : ''} found
            </Text>
          }
        />
      )}
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF3B30',
    marginTop: 16,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  hintText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  hintSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 20,
  },
  resultsCount: {
    fontSize: 12,
    color: '#666',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  venueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
  },
  venueImage: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  venueImagePlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  venueInfo: {
    flex: 1,
    marginLeft: 12,
  },
  venueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  venueName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginRight: 8,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F57C00',
  },
  venueAddress: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 6,
  },
  venueMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  priceLevel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#34C759',
  },
  openBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  openText: {
    fontSize: 11,
    fontWeight: '600',
  },
  typeTag: {
    fontSize: 11,
    color: '#999',
    textTransform: 'capitalize',
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
});
