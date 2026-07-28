import React from 'react';
import { useTheme } from '../../theme/ThemeContext';

export default function ThemePicker({ className = '' }) {
  const { theme, setTheme, themes } = useTheme();

  return (
    <label className={`flex items-center gap-2 text-sm ${className}`.trim()}>
      <span className="ui-muted font-bold whitespace-nowrap">تم</span>
      <select
        className="ui-select py-2"
        value={theme}
        onChange={(e) => setTheme(e.target.value)}
        aria-label="انتخاب تم"
        style={{ minWidth: '7.5rem' }}
      >
        {themes.map((t) => (
          <option key={t.id} value={t.id}>{t.label}</option>
        ))}
      </select>
    </label>
  );
}
