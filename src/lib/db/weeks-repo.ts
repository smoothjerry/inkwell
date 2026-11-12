import { getDb } from "./client";

export type WeekRecord = {
  weekStart: string;
  weekStartsOn: number;
  goalWords: number;
  dailyTarget: number | null;
};

export async function listWeeks(): Promise<WeekRecord[]> {
  const db = await getDb();
  return db.select<WeekRecord[]>(
    `SELECT week_start AS weekStart, week_starts_on AS weekStartsOn,
            goal_words AS goalWords, daily_target AS dailyTarget
     FROM weeks ORDER BY week_start`,
  );
}

/** Inserts a week, or updates its goal and daily target. Its start day never changes. */
export async function saveWeek(week: WeekRecord): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO weeks (week_start, week_starts_on, goal_words, daily_target)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (week_start) DO UPDATE SET
       goal_words = excluded.goal_words, daily_target = excluded.daily_target`,
    [week.weekStart, week.weekStartsOn, week.goalWords, week.dailyTarget],
  );
}
