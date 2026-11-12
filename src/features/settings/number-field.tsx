import { Minus, Plus } from "lucide-react";

type NumberFieldProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
};

const STEP_BUTTON =
  "flex size-7 items-center justify-center text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40";

/** A whole-number input with − and + buttons. Typed values apply on blur or Enter. */
export function NumberField({ label, value, min, max, step, onChange }: NumberFieldProps) {
  const clamp = (next: number) => Math.min(max, Math.max(min, Math.round(next)));

  function commit(text: string) {
    const parsed = Number(text.replace(/[,\s]/g, ""));
    if (text.trim() !== "" && Number.isFinite(parsed) && clamp(parsed) !== value) {
      onChange(clamp(parsed));
    }
  }

  return (
    <div className="inline-flex items-center rounded-md border bg-background">
      <button
        type="button"
        className={STEP_BUTTON}
        aria-label={`Decrease ${label}`}
        disabled={value <= min}
        onClick={() => onChange(clamp(value - step))}
      >
        <Minus className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
      </button>
      <input
        // Remount when the value changes from outside (buttons, presets).
        key={value}
        defaultValue={value}
        inputMode="numeric"
        aria-label={label}
        className="h-7 w-16 cursor-text bg-transparent text-center font-mono tabular-nums outline-none select-text"
        onBlur={(event) => commit(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
      />
      <button
        type="button"
        className={STEP_BUTTON}
        aria-label={`Increase ${label}`}
        disabled={value >= max}
        onClick={() => onChange(clamp(value + step))}
      >
        <Plus className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
      </button>
    </div>
  );
}
