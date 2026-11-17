/**
 * Theme hooks for light and dark botanical palettes.
 */

import { DarkPalette, LightPalette, type ThemePalette } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeStore } from '@/store/useThemeStore';

export function useIsDark(): boolean {
  const systemScheme = useColorScheme();
  const preference = useThemeStore((s) => s.preference);

  if (preference === 'dark') return true;
  if (preference === 'light') return false;
  return systemScheme === 'dark';
}

export function usePalette(): ThemePalette {
  return useIsDark() ? DarkPalette : LightPalette;
}
