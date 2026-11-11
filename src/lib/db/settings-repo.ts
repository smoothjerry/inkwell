import { getDb } from "./client";

/** Returns every stored setting, with its JSON value parsed. */
export async function getSettings(): Promise<Record<string, unknown>> {
  const db = await getDb();
  const rows = await db.select<{ key: string; value: string }[]>("SELECT key, value FROM settings");
  const settings: Record<string, unknown> = {};
  for (const row of rows) {
    try {
      settings[row.key] = JSON.parse(row.value);
    } catch {
      // Ignore a value that is not valid JSON; the default applies.
    }
  }
  return settings;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO settings (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
    [key, JSON.stringify(value)],
  );
}
