/**
 * Read-only: AI calls for the last 7 days, per day (UTC) and kind, then the five players with the most calls.
 * Prints tokens, not money: multiply by your provider's prices. Limits live in src/lib/ai/ai-limits.ts.
 * Run: npx tsx --env-file=.env.local src/db/scripts/ai-usage.ts
 */

import postgres from "postgres";

const out = (line: string) => process.stdout.write(`${line}\n`);
const right = (value: string | number, width: number) => String(value).padStart(width);

interface DayRow {
  day: string;
  kind: string;
  calls: number;
  failed: number;
  promptTokens: string;
  answerTokens: string;
}

// Wrapped in main(): tsx compiles this project's .ts files as CommonJS, which has no top-level await.
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    process.stderr.write("DATABASE_URL is not set (put it in .env.local).\n");
    process.exit(1);
  }

  const sql = postgres(url, { prepare: false, max: 1 });
  try {
    const days = await sql<DayRow[]>`
      select to_char(date_trunc('day', created_at at time zone 'UTC'), 'YYYY-MM-DD') as day, kind,
             count(*)::int as calls, (count(*) filter (where not ok))::int as failed,
             coalesce(sum(prompt_tokens), 0)::text as "promptTokens", coalesce(sum(answer_tokens), 0)::text as "answerTokens"
      from ai_calls where created_at > now() - interval '7 days'
      group by 1, 2 order by 1, 2`;
    out("day (UTC)   kind               calls  failed  prompt tokens  answer tokens");
    for (const row of days) {
      out(`${row.day}  ${row.kind.padEnd(17)} ${right(row.calls, 6)} ${right(row.failed, 7)} ${right(row.promptTokens, 14)} ${right(row.answerTokens, 14)}`);
    }
    if (days.length === 0) out("(no AI calls in the last 7 days)");

    const players = await sql<{ clerkUserId: string; calls: number }[]>`
      select clerk_user_id as "clerkUserId", count(*)::int as calls from ai_calls
      where created_at > now() - interval '7 days' group by 1 order by 2 desc limit 5`;
    out("\nMost calls, last 7 days");
    for (const row of players) out(`${right(row.calls, 6)}  ${row.clerkUserId}`);
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  // Print the reason only, never the connection string.
  process.stderr.write(`AI usage report failed: ${error instanceof Error ? error.message : "unknown error"}\n`);
  process.exit(1);
});
