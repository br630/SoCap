import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

// ─── Design System Tokens ───────────────────────────────────────────────────

// Primary Colors
export const colors = {
  primary: '#007AFF',      // Main actions, primary buttons, active states, links
  secondary: '#5856D6',    // AI features, accent elements, FABs, highlights
  tertiary: '#34C759',     // Success states, positive indicators, health scores

  // Neutral Colors
  background: '#FFFFFF',   // Screen backgrounds
  surface: '#F2F2F7',      // Cards, list backgrounds, elevated surfaces
  surfaceVariant: '#E5E5EA', // Subtle backgrounds, dividers
  textPrimary: '#000000',  // Headings, primary text
  textSecondary: '#8E8E93', // Captions, helper text, placeholders
  textTertiary: '#C7C7CC', // Disabled text, subtle hints
  border: '#D1D1D6',       // Input outlines, dividers, borders

  // Semantic Colors
  success: '#34C759',      // Success messages, completed states
  warning: '#FF9500',      // Warnings, pending states, attention needed
  error: '#FF3B30',        // Errors, destructive actions, delete
  info: '#5AC8FA',         // Informational states, tips

  // Relationship Tier Colors
  tierInnerCircle: '#AF52DE',  // Deepest relationships, premium tier
  tierCloseFriends: '#007AFF', // Strong bonds
  tierFriends: '#34C759',      // Regular friendships
  tierAcquaintances: '#FF9500', // Casual connections
  tierProfessional: '#8E8E93', // Work relationships

  // Status Colors
  statusConfirmed: '#34C759',
  statusPlanning: '#FF9500',
  statusCancelled: '#FF3B30',
  statusCompleted: '#8E8E93',
  statusDraft: '#5AC8FA',

  // Gradient endpoints (for health card)
  gradientStart: '#5856D6',
  gradientEnd: '#007AFF',
};

// ─── Spacing Scale (base unit: 4px) ─────────────────────────────────────────

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
  '4xl': 64,
} as const;

// ─── Border Radius ──────────────────────────────────────────────────────────

export const radii = {
  none: 0,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

// ─── Shadows ────────────────────────────────────────────────────────────────

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  subtle: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  light: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 4,
  },
  strong: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  heavy: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 12,
  },
};

// ─── Typography ─────────────────────────────────────────────────────────────
// Font family: SF Pro (iOS) / Roboto (Android) — system default

export const typography = {
  h1: { fontSize: 34, fontWeight: '700' as const, lineHeight: 40, letterSpacing: -0.4 },
  h2: { fontSize: 28, fontWeight: '700' as const, lineHeight: 34, letterSpacing: -0.4 },
  h3: { fontSize: 22, fontWeight: '600' as const, lineHeight: 28, letterSpacing: -0.4 },
  h4: { fontSize: 20, fontWeight: '600' as const, lineHeight: 25, letterSpacing: -0.4 },
  h5: { fontSize: 17, fontWeight: '600' as const, lineHeight: 22, letterSpacing: -0.2 },
  body: { fontSize: 17, fontWeight: '400' as const, lineHeight: 22, letterSpacing: -0.2 },
  bodySmall: { fontSize: 15, fontWeight: '400' as const, lineHeight: 20, letterSpacing: -0.2 },
  caption: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18, letterSpacing: -0.1 },
  captionSmall: { fontSize: 12, fontWeight: '500' as const, lineHeight: 16, letterSpacing: 0 },
  overline: { fontSize: 11, fontWeight: '600' as const, lineHeight: 13, letterSpacing: 0.5 },
};

// ─── React Native Paper Theme ───────────────────────────────────────────────

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    secondary: colors.secondary,
    tertiary: colors.tertiary,
    error: colors.error,
    background: colors.background,
    surface: colors.surface,
    surfaceVariant: colors.surfaceVariant,
    text: colors.textPrimary,
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onBackground: colors.textPrimary,
    onSurface: colors.textPrimary,
    outline: colors.border,
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#0A84FF',
    secondary: '#5E5CE6',
    error: '#FF453A',
    background: '#000000',
    surface: '#1C1C1E',
    text: '#FFFFFF',
    onPrimary: '#000000',
    onSecondary: '#000000',
    onBackground: '#FFFFFF',
    onSurface: '#FFFFFF',
  },
};
