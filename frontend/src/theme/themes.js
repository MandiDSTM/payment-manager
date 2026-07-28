export const THEME_STORAGE_KEY = 'pm-theme';

export const THEMES = [
  { id: 'light', label: 'روشن' },
  { id: 'slate', label: 'تیره' },
  { id: 'ocean', label: 'اقیانوس' },
];

export const DEFAULT_THEME = 'light';

export const isValidTheme = (id) => THEMES.some((t) => t.id === id);
