// @vitest-environment jsdom
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DrumPad } from './drumTypes';
import { padMap } from './padMap';
import { useDrumKeyboard } from './useDrumKeyboard';

/** Dispatch a bubbling, cancelable key event with `code` populated. */
function press(
  target: EventTarget,
  code: string,
  init: KeyboardEventInit & { type?: 'keydown' | 'keyup' } = {},
): KeyboardEvent {
  const { type = 'keydown', ...rest } = init;
  const event = new KeyboardEvent(type, { code, bubbles: true, cancelable: true, ...rest });
  target.dispatchEvent(event);
  return event;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('useDrumKeyboard', () => {
  it('fires once with the mapped pad and prevents default', () => {
    const onTrigger = vi.fn();
    renderHook(() => useDrumKeyboard(padMap, onTrigger));

    const event = press(window, 'KeyW');

    expect(onTrigger).toHaveBeenCalledTimes(1);
    expect(onTrigger).toHaveBeenCalledWith(padMap.get('KeyW'));
    expect(event.defaultPrevented).toBe(true);
  });

  it('ignores auto-repeat keydown events', () => {
    const onTrigger = vi.fn();
    renderHook(() => useDrumKeyboard(padMap, onTrigger));

    press(window, 'KeyA');
    press(window, 'KeyA', { repeat: true });
    press(window, 'KeyA', { repeat: true });

    expect(onTrigger).toHaveBeenCalledTimes(1);
  });

  it.each(['input', 'textarea', 'select'])(
    'ignores keys typed inside a <%s>',
    (tag) => {
      const onTrigger = vi.fn();
      renderHook(() => useDrumKeyboard(padMap, onTrigger));
      const control = document.body.appendChild(document.createElement(tag));

      const event = press(control, 'KeyS');

      expect(onTrigger).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
    },
  );

  it('ignores unmapped keys and does not prevent default', () => {
    const onTrigger = vi.fn();
    renderHook(() => useDrumKeyboard(padMap, onTrigger));

    const event = press(window, 'KeyQ');

    expect(onTrigger).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('ignores keys with Ctrl/Meta/Alt held', () => {
    const onTrigger = vi.fn();
    renderHook(() => useDrumKeyboard(padMap, onTrigger));

    press(window, 'KeyS', { ctrlKey: true });
    press(window, 'KeyS', { metaKey: true });
    press(window, 'KeyS', { altKey: true });

    expect(onTrigger).not.toHaveBeenCalled();
  });

  it('reports keyup via onReleasePad, even from a form control', () => {
    const onRelease = vi.fn();
    renderHook(() => useDrumKeyboard(padMap, vi.fn(), true, onRelease));
    const input = document.body.appendChild(document.createElement('input'));

    press(input, 'KeyD', { type: 'keyup' });

    expect(onRelease).toHaveBeenCalledWith(padMap.get('KeyD') as DrumPad);
  });

  it('uses the latest callback without re-attaching listeners', () => {
    const first = vi.fn();
    const second = vi.fn();
    const addSpy = vi.spyOn(window, 'addEventListener');
    const { rerender } = renderHook(({ cb }) => useDrumKeyboard(padMap, cb), {
      initialProps: { cb: first },
    });
    const addCalls = addSpy.mock.calls.length;

    rerender({ cb: second });
    press(window, 'KeyJ');

    expect(addSpy.mock.calls.length).toBe(addCalls);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  describe('cleanup', () => {
    it('removes the same keydown/keyup listeners on unmount', () => {
      const addSpy = vi.spyOn(window, 'addEventListener');
      const removeSpy = vi.spyOn(window, 'removeEventListener');
      const { unmount } = renderHook(() => useDrumKeyboard(padMap, vi.fn()));

      const added = (type: string) =>
        addSpy.mock.calls.find(([t]) => t === type)?.[1];
      expect(added('keydown')).toBeDefined();
      expect(added('keyup')).toBeDefined();

      unmount();

      expect(removeSpy).toHaveBeenCalledWith('keydown', added('keydown'));
      expect(removeSpy).toHaveBeenCalledWith('keyup', added('keyup'));
    });

    it('stops triggering after unmount', () => {
      const onTrigger = vi.fn();
      const { unmount } = renderHook(() => useDrumKeyboard(padMap, onTrigger));

      unmount();
      press(window, 'KeyK');

      expect(onTrigger).not.toHaveBeenCalled();
    });

    it('removes listeners when disabled and re-adds them when re-enabled', () => {
      const onTrigger = vi.fn();
      const { rerender } = renderHook(
        ({ enabled }) => useDrumKeyboard(padMap, onTrigger, enabled),
        { initialProps: { enabled: true } },
      );

      rerender({ enabled: false });
      press(window, 'KeyL');
      expect(onTrigger).not.toHaveBeenCalled();

      rerender({ enabled: true });
      press(window, 'KeyL');
      expect(onTrigger).toHaveBeenCalledTimes(1);
    });

    it('never attaches listeners when mounted disabled', () => {
      const addSpy = vi.spyOn(window, 'addEventListener');
      renderHook(() => useDrumKeyboard(padMap, vi.fn(), false));

      expect(addSpy.mock.calls.some(([t]) => t === 'keydown' || t === 'keyup')).toBe(false);
    });
  });
});
