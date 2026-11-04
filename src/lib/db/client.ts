import pg from "pg";

/** Server-side only: never import this module from client components. */
export function createPool(connectionString = process.env.DATABASE_URL): pg.Pool {
  if (!connectionString) throw new Error("DATABASE_URL is not set.");
  return new pg.Pool({ connectionString, max: 5 });
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
