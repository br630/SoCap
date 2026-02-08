import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Image,
  ScrollView,
} from 'react-native';
import { Text, Card, Chip, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import interestService, { InterestUpdate, NewsArticle } from '../../services/interestService';

interface InterestUpdatesCardProps {
  contactId: string;
  contactName: string;
}

export function InterestUpdatesCard({ contactId, contactName }: InterestUpdatesCardProps) {
  const [updates, setUpdates] = useState<InterestUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedInterest, setExpandedInterest] = useState<string | null>(null);

  useEffect(() => {
    loadUpdates();
  }, [contactId]);

  const loadUpdates = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await interestService.getInterestUpdatesForContact(contactId);
      setUpdates(data);
    } catch (err) {
      console.error('Failed to load interest updates:', err);
      setError('Failed to load updates');
    } finally {
      setLoading(false);
    }
  };

  const openArticle = (url: string) => {
    Linking.openURL(url);
  };

  if (loading) {
    return (
      <Card style={styles.card}>
        <Card.Content style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#5856D6" />
          <Text style={styles.loadingText}>Finding conversation topics...</Text>
        </Card.Content>
      </Card>
    );
  }

  if (error || updates.length === 0) {
    return null; // Don't show anything if no updates
  }

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.header}>
          <Ionicons name="newspaper-outline" size={20} color="#5856D6" />
          <Text style={styles.headerTitle}>Topics to Talk About</Text>
        </View>
        <Text style={styles.subtitle}>
          Based on interests you share with {contactName}
        </Text>

        {updates.map((update) => (
          <View key={update.interest} style={styles.interestSection}>
            <TouchableOpacity
              style={styles.interestHeader}
              onPress={() => setExpandedInterest(
                expandedInterest === update.interest ? null : update.interest
              )}
            >
              <Chip style={styles.interestChip} textStyle={styles.interestChipText}>
                {update.interest}
              </Chip>
              <Ionicons
                name={expandedInterest === update.interest ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#666"
              />
            </TouchableOpacity>

            {/* Conversation Starters */}
            {update.conversationStarters.length > 0 && (
              <View style={styles.startersContainer}>
                {update.conversationStarters.slice(0, 2).map((starter, index) => (
                  <View key={index} style={styles.starterItem}>
                    <Text style={styles.starterIcon}>💬</Text>
                    <Text style={styles.starterText}>{starter}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Expanded Articles */}
            {expandedInterest === update.interest && update.articles.length > 0 && (
              <View style={styles.articlesContainer}>
                <Text style={styles.articlesTitle}>Recent News</Text>
                {update.articles.map((article, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.articleItem}
                    onPress={() => openArticle(article.url)}
                  >
                    {article.urlToImage && (
                      <Image
                        source={{ uri: article.urlToImage }}
                        style={styles.articleImage}
                      />
                    )}
                    <View style={styles.articleContent}>
                      <Text style={styles.articleTitle} numberOfLines={2}>
                        {article.title}
                      </Text>
                      <Text style={styles.articleSource}>
                        {article.source} • {new Date(article.publishedAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ))}
      </Card.Content>
    </Card>
  );
}

interface TrendingInterestsCardProps {
  onPressInterest?: (interest: string) => void;
}

export function TrendingInterestsCard({ onPressInterest }: TrendingInterestsCardProps) {
  const [trending, setTrending] = useState<{ interest: string; headline: string; url: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTrending();
  }, []);

  const loadTrending = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await interestService.getTrending();
      setTrending(data);
    } catch (err: any) {
      console.error('Failed to load trending:', err);
      setError(err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card style={styles.trendingCard}>
        <Card.Content style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#5856D6" />
          <Text style={styles.loadingText}>Loading trending topics...</Text>
        </Card.Content>
      </Card>
    );
  }

  // Show error state if there was an error
  if (error) {
    return (
      <Card style={styles.trendingCard}>
        <Card.Content>
          <View style={styles.header}>
            <Ionicons name="trending-up" size={20} color="#FF6B6B" />
            <Text style={styles.headerTitle}>Trending in Your Interests</Text>
            <TouchableOpacity onPress={loadTrending} style={styles.refreshButton}>
              <Ionicons name="refresh-outline" size={18} color="#666" />
            </TouchableOpacity>
          </View>
          <View style={styles.emptyContainer}>
            <Ionicons name="alert-circle-outline" size={40} color="#FF6B6B" />
            <Text style={styles.emptyText}>Unable to load trending topics</Text>
            <Text style={styles.emptyHint}>Tap refresh to try again</Text>
          </View>
        </Card.Content>
      </Card>
    );
  }

  // Show helpful message if no trending data
  if (trending.length === 0) {
    return (
      <Card style={styles.trendingCard}>
        <Card.Content>
          <View style={styles.header}>
            <Ionicons name="trending-up" size={20} color="#FF6B6B" />
            <Text style={styles.headerTitle}>Trending in Your Interests</Text>
            <TouchableOpacity onPress={loadTrending} style={styles.refreshButton}>
              <Ionicons name="refresh-outline" size={18} color="#666" />
            </TouchableOpacity>
          </View>
          <View style={styles.emptyContainer}>
            <Ionicons name="newspaper-outline" size={40} color="#ccc" />
            <Text style={styles.emptyText}>
              Add shared interests to your contacts to see trending news and conversation topics here!
            </Text>
            <Text style={styles.emptyHint}>
              Edit a contact → Add interests you share with them
            </Text>
          </View>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card style={styles.trendingCard}>
      <Card.Content>
        <View style={styles.header}>
          <Ionicons name="trending-up" size={20} color="#FF6B6B" />
          <Text style={styles.headerTitle}>Trending in Your Interests</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.trendingScroll}
        >
          {trending.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.trendingItem}
              onPress={() => {
                if (onPressInterest) {
                  onPressInterest(item.interest);
                } else {
                  Linking.openURL(item.url);
                }
              }}
            >
              <Chip style={styles.trendingChip} textStyle={styles.trendingChipText}>
                {item.interest}
              </Chip>
              <Text style={styles.trendingHeadline} numberOfLines={2}>
                {item.headline}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 8,
    color: '#666',
    fontSize: 13,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  interestSection: {
    marginBottom: 12,
  },
  interestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  interestChip: {
    backgroundColor: '#F3E5FF',
  },
  interestChipText: {
    color: '#5856D6',
    fontWeight: '500',
  },
  startersContainer: {
    gap: 8,
  },
  starterItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  starterIcon: {
    fontSize: 14,
  },
  starterText: {
    flex: 1,
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },
  articlesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  articlesTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  articleItem: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 10,
  },
  articleImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  articleContent: {
    flex: 1,
  },
  articleTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1a1a1a',
    lineHeight: 18,
  },
  articleSource: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  trendingCard: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
  },
  trendingScroll: {
    paddingVertical: 8,
    gap: 12,
  },
  trendingItem: {
    width: 180,
    marginRight: 12,
  },
  trendingChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFE5E5',
    marginBottom: 6,
  },
  trendingChipText: {
    color: '#FF6B6B',
    fontSize: 11,
    fontWeight: '500',
  },
  trendingHeadline: {
    fontSize: 12,
    color: '#333',
    lineHeight: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyHint: {
    marginTop: 8,
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  refreshButton: {
    padding: 4,
    marginLeft: 'auto',
  },
});
