import { useEffect, useRef } from "react";

type InlineRenameInputProps = {
  initialValue: string;
  label: string;
  /** Called with the trimmed name when it changed and is not empty. */
  onSubmit: (value: string) => void;
  /** Called once when editing ends, whether or not a name was submitted. */
  onDone: () => void;
};

/** Text field for renaming in place. Enter or blur saves; Escape cancels. */
export function InlineRenameInput({
  initialValue,
  label,
  onSubmit,
  onDone,
}: InlineRenameInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const finished = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  function finish(save: boolean) {
    if (finished.current) {
      return;
    }
    finished.current = true;
    const value = inputRef.current?.value.trim() ?? "";
    if (save && value !== "" && value !== initialValue) {
      onSubmit(value);
    }
    onDone();
  }

  return (
    <input
      ref={inputRef}
      defaultValue={initialValue}
      aria-label={label}
      className="h-5 min-w-0 flex-1 cursor-text rounded-sm border border-border-strong bg-background px-1 text-foreground outline-none select-text focus-visible:ring-2 focus-visible:ring-ring"
      onBlur={() => finish(true)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          finish(true);
        } else if (event.key === "Escape") {
          finish(false);
        }
      }}
    />
  );
}
