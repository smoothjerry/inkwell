import Database from "@tauri-apps/plugin-sql";

// Must match DB_URL in src-tauri/src/migrations.rs, which registers the migrations.
const DB_URL = "sqlite:inkwell.db";

let connection: Promise<Database> | undefined;

/**
 * Returns the shared database connection, opening it on first use.
 * Loading runs any pending migrations. Foreign keys are already enforced by
 * the plugin's SQLite driver on every connection.
 */
export function getDb(): Promise<Database> {
  // A failed open is not cached, so the next call tries again.
  connection ??= open().catch((error: unknown) => {
    connection = undefined;
    throw error;
  });
  return connection;
}

async function open(): Promise<Database> {
  const db = await Database.load(DB_URL);
  // Returns a row, so it has to be a select. The mode is stored in the file.
  await db.select("PRAGMA journal_mode = WAL");
  return db;
}
