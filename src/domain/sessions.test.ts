import { describe, expect, it } from "vitest";
import {
  endOfLocalDay,
  localDateOf,
  recordActivity,
  recordWordCount,
  type Session,
  sessionWords,
} from "./sessions";

const MINUTE = 60_000;
const IDLE_MS = 10 * MINUTE;

function makeOptions() {
  let count = 0;
  return { idleMs: IDLE_MS, newId: () => `session-${++count}` };
}

/** Local time on 12 November 2026, so the tests do not depend on the time zone. */
function at(hours: number, minutes = 0, seconds = 0): number {
  return new Date(2026, 10, 12, hours, minutes, seconds).getTime();
}

/** Starts a session with one edit to `documentId`. */
function start(documentId: string, time: number, currentWords: number): Session {
  return recordActivity(null, { documentId, at: time, currentWords }, makeOptions()).active;
}

describe("idle split", () => {
  it("keeps the session one millisecond before the idle limit", () => {
    const options = makeOptions();
    const first = recordActivity(null, { documentId: "a", at: at(9), currentWords: 0 }, options);
    const next = recordActivity(
      first.active,
      { documentId: "a", at: at(9) + IDLE_MS - 1, currentWords: 0 },
      options,
    );

    expect(next.ended).toBeNull();
    expect(next.active.id).toBe(first.active.id);
  });

  it("splits at exactly 10 minutes without an edit", () => {
    const options = makeOptions();
    const first = recordActivity(null, { documentId: "a", at: at(9), currentWords: 0 }, options);
    const next = recordActivity(
      first.active,
      { documentId: "a", at: at(9) + IDLE_MS, currentWords: 5 },
      options,
    );

    // The idle session ends at its last edit, and a new one starts.
    expect(next.ended).toMatchObject({ id: first.active.id, endedAt: at(9) });
    expect(next.active.id).not.toBe(first.active.id);
    expect(next.active).toMatchObject({ startedAt: at(9) + IDLE_MS, endedAt: null, activeMs: 0 });
  });
});

describe("midnight split", () => {
  it("ends the session at 23:59:59.999 and starts a new one on the next date", () => {
    const options = makeOptions();
    const beforeMidnight = at(23, 59, 30);
    const afterMidnight = beforeMidnight + MINUTE; // 00:00:30 on 13 November
    const first = recordActivity(
      null,
      { documentId: "a", at: beforeMidnight, currentWords: 100 },
      options,
    );
    const counted = recordWordCount(first.active, "a", 120);
    const next = recordActivity(
      counted,
      { documentId: "a", at: afterMidnight, currentWords: 120 },
      options,
    );

    expect(next.ended).toMatchObject({
      id: first.active.id,
      localDate: "2026-11-12",
      endedAt: endOfLocalDay(beforeMidnight),
    });
    expect(next.ended && sessionWords(next.ended)).toBe(20);

    // The new session belongs to the next date and starts from the current count.
    expect(next.active.localDate).toBe("2026-11-13");
    expect(next.active.localDate).toBe(localDateOf(afterMidnight));
    expect(next.active.docs).toEqual([{ documentId: "a", startWords: 120, endWords: 120 }]);
  });
});

describe("multiple documents", () => {
  it("tracks each document's start and end counts and sums their net words", () => {
    const options = makeOptions();
    let session = start("a", at(9), 100);
    session = recordWordCount(session, "a", 150);
    session = recordActivity(
      session,
      { documentId: "b", at: at(9, 1), currentWords: 40 },
      options,
    ).active;
    session = recordWordCount(session, "b", 70);

    expect(session.docs).toEqual([
      { documentId: "a", startWords: 100, endWords: 150 },
      { documentId: "b", startWords: 40, endWords: 70 },
    ]);
    expect(sessionWords(session)).toBe(80);
  });
});

describe("deletion floors at 0", () => {
  it("counts a document that shrank as zero, not negative", () => {
    const session = recordWordCount(start("a", at(9), 500), "a", 200);

    expect(sessionWords(session)).toBe(0);
  });

  it("does not let a shrinking document cancel words written in another", () => {
    const options = makeOptions();
    let session = recordWordCount(start("a", at(9), 500), "a", 200);
    session = recordActivity(
      session,
      { documentId: "b", at: at(9, 1), currentWords: 0 },
      options,
    ).active;
    session = recordWordCount(session, "b", 120);

    expect(sessionWords(session)).toBe(120);
  });
});

describe("paste", () => {
  it("counts pasted words like typed words", () => {
    // A paste is one edit that raises the count by many words at once.
    const session = recordWordCount(start("a", at(9), 10), "a", 2_510);

    expect(sessionWords(session)).toBe(2_500);
  });
});
