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
  Checkbox,
  HelperText,
  Divider,
} from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';
import { useNavigation } from '@react-navigation/native';
import SecureTextInput from '../../components/security/SecureTextInput';
import { ScreenshotPrevention } from '../../utils/screenshotPrevention';
import JailbreakWarning from '../../components/security/JailbreakWarning';

export default function RegisterScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const { signUp, signInWithGoogle, signInWithApple, isLoading, error, clearError } = useAuth();
  const navigation = useNavigation<any>();

  const validateField = (field: string, value: string): string => {
    switch (field) {
      case 'firstName':
        if (!value.trim()) return 'First name is required';
        if (value.trim().length < 2) return 'First name must be at least 2 characters';
        if (value.trim().length > 50) return 'First name is too long';
        return '';
      case 'lastName':
        if (!value.trim()) return 'Last name is required';
        if (value.trim().length < 2) return 'Last name must be at least 2 characters';
        if (value.trim().length > 50) return 'Last name is too long';
        return '';
      case 'email':
        if (!value.trim()) return 'Email is required';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return 'Please enter a valid email address';
        return '';
      case 'password':
        if (!value) return 'Password is required';
        if (value.length < 8) return 'Password must be at least 8 characters';
        if (!/(?=.*[a-z])/.test(value)) return 'Password must contain at least one lowercase letter';
        if (!/(?=.*[A-Z])/.test(value)) return 'Password must contain at least one uppercase letter';
        if (!/(?=.*\d)/.test(value)) return 'Password must contain at least one number';
        return '';
      case 'confirmPassword':
        if (!value) return 'Please confirm your password';
        if (value !== password) return 'Passwords do not match';
        return '';
      default:
        return '';
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    const error = validateField(field, value);
    setErrors((prev) => ({ ...prev, [field]: error }));

    switch (field) {
      case 'firstName':
        setFirstName(value);
        break;
      case 'lastName':
        setLastName(value);
        break;
      case 'email':
        setEmail(value);
        break;
      case 'password':
        setPassword(value);
        // Re-validate confirm password if it's already filled
        if (confirmPassword) {
          const confirmError = validateField('confirmPassword', confirmPassword);
          setErrors((prev) => ({ ...prev, confirmPassword: confirmError }));
        }
        break;
      case 'confirmPassword':
        setConfirmPassword(value);
        break;
    }
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const value = field === 'firstName' ? firstName : 
                  field === 'lastName' ? lastName :
                  field === 'email' ? email :
                  field === 'password' ? password : confirmPassword;
    const error = validateField(field, value);
    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  const handleRegister = async () => {
    clearError();
    setTouched({ firstName: true, lastName: true, email: true, password: true, confirmPassword: true });

    // Validate all fields
    const firstNameError = validateField('firstName', firstName);
    const lastNameError = validateField('lastName', lastName);
    const emailError = validateField('email', email);
    const passwordError = validateField('password', password);
    const confirmPasswordError = validateField('confirmPassword', confirmPassword);

    setErrors({
      firstName: firstNameError,
      lastName: lastNameError,
      email: emailError,
      password: passwordError,
      confirmPassword: confirmPasswordError,
    });

    if (firstNameError || lastNameError || emailError || passwordError || confirmPasswordError) {
      return;
    }

    if (!acceptTerms) {
      Alert.alert('Terms Required', 'Please accept the terms and conditions to continue');
      return;
    }

    try {
      await signUp(email.trim(), password, firstName.trim(), lastName.trim());
    } catch (err: any) {
      Alert.alert('Registration Failed', err.message || 'An error occurred during registration');
    }
  };

  const handleGoogleSignUp = async () => {
    clearError();
    try {
      await signInWithGoogle();
    } catch (err: any) {
      Alert.alert('Google Sign Up Failed', err.message || 'An error occurred during Google sign up');
    }
  };

  const handleAppleSignUp = async () => {
    clearError();
    try {
      await signInWithApple();
    } catch (err: any) {
      Alert.alert('Apple Sign Up Failed', err.message || 'An error occurred during Apple sign up');
    }
  };

  return (
    <>
      <JailbreakWarning allowContinue={true} />
      <ScreenshotPrevention enabled={true}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.content}>
          <Text style={styles.title}>
            Create Account
          </Text>
          <Text style={styles.subtitle}>
            Sign up to get started
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
            <View style={styles.row}>
              <TextInput
                label="First Name"
                value={firstName}
                onChangeText={(text) => handleFieldChange('firstName', text)}
                onBlur={() => handleBlur('firstName')}
                autoCapitalize="words"
                error={!!errors.firstName && touched.firstName}
                mode="outlined"
                style={[styles.input, styles.halfWidth]}
                disabled={isLoading}
              />
              <TextInput
                label="Last Name"
                value={lastName}
                onChangeText={(text) => handleFieldChange('lastName', text)}
                onBlur={() => handleBlur('lastName')}
                autoCapitalize="words"
                error={!!errors.lastName && touched.lastName}
                mode="outlined"
                style={[styles.input, styles.halfWidth]}
                disabled={isLoading}
              />
            </View>
            {errors.firstName && touched.firstName && (
              <HelperText type="error" visible={!!errors.firstName}>
                {errors.firstName}
              </HelperText>
            )}
            {errors.lastName && touched.lastName && (
              <HelperText type="error" visible={!!errors.lastName}>
                {errors.lastName}
              </HelperText>
            )}

            <TextInput
              label="Email"
              value={email}
              onChangeText={(text) => handleFieldChange('email', text)}
              onBlur={() => handleBlur('email')}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              error={!!errors.email && touched.email}
              mode="outlined"
              style={styles.input}
              disabled={isLoading}
            />
            {errors.email && touched.email && (
              <HelperText type="error" visible={!!errors.email}>
                {errors.email}
              </HelperText>
            )}

            <SecureTextInput
              label="Password"
              value={password}
              onChangeText={(text) => handleFieldChange('password', text)}
              onBlur={() => handleBlur('password')}
              secureTextEntry={true}
              clearClipboardOnPaste={true}
              error={!!errors.password && touched.password}
              mode="outlined"
              style={styles.input}
              disabled={isLoading}
            />
            {errors.password && touched.password && (
              <HelperText type="error" visible={!!errors.password}>
                {errors.password}
              </HelperText>
            )}

            <SecureTextInput
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={(text) => handleFieldChange('confirmPassword', text)}
              onBlur={() => handleBlur('confirmPassword')}
              secureTextEntry={true}
              clearClipboardOnPaste={true}
              error={!!errors.confirmPassword && touched.confirmPassword}
              mode="outlined"
              style={styles.input}
              disabled={isLoading}
            />
            {errors.confirmPassword && touched.confirmPassword && (
              <HelperText type="error" visible={!!errors.confirmPassword}>
                {errors.confirmPassword}
              </HelperText>
            )}

            <View style={styles.checkboxContainer}>
              <Checkbox
                status={acceptTerms ? 'checked' : 'unchecked'}
                onPress={() => setAcceptTerms(!acceptTerms)}
                disabled={isLoading}
              />
              <Text style={styles.checkboxLabel}>
                I accept the Terms and Conditions and Privacy Policy
              </Text>
            </View>

            <Button
              mode="contained"
              onPress={handleRegister}
              loading={isLoading}
              disabled={isLoading || !acceptTerms}
              style={styles.button}
              contentStyle={styles.buttonContent}
            >
              Sign Up
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
              onPress={handleGoogleSignUp}
              disabled={isLoading}
              style={styles.button}
              contentStyle={styles.buttonContent}
              icon="google"
            >
              Sign up with Google
            </Button>

            {Platform.OS === 'ios' && (
              <Button
                mode="contained-tonal"
                onPress={handleAppleSignUp}
                disabled={isLoading}
                style={[styles.button, styles.appleButton]}
                contentStyle={styles.buttonContent}
                icon="apple"
                buttonColor="#000000"
                textColor="#FFFFFF"
              >
                Sign up with Apple
              </Button>
            )}

            <View style={styles.signInContainer}>
              <Text style={styles.signInText}>
                Already have an account?{' '}
              </Text>
              <Button
                mode="text"
                onPress={() => navigation.navigate('Login')}
                compact
              >
                Sign In
              </Button>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
      </ScreenshotPrevention>
    </>
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  input: {
    marginBottom: 8,
  },
  halfWidth: {
    flex: 1,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    marginLeft: 8,
    opacity: 0.7,
    color: '#666',
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
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  signInText: {
    fontSize: 16,
    opacity: 0.7,
    color: '#666',
  },
});
