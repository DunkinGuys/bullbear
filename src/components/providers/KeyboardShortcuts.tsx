'use client';

import { useCallback } from 'react';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';

const ctrlOpts = { ctrl: true } as const;

export function KeyboardShortcuts() {
  const focusSearch = useCallback(() => {
    const ref = (window as unknown as Record<string, unknown>).__searchInputRef as
      | React.RefObject<HTMLInputElement | null>
      | undefined;
    ref?.current?.focus();
  }, []);

  useKeyboardShortcut('k', focusSearch, ctrlOpts);

  return null;
}
