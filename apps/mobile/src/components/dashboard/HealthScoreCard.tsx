import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';

interface HealthScoreCardProps {
  score: number;
  trend: number;
  onPress?: () => void;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function HealthScoreCard({ score, trend, onPress }: HealthScoreCardProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const size = 120;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: score / 100,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [score]);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#4CAF50';
    if (score >= 60) return '#FFB300';
    if (score >= 40) return '#FF9800';
    return '#F44336';
  };

  const getTrendIcon = () => {
    if (trend > 0) return 'trending-up';
    if (trend < 0) return 'trending-down';
    return 'remove';
  };

  const getTrendColor = () => {
    if (trend > 0) return '#4CAF50';
    if (trend < 0) return '#F44336';
    return '#666';
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Health Score</Text>
        <View style={[styles.trendBadge, { backgroundColor: getTrendColor() + '20' }]}>
          <Ionicons
            name={getTrendIcon()}
            size={14}
            color={getTrendColor()}
          />
          <Text style={[styles.trendText, { color: getTrendColor() }]}>
            {trend > 0 ? '+' : ''}{trend}
          </Text>
        </View>
      </View>

      <View style={styles.scoreContainer}>
        <View style={styles.circleContainer}>
          <Svg width={size} height={size} style={styles.svg}>
            {/* Background circle */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#E0E0E0"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Animated progress circle */}
            <AnimatedCircle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={getScoreColor(score)}
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </Svg>
          <View style={styles.scoreTextContainer}>
            <Text style={[styles.scoreText, { color: getScoreColor(score) }]}>
              {score}
            </Text>
            <Text style={styles.scoreLabel}>/ 100</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Ionicons name="information-circle-outline" size={16} color="#666" />
        <Text style={styles.footerText}>Tap for details</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scoreContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  circleContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
  },
  scoreTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontSize: 36,
    fontWeight: '700',
  },
  scoreLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: -4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 6,
  },
  footerText: {
    fontSize: 12,
    color: '#666',
  },
});
