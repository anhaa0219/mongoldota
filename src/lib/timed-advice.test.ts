import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const HOUR = 3_600_000;
const NOW = 100 * HOUR;
const store = vi.hoisted(() => ({ row: null as { payload: unknown; createdAt: Date } | null, writes: [] as unknown[] }));

vi.mock("next/server", () => ({ connection: async () => undefined }));
vi.mock("@/db", () => {
  const select = () => ({ from: () => ({ where: () => ({ limit: async () => (store.row ? [store.row] : []) }) }) });
  const insert = () => ({
    values: (values: { payload: unknown; createdAt: Date }) => ({
      onConflictDoUpdate: async () => {
        store.writes.push(values.payload);
        store.row = { payload: values.payload, createdAt: values.createdAt };
      },
    }),
  });
  return { db: { select, insert } };
});

const { getTimedAdvice } = await import("@/lib/timed-advice");
const schema = z.object({ text: z.string(), bracket: z.string() });

function ask(answer: { text: string; bracket: string } | null, bracket = "7") {
  const generate = vi.fn(async () => answer);
  const result = getTimedAdvice({ accountId: "123", kind: "stats-coach", schema, generate, stillFits: (value) => value.bracket === bracket });
  return { result, generate };
}

describe("getTimedAdvice", () => {
  beforeEach(() => {
    store.row = null;
    store.writes = [];
    vi.spyOn(Date, "now").mockReturnValue(NOW);
  });

  it("asks the AI the first time and saves the answer", async () => {
    const { result, generate } = ask({ text: "new", bracket: "7" });
    expect(await result).toEqual({ value: { text: "new", bracket: "7" }, createdAt: NOW, now: NOW });
    expect(generate).toHaveBeenCalledOnce();
    expect(store.writes).toHaveLength(1);
  });

  it("reuses advice younger than 12 hours without asking", async () => {
    store.row = { payload: { text: "old", bracket: "7" }, createdAt: new Date(NOW - 11 * HOUR) };
    const { result, generate } = ask({ text: "new", bracket: "7" });
    expect((await result)?.value.text).toBe("old");
    expect(generate).not.toHaveBeenCalled();
  });

  it("asks again after 12 hours, or sooner when the stored advice no longer fits", async () => {
    store.row = { payload: { text: "old", bracket: "7" }, createdAt: new Date(NOW - 13 * HOUR) };
    expect((await ask({ text: "new", bracket: "7" }).result)?.value.text).toBe("new");

    store.row = { payload: { text: "old", bracket: "6" }, createdAt: new Date(NOW - HOUR) };
    expect((await ask({ text: "for 7", bracket: "7" }).result)?.value.text).toBe("for 7");
  });

  it("keeps old advice when the AI fails, but not advice that no longer fits", async () => {
    store.row = { payload: { text: "old", bracket: "7" }, createdAt: new Date(NOW - 20 * HOUR) };
    expect((await ask(null).result)?.value.text).toBe("old");

    store.row = { payload: { text: "old", bracket: "6" }, createdAt: new Date(NOW - 20 * HOUR) };
    expect(await ask(null).result).toBeNull();
  });
});
