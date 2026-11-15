import type { ReactNode } from "react";

type StatsSectionProps = {
  title: string;
  children: ReactNode;
};

/** A titled block of the Stats view. */
export function StatsSection({ title, children }: StatsSectionProps) {
  return (
    <section aria-label={title}>
      <h2 className="mb-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
        {title}
      </h2>
      {children}
    </section>
  );
}
