import { useEffect } from 'react';

interface ShortcutOptions {
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
}

export function useKeyboardShortcut(
  key: string,
  handler: (e: KeyboardEvent) => void,
  options: ShortcutOptions = {},
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const { ctrl, meta, shift } = options;

      // Check modifiers
      if (ctrl && !e.ctrlKey && !e.metaKey) return;
      if (meta && !e.metaKey) return;
      if (shift && !e.shiftKey) return;

      // Don't trigger in input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key.toLowerCase() === key.toLowerCase()) {
        e.preventDefault();
        handler(e);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [key, handler, options]);
}
