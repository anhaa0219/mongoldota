import { getMatch } from "@/lib/match-store";
import { db } from "@/db";
async function main() {
  const id = Number(process.argv[2]);
  const stored = await getMatch(id);
  process.stdout.write(`match ${id} stored: ${stored ? `yes (parsed=${stored.parsed})` : "no"}\n`);
  await db?.$client.end();
}
void main();
