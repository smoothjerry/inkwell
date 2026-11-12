import type { ReactNode } from "react";

type SettingRowProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

/** One setting: its name and explanation on the left, its control on the right. */
export function SettingRow({ title, description, children }: SettingRowProps) {
  return (
    <div className="flex items-start justify-between gap-6 py-3">
      <div className="min-w-0">
        <p className="text-foreground">{title}</p>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">{children}</div>
    </div>
  );
}
