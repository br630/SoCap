import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, shadows, radii, spacing } from '../../theme/paperTheme';

interface HealthScoreCardProps {
  score: number;
  trend: number;
  onPress?: () => void;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function HealthScoreCard({ score, trend, onPress }: HealthScoreCardProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const size = 120;
  const strokeWidth = 10;
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

  const getStatusMessage = (score: number) => {
    if (score >= 80) return 'Your relationships are thriving!';
    if (score >= 60) return 'Your relationships are doing well';
    if (score >= 40) return 'Some relationships need attention';
    return 'Time to reconnect with your network';
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={styles.cardWrapper}
    >
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <Text style={styles.title}>Relationship Health</Text>

        <View style={styles.scoreContainer}>
          <View style={styles.circleContainer}>
            <Svg width={size} height={size}>
              {/* Background circle */}
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="rgba(255,255,255,0.2)"
                strokeWidth={strokeWidth}
                fill="transparent"
              />
              {/* Progress circle */}
              <AnimatedCircle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="#FFFFFF"
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            </Svg>
            <View style={styles.scoreTextContainer}>
              <Text style={styles.scoreText}>{score}/100</Text>
              {trend !== 0 && (
                <View style={styles.trendBadge}>
                  <Ionicons
                    name={trend > 0 ? 'arrow-up' : 'arrow-down'}
                    size={10}
                    color="#FFFFFF"
                  />
                  <Text style={styles.trendText}>
                    {trend > 0 ? '+' : ''}{trend} this week
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <Text style={styles.statusMessage}>{getStatusMessage(score)}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    borderRadius: radii.xl,
    ...shadows.medium,
  },
  card: {
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: -0.2,
    marginBottom: spacing.lg,
  },
  scoreContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.sm,
  },
  circleContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 120,
    height: 120,
  },
  scoreTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
    marginTop: spacing.xs,
    gap: 2,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusMessage: {
    fontSize: 15,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: -0.2,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
