import { useCallback, useEffect, useRef } from "react";

/**
 * Custom hook for managing focus with cleanup to prevent memory leaks
 */
export function useFocusManagement() {
  const timeoutRefs = useRef<NodeJS.Timeout[]>([]);

  // Clear all timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(clearTimeout);
      timeoutRefs.current = [];
    };
  }, []);

  const clearAllTimeouts = useCallback(() => {
    timeoutRefs.current.forEach(clearTimeout);
    timeoutRefs.current = [];
  }, []);

  const scheduleTimeout = useCallback((callback: () => void, delay: number) => {
    const timeoutId = setTimeout(() => {
      callback();
      // Remove this timeout from the ref array
      timeoutRefs.current = timeoutRefs.current.filter(
        (id) => id !== timeoutId,
      );
    }, delay);

    timeoutRefs.current.push(timeoutId);
    return timeoutId;
  }, []);

  const focusInputWithRetries = useCallback(
    (selector: string, retries: number[] = [0, 50, 100, 200]) => {
      // Clear any existing timeouts
      clearAllTimeouts();

      const attemptFocus = () => {
        const input = document.querySelector(selector) as HTMLInputElement;
        if (input) {
          input.focus();
          // Move cursor to end of input
          const length = input.value.length;
          input.setSelectionRange(length, length);
          return true;
        }
        return false;
      };

      // Try immediate focus first
      if (attemptFocus()) {
        return;
      }

      // Schedule retries with increasing delays
      retries.forEach((delay, index) => {
        scheduleTimeout(() => {
          if (!attemptFocus() && index < retries.length - 1) {
            // Continue with remaining retries
          }
        }, delay);
      });

      // Also try with requestAnimationFrame
      requestAnimationFrame(() => {
        if (!attemptFocus()) {
          requestAnimationFrame(attemptFocus);
        }
      });
    },
    [clearAllTimeouts, scheduleTimeout],
  );

  const focusNewRowInput = useCallback(() => {
    focusInputWithRetries(
      '.rdg-row input[placeholder^="Enter "], .rdg input[type="text"], .rdg input[type="number"]',
    );
  }, [focusInputWithRetries]);

  return {
    clearAllTimeouts,
    scheduleTimeout,
    focusInputWithRetries,
    focusNewRowInput,
  };
}
