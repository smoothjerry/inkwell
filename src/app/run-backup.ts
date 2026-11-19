import { isTauri } from "@tauri-apps/api/core";
import { appConfigDir, join } from "@tauri-apps/api/path";
import { BaseDirectory, mkdir, readDir, remove, stat } from "@tauri-apps/plugin-fs";
import { backupFileName, backupsToDelete, isBackupDue, isBackupFile } from "@/domain/backups";
import { backupDatabaseTo, DB_FILE_STEM } from "@/lib/db";

/** The folder next to the database, which tauri-plugin-sql keeps in AppConfig. */
const BACKUP_DIR = "backups";
const inAppConfig = { baseDir: BaseDirectory.AppConfig };

/**
 * Backs the database up if the newest backup is over 24 hours old, then
 * deletes all but the newest seven (DESIGN_SPEC §4.3). Only this build's
 * backups are counted or deleted. Does nothing outside the Tauri app.
 */
export async function runBackup(now: Date = new Date()): Promise<void> {
  if (!isTauri()) {
    return;
  }
  await mkdir(BACKUP_DIR, { ...inAppConfig, recursive: true });
  const entries = await readDir(BACKUP_DIR, inAppConfig);
  const names = entries
    .filter((entry) => entry.isFile && isBackupFile(DB_FILE_STEM, entry.name))
    .map((entry) => entry.name);

  let newest: number | null = null;
  for (const name of names) {
    const modified = (await stat(`${BACKUP_DIR}/${name}`, inAppConfig)).mtime?.getTime();
    if (modified !== undefined && (newest === null || modified > newest)) {
      newest = modified;
    }
  }
  if (!isBackupDue(newest, now.getTime())) {
    return;
  }

  const name = backupFileName(DB_FILE_STEM, now);
  // VACUUM INTO refuses to overwrite, so clear a same-named file first.
  if (names.includes(name)) {
    await remove(`${BACKUP_DIR}/${name}`, inAppConfig);
  }
  await backupDatabaseTo(await join(await appConfigDir(), BACKUP_DIR, name));

  const all = [...new Set([...names, name])];
  for (const old of backupsToDelete(all, DB_FILE_STEM)) {
    await remove(`${BACKUP_DIR}/${old}`, inAppConfig);
  }
}
