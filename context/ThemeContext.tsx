import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { type ColorPalette, DarkColors, LightColors, getCloseButtonStyle } from '../constants/theme';

interface ThemeContextType {
  colors: ColorPalette;
  isDark: boolean;
  closeButtonStyle: ReturnType<typeof getCloseButtonStyle>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};

export const useColors = () => useTheme().colors;

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const scheme = useColorScheme();
  const isDark = scheme !== 'light';
  const colors = isDark ? DarkColors : LightColors;

  const value = useMemo(
    () => ({ colors, isDark, closeButtonStyle: getCloseButtonStyle(colors) }),
    [colors, isDark]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
