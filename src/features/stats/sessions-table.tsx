import { wordsPerMinute } from "@/domain/sessions";
import type { RecentSession } from "@/lib/db";

function formatStart(startedAt: number): string {
  return new Date(startedAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatActive(activeMs: number): string {
  const minutes = Math.round(activeMs / 60_000);
  if (minutes < 1) {
    return "< 1 min";
  }
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

type SessionsTableProps = {
  /** Newest first. */
  sessions: RecentSession[];
};

const HEAD = "px-3 py-2 text-left font-normal text-muted-foreground";
const NUMBER = "px-3 py-2 text-right font-mono tabular-nums";

/** The most recent writing sessions. */
export function SessionsTable({ sessions }: SessionsTableProps) {
  if (sessions.length === 0) {
    return <p className="text-muted-foreground">No sessions yet. Start writing to record one.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-subtle">
            <th scope="col" className={HEAD}>
              Started
            </th>
            <th scope="col" className={`${HEAD} text-right`}>
              Active time
            </th>
            <th scope="col" className={`${HEAD} text-right`}>
              Words
            </th>
            <th scope="col" className={`${HEAD} text-right`}>
              WPM
            </th>
            <th scope="col" className={HEAD}>
              Documents
            </th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session) => {
            const wpm = wordsPerMinute(session.words, session.activeMs);
            return (
              <tr key={session.id} className="border-b last:border-b-0">
                <td className="px-3 py-2 whitespace-nowrap">{formatStart(session.startedAt)}</td>
                <td className={NUMBER}>{formatActive(session.activeMs)}</td>
                <td className={NUMBER}>{session.words.toLocaleString()}</td>
                <td className={NUMBER}>{wpm === null ? "—" : Math.round(wpm)}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {session.documentTitles.map((title) => (
                      <span
                        key={title}
                        className="max-w-40 truncate rounded-md border bg-subtle px-1.5 py-0.5 text-[12px]"
                      >
                        {title}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
