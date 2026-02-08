import React, { useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { Text, ActivityIndicator, Avatar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { useInsights, useHealthScoreHistory } from '../../hooks/useDashboard';
import { useAuth } from '../../hooks/useAuth';
import { colors, shadows, radii, spacing, typography } from '../../theme/paperTheme';

const screenWidth = Dimensions.get('window').width;
const cardWidth = (screenWidth - spacing.lg * 2 - spacing.md) / 2;

export default function InsightsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { data: insightsData, isLoading, refetch, isRefetching } = useInsights();
  const { data: healthScoreHistory } = useHealthScoreHistory(30);

  const handleRefresh = () => { refetch(); };

  const chartConfig = {
    backgroundColor: '#FFFFFF',
    backgroundGradientFrom: '#FFFFFF',
    backgroundGradientTo: '#FFFFFF',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: { borderRadius: radii.lg },
    propsForDots: { r: '4', strokeWidth: '2', stroke: colors.primary },
  };

  const communicationTrendsData = useMemo(() => {
    if (!insightsData) return null;
    return {
      labels: ['Last Week', 'This Week', 'Last Month', 'This Month'],
      datasets: [{
        data: [
          insightsData.communicationTrends.lastWeek,
          insightsData.communicationTrends.thisWeek,
          insightsData.communicationTrends.lastMonth,
          insightsData.communicationTrends.thisMonth,
        ],
      }],
    };
  }, [insightsData]);

  const tierDistributionData = useMemo(() => {
    if (!insightsData) return [];
    const tierColors: Record<string, string> = {
      INNER_CIRCLE: colors.tierInnerCircle,
      CLOSE_FRIENDS: colors.tierCloseFriends,
      FRIENDS: colors.tierFriends,
      ACQUAINTANCES: colors.tierAcquaintances,
      PROFESSIONAL: colors.tierProfessional,
    };
    return Object.entries(insightsData.tierDistribution)
      .filter(([_, count]) => count > 0)
      .map(([tier, count]) => ({
        name: tier.replace('_', ' '),
        count: count as number,
        color: tierColors[tier] || colors.textSecondary,
        legendFontColor: colors.textSecondary,
        legendFontSize: 10,
      }));
  }, [insightsData]);

  const healthScoreChartData = useMemo(() => {
    if (!healthScoreHistory?.history || healthScoreHistory.history.length === 0) return null;
    const history = healthScoreHistory.history;
    const labels = history.map((_, index) => {
      if (index === 0 || index === history.length - 1) {
        return new Date(history[index].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
      return '';
    });
    const scores = history.map((item) => item.score ?? 0);
    if (scores.length === 0) return null;
    return { labels, datasets: [{ data: scores }] };
  }, [healthScoreHistory]);

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading insights...</Text>
      </View>
    );
  }

  const data = insightsData || {
    communicationTrends: { thisWeek: 0, lastWeek: 0, thisMonth: 0, lastMonth: 0, byType: { call: 0, text: 0, inPerson: 0 } },
    tierDistribution: {},
    topContacts: [],
    neglectedTiers: [],
    averageHealthScore: 0,
    healthScoreHistory: [],
  };

  const trendDelta = data.communicationTrends.thisMonth - data.communicationTrends.lastMonth;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* 2x2 Grid */}
      <View style={styles.grid}>
        {/* Health Score Card */}
        <View style={styles.gridCard}>
          <Text style={styles.gridCardTitle}>Health Score</Text>
          <Text style={styles.bigScore}>{data.averageHealthScore}/100</Text>
          {healthScoreChartData && (
            <LineChart
              data={healthScoreChartData}
              width={cardWidth - spacing.xl}
              height={80}
              chartConfig={{ ...chartConfig, color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})` }}
              bezier
              withInnerLines={false}
              withOuterLines={false}
              withVerticalLabels={false}
              withHorizontalLabels={false}
              withDots={false}
              style={{ marginLeft: -spacing.lg }}
            />
          )}
          <View style={styles.trendRow}>
            <Ionicons
              name={trendDelta >= 0 ? 'trending-up' : 'trending-down'}
              size={14}
              color={trendDelta >= 0 ? colors.success : colors.error}
            />
            <Text style={[styles.trendText, { color: trendDelta >= 0 ? colors.success : colors.error }]}>
              {trendDelta >= 0 ? '+' : ''}{trendDelta > 0 ? `${Math.round((trendDelta / Math.max(data.communicationTrends.lastMonth, 1)) * 100)}%` : '0%'} vs last month
            </Text>
          </View>
        </View>

        {/* Communication Trends Card */}
        <View style={styles.gridCard}>
          <Text style={styles.gridCardTitle}>Communication Trends</Text>
          <View style={styles.barChartContainer}>
            <View style={styles.barRow}>
              <View style={[styles.bar, { width: '70%', backgroundColor: colors.secondary }]} />
              <View style={[styles.bar, { width: '50%', backgroundColor: colors.success }]} />
            </View>
            <View style={styles.barRow}>
              <View style={[styles.bar, { width: '60%', backgroundColor: colors.secondary }]} />
              <View style={[styles.bar, { width: '45%', backgroundColor: colors.success }]} />
            </View>
          </View>
          <View style={styles.commStats}>
            <View style={styles.commStatRow}>
              <Ionicons name="call-outline" size={14} color={colors.primary} />
              <Text style={styles.commStatText}>{data.communicationTrends.byType.call} calls</Text>
            </View>
            <View style={styles.commStatRow}>
              <Ionicons name="chatbubble-outline" size={14} color={colors.success} />
              <Text style={styles.commStatText}>{data.communicationTrends.byType.text} texts</Text>
            </View>
            <View style={styles.commStatRow}>
              <Ionicons name="people-outline" size={14} color={colors.warning} />
              <Text style={styles.commStatText}>{data.communicationTrends.byType.inPerson} in-person</Text>
            </View>
          </View>
        </View>

        {/* Tier Distribution Card */}
        <View style={styles.gridCard}>
          <Text style={styles.gridCardTitle}>Relationship Tiers</Text>
          {tierDistributionData.length > 0 ? (
            <PieChart
              data={tierDistributionData}
              width={cardWidth - spacing.xl}
              height={100}
              chartConfig={chartConfig}
              accessor="count"
              backgroundColor="transparent"
              paddingLeft="-10"
              hasLegend={false}
              style={{ marginLeft: -spacing.sm }}
            />
          ) : (
            <Text style={styles.noDataText}>No data yet</Text>
          )}
          <View style={styles.legendContainer}>
            {tierDistributionData.map((item) => (
              <View key={item.name} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                <Text style={styles.legendText}>{item.count} {item.name}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Top Contacts Card */}
        <View style={styles.gridCard}>
          <Text style={styles.gridCardTitle}>Top Contacts</Text>
          {data.topContacts.length > 0 ? (
            data.topContacts.slice(0, 3).map((contact, index) => (
              <View key={contact.id} style={styles.topContactRow}>
                <Avatar.Text
                  size={28}
                  label={contact.name.charAt(0).toUpperCase()}
                  style={{ backgroundColor: colors.surface }}
                  labelStyle={{ color: colors.textSecondary, fontWeight: '600' }}
                />
                <View style={styles.topContactInfo}>
                  <Text style={styles.topContactName} numberOfLines={1}>{contact.name}</Text>
                  <Text style={styles.topContactCount}>({contact.interactionCount} interactions)</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>No interactions yet</Text>
          )}
        </View>
      </View>

      {/* Needs Attention Card */}
      {data.neglectedTiers.length > 0 && (
        <View style={styles.attentionCard}>
          <Text style={styles.attentionTitle}>Needs Attention</Text>
          <Text style={styles.attentionText}>
            {data.topContacts.length > 0 ? `${data.neglectedTiers.length} tier(s)` : 'Some contacts'} haven't been reached in 3+ weeks
          </Text>
          <TouchableOpacity>
            <Text style={styles.viewListText}>View List</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: spacing['2xl'] }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  loadingText: { marginTop: spacing.md, ...typography.bodySmall, color: colors.textSecondary },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  gridCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.lg,
    padding: spacing.lg,
    width: cardWidth,
    ...shadows.light,
  },
  gridCardTitle: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  bigScore: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.4,
    marginBottom: spacing.xs,
  },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  trendText: { ...typography.overline, fontWeight: '600' },
  barChartContainer: { gap: spacing.sm, marginBottom: spacing.sm },
  barRow: { gap: spacing.xs },
  bar: { height: 8, borderRadius: radii.sm },
  commStats: { gap: spacing.xs },
  commStatRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  commStatText: { ...typography.overline, color: colors.textSecondary },
  legendContainer: { gap: spacing.xs, marginTop: spacing.xs },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  legendDot: { width: 8, height: 8, borderRadius: radii.full },
  legendText: { fontSize: 10, color: colors.textSecondary },
  topContactRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  topContactInfo: { flex: 1 },
  topContactName: { ...typography.caption, fontWeight: '600', color: colors.textPrimary },
  topContactCount: { ...typography.overline, color: colors.textSecondary },
  noDataText: { ...typography.captionSmall, color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.lg },
  attentionCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.light,
    borderTopWidth: 3,
    borderTopColor: colors.warning,
  },
  attentionTitle: { ...typography.h4, color: colors.textPrimary, marginBottom: spacing.sm },
  attentionText: { ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.sm },
  viewListText: { ...typography.bodySmall, fontWeight: '600', color: colors.primary },
});
