import { Platform } from 'react-native';

export const colors = {
  // Brand
  primary: '#0A7B6E',
  primaryLight: '#E6F5F3',
  primaryDark: '#065E54',
  accent: '#F0A830',
  accentLight: '#FFF5E0',

  // Backgrounds
  background: '#F9F7F4',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',

  // Text
  textPrimary: '#1A1A2E',
  textSecondary: '#5C6270',
  textTertiary: '#9CA3AF',
  textOnPrimary: '#FFFFFF',
  textOnAccent: '#1A1A2E',

  // Severity
  alert: '#DC2626',
  alertLight: '#FEF2F2',
  warning: '#F0A830',
  warningLight: '#FFF5E0',
  info: '#2563EB',
  infoLight: '#EFF6FF',
  ok: '#16A34A',
  okLight: '#F0FFF4',

  // Category colors
  medication: '#8B5CF6',
  mobility: '#2563EB',
  behavior: '#F0A830',
  therapy: '#16A34A',
  coordination: '#5C6270',
  incident: '#DC2626',
  medical: '#0A7B6E',

  // UI
  border: '#E8E5E0',
  borderLight: '#F0EDE8',
  divider: '#E8E5E0',
  tabInactive: '#9CA3AF',
  shadow: '#000000',

  // Member type badge colors
  professional: '#0A7B6E',
  family: '#8B5CF6',
  medicalType: '#2563EB',
  agency: '#F0A830',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
} as const;

export const borderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  full: 9999,
} as const;

export const typography = {
  // Plus Jakarta Sans weights are loaded via expo-google-fonts
  // We map them to usable font family names
  fontFamily: {
    regular: 'PlusJakartaSans_400Regular',
    medium: 'PlusJakartaSans_500Medium',
    semiBold: 'PlusJakartaSans_600SemiBold',
    bold: 'PlusJakartaSans_700Bold',
  },
  size: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
} as const;

export const shadows = {
  sm: Platform.select({
    ios: {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
    },
    android: {
      elevation: 2,
    },
    default: {},
  }),
  md: Platform.select({
    ios: {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    android: {
      elevation: 4,
    },
    default: {},
  }),
  lg: Platform.select({
    ios: {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
    },
    android: {
      elevation: 8,
    },
    default: {},
  }),
} as const;
