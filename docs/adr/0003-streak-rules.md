# ADR 0003: Streak and word-count rules

- **Status:** Accepted
- **Date:** 2026-11-09

## Context

The weekly streak is Inkwell's motivation system. Its rules must be simple enough to explain in one sentence, hard to lose unfairly, and computable from stored data without drift. The full rules are in the design spec, §6.

## Decision

**Word counting**

- Count words with `Intl.Segmenter` (word granularity, `isWordLike` segments) over the document's plain text. Everything visible counts, including code blocks.
- A session's words are the **net new words**, per document, floored at 0: `Σ max(0, end_words − start_words)`. Deleting never produces a negative count.
- Pasted text counts like typed text.

**Sessions**

- Sessions are automatic. One starts on the first edit and ends after 10 idle minutes (configurable), on app close, or at local midnight.
- A session belongs to exactly one local date. A session that crosses midnight is split.

**Weeks and goals**

- The weekly goal alone decides the streak. A week is met when its session words reach the goal.
- The week starts on a user-chosen day (default Monday), in local time.
- Each week snapshots its goal when first touched. Past weeks never change.
- A change of week start applies from the next week boundary. The transitional week gets a pro-rated goal.

**Streak**

- Current streak = consecutive met weeks ending at the last completed week, plus 1 if the current week is already met.
- An unmet week in progress does not break the streak until it ends.
- Weeks with no data count as unmet.
- The streak is derived from `sessions` and `weeks` on demand and is never stored.

**Daily target**

- Optional. It affects only the heatmap, the "today" ring, and the "Perfect week" badge. It never affects the streak.

**Not in v1:** streak freezes.

## Consequences

- One clear rule: hit the weekly number and the streak continues.
- Weekly granularity tolerates days off, so there is less pressure than with a daily streak.
- Paste can inflate counts. This is accepted: the tool is for self-accountability, not competition.
- Deriving the streak avoids drift but requires careful, well-tested week math (DST, week-start changes). That logic lives in `src/domain/` with table-driven tests.

## Alternatives considered

- **Daily streak:** familiar, but punishing and a poor fit for how most people write.
- **Gross words typed:** rewards churn and needs keystroke-level tracking.
- **Storing the streak count:** cheaper to read, but can drift from the underlying data.
