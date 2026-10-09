// The whole design system: colours, spacing, radii and type sizes. Every screen uses these.
// The accent is the green used by the bottom tab bar.
import { useColorScheme } from 'react-native';

const light = {
  background: '#F6F7F9',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF1F4',
  text: '#111827',
  textMuted: '#5F6B78',
  textFaint: '#97A1AC',
  border: '#E3E7EB',
  primary: '#0A7A4B',
  primarySoft: '#E3F1EA',
  onPrimary: '#FFFFFF',
  danger: '#C81E1E',
  dangerSoft: '#FDECEC',
  warning: '#A85F05',
  warningSoft: '#FDF3DD',
  success: '#15803D',
  successSoft: '#E5F5EA',
  backdrop: 'rgba(17, 24, 39, 0.45)',
  tabBar: '#FFFFFF',
  tabBarBorder: '#DDDDDD',
  tabActiveBg: '#E3F1EA',
  tabActive: '#0A7A4B',
  tabIcon: '#0F2418',
  tabLabel: '#444444',
};

const dark: typeof light = {
  background: '#0E1113',
  surface: '#171B1F',
  surfaceAlt: '#22282D',
  text: '#F1F3F5',
  textMuted: '#A2ABB4',
  textFaint: '#6C757E',
  border: '#2B3238',
  primary: '#7BD9A8',
  primarySoft: '#1F3A2D',
  onPrimary: '#05210F',
  danger: '#F87171',
  dangerSoft: '#3B1D1D',
  warning: '#FBBF24',
  warningSoft: '#3A2D0F',
  success: '#4ADE80',
  successSoft: '#143023',
  backdrop: 'rgba(0, 0, 0, 0.6)',
  tabBar: '#1C2420',
  tabBarBorder: '#2E3A34',
  tabActiveBg: '#1F3A2D',
  tabActive: '#7BD9A8',
  tabIcon: '#B8C2BC',
  tabLabel: '#B8C2BC',
};

export type Colors = typeof light;

/** Follows the resolved colour scheme (the saved System/Light/Dark choice is applied via Appearance). */
export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

export const type = {
  title: { fontSize: 24, fontWeight: '700', letterSpacing: -0.2 },
  heading: { fontSize: 17, fontWeight: '600' },
  body: { fontSize: 15, fontWeight: '400' },
  caption: { fontSize: 13, fontWeight: '500' },
} as const;

/** Minimum touch target (Android guideline: 48dp). */
export const TOUCH = 48;
