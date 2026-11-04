import pg from "pg";

/** Server-side only: never import this module from client components. */
export function createPool(connectionString = process.env.DATABASE_URL): pg.Pool {
  if (!connectionString) throw new Error("DATABASE_URL is not set.");
  return new pg.Pool({ connectionString, max: 5 });
}

const globalForPool = globalThis as typeof globalThis & { jalacampusPool?: pg.Pool };

/** One shared pool per server process; cached on globalThis so dev hot reloads don't leak connections. */
export function getPool(): pg.Pool {
  globalForPool.jalacampusPool ??= createPool();
  return globalForPool.jalacampusPool;
}

export async function withTransaction<T>(client: pg.ClientBase, work: () => Promise<T>): Promise<T> {
  await client.query("BEGIN");
  try {
    const result = await work();
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}
