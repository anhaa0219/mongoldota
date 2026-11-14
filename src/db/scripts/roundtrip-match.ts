/**
 * Saves real matches through match-store and reads them back. Writes to the database.
 * Run: npx tsx --env-file=.env.local src/db/scripts/roundtrip-match.ts <matchId> [matchId...]
 * Without DATABASE_URL it checks that loadMatch still works from OpenDota alone.
 */

import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { playerMatches } from "@/db/schema";
import { getMatch, loadMatch } from "@/lib/match-store";

const out = (line: string) => process.stdout.write(`${line}\n`);

async function main() {
  const ids = process.argv.slice(2).map(Number).filter((id) => Number.isSafeInteger(id) && id > 0);
  if (ids.length === 0) throw new Error("pass at least one match id");
  out(`database: ${db ? "configured" : "NOT configured (OpenDota only)"}`);

  for (const id of ids) {
    const saves: Promise<void>[] = [];
    const loaded = await loadMatch(id, (task) => saves.push(task()));
    await Promise.all(saves); // scripts wait for the save; pages run it after the response
    out(`match ${id}: loadMatch -> ${loaded ? `${loaded.players.length} players, ${(JSON.stringify(loaded).length / 1024).toFixed(0)} KB` : "null"}`);
    if (!db) continue;
    const stored = await getMatch(id);
    const [players] = await db.select({ rows: count() }).from(playerMatches).where(eq(playerMatches.matchId, id));
    out(`  stored: ${stored ? `parsed=${stored.parsed}, player rows=${players.rows}` : "NOT FOUND"}`);
  }
  await db?.$client.end(); // close the pool so the script exits on its own
}

main().catch((error: unknown) => {
  process.stderr.write(`roundtrip failed: ${error instanceof Error ? error.message : "unknown error"}\n`);
  process.exit(1);
});
