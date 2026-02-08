import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../hooks/useAuth';
import authService from '../../services/authService';
import { AutoSyncSettings } from '../../components/settings';
import { colors, shadows, radii, spacing, typography } from '../../theme/paperTheme';

const settingsItems = [
  { key: 'notifications', label: 'Notification Settings', icon: 'notifications-outline' as const, screen: 'NotificationPreferences' },
  { key: 'calendar', label: 'Calendar Settings', icon: 'calendar-outline' as const, screen: 'CalendarSettings' },
  { key: 'security', label: 'Security Settings', icon: 'lock-closed-outline' as const, screen: 'SecuritySettings' },
  { key: 'insights', label: 'Insights & Analytics', icon: 'bar-chart-outline' as const, screen: 'Insights' },
];

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [bio, setBio] = useState('');
  const [profileImage, setProfileImage] = useState<string | undefined>(undefined);
  const [isEditingBio, setIsEditingBio] = useState(false);

  // Track if there are unsaved changes
  const [hasImageChanged, setHasImageChanged] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  // Refresh profile on focus
  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  // Sync local state when user data changes
  useEffect(() => {
    if (user) {
      setBio(user.bio || '');
      setProfileImage(user.profileImage || undefined);
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const profileData = await authService.getProfile();
      setProfile(profileData);
      if (profileData.user) {
        setBio(profileData.user.bio || '');
        setProfileImage(profileData.user.profileImage || undefined);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library to set a profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: Platform.OS === 'web',
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        let imageUri: string;

        if (Platform.OS === 'web' && asset.base64) {
          const mimeType = asset.mimeType || 'image/jpeg';
          imageUri = `data:${mimeType};base64,${asset.base64}`;
        } else {
          imageUri = asset.uri;
        }

        setProfileImage(imageUri);
        setHasImageChanged(true);

        // Save immediately
        await saveProfileUpdate({ profileImage: imageUri });
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const removeImage = async () => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove your profile photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setProfileImage(undefined);
            setHasImageChanged(true);
            await saveProfileUpdate({ profileImage: '' });
          },
        },
      ]
    );
  };

  const saveBio = async () => {
    setIsEditingBio(false);
    await saveProfileUpdate({ bio: bio.trim() });
  };

  const saveProfileUpdate = async (data: { profileImage?: string; bio?: string }) => {
    try {
      setSaving(true);
      await authService.updateProfile(data);
      await refreshUser();
    } catch (error) {
      console.error('Failed to update profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
      // Revert local state on error
      if (data.profileImage !== undefined) {
        setProfileImage(user?.profileImage || undefined);
      }
      if (data.bio !== undefined) {
        setBio(user?.bio || '');
      }
    } finally {
      setSaving(false);
      setHasImageChanged(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const initials = (user?.firstName?.charAt(0) || 'U').toUpperCase() + (user?.lastName?.charAt(0) || '').toUpperCase();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header with Profile Picture */}
      <View style={styles.header}>
        {/* Profile Picture */}
        <TouchableOpacity style={styles.avatarContainer} onPress={pickImage} activeOpacity={0.7}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
          {/* Camera badge */}
          <View style={styles.cameraBadge}>
            <Ionicons name="camera" size={14} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          {user?.isVerified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.verifiedText}>Verified Account</Text>
            </View>
          )}
        </View>
      </View>

      {/* Remove photo button (only if image exists) */}
      {profileImage && (
        <TouchableOpacity style={styles.removePhotoButton} onPress={removeImage} activeOpacity={0.6}>
          <Ionicons name="trash-outline" size={16} color={colors.error} />
          <Text style={styles.removePhotoText}>Remove Photo</Text>
        </TouchableOpacity>
      )}

      {/* Bio Section */}
      <View style={styles.bioCard}>
        <View style={styles.bioHeader}>
          <Text style={styles.bioLabel}>Bio</Text>
          {!isEditingBio ? (
            <TouchableOpacity onPress={() => setIsEditingBio(true)} activeOpacity={0.6}>
              <Ionicons name="pencil-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={saveBio} activeOpacity={0.6}>
              <Text style={styles.saveBioText}>{saving ? 'Saving...' : 'Save'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {isEditingBio ? (
          <View>
            <TextInput
              style={styles.bioInput}
              value={bio}
              onChangeText={setBio}
              placeholder="Write a short bio about yourself..."
              placeholderTextColor={colors.textSecondary}
              multiline
              maxLength={500}
              autoFocus
            />
            <Text style={styles.charCount}>{bio.length}/500</Text>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setIsEditingBio(true)} activeOpacity={0.8}>
            <Text style={bio ? styles.bioText : styles.bioPlaceholder}>
              {bio || 'Tap to add a bio...'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Stats — Standard Card */}
      {profile?.stats && (
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{profile.stats.contacts || profile.stats.totalContacts || 0}</Text>
            <Text style={styles.statLabel}>Contacts</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{profile.stats.events || profile.stats.totalEvents || 0}</Text>
            <Text style={styles.statLabel}>Events</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{profile.stats.relationships || profile.stats.totalRelationships || 0}</Text>
            <Text style={styles.statLabel}>Relationships</Text>
          </View>
        </View>
      )}

      {/* Auto-Sync Settings */}
      <AutoSyncSettings />

      {/* Settings Menu — Standard Card */}
      <View style={styles.menuCard}>
        {settingsItems.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={styles.menuItem}
            onPress={() => navigation.navigate(item.screen as never)}
            activeOpacity={0.6}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name={item.icon} size={24} color={colors.textSecondary} />
              <Text style={styles.menuItemText}>{item.label}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        ))}

        {/* Writing Style — Accent style with secondary color */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('WritingStyle' as never)}
          activeOpacity={0.6}
        >
          <View style={styles.menuItemLeft}>
            <Ionicons name="pencil-outline" size={24} color={colors.secondary} />
            <Text style={[styles.menuItemText, { color: colors.secondary }]}>My Writing Style</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Refresh & Logout */}
      <TouchableOpacity style={styles.refreshButton} onPress={loadProfile} activeOpacity={0.6}>
        <Text style={styles.refreshText}>Refresh Profile</Text>
      </TouchableOpacity>

      <LogoutButton />

      <View style={{ height: spacing['3xl'] }} />
    </ScrollView>
  );
}

// Separate component to properly use useAuth hook
function LogoutButton() {
  const { signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  return (
    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7}>
      <Text style={styles.logoutText}>Logout</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    marginBottom: spacing.xs,
  },
  // Avatar container with camera badge
  avatarContainer: {
    position: 'relative',
    marginRight: spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    ...shadows.light,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: radii.full,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    ...shadows.light,
  },
  avatarText: { color: colors.textSecondary, fontSize: 28, fontWeight: '600' },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  headerInfo: { flex: 1 },
  name: { ...typography.h4, color: colors.textPrimary, marginBottom: spacing.xs },
  email: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.sm },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  verifiedText: { ...typography.caption, color: colors.success, fontWeight: '600' },

  // Remove photo
  removePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    backgroundColor: '#FFFFFF',
    marginBottom: spacing.md,
  },
  removePhotoText: {
    ...typography.caption,
    color: colors.error,
    fontWeight: '600',
  },

  // Bio card
  bioCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: spacing.lg,
    borderRadius: radii.lg,
    padding: spacing.lg,
    ...shadows.light,
    marginBottom: spacing.lg,
  },
  bioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  bioLabel: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  saveBioText: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.primary,
  },
  bioInput: {
    ...typography.body,
    color: colors.textPrimary,
    minHeight: 80,
    maxHeight: 150,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    backgroundColor: colors.background,
  },
  charCount: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  bioText: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  bioPlaceholder: {
    ...typography.body,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },

  // Stats
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: spacing.lg,
    borderRadius: radii.lg,
    paddingVertical: spacing.xl,
    ...shadows.light,
    marginBottom: spacing.lg,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 24, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.xs },
  statLabel: { ...typography.caption, color: colors.textSecondary },
  statDivider: { width: 1, backgroundColor: colors.border, marginVertical: spacing.xs },

  // Menu
  menuCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: spacing.lg,
    borderRadius: radii.lg,
    ...shadows.light,
    marginBottom: spacing.xl,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: 44,
  },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  menuItemText: { ...typography.bodySmall, fontWeight: '500', color: colors.textPrimary },

  // Actions
  refreshButton: { alignItems: 'center', paddingVertical: spacing.lg },
  refreshText: { ...typography.bodySmall, fontWeight: '600', color: colors.textSecondary },
  logoutButton: {
    backgroundColor: colors.error + '15',
    marginHorizontal: spacing.lg,
    height: 50,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  logoutText: { ...typography.body, fontWeight: '600', color: colors.error },
});
