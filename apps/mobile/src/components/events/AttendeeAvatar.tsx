import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Text } from 'react-native-paper';
import { RSVPStatus } from '../../services/eventService';

interface AttendeeAvatarProps {
  name: string;
  profileImage?: string | null;
  rsvpStatus: RSVPStatus;
  size?: 'small' | 'medium' | 'large';
  showStatusIndicator?: boolean;
}

const RSVP_COLORS: Record<RSVPStatus, string> = {
  PENDING: '#FF9800',
  CONFIRMED: '#4CAF50',
  DECLINED: '#F44336',
  MAYBE: '#9C27B0',
};

const SIZES = {
  small: { avatar: 32, indicator: 10, fontSize: 12 },
  medium: { avatar: 44, indicator: 14, fontSize: 14 },
  large: { avatar: 56, indicator: 16, fontSize: 18 },
};

export default function AttendeeAvatar({
  name,
  profileImage,
  rsvpStatus,
  size = 'medium',
  showStatusIndicator = true,
}: AttendeeAvatarProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const sizeConfig = SIZES[size];
  const statusColor = RSVP_COLORS[rsvpStatus];

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.avatarContainer,
          {
            width: sizeConfig.avatar,
            height: sizeConfig.avatar,
            borderRadius: sizeConfig.avatar / 2,
          },
        ]}
      >
        {profileImage ? (
          <Image
            source={{ uri: profileImage }}
            style={[
              styles.avatar,
              {
                width: sizeConfig.avatar,
                height: sizeConfig.avatar,
                borderRadius: sizeConfig.avatar / 2,
              },
            ]}
          />
        ) : (
          <View
            style={[
              styles.initialsContainer,
              {
                width: sizeConfig.avatar,
                height: sizeConfig.avatar,
                borderRadius: sizeConfig.avatar / 2,
              },
            ]}
          >
            <Text style={[styles.initials, { fontSize: sizeConfig.fontSize }]}>{initials}</Text>
          </View>
        )}
      </View>

      {showStatusIndicator && (
        <View
          style={[
            styles.statusIndicator,
            {
              width: sizeConfig.indicator,
              height: sizeConfig.indicator,
              borderRadius: sizeConfig.indicator / 2,
              backgroundColor: statusColor,
              borderWidth: sizeConfig.indicator / 5,
            },
          ]}
        />
      )}
    </View>
  );
}

interface AttendeeStackProps {
  attendees: Array<{
    name: string;
    profileImage?: string | null;
    rsvpStatus: RSVPStatus;
  }>;
  maxDisplay?: number;
  size?: 'small' | 'medium' | 'large';
}

export function AttendeeStack({ attendees, maxDisplay = 4, size = 'small' }: AttendeeStackProps) {
  const displayedAttendees = attendees.slice(0, maxDisplay);
  const remainingCount = attendees.length - maxDisplay;
  const sizeConfig = SIZES[size];

  return (
    <View style={styles.stackContainer}>
      {displayedAttendees.map((attendee, index) => (
        <View
          key={index}
          style={[
            styles.stackItem,
            { marginLeft: index === 0 ? 0 : -(sizeConfig.avatar / 3) },
            { zIndex: displayedAttendees.length - index },
          ]}
        >
          <AttendeeAvatar
            name={attendee.name}
            profileImage={attendee.profileImage}
            rsvpStatus={attendee.rsvpStatus}
            size={size}
            showStatusIndicator={false}
          />
        </View>
      ))}
      {remainingCount > 0 && (
        <View
          style={[
            styles.remainingContainer,
            {
              width: sizeConfig.avatar,
              height: sizeConfig.avatar,
              borderRadius: sizeConfig.avatar / 2,
              marginLeft: -(sizeConfig.avatar / 3),
            },
          ]}
        >
          <Text style={[styles.remainingText, { fontSize: sizeConfig.fontSize - 2 }]}>
            +{remainingCount}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  avatarContainer: {
    backgroundColor: '#f0f0f0',
    overflow: 'hidden',
  },
  avatar: {
    resizeMode: 'cover',
  },
  initialsContainer: {
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: '#fff',
    fontWeight: '600',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderColor: '#fff',
  },
  stackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackItem: {
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 50,
  },
  remainingContainer: {
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  remainingText: {
    color: '#666',
    fontWeight: '600',
  },
});
