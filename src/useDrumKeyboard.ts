import { useEffect, useRef } from 'react';
import type { DrumPad, DrumPadCode, PadMap } from './drumTypes';

const IGNORED_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

function isFormControl(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && IGNORED_TAGS.has(target.tagName);
}

/**
 * Maps physical key presses (KeyboardEvent.code) to drum pads.
 *
 * - keydown triggers a pad; auto-repeat events are ignored.
 * - Typing in INPUT / TEXTAREA / SELECT never triggers a pad.
 * - preventDefault is called only for a mapped, handled pad.
 * - keyup reports release via the optional `onReleasePad`.
 * - Listeners are removed on unmount and whenever `isEnabled` is false.
 */
export function useDrumKeyboard(
  padMap: PadMap,
  onTriggerPad: (pad: DrumPad) => void,
  isEnabled: boolean = true,
  onReleasePad?: (pad: DrumPad) => void,
): void {
  // Keep the latest values in refs so listeners are not re-attached
  // every time the parent re-renders with a new callback identity.
  const padMapRef = useRef(padMap);
  const triggerRef = useRef(onTriggerPad);
  const releaseRef = useRef(onReleasePad);
  padMapRef.current = padMap;
  triggerRef.current = onTriggerPad;
  releaseRef.current = onReleasePad;

  useEffect(() => {
    if (!isEnabled) return;

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.repeat) return;
      if (isFormControl(event.target)) return;
      // Leave browser/OS shortcuts (e.g. Ctrl+S) alone.
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      const pad = padMapRef.current.get(event.code as DrumPadCode);
      if (!pad) return;

      event.preventDefault();
      triggerRef.current(pad);
    };

    const handleKeyUp = (event: KeyboardEvent): void => {
      // No form-control guard: a key pressed before focus moved into an
      // input must still be released, or the pad would stay "pressed".
      const pad = padMapRef.current.get(event.code as DrumPadCode);
      if (!pad) return;
      releaseRef.current?.(pad);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isEnabled]);
}
