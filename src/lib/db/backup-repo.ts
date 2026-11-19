import { getDb } from "./client";

export { DB_FILE_STEM } from "./client";

/**
 * Writes a complete copy of the database to `path`, which must not exist yet
 * (DESIGN_SPEC §4.3). `VACUUM INTO` copies through the open connection, so
 * the copy includes changes still in the WAL file, which a file copy of the
 * `.db` alone could miss.
 */
export async function backupDatabaseTo(path: string): Promise<void> {
  const db = await getDb();
  await db.execute("VACUUM INTO $1", [path]);
}
