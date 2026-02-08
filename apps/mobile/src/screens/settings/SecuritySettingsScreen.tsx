import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Text,
  List,
  Switch,
  Divider,
  Card,
  ActivityIndicator,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import biometricService from '../../services/biometricService';
import sessionService from '../../services/sessionService';
import { isDeviceCompromised, getDeviceSecurityInfo } from '../../utils/security';

export default function SecuritySettingsScreen() {
  const navigation = useNavigation();
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('');
  const [logoutOnClose, setLogoutOnClose] = useState(false);
  const [isCompromised, setIsCompromised] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);

      // Check biometric availability
      const available = await biometricService.isAvailable();
      setBiometricAvailable(available);

      if (available) {
        const types = await biometricService.getSupportedTypes();
        const typeName = biometricService.getBiometricTypeName(types);
        setBiometricType(typeName);

        const enabled = await biometricService.isEnabled();
        setBiometricEnabled(enabled);
      }

      // Load session settings
      const logoutEnabled = await sessionService.isLogoutOnCloseEnabled();
      setLogoutOnClose(logoutEnabled);

      // Check device security
      const compromised = await isDeviceCompromised();
      setIsCompromised(compromised.isCompromised);

      // Get device info
      const info = await getDeviceSecurityInfo();
      setDeviceInfo(info);
    } catch (error) {
      console.error('Error loading security settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricToggle = async (enabled: boolean) => {
    if (enabled) {
      // Test biometric authentication before enabling
      const result = await biometricService.authenticate(
        `Enable ${biometricType} for authentication?`
      );

      if (result.success) {
        await biometricService.enable();
        setBiometricEnabled(true);
        Alert.alert('Success', `${biometricType} authentication enabled`);
      } else {
        Alert.alert('Authentication Failed', result.error || 'Could not enable biometric authentication');
      }
    } else {
      await biometricService.disable();
      setBiometricEnabled(false);
      Alert.alert('Disabled', 'Biometric authentication disabled');
    }
  };

  const handleLogoutOnCloseToggle = async (enabled: boolean) => {
    await sessionService.setLogoutOnClose(enabled);
    setLogoutOnClose(enabled);
  };

  const handleTestBiometric = async () => {
    const result = await biometricService.authenticate(
      `Test ${biometricType} authentication`
    );

    if (result.success) {
      Alert.alert('Success', 'Biometric authentication successful');
    } else {
      Alert.alert('Failed', result.error || 'Biometric authentication failed');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading security settings...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Biometric Authentication */}
      {biometricAvailable && (
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Ionicons name="finger-print" size={24} color="#007AFF" />
              <View style={styles.sectionHeaderText}>
                <Text style={styles.sectionTitle}>Biometric Authentication</Text>
                <Text style={styles.sectionSubtitle}>{biometricType}</Text>
              </View>
            </View>

            <List.Item
              title="Enable Biometric Authentication"
              description={`Use ${biometricType} to authenticate sensitive actions`}
              left={(props) => <List.Icon {...props} icon="fingerprint" />}
              right={() => (
                <Switch
                  value={biometricEnabled}
                  onValueChange={handleBiometricToggle}
                />
              )}
            />

            {biometricEnabled && (
              <>
                <Divider style={styles.divider} />
                <TouchableOpacity onPress={handleTestBiometric}>
                  <List.Item
                    title="Test Authentication"
                    description="Verify biometric authentication works"
                    left={(props) => <List.Icon {...props} icon="check-circle" />}
                    right={(props) => <List.Icon {...props} icon="chevron-right" />}
                  />
                </TouchableOpacity>
              </>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Session Management */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Ionicons name="time-outline" size={24} color="#007AFF" />
            <Text style={styles.sectionTitle}>Session Management</Text>
          </View>

          <List.Item
            title="Auto Logout After Inactivity"
            description="Logout automatically after 30 minutes of inactivity"
            left={(props) => <List.Icon {...props} icon="timer-outline" />}
            right={() => <Ionicons name="checkmark-circle" size={24} color="#34C759" />}
          />

          <Divider style={styles.divider} />

          <List.Item
            title="Logout on App Close"
            description="Clear session when app is closed"
            left={(props) => <List.Icon {...props} icon="log-out-outline" />}
            right={() => (
              <Switch value={logoutOnClose} onValueChange={handleLogoutOnCloseToggle} />
            )}
          />
        </Card.Content>
      </Card>

      {/* Device Security */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Ionicons
              name={isCompromised ? 'warning' : 'shield-checkmark'}
              size={24}
              color={isCompromised ? '#FF9500' : '#34C759'}
            />
            <Text style={styles.sectionTitle}>Device Security</Text>
          </View>

          {isCompromised && (
            <View style={styles.warningBox}>
              <Ionicons name="warning" size={20} color="#FF9500" />
              <Text style={styles.warningText}>
                Your device is {deviceInfo?.isCompromised ? 'jailbroken' : 'rooted'}. This may compromise security.
              </Text>
            </View>
          )}

          {deviceInfo && (
            <View style={styles.deviceInfo}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Device:</Text>
                <Text style={styles.infoValue}>
                  {deviceInfo.brand} {deviceInfo.model}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>OS Version:</Text>
                <Text style={styles.infoValue}>{deviceInfo.systemVersion}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Status:</Text>
                <Text
                  style={[
                    styles.infoValue,
                    { color: isCompromised ? '#FF9500' : '#34C759' },
                  ]}
                >
                  {isCompromised ? 'Compromised' : 'Secure'}
                </Text>
              </View>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Security Information */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle-outline" size={24} color="#666" />
            <Text style={styles.sectionTitle}>Security Features</Text>
          </View>

          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#34C759" />
              <Text style={styles.featureText}>Secure token storage</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#34C759" />
              <Text style={styles.featureText}>Automatic token refresh</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#34C759" />
              <Text style={styles.featureText}>Session timeout protection</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#34C759" />
              <Text style={styles.featureText}>Encrypted data storage</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
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
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  divider: {
    marginVertical: 8,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#FF9500',
    lineHeight: 18,
  },
  deviceInfo: {
    marginTop: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  featureList: {
    marginTop: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#666',
  },
});
