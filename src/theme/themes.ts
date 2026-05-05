/**
 * Theme Templates — Professional color palettes for the app.
 * Each template defines a full color system with proper contrast ratios.
 */

export interface ThemeColors {
  /** Main background */
  bg: string;
  /** Card / elevated surface background */
  card: string;
  /** Borders and dividers */
  border: string;
  /** Primary accent color (CTAs, active states) */
  accent: string;
  /** Primary body text */
  text: string;
  /** Headings / high-emphasis text */
  heading: string;
  /** Secondary / placeholder text */
  muted: string;
  /** Error / destructive actions */
  danger: string;
  /** Warning indicators */
  warning: string;
  /** Success indicators */
  success: string;
  /** Subtle accent tint for backgrounds */
  accentDim: string;
  /** Slightly stronger accent tint */
  accentSoft: string;
  /** Tab bar background */
  tabBar: string;
  /** Tab bar top border */
  tabBarBorder: string;
  /** Input field background */
  inputBg: string;
  /** Shadow color */
  shadow: string;
  /** Status bar style */
  statusBar: 'light' | 'dark';
}

export interface ThemeTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  /** Preview colors for the picker card [bg, card, accent] */
  preview: [string, string, string];
  colors: ThemeColors;
}

// ─────────────────────────────────────────
// TEMPLATES
// ─────────────────────────────────────────

const midnightNavy: ThemeTemplate = {
  id: 'midnight-navy',
  name: 'Midnight Navy',
  description: 'Navy profundo con acentos cyan — El clásico',
  icon: 'moon-outline',
  preview: ['#0a192f', '#112240', '#64ffda'],
  colors: {
    bg: '#0a192f',
    card: '#112240',
    border: '#233554',
    accent: '#64ffda',
    text: '#ccd6f6',
    heading: '#e6f1ff',
    muted: '#8892b0',
    danger: '#ff6b6b',
    warning: '#FFA726',
    success: '#66BB6A',
    accentDim: 'rgba(100,255,218,0.08)',
    accentSoft: 'rgba(100,255,218,0.12)',
    tabBar: '#0a192f',
    tabBarBorder: '#233554',
    inputBg: '#112240',
    shadow: '#000000',
    statusBar: 'light',
  },
};

const pureLight: ThemeTemplate = {
  id: 'pure-light',
  name: 'Pure Light',
  description: 'Blanco limpio con acentos azul royal',
  icon: 'sunny-outline',
  preview: ['#FFFFFF', '#F5F7FA', '#2563EB'],
  colors: {
    bg: '#FFFFFF',
    card: '#F5F7FA',
    border: '#E2E8F0',
    accent: '#2563EB',
    text: '#334155',
    heading: '#0F172A',
    muted: '#94A3B8',
    danger: '#EF4444',
    warning: '#F59E0B',
    success: '#22C55E',
    accentDim: 'rgba(37,99,235,0.06)',
    accentSoft: 'rgba(37,99,235,0.10)',
    tabBar: '#FFFFFF',
    tabBarBorder: '#E2E8F0',
    inputBg: '#F1F5F9',
    shadow: '#94A3B8',
    statusBar: 'dark',
  },
};

const obsidian: ThemeTemplate = {
  id: 'obsidian',
  name: 'Obsidian',
  description: 'Negro AMOLED con neon verde — Modo ahorro',
  icon: 'contrast-outline',
  preview: ['#000000', '#111111', '#00E676'],
  colors: {
    bg: '#000000',
    card: '#111111',
    border: '#1E1E1E',
    accent: '#00E676',
    text: '#D4D4D4',
    heading: '#F5F5F5',
    muted: '#737373',
    danger: '#FF5252',
    warning: '#FFB74D',
    success: '#69F0AE',
    accentDim: 'rgba(0,230,118,0.07)',
    accentSoft: 'rgba(0,230,118,0.12)',
    tabBar: '#000000',
    tabBarBorder: '#1E1E1E',
    inputBg: '#111111',
    shadow: '#000000',
    statusBar: 'light',
  },
};

const warmMocha: ThemeTemplate = {
  id: 'warm-mocha',
  name: 'Warm Mocha',
  description: 'Tonos cálidos de café con dorado suave',
  icon: 'cafe-outline',
  preview: ['#1C1410', '#2A1F18', '#D4A574'],
  colors: {
    bg: '#1C1410',
    card: '#2A1F18',
    border: '#3D2E24',
    accent: '#D4A574',
    text: '#E8D5C4',
    heading: '#F5EBE0',
    muted: '#A68B7B',
    danger: '#E57373',
    warning: '#FFB74D',
    success: '#A5D6A7',
    accentDim: 'rgba(212,165,116,0.08)',
    accentSoft: 'rgba(212,165,116,0.12)',
    tabBar: '#1C1410',
    tabBarBorder: '#3D2E24',
    inputBg: '#2A1F18',
    shadow: '#000000',
    statusBar: 'light',
  },
};

const arcticFrost: ThemeTemplate = {
  id: 'arctic-frost',
  name: 'Arctic Frost',
  description: 'Gris claro helado con violeta — Elegante y fresco',
  icon: 'snow-outline',
  preview: ['#F0F4F8', '#FFFFFF', '#7C3AED'],
  colors: {
    bg: '#F0F4F8',
    card: '#FFFFFF',
    border: '#D9E2EC',
    accent: '#7C3AED',
    text: '#334E68',
    heading: '#102A43',
    muted: '#829AB1',
    danger: '#E53E3E',
    warning: '#ED8936',
    success: '#38A169',
    accentDim: 'rgba(124,58,237,0.06)',
    accentSoft: 'rgba(124,58,237,0.10)',
    tabBar: '#F0F4F8',
    tabBarBorder: '#D9E2EC',
    inputBg: '#FFFFFF',
    shadow: '#829AB1',
    statusBar: 'dark',
  },
};

const sunsetEmber: ThemeTemplate = {
  id: 'sunset-ember',
  name: 'Sunset Ember',
  description: 'Oscuro elegante con coral cálido',
  icon: 'flame-outline',
  preview: ['#1A1019', '#2A1B28', '#FF6B6B'],
  colors: {
    bg: '#1A1019',
    card: '#2A1B28',
    border: '#3D2A3A',
    accent: '#FF6B6B',
    text: '#E8D8E4',
    heading: '#F5ECF2',
    muted: '#A68BA0',
    danger: '#FF5252',
    warning: '#FFB74D',
    success: '#81C784',
    accentDim: 'rgba(255,107,107,0.08)',
    accentSoft: 'rgba(255,107,107,0.12)',
    tabBar: '#1A1019',
    tabBarBorder: '#3D2A3A',
    inputBg: '#2A1B28',
    shadow: '#000000',
    statusBar: 'light',
  },
};

const forestDeep: ThemeTemplate = {
  id: 'forest-deep',
  name: 'Forest Deep',
  description: 'Verde profundo con acentos dorados',
  icon: 'leaf-outline',
  preview: ['#0B1A0F', '#132A18', '#FFD700'],
  colors: {
    bg: '#0B1A0F',
    card: '#132A18',
    border: '#1E3D24',
    accent: '#FFD700',
    text: '#C8DBC9',
    heading: '#E8F5E9',
    muted: '#7BA17E',
    danger: '#EF5350',
    warning: '#FFA726',
    success: '#66BB6A',
    accentDim: 'rgba(255,215,0,0.07)',
    accentSoft: 'rgba(255,215,0,0.12)',
    tabBar: '#0B1A0F',
    tabBarBorder: '#1E3D24',
    inputBg: '#132A18',
    shadow: '#000000',
    statusBar: 'light',
  },
};

const roseQuartz: ThemeTemplate = {
  id: 'rose-quartz',
  name: 'Rose Quartz',
  description: 'Rosa suave y elegante — Femenino y moderno',
  icon: 'heart-outline',
  preview: ['#FFF5F5', '#FFFFFF', '#E53E6A'],
  colors: {
    bg: '#FFF5F5',
    card: '#FFFFFF',
    border: '#FED7D7',
    accent: '#E53E6A',
    text: '#4A2040',
    heading: '#2D1228',
    muted: '#9B7089',
    danger: '#E53E3E',
    warning: '#ED8936',
    success: '#38A169',
    accentDim: 'rgba(229,62,106,0.06)',
    accentSoft: 'rgba(229,62,106,0.10)',
    tabBar: '#FFF5F5',
    tabBarBorder: '#FED7D7',
    inputBg: '#FFF0F0',
    shadow: '#E8B4B8',
    statusBar: 'dark',
  },
};

// ─────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────

export const THEMES: ThemeTemplate[] = [
  midnightNavy,
  pureLight,
  obsidian,
  warmMocha,
  arcticFrost,
  sunsetEmber,
  forestDeep,
  roseQuartz,
];

export const DEFAULT_THEME_ID = 'forest-deep';

/** Quick lookup by ID */
export const getThemeById = (id: string): ThemeTemplate =>
  THEMES.find(t => t.id === id) || midnightNavy;
