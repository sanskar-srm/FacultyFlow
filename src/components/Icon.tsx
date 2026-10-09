import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

/** One icon family (Feather) for the whole app. */
export type IconName = ComponentProps<typeof Feather>['name'];

export const ICON_FONT = Feather.font;

export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color: ColorValue }) {
  return <Feather name={name} size={size} color={color} accessible={false} importantForAccessibility="no" />;
}
