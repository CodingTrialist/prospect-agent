import { Platform } from 'react-native';

export const colors = {
  bg: '#F2F3F7',
  surface: '#FFFFFF',
  surfaceMuted: '#F7F8FA',
  border: '#E3E6EC',
  divider: '#EEF0F4',

  primary: '#0B5FBF',
  primaryPressed: '#094E9C',
  onPrimary: '#FFFFFF',

  text: '#111827',
  textMuted: '#6B7280',
  textFaint: '#9CA3AF',

  score: '#16A34A',
  scoreBg: '#E8F6EE',

  chipBlueBg: '#E8F1FB',
  chipBlueText: '#1D4ED8',
  chipAmberBg: '#FEF3C7',
  chipAmberText: '#92400E',

  danger: '#DC2626',
  dangerBg: '#FEECEC',
  warnText: '#92400E',
  warnBg: '#FEF3C7',
  snooze: '#7C3AED',
  snoozeBg: '#F3EEFE',
};

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };

export const spacing = (n: number) => n * 4;

export const font = {
  family: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  }) as string,
};

export const shadow = Platform.select({
  ios: {
    shadowColor: '#0B1220',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  android: { elevation: 2 },
  default: { boxShadow: '0 4px 14px rgba(11, 18, 32, 0.07)' } as any,
}) as object;
