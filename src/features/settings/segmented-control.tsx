import { cn } from "@/lib/utils";

type SegmentedControlProps<T extends string> = {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
};

/** A row of mutually exclusive choices. Option names are shown capitalized. */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex rounded-md border bg-subtle p-0.5"
    >
      {options.map((option) => (
        // biome-ignore lint/a11y/useSemanticElements: styled segments, not native radio inputs.
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={option === value}
          className={cn(
            "h-6 rounded-sm px-2.5 text-muted-foreground capitalize outline-none focus-visible:ring-2 focus-visible:ring-ring",
            option === value && "bg-background text-foreground shadow-sm",
          )}
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
