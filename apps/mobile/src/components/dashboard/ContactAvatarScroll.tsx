import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  Image,
  Platform,
} from 'react-native';
import { Text } from 'react-native-paper';
import { ContactNeedingAttention } from '../../services/dashboardService';
import { colors, radii, spacing, shadows, typography } from '../../theme/paperTheme';
import { LinearGradient } from 'expo-linear-gradient';

interface ContactAvatarScrollProps {
  contacts: ContactNeedingAttention[];
  onContactPress: (contactId: string) => void;
}

/**
 * Animated tooltip avatar row for contacts needing attention.
 * Inspired by the overlapping avatar tooltip pattern — on hover (web) or press (native),
 * a spring-animated tooltip appears above the avatar showing the contact name and
 * how long since they were last contacted.
 */
export default function ContactAvatarScroll({
  contacts,
  onContactPress,
}: ContactAvatarScrollProps) {
  if (contacts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>All contacts are up to date!</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {contacts.map((contact) => (
          <AnimatedTooltipAvatar
            key={contact.id}
            contact={contact}
            onPress={() => onContactPress(contact.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

// ——— Individual avatar with animated tooltip ———

interface AnimatedTooltipAvatarProps {
  contact: ContactNeedingAttention;
  onPress: () => void;
}

function AnimatedTooltipAvatar({ contact, onPress }: AnimatedTooltipAvatarProps) {
  const [hovered, setHovered] = useState(false);

  // Animated values
  const tooltipOpacity = useRef(new Animated.Value(0)).current;
  const tooltipTranslateY = useRef(new Animated.Value(12)).current;
  const tooltipScale = useRef(new Animated.Value(0.6)).current;
  const avatarScale = useRef(new Animated.Value(1)).current;

  const showTooltip = () => {
    setHovered(true);
    Animated.parallel([
      Animated.spring(tooltipOpacity, {
        toValue: 1,
        useNativeDriver: true,
        tension: 260,
        friction: 10,
      }),
      Animated.spring(tooltipTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 260,
        friction: 10,
      }),
      Animated.spring(tooltipScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 260,
        friction: 10,
      }),
      Animated.spring(avatarScale, {
        toValue: 1.08,
        useNativeDriver: true,
        tension: 200,
        friction: 12,
      }),
    ]).start();
  };

  const hideTooltip = () => {
    Animated.parallel([
      Animated.timing(tooltipOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(tooltipTranslateY, {
        toValue: 12,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(tooltipScale, {
        toValue: 0.6,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.spring(avatarScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 200,
        friction: 12,
      }),
    ]).start(() => setHovered(false));
  };

  const formatTimeSince = (days: number, neverContacted?: boolean): string => {
    if (neverContacted) return 'Never contacted';
    if (days === 0) return 'Last contacted today';
    if (days === 1) return '1 day ago';
    if (days < 7) return `${days} days ago`;
    if (days < 30) {
      const weeks = Math.floor(days / 7);
      return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
    }
    if (days < 365) {
      const months = Math.floor(days / 30);
      return months === 1 ? '1 month ago' : `${months} months ago`;
    }
    const years = Math.floor(days / 365);
    return years === 1 ? '1 year ago' : `${years} years ago`;
  };

  const daysSince = contact.daysSince ?? contact.daysOverdue;
  const timeText = formatTimeSince(daysSince, contact.neverContacted);
  const initials = contact.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // On web, use mouse hover events; on native, use press
  const hoverProps =
    Platform.OS === 'web'
      ? {
          onHoverIn: showTooltip,
          onHoverOut: hideTooltip,
        }
      : {};

  const handlePressIn = Platform.OS !== 'web' ? showTooltip : undefined;
  const handlePressOut = Platform.OS !== 'web' ? hideTooltip : undefined;

  return (
    <View style={styles.avatarWrapper}>
      {/* Animated Tooltip */}
      {hovered && (
        <Animated.View
          style={[
            styles.tooltip,
            {
              opacity: tooltipOpacity,
              transform: [
                { translateY: tooltipTranslateY },
                { scale: tooltipScale },
              ],
            },
          ]}
          pointerEvents="none"
        >
          {/* Gradient accent lines */}
          <View style={styles.gradientLineContainer}>
            <LinearGradient
              colors={['transparent', '#10b981', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientLineShort}
            />
          </View>
          <View style={styles.gradientLineContainer2}>
            <LinearGradient
              colors={['transparent', '#0ea5e9', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientLineLong}
            />
          </View>

          <Text style={styles.tooltipName} numberOfLines={1}>
            {contact.name}
          </Text>
          <Text style={styles.tooltipDesignation} numberOfLines={1}>
            {timeText}
          </Text>

          {/* Arrow */}
          <View style={styles.tooltipArrow} />
        </Animated.View>
      )}

      {/* Avatar */}
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        {...hoverProps}
      >
        <Animated.View
          style={[
            styles.avatarOuter,
            {
              transform: [{ scale: avatarScale }],
            },
            hovered && styles.avatarOuterHovered,
          ]}
        >
          {contact.profileImage ? (
            <Image
              source={{ uri: contact.profileImage }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={styles.avatarInitials}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
        </Animated.View>
      </Pressable>
    </View>
  );
}

// ——— Styles ———

const AVATAR_SIZE = Platform.OS === 'web' ? 80 : 56;
const OVERLAP_MARGIN = Platform.OS === 'web' ? -12 : -10;

const styles = StyleSheet.create({
  container: {
    marginTop: -4,
    marginBottom: spacing.xs,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: colors.textSecondary,
  },

  // Each avatar wrapper has negative margin for overlap
  avatarWrapper: {
    alignItems: 'center',
    marginRight: OVERLAP_MARGIN,
    zIndex: 1,
    overflow: 'visible' as any,
  },

  // Tooltip
  tooltip: {
    position: 'absolute',
    bottom: AVATAR_SIZE + 10,
    alignSelf: 'center',
    backgroundColor: colors.textPrimary,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 120,
    alignItems: 'center',
    zIndex: 50,
    ...shadows.medium,
    overflow: 'hidden',
  },
  tooltipName: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
  },
  tooltipDesignation: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
  tooltipArrow: {
    position: 'absolute',
    bottom: -6,
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.textPrimary,
  },

  // Gradient accent lines at bottom of tooltip
  gradientLineContainer: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    width: '20%',
    height: 1,
  },
  gradientLineContainer2: {
    position: 'absolute',
    bottom: 0,
    left: '15%',
    width: '40%',
    height: 1,
  },
  gradientLineShort: {
    flex: 1,
  },
  gradientLineLong: {
    flex: 1,
  },

  // Avatar outer circle
  avatarOuter: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 2,
    borderColor: colors.background,
    overflow: 'hidden',
    ...shadows.light,
  },
  avatarOuterHovered: {
    zIndex: 30,
    borderColor: colors.primary,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarInitials: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: colors.textSecondary,
    fontSize: Platform.OS === 'web' ? 24 : 18,
    fontWeight: '600',
  },
});
