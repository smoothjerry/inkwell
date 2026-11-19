/**
 * Database backups (DESIGN_SPEC §4.3). Pure functions.
 *
 * A backup is named `<prefix>-YYYYMMDD.db` after the local date it was made.
 * The prefix is the database's file name without `.db`, so the dev build's
 * backups (`inkwell-dev-…`) never mix with the app's (`inkwell-…`).
 */

/** A new backup is made once the newest one is older than this. */
export const BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** How many backups are kept. */
export const BACKUPS_KEPT = 7;

function pattern(prefix: string): RegExp {
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped}-(\\d{8})\\.db$`);
}

/** The backup file name for `date`, using the local calendar date. */
export function backupFileName(prefix: string, date: Date): string {
  const yyyy = String(date.getFullYear()).padStart(4, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${prefix}-${yyyy}${mm}${dd}.db`;
}

/** Whether `name` is one of `prefix`'s backups. */
export function isBackupFile(prefix: string, name: string): boolean {
  return pattern(prefix).test(name);
}

/**
 * Whether a backup is due: there is none yet, or the newest was written
 * more than 24 hours before `now`. Times are epoch milliseconds.
 */
export function isBackupDue(newestBackupAt: number | null, now: number): boolean {
  return newestBackupAt === null || now - newestBackupAt > BACKUP_INTERVAL_MS;
}

/**
 * The backups of `prefix` to delete so that only the `keep` newest remain,
 * newest judged by the date in the name. Other files are never returned.
 */
export function backupsToDelete(
  fileNames: readonly string[],
  prefix: string,
  keep: number = BACKUPS_KEPT,
): string[] {
  const backups = fileNames.filter((name) => isBackupFile(prefix, name)).sort();
  return backups.slice(0, Math.max(0, backups.length - keep));
}
