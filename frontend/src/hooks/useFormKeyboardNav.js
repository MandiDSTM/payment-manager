import { useCallback, useRef } from 'react';

/**
 * Keyboard navigation for form fields:
 * Enter -> next field (submit on last if onSubmitLast provided)
 * Shift+Enter -> previous field
 */
export function useFormKeyboardNav({ fieldCount, onSubmitLast } = {}) {
  const refs = useRef([]);

  const setRef = useCallback((index) => (el) => {
    refs.current[index] = el;
  }, []);

  const focusFirst = useCallback(() => {
    refs.current[0]?.focus?.();
  }, []);

  const handleKeyDown = useCallback((e, index) => {
    const isEnter = e.key === 'Enter';
    if (!isEnter) return;

    // Allow native newline in textarea
    if (e.target?.tagName === 'TEXTAREA' && !e.ctrlKey) return;

    // For select: only advance when not expanding via Enter (browser dependent);
    // still prevent form submit and move next.
    e.preventDefault();

    if (e.shiftKey) {
      if (index > 0) refs.current[index - 1]?.focus?.();
      return;
    }

    if (index < fieldCount - 1) {
      refs.current[index + 1]?.focus?.();
      return;
    }

    onSubmitLast?.();
  }, [fieldCount, onSubmitLast]);

  return { setRef, handleKeyDown, focusFirst, refs };
}
