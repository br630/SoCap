import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { isDeviceCompromised } from '../../utils/security';

interface JailbreakWarningProps {
  onContinue?: () => void;
  onExit?: () => void;
  allowContinue?: boolean; // If false, user must exit
}

export default function JailbreakWarning({
  onContinue,
  onExit,
  allowContinue = true,
}: JailbreakWarningProps) {
  const [visible, setVisible] = useState(false);
  const [isCompromised, setIsCompromised] = useState(false);

  useEffect(() => {
    checkDeviceSecurity();
  }, []);

  const checkDeviceSecurity = async () => {
    const result = await isDeviceCompromised();
    setIsCompromised(result.isCompromised);
    setVisible(result.isCompromised);
  };

  const handleContinue = () => {
    setVisible(false);
    onContinue?.();
  };

  const handleExit = () => {
    setVisible(false);
    onExit?.();
  };

  if (!isCompromised) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={allowContinue ? handleContinue : handleExit}
    >
      <View style={styles.overlay}>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.iconContainer}>
              <Ionicons name="warning" size={48} color="#FF9500" />
            </View>

            <Text style={styles.title}>Security Warning</Text>
            <Text style={styles.message}>
              Your device appears to be {require('react-native-device-info').default.getSystemName() === 'iOS' ? 'jailbroken' : 'rooted'}. This compromises the security of your device and may put your data at risk.
            </Text>

            <Text style={styles.warning}>
              We recommend using a secure, unmodified device to access this app.
            </Text>

            <View style={styles.actions}>
              {allowContinue ? (
                <>
                  <Button
                    mode="outlined"
                    onPress={handleContinue}
                    style={styles.button}
                  >
                    Continue Anyway
                  </Button>
                  <Button
                    mode="contained"
                    onPress={handleExit}
                    style={styles.button}
                    buttonColor="#FF3B30"
                  >
                    Exit App
                  </Button>
                </>
              ) : (
                <Button
                  mode="contained"
                  onPress={handleExit}
                  style={styles.button}
                  buttonColor="#FF3B30"
                >
                  Exit App
                </Button>
              )}
            </View>
          </Card.Content>
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
  },
  warning: {
    fontSize: 13,
    color: '#FF9500',
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '600',
  },
  actions: {
    gap: 12,
  },
  button: {
    borderRadius: 8,
  },
});
