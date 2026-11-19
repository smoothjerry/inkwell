import { describe, expect, it } from "vitest";
import {
  BACKUP_INTERVAL_MS,
  backupFileName,
  backupsToDelete,
  isBackupDue,
  isBackupFile,
} from "./backups";

describe("backupFileName", () => {
  it("uses the local calendar date with zero padding", () => {
    expect(backupFileName("inkwell", new Date(2026, 0, 5, 23, 59))).toBe("inkwell-20260105.db");
  });
});

describe("isBackupFile", () => {
  it.each([
    ["the app's backup", "inkwell", "inkwell-20261118.db", true],
    ["the dev build's backup, for the app", "inkwell", "inkwell-dev-20261118.db", false],
    ["the dev build's backup, for the dev build", "inkwell-dev", "inkwell-dev-20261118.db", true],
    ["a short date", "inkwell", "inkwell-2026111.db", false],
    ["another extension", "inkwell", "inkwell-20261118.db-wal", false],
    ["the live database", "inkwell", "inkwell.db", false],
  ])("%s", (_name, prefix, file, expected) => {
    expect(isBackupFile(prefix, file)).toBe(expected);
  });
});

describe("isBackupDue", () => {
  const now = Date.UTC(2026, 10, 18, 12);

  it.each([
    ["when there is no backup", null, true],
    ["when the newest is exactly 24 hours old", now - BACKUP_INTERVAL_MS, false],
    ["when the newest is just over 24 hours old", now - BACKUP_INTERVAL_MS - 1, true],
    ["when the newest is from earlier today", now - 60_000, false],
  ])("%s", (_name, newest, expected) => {
    expect(isBackupDue(newest, now)).toBe(expected);
  });
});

describe("backupsToDelete", () => {
  const eight = Array.from({ length: 8 }, (_, i) => `inkwell-2026111${i}.db`);

  it("keeps the seven newest and deletes the rest, oldest first", () => {
    expect(backupsToDelete(eight, "inkwell")).toEqual(["inkwell-20261110.db"]);
  });

  it("deletes nothing when there are seven or fewer", () => {
    expect(backupsToDelete(eight.slice(1), "inkwell")).toEqual([]);
  });

  it("orders by the date in the name, not the order given", () => {
    const shuffled = ["inkwell-20261117.db", "inkwell-20260101.db", "inkwell-20261116.db"];

    expect(backupsToDelete(shuffled, "inkwell", 2)).toEqual(["inkwell-20260101.db"]);
  });

  it("never touches other files or the other build's backups", () => {
    const files = [...eight, "inkwell-dev-20200101.db", "notes.txt", "inkwell.db"];

    expect(backupsToDelete(files, "inkwell")).toEqual(["inkwell-20261110.db"]);
  });
});
