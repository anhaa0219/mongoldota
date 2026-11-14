/** Read-only: lists the tables in the public schema. Run: npx tsx --env-file=.env.local src/db/scripts/check-db.ts */

import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  process.stderr.write("DATABASE_URL is not set (put it in .env.local).\n");
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1 });
const rows = await sql`select table_name from information_schema.tables where table_schema = 'public' order by table_name`;
process.stdout.write(`public tables (${rows.length}): ${rows.map((row) => row.table_name).join(", ") || "(none)"}\n`);
await sql.end();
