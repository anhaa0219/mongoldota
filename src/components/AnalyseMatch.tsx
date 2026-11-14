"use client";

import { useState } from "react";

type Status = "idle" | "sending" | "requested" | "failed";

const FAILED = "OpenDota could not start the analysis. Try again later.";

async function sendRequest(matchId: number): Promise<{ status: Status; message?: string }> {
  try {
    const response = await fetch(`/api/matches/${matchId}/parse`, { method: "POST" });
    if (response.ok) return { status: "requested" };
    const body: unknown = await response.json();
    const hasMessage = typeof body === "object" && body !== null && "error" in body && typeof body.error === "string";
    return { status: "failed", message: hasMessage ? String(body.error) : FAILED };
  } catch {
    return { status: "failed", message: FAILED };
  }
}

const buttonClass =
  "rounded-full bg-accent/90 px-[1.2rem] py-[0.5rem] text-[1rem] font-medium text-ink transition-colors hover:bg-accent disabled:opacity-60";

/** Asks OpenDota to parse an unparsed match, then lets the player re-check a few minutes later. */
export function AnalyseMatch({ matchId, onCheckAgain }: { matchId: number; onCheckAgain: () => void }) {
  const [state, setState] = useState<{ status: Status; message?: string }>({ status: "idle" });

  async function analyse() {
    setState({ status: "sending" });
    setState(await sendRequest(matchId));
  }

  return (
    <div className="flex flex-wrap items-center gap-[1rem] rounded-[0.9rem] bg-white/5 px-[1rem] py-[0.8rem]" aria-live="polite">
      {state.status === "requested" ? (
        <>
          <p className="flex-1 text-[1rem] text-white/75">OpenDota is analysing this match. Check again in a few minutes.</p>
          <button type="button" onClick={onCheckAgain} className={buttonClass}>
            Check again
          </button>
        </>
      ) : (
        <>
          <p className="flex-1 text-[1rem] text-white/75">
            {state.status === "failed"
              ? state.message
              : "Gold graph, item timings, wards and deaths need OpenDota to analyse the replay (recent matches only)."}
          </p>
          <button type="button" onClick={analyse} disabled={state.status === "sending"} className={buttonClass}>
            {state.status === "sending" ? "Asking OpenDota…" : "Analyse with OpenDota"}
          </button>
        </>
      )}
    </div>
  );
}
