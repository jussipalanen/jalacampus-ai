import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ClientBase } from "pg";
import { withTransaction } from "./client.ts";

export const MIGRATIONS_DIR = join(process.cwd(), "db", "migrations");
const MIGRATION_FILE = /^\d{3}_[a-z0-9_-]+\.sql$/;
// Arbitrary constant shared by every migration run so concurrent runs serialize.
const MIGRATION_LOCK_ID = 7_316_002;

/** Applies pending `NNN_name.sql` files in order, each in its own transaction. Returns newly applied versions. */
export async function migrate(client: ClientBase, directory = MIGRATIONS_DIR): Promise<string[]> {
  const files = (await readdir(directory)).filter(file => MIGRATION_FILE.test(file)).sort();
  await client.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_ID]);
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);
    const { rows } = await client.query<{ version: string }>("SELECT version FROM schema_migrations");
    const applied = new Set(rows.map(row => row.version));
    const newlyApplied: string[] = [];
    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = await readFile(join(directory, file), "utf8");
      await withTransaction(client, async () => {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [file]);
      });
      newlyApplied.push(file);
    }
    return newlyApplied;
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_ID]);
  }
}
