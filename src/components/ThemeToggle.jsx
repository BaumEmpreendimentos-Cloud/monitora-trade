import React from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ThemeToggle({ className = '' }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const isDark = (resolvedTheme || theme) === 'dark';

  return (
    <Button
      variant="ghost"
      size="icon"
      className={`h-9 w-9 ${className}`}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      aria-label="Alternar tema"
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </Button>
  );
}