import type { LucideIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** The radio value of "no colour". */
const NONE = "none";

type ColorPickerProps = {
  label: string;
  Icon: LucideIcon;
  /** The colour names, drawn from `--text-<name>` or `--highlight-<name>` tokens. */
  options: readonly string[];
  tokenPrefix: "text" | "highlight";
  /** The label of no colour: "Default" or "None". */
  noneLabel: string;
  value: string | null;
  onChange: (value: string | null) => void;
  onCloseAutoFocus: (event: Event) => void;
};

/** Upper-cases a colour name's first letter for display. */
export function colorLabel(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * A toolbar menu of named colours (DESIGN_SPEC §7.11), for text colour or
 * highlight. The button's bar shows the selection's colour.
 */
export function ColorPicker({
  label,
  Icon,
  options,
  tokenPrefix,
  noneLabel,
  value,
  onChange,
  onCloseAutoFocus,
}: ColorPickerProps) {
  const swatch = (name: string) => `var(--${tokenPrefix}-${name})`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`${label}: ${value === null ? noneLabel : colorLabel(value)}`}
          title={label}
          className="flex size-7 shrink-0 flex-col items-center justify-center gap-0.5 rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-accent"
        >
          <Icon className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
          <span
            aria-hidden="true"
            className="h-0.5 w-3.5 rounded-full"
            style={{ background: value === null ? "transparent" : swatch(value) }}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-40" onCloseAutoFocus={onCloseAutoFocus}>
        <DropdownMenuRadioGroup
          value={value ?? NONE}
          onValueChange={(next) => onChange(next === NONE ? null : next)}
        >
          <DropdownMenuRadioItem value={NONE}>{noneLabel}</DropdownMenuRadioItem>
          {options.map((name) => (
            <DropdownMenuRadioItem key={name} value={name}>
              <span
                aria-hidden="true"
                className="size-3 rounded-full border"
                style={{ background: swatch(name) }}
              />
              {colorLabel(name)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
