import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import {
  Button,
  HelperText,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useNavigation } from '@react-navigation/native';
import SecureTextInput from '../../components/security/SecureTextInput';
import { ScreenshotPrevention } from '../../utils/screenshotPrevention';
import JailbreakWarning from '../../components/security/JailbreakWarning';
import { colors, shadows, radii, spacing, typography } from '../../theme/paperTheme';

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

  const isNative = Platform.OS === 'ios' || Platform.OS === 'android';
  const { height: windowHeight } = useWindowDimensions();

  const innerContent = (
    <View style={styles.content}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <View style={styles.logoCircle}>
          <Ionicons name="people" size={40} color="#FFFFFF" />
        </View>
        <Text style={styles.logoText}>SoCap</Text>
        <Text style={styles.logoSubtext}>Social Capital</Text>
      </View>

      {/* Form Card */}
      <View style={styles.formCard}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

        {error && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={18} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
            <SecureTextInput
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
              error={!!emailError}
              mode="outlined"
              style={styles.input}
              disabled={isLoading}
              outlineStyle={styles.inputOutline}
              dense
            />
          </View>
          {emailError && touched.email && (
            <HelperText type="error" visible={!!emailError}>
              {emailError}
            </HelperText>
          )}

          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
            <SecureTextInput
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
              secureTextEntry={true}
              clearClipboardOnPaste={true}
              error={!!passwordError}
              mode="outlined"
              style={styles.input}
              disabled={isLoading}
              outlineStyle={styles.inputOutline}
              dense
            />
          </View>
          {passwordError && touched.password && (
            <HelperText type="error" visible={!!passwordError}>
              {passwordError}
            </HelperText>
          )}

          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={styles.forgotContainer}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        {/* Sign In Button */}
        <TouchableOpacity
          style={[styles.signInButton, isLoading && styles.signInButtonDisabled]}
          onPress={handleLogin}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <Text style={styles.signInButtonText}>
            {isLoading ? 'Signing In...' : 'Sign In'}
          </Text>
        </TouchableOpacity>

        {/* OR Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Social Buttons */}
        <TouchableOpacity
          style={styles.socialButton}
          onPress={handleGoogleLogin}
          disabled={isLoading}
          activeOpacity={0.7}
        >
          <Ionicons name="logo-google" size={20} color="#DB4437" />
          <Text style={styles.socialButtonText}>Continue with Google</Text>
        </TouchableOpacity>

        {Platform.OS === 'ios' && (
          <TouchableOpacity
            style={[styles.socialButton, styles.appleButton]}
            onPress={handleAppleLogin}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
            <Text style={[styles.socialButtonText, styles.appleButtonText]}>Continue with Apple</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Sign Up Link */}
      <View style={styles.signUpContainer}>
        <Text style={styles.signUpText}>Don't have an account? </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.signUpLink}>Sign Up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!isNative) {
    // Web: ScrollView with explicit pixel height so it actually scrolls
    return (
      <>
        <JailbreakWarning allowContinue={true} />
        <ScreenshotPrevention enabled={true}>
          <ScrollView
            style={{ height: windowHeight, backgroundColor: colors.surface }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator
          >
            {innerContent}
          </ScrollView>
        </ScreenshotPrevention>
      </>
    );
  }

  return (
    <>
      <JailbreakWarning allowContinue={true} />
      <ScreenshotPrevention enabled={true}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {innerContent}
          </ScrollView>
        </KeyboardAvoidingView>
      </ScreenshotPrevention>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface, // Subtle gray so the white card stands out
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: spacing['3xl'],
    paddingBottom: spacing['2xl'],
  },
  content: {
    paddingHorizontal: spacing.xl,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadows.light,
  },
  logoText: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  logoSubtext: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.surfaceVariant,
    ...shadows.medium,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error + '15',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  errorText: {
    color: colors.error,
    ...typography.caption,
    flex: 1,
  },
  inputContainer: {
    marginBottom: spacing.sm,
  },
  inputWrapper: {
    position: 'relative',
    marginBottom: spacing.xs,
  },
  inputIcon: {
    position: 'absolute',
    left: 14,
    top: 18,
    zIndex: 1,
  },
  input: {
    backgroundColor: colors.surface,
    paddingLeft: 36,
  },
  inputOutline: {
    borderRadius: radii.md,
    borderColor: colors.border,
  },
  forgotContainer: {
    alignSelf: 'flex-end',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  forgotText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.primary,
  },
  signInButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
    ...shadows.light,
  },
  signInButtonDisabled: {
    opacity: 0.4,
  },
  signInButtonText: {
    color: '#FFFFFF',
    ...typography.h5,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    ...typography.captionSmall,
    marginHorizontal: spacing.lg,
    color: colors.textSecondary,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    marginBottom: spacing.md,
    backgroundColor: '#FFFFFF',
    gap: spacing.sm,
  },
  socialButtonText: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  appleButton: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  appleButtonText: {
    color: '#FFFFFF',
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  signUpText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  signUpLink: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.primary,
  },
});
