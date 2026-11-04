import { createPool } from "../src/lib/db/client.ts";
import { migrate } from "../src/lib/db/migrate.ts";

const pool = createPool();
const client = await pool.connect();
try {
  const applied = await migrate(client);
  console.log(applied.length ? `Applied: ${applied.join(", ")}` : "Database is up to date.");
} finally {
  client.release();
  await pool.end();
}
