import { getDb } from "./client";

export async function listAchievements(): Promise<{ id: string; unlockedAt: number }[]> {
  const db = await getDb();
  return db.select<{ id: string; unlockedAt: number }[]>(
    "SELECT id, unlocked_at AS unlockedAt FROM achievements",
  );
}

/** Records an unlock. Unlocking the same achievement again changes nothing. */
export async function unlockAchievement(id: string, unlockedAt: number): Promise<void> {
  const db = await getDb();
  await db.execute("INSERT OR IGNORE INTO achievements (id, unlocked_at) VALUES ($1, $2)", [
    id,
    unlockedAt,
  ]);
}
