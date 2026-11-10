import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import './Piano.css';
import { generate88Keys } from './keyGenerator';
import PianoKey from './PianoKey';
import { PolyphonicSynth } from './PolyphonicSynth';

/** Middle C: the initial Tab stop and the key scrolled into view on mount. */
const ENTRY_MIDI = 60;

export default function Piano() {
  const [pressed, setPressed] = useState<ReadonlySet<number>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const tabStopRef = useRef<HTMLButtonElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const synthRef = useRef<PolyphonicSynth | null>(null);

  // Generated once; `slot` = number of white keys before this key.
  const keys = useMemo(() => {
    let whiteCount = 0;
    return generate88Keys().map((key) => {
      const slot = whiteCount;
      if (!key.isBlack) whiteCount += 1;
      return { ...key, slot };
    });
  }, []);

  // The AudioContext is created on the first key press (a user gesture), so
  // browsers' autoplay policies never block it.
  const getSynth = useCallback((): PolyphonicSynth => {
    if (!synthRef.current) {
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      synthRef.current = new PolyphonicSynth(ctx);
    }
    return synthRef.current;
  }, []);

  // Stable identities are what make React.memo on PianoKey effective.
  const handlePress = useCallback(
    (midi: number, freqHz: number) => {
      setPressed((prev) => (prev.has(midi) ? prev : new Set(prev).add(midi)));
      getSynth().noteOn(midi, freqHz);
    },
    [getSynth],
  );

  const handleRelease = useCallback((midi: number) => {
    setPressed((prev) => {
      if (!prev.has(midi)) return prev; // idempotent: same state, no re-render
      const next = new Set(prev);
      next.delete(midi);
      return next;
    });
    synthRef.current?.noteOff(midi);
  }, []);

  // Start with middle C in view and as the Tab stop.
  useEffect(() => {
    const region = scrollRef.current;
    const c4 = region?.querySelector<HTMLButtonElement>(`[data-midi="${ENTRY_MIDI}"]`);
    if (!region || !c4) return;
    tabStopRef.current = c4;
    region.scrollLeft = c4.offsetLeft - region.clientWidth / 2 + c4.offsetWidth / 2;
  }, []);

  useEffect(
    () => () => {
      synthRef.current?.dispose();
      synthRef.current = null;
      void ctxRef.current?.close();
      ctxRef.current = null;
    },
    [],
  );

  // Roving tabindex without React state, so moving focus never re-renders keys.
  const handleFocus = (event: FocusEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement) || target === tabStopRef.current) return;
    tabStopRef.current?.setAttribute('tabindex', '-1');
    target.setAttribute('tabindex', '0');
    tabStopRef.current = target;
  };

  // DOM order is pitch order, so siblings are chromatic neighbours.
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) return;

    let next: Element | null | undefined;
    switch (event.key) {
      case 'ArrowRight':
        next = target.nextElementSibling;
        break;
      case 'ArrowLeft':
        next = target.previousElementSibling;
        break;
      case 'Home':
        next = target.parentElement?.firstElementChild;
        break;
      case 'End':
        next = target.parentElement?.lastElementChild;
        break;
      default:
        return;
    }
    if (next instanceof HTMLElement) {
      event.preventDefault();
      next.focus();
    }
  };

  return (
    <section className="piano" aria-labelledby="piano-title">
      <h2 id="piano-title">Grand piano (88 keys)</h2>
      <p id="piano-hint" className="piano__hint">
        Tap or click keys. With the keyboard, Tab to the piano, move with the arrow keys, Home and
        End, and play with Space or Enter. Scroll sideways for more keys.
      </p>
      <div
        ref={scrollRef}
        className="piano__scroll"
        role="region"
        aria-label="Piano keyboard, A0 to C8"
        aria-describedby="piano-hint"
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
      >
        <div className="piano__keys">
          {keys.map((key) => (
            <PianoKey
              key={key.midi}
              midi={key.midi}
              freqHz={key.freqHz}
              noteName={key.noteName}
              isBlack={key.isBlack}
              slot={key.slot}
              isPressed={pressed.has(key.midi)}
              tabbable={key.midi === ENTRY_MIDI}
              onPress={handlePress}
              onRelease={handleRelease}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
