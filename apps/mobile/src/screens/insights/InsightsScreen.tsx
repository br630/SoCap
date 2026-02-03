import React, { useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Text, Card, ActivityIndicator, Avatar, Chip } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { useInsights, useHealthScoreHistory } from '../../hooks/useDashboard';
import { useAuth } from '../../hooks/useAuth';

const screenWidth = Dimensions.get('window').width;

export default function InsightsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { data: insightsData, isLoading, refetch, isRefetching } = useInsights();
  const { data: healthScoreHistory } = useHealthScoreHistory(30);

  const handleRefresh = () => {
    refetch();
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#007AFF',
    },
  };

  // Prepare communication trends chart data
  const communicationTrendsData = useMemo(() => {
    if (!insightsData) return null;

    return {
      labels: ['Last Week', 'This Week', 'Last Month', 'This Month'],
      datasets: [
        {
          data: [
            insightsData.communicationTrends.lastWeek,
            insightsData.communicationTrends.thisWeek,
            insightsData.communicationTrends.lastMonth,
            insightsData.communicationTrends.thisMonth,
          ],
        },
      ],
    };
  }, [insightsData]);

  // Prepare tier distribution pie chart data
  const tierDistributionData = useMemo(() => {
    if (!insightsData) return [];

    const colors = {
      INNER_CIRCLE: '#4CAF50',
      CLOSE_FRIENDS: '#2196F3',
      FRIENDS: '#FF9800',
      ACQUAINTANCES: '#9E9E9E',
      PROFESSIONAL: '#9C27B0',
    };

    return Object.entries(insightsData.tierDistribution)
      .filter(([_, count]) => count > 0)
      .map(([tier, count]) => ({
        name: tier.replace('_', ' '),
        count: count as number,
        color: colors[tier as keyof typeof colors] || '#666',
        legendFontColor: '#333',
        legendFontSize: 12,
      }));
  }, [insightsData]);

  // Prepare health score history chart data
  const healthScoreChartData = useMemo(() => {
    if (!healthScoreHistory?.history) return null;

    const history = healthScoreHistory.history;
    const labels = history.map((_, index) => {
      if (index === 0 || index === history.length - 1) {
        return new Date(history[index].date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
      }
      return '';
    });

    return {
      labels,
      datasets: [
        {
          data: history.map((item) => item.score),
        },
      ],
    };
  }, [healthScoreHistory]);

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading insights...</Text>
      </View>
    );
  }

  const data = insightsData || {
    communicationTrends: {
      thisWeek: 0,
      lastWeek: 0,
      thisMonth: 0,
      lastMonth: 0,
      byType: { call: 0, text: 0, inPerson: 0 },
    },
    tierDistribution: {},
    topContacts: [],
    neglectedTiers: [],
    averageHealthScore: 0,
    healthScoreHistory: [],
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Insights & Analytics</Text>
        <Text style={styles.headerSubtitle}>
          Track your relationship health and communication patterns
        </Text>
      </View>

      {/* Health Score Summary */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.healthScoreHeader}>
            <Text style={styles.cardTitle}>Health Score</Text>
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreText}>{data.averageHealthScore}</Text>
              <Text style={styles.scoreLabel}>/ 100</Text>
            </View>
          </View>
          {healthScoreChartData && (
            <LineChart
              data={healthScoreChartData}
              width={screenWidth - 64}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              withInnerLines={false}
              withOuterLines={false}
              withVerticalLabels={true}
              withHorizontalLabels={true}
            />
          )}
        </Card.Content>
      </Card>

      {/* Communication Trends */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>Communication Trends</Text>
          {communicationTrendsData && (
            <LineChart
              data={communicationTrendsData}
              width={screenWidth - 64}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              withInnerLines={false}
              withOuterLines={false}
            />
          )}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="call-outline" size={20} color="#007AFF" />
              <Text style={styles.statValue}>{data.communicationTrends.byType.call}</Text>
              <Text style={styles.statLabel}>Calls</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="chatbubble-outline" size={20} color="#4CAF50" />
              <Text style={styles.statValue}>{data.communicationTrends.byType.text}</Text>
              <Text style={styles.statLabel}>Texts</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="people-outline" size={20} color="#FF9800" />
              <Text style={styles.statValue}>
                {data.communicationTrends.byType.inPerson}
              </Text>
              <Text style={styles.statLabel}>In Person</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Tier Distribution */}
      {tierDistributionData.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Tier Distribution</Text>
            <PieChart
              data={tierDistributionData}
              width={screenWidth - 64}
              height={220}
              chartConfig={chartConfig}
              accessor="count"
              backgroundColor="transparent"
              paddingLeft="15"
              style={styles.chart}
            />
          </Card.Content>
        </Card>
      )}

      {/* Monthly Comparison */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>Monthly Comparison</Text>
          <View style={styles.comparisonRow}>
            <View style={styles.comparisonItem}>
              <Text style={styles.comparisonLabel}>Last Month</Text>
              <Text style={styles.comparisonValue}>
                {data.communicationTrends.lastMonth}
              </Text>
              <Text style={styles.comparisonSubtext}>interactions</Text>
            </View>
            <View style={styles.comparisonDivider} />
            <View style={styles.comparisonItem}>
              <Text style={styles.comparisonLabel}>This Month</Text>
              <Text style={[styles.comparisonValue, styles.comparisonValueHighlight]}>
                {data.communicationTrends.thisMonth}
              </Text>
              <Text style={styles.comparisonSubtext}>interactions</Text>
            </View>
          </View>
          <View style={styles.trendIndicator}>
            {data.communicationTrends.thisMonth >=
            data.communicationTrends.lastMonth ? (
              <>
                <Ionicons name="trending-up" size={20} color="#4CAF50" />
                <Text style={styles.trendText}>
                  {data.communicationTrends.thisMonth -
                    data.communicationTrends.lastMonth}{' '}
                  more than last month
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="trending-down" size={20} color="#F44336" />
                <Text style={styles.trendText}>
                  {data.communicationTrends.lastMonth -
                    data.communicationTrends.thisMonth}{' '}
                  fewer than last month
                </Text>
              </>
            )}
          </View>
        </Card.Content>
      </Card>

      {/* Top Contacts */}
      {data.topContacts.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Most Contacted This Month</Text>
            {data.topContacts.map((contact, index) => (
              <View key={contact.id} style={styles.contactRow}>
                <View style={styles.contactLeft}>
                  <Text style={styles.rankNumber}>{index + 1}</Text>
                  {contact.profileImage ? (
                    <Avatar.Image size={40} source={{ uri: contact.profileImage }} />
                  ) : (
                    <Avatar.Text
                      size={40}
                      label={contact.name.charAt(0).toUpperCase()}
                    />
                  )}
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    <Chip
                      mode="flat"
                      compact
                      style={styles.tierChip}
                      textStyle={styles.tierChipText}
                    >
                      {contact.tier.replace('_', ' ')}
                    </Chip>
                  </View>
                </View>
                <View style={styles.interactionCount}>
                  <Text style={styles.interactionCountText}>
                    {contact.interactionCount}
                  </Text>
                  <Text style={styles.interactionCountLabel}>times</Text>
                </View>
              </View>
            ))}
          </Card.Content>
        </Card>
      )}

      {/* Neglected Tiers Warning */}
      {data.neglectedTiers.length > 0 && (
        <Card style={[styles.card, styles.warningCard]}>
          <Card.Content>
            <View style={styles.warningHeader}>
              <Ionicons name="warning-outline" size={24} color="#FF9800" />
              <Text style={styles.warningTitle}>Tiers Needing Attention</Text>
            </View>
            <Text style={styles.warningText}>
              These relationship tiers have low engagement this month:
            </Text>
            <View style={styles.neglectedTiersContainer}>
              {data.neglectedTiers.map((tier) => (
                <Chip
                  key={tier}
                  mode="outlined"
                  style={styles.neglectedTierChip}
                  textStyle={styles.neglectedTierChipText}
                >
                  {tier.replace('_', ' ')}
                </Chip>
              ))}
            </View>
          </Card.Content>
        </Card>
      )}
    </ScrollView>
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
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  healthScoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  scoreText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#007AFF',
  },
  scoreLabel: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 16,
  },
  comparisonItem: {
    alignItems: 'center',
    flex: 1,
  },
  comparisonDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
  },
  comparisonLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  comparisonValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  comparisonValueHighlight: {
    color: '#007AFF',
  },
  comparisonSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  trendIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 6,
  },
  trendText: {
    fontSize: 14,
    color: '#666',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  contactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  rankNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
    width: 24,
    textAlign: 'center',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  tierChip: {
    height: 24,
    alignSelf: 'flex-start',
  },
  tierChipText: {
    fontSize: 11,
  },
  interactionCount: {
    alignItems: 'center',
  },
  interactionCountText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#007AFF',
  },
  interactionCountLabel: {
    fontSize: 11,
    color: '#666',
  },
  warningCard: {
    backgroundColor: '#FFF3E0',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  warningText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  neglectedTiersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  neglectedTierChip: {
    borderColor: '#FF9800',
  },
  neglectedTierChipText: {
    color: '#FF9800',
    fontSize: 12,
  },
});
