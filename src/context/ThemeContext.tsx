import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeColors, ThemeTemplate, THEMES, DEFAULT_THEME_ID, getThemeById } from '../theme/themes';

const STORAGE_KEY = '@secret_theme_id';

interface ThemeContextType {
  /** Current resolved colors */
  colors: ThemeColors;
  /** Full current theme template */
  theme: ThemeTemplate;
  /** All available templates */
  themes: ThemeTemplate[];
  /** Switch to a different template (persisted) */
  setTheme: (id: string) => void;
  /** Whether theme has loaded from storage */
  ready: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeId, setThemeId] = useState(DEFAULT_THEME_ID);
  const [ready, setReady] = useState(false);

  // Load persisted theme on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored && THEMES.find(t => t.id === stored)) {
          setThemeId(stored);
        }
      } catch {
        // Fallback to default
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const setTheme = useCallback((id: string) => {
    const valid = THEMES.find(t => t.id === id);
    if (!valid) return;
    setThemeId(id);
    AsyncStorage.setItem(STORAGE_KEY, id).catch(() => {});
  }, []);

  const theme = getThemeById(themeId);

  return (
    <ThemeContext.Provider value={{
      colors: theme.colors,
      theme,
      themes: THEMES,
      setTheme,
      ready,
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * Hook to access current theme colors and switch themes.
 * Must be used within a <ThemeProvider>.
 */
export const useTheme = (): ThemeContextType => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
