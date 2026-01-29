import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import {
  TextInput,
  Button,
  Card,
  HelperText,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { authService } from '../../services/authService';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [touched, setTouched] = useState(false);

  const navigation = useNavigation<any>();

  const validateEmail = (email: string): boolean => {
    if (!email.trim()) {
      setEmailError('Email is required');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleSendResetLink = async () => {
    setTouched(true);
    if (!validateEmail(email)) {
      return;
    }

    setIsLoading(true);
    try {
      await authService.sendPasswordResetEmail(email.trim());
      setIsSent(true);
      Alert.alert(
        'Reset Link Sent',
        'Please check your email for password reset instructions.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>
            Forgot Password?
          </Text>
          <Text style={styles.subtitle}>
            Enter your email address and we'll send you a link to reset your password.
          </Text>

          {isSent ? (
            <Card style={styles.successCard}>
              <Card.Content>
                <Text style={styles.successText}>
                  Password reset link has been sent to {email}
                </Text>
              </Card.Content>
            </Card>
          ) : (
            <View style={styles.form}>
              <TextInput
                label="Email"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (touched) validateEmail(text);
                }}
                onBlur={() => {
                  setTouched(true);
                  validateEmail(email);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                error={!!emailError && touched}
                mode="outlined"
                style={styles.input}
                disabled={isLoading}
              />
              {emailError && touched && (
                <HelperText type="error" visible={!!emailError}>
                  {emailError}
                </HelperText>
              )}

              <Button
                mode="contained"
                onPress={handleSendResetLink}
                loading={isLoading}
                disabled={isLoading}
                style={styles.button}
                contentStyle={styles.buttonContent}
              >
                Send Reset Link
              </Button>

              <Button
                mode="text"
                onPress={() => navigation.goBack()}
                disabled={isLoading}
                style={styles.backButton}
              >
                Back to Login
              </Button>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: '#000',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 22,
    color: '#666',
  },
  successCard: {
    marginBottom: 24,
    backgroundColor: '#e8f5e9',
  },
  successText: {
    color: '#2e7d32',
  },
  form: {
    width: '100%',
  },
  input: {
    marginBottom: 8,
  },
  button: {
    marginBottom: 12,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  backButton: {
    marginTop: 8,
  },
});
