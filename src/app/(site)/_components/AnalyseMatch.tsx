"use client";

import { useState } from "react";
import { useWords } from "@/lib/i18n/use-words";

type Status = "idle" | "sending" | "requested" | "failed";

/** `failed`: the message when OpenDota gives none of its own. */
async function sendRequest(matchId: number, failed: string): Promise<{ status: Status; message?: string }> {
  try {
    const response = await fetch(`/api/matches/${matchId}/parse`, { method: "POST" });
    if (response.ok) return { status: "requested" };
    const body: unknown = await response.json();
    const hasMessage = typeof body === "object" && body !== null && "error" in body && typeof body.error === "string";
    return { status: "failed", message: hasMessage ? String(body.error) : failed };
  } catch {
    return { status: "failed", message: failed };
  }
}

const buttonClass =
  "rounded-full bg-accent/90 px-[1.2rem] py-[0.5rem] text-[1rem] font-medium text-ink transition-colors hover:bg-accent disabled:opacity-60";

/** Asks OpenDota to parse an unparsed match, then lets the player re-check a few minutes later. */
export function AnalyseMatch({ matchId, onCheckAgain }: { matchId: number; onCheckAgain: () => void }) {
  const [state, setState] = useState<{ status: Status; message?: string }>({ status: "idle" });
  const words = useWords().shell.analyse;

  async function analyse() {
    setState({ status: "sending" });
    setState(await sendRequest(matchId, words.failed));
  }

  return (
    <div className="flex flex-wrap items-center gap-[1rem] rounded-[0.9rem] bg-white/5 px-[1rem] py-[0.8rem]" aria-live="polite">
      {state.status === "requested" ? (
        <>
          <p className="flex-1 text-[1rem] text-white/75">{words.requested}</p>
          <button type="button" onClick={onCheckAgain} className={buttonClass}>
            {words.checkAgain}
          </button>
        </>
      ) : (
        <>
          <p className="flex-1 text-[1rem] text-white/75">
            {state.status === "failed"
              ? state.message
              : words.explain}
          </p>
          <button type="button" onClick={analyse} disabled={state.status === "sending"} className={buttonClass}>
            {state.status === "sending" ? words.asking : words.analyse}
          </button>
        </>
      )}
    </div>
  );
}
