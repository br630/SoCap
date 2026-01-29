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
  Divider,
  HelperText,
} from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';
import { useNavigation } from '@react-navigation/native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });

  const { signIn, signInWithGoogle, signInWithApple, isLoading, error, clearError } = useAuth();
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

  const validatePassword = (password: string): boolean => {
    if (!password) {
      setPasswordError('Password is required');
      return false;
    }
    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleLogin = async () => {
    clearError();
    setTouched({ email: true, password: true });
    
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    try {
      await signIn(email, password);
    } catch (err: any) {
      Alert.alert('Login Failed', err.message || 'An error occurred during login');
    }
  };

  const handleGoogleLogin = async () => {
    clearError();
    try {
      await signInWithGoogle();
    } catch (err: any) {
      Alert.alert('Google Login Failed', err.message || 'An error occurred during Google login');
    }
  };

  const handleAppleLogin = async () => {
    clearError();
    try {
      await signInWithApple();
    } catch (err: any) {
      Alert.alert('Apple Login Failed', err.message || 'An error occurred during Apple login');
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
            Welcome Back
          </Text>
          <Text style={styles.subtitle}>
            Sign in to continue
          </Text>

          {error && (
            <Card style={styles.errorCard}>
              <Card.Content>
                <Text style={styles.errorText}>
                  {error}
                </Text>
              </Card.Content>
            </Card>
          )}

          <View style={styles.form}>
            <TextInput
              label="Email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (touched.email) validateEmail(text);
              }}
              onBlur={() => {
                setTouched({ ...touched, email: true });
                validateEmail(email);
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              error={!!emailError}
              mode="outlined"
              style={styles.input}
              disabled={isLoading}
            />
            {emailError && touched.email && (
              <HelperText type="error" visible={!!emailError}>
                {emailError}
              </HelperText>
            )}

            <TextInput
              label="Password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (touched.password) validatePassword(text);
              }}
              onBlur={() => {
                setTouched({ ...touched, password: true });
                validatePassword(password);
              }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              error={!!passwordError}
              mode="outlined"
              style={styles.input}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
              disabled={isLoading}
            />
            {passwordError && touched.password && (
              <HelperText type="error" visible={!!passwordError}>
                {passwordError}
              </HelperText>
            )}

            <Button
              mode="text"
              onPress={() => navigation.navigate('ForgotPassword')}
              style={styles.forgotPassword}
            >
              Forgot Password?
            </Button>

            <Button
              mode="contained"
              onPress={handleLogin}
              loading={isLoading}
              disabled={isLoading}
              style={styles.button}
              contentStyle={styles.buttonContent}
            >
              Sign In
            </Button>

            <View style={styles.divider}>
              <Divider style={styles.dividerLine} />
              <Text style={styles.dividerText}>
                OR
              </Text>
              <Divider style={styles.dividerLine} />
            </View>

            <Button
              mode="outlined"
              onPress={handleGoogleLogin}
              disabled={isLoading}
              style={styles.button}
              contentStyle={styles.buttonContent}
              icon="google"
            >
              Continue with Google
            </Button>

            {Platform.OS === 'ios' && (
              <Button
                mode="contained-tonal"
                onPress={handleAppleLogin}
                disabled={isLoading}
                style={[styles.button, styles.appleButton]}
                contentStyle={styles.buttonContent}
                icon="apple"
                buttonColor="#000000"
                textColor="#FFFFFF"
              >
                Continue with Apple
              </Button>
            )}

            <View style={styles.signUpContainer}>
              <Text style={styles.signUpText}>
                Don't have an account?{' '}
              </Text>
              <Button
                mode="text"
                onPress={() => navigation.navigate('Register')}
                compact
              >
                Sign Up
              </Button>
            </View>
          </View>
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
    color: '#666',
  },
  errorCard: {
    marginBottom: 16,
    backgroundColor: '#ffebee',
  },
  errorText: {
    color: '#c62828',
  },
  form: {
    width: '100%',
  },
  input: {
    marginBottom: 8,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  button: {
    marginBottom: 12,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  appleButton: {
    marginBottom: 12,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
  },
  dividerText: {
    fontSize: 14,
    marginHorizontal: 16,
    opacity: 0.6,
    color: '#666',
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  signUpText: {
    fontSize: 16,
    opacity: 0.7,
    color: '#666',
  },
});
