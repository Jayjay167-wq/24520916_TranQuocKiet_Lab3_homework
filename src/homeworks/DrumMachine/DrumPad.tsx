import type { DrumPad as DrumPadData } from './drumTypes';

interface DrumPadProps {
  pad: DrumPadData;
  isPressed: boolean;
  onTrigger: (pad: DrumPadData) => void;
}

export default function DrumPad({ pad, isPressed, onTrigger }: DrumPadProps) {
  return (
    <button
      type="button"
      className="drum-pad"
      aria-pressed={isPressed}
      aria-keyshortcuts={pad.keyLabel}
      onClick={() => onTrigger(pad)}
    >
      <span className="drum-pad__label">{pad.label}</span>
      <kbd className="drum-pad__key" aria-hidden="true">
        {pad.keyLabel}
      </kbd>
    </button>
  );
}
