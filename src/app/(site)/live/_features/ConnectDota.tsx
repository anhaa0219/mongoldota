"use client";

import { Check, Copy, Download } from "lucide-react";
import { useState } from "react";
import { saveBlob } from "../_utils/save-blob";
import { useWords } from "@/lib/i18n/use-words";

const LAUNCH_OPTION = "-gamestateintegration";
const WINDOWS_PATH = "C:\\Program Files (x86)\\Steam\\steamapps\\common\\dota 2 beta\\game\\dota\\cfg";
const MAC_PATH = "~/Library/Application Support/Steam/steamapps/common/dota 2 beta/game/dota/cfg";

type Download = { kind: "idle" } | { kind: "working" } | { kind: "done" } | { kind: "error"; message: string };

interface ConnectDotaProps {
  /** Dota has sent data at least once. */
  connected: boolean;
  /** A setup folder was downloaded before (on any device). */
  hasToken: boolean;
  /** Milliseconds since epoch of Dota's last update ever (null: never). */
  lastSeen: number | null;
  now: number;
  onDownloaded: () => void;
}

/** `failed`: the message when the server gives none of its own. */
async function downloadSetup(failed: string): Promise<string | null> {
  const response = await fetch("/api/live/setup", { method: "POST" });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    return body.error ?? failed;
  }
  saveBlob(await response.blob(), "mongoldota-dota-setup.zip");
  return null;
}

/** `text` with each {mark} replaced by its value in bold (word order is the language's own). */
function withBold(text: string, marks: Record<string, string>) {
  return text.split(/(\{\w+\})/).map((part, index) => {
    const mark = /^\{(\w+)\}$/.exec(part)?.[1];
    return mark && marks[mark] ? <strong key={index} className="text-white">{marks[mark]}</strong> : part;
  });
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-[1rem]">
      <span className="grid size-[2.2rem] shrink-0 place-items-center rounded-full bg-accent font-display text-[1.2rem] text-ink">{number}</span>
      <div className="flex min-w-0 flex-col gap-[0.5rem]">
        <h3 className="text-[1.15rem] font-medium text-white">{title}</h3>
        {children}
      </div>
    </li>
  );
}

/** One-time setup: launch option, the setup folder with this player's token, then wait for Dota's first update. */
export function ConnectDota({ connected, hasToken, lastSeen, now, onDownloaded }: ConnectDotaProps) {
  const [copied, setCopied] = useState(false);
  const say = useWords().live.connect;
  const [download, setDownload] = useState<Download>({ kind: "idle" });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(LAUNCH_OPTION);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const getSetup = async () => {
    setDownload({ kind: "working" });
    const failure = await downloadSetup(say.downloadFailed);
    if (failure) return setDownload({ kind: "error", message: failure });
    setDownload({ kind: "done" });
    onDownloaded();
  };

  const waiting = hasToken || download.kind === "done";
  const note = "text-[0.95rem] leading-relaxed text-white/70";

  return (
    <section aria-label={say.label} className="glass-panel rise-in flex flex-col gap-[1.2rem] rounded-[1.4rem] p-[1.2rem]">
      <div className="flex flex-wrap items-baseline justify-between gap-[0.5rem]">
        <h2 className="font-display text-[1.8rem] uppercase tracking-[0.06em] text-white">{say.title}</h2>
        <p className="text-[0.9rem] text-white/50">{say.once}</p>
      </div>
      <ol className="flex flex-col gap-[1.2rem]">
        <Step number={1} title={say.step1}>
          <p className={note}>{say.step1Text}</p>
          <div className="flex flex-wrap items-center gap-[0.6rem]">
            <code className="rounded-[0.6rem] bg-white/[0.08] px-[0.8rem] py-[0.4rem] text-[1rem] text-white">{LAUNCH_OPTION}</code>
            <button type="button" onClick={copy} className="flex items-center gap-[0.4rem] rounded-full bg-white/[0.1] px-[0.9rem] py-[0.4rem] text-[0.9rem] text-white hover:bg-white/[0.16]">
              {copied ? <Check className="size-[1rem]" aria-hidden="true" /> : <Copy className="size-[1rem]" aria-hidden="true" />}
              {copied ? say.copied : say.copy}
            </button>
          </div>
        </Step>
        <Step number={2} title={say.step2}>
          <button
            type="button"
            onClick={getSetup}
            disabled={download.kind === "working"}
            className="flex w-fit items-center gap-[0.5rem] rounded-full bg-accent px-[1.3rem] py-[0.5rem] font-medium text-ink hover:brightness-110 disabled:opacity-50"
          >
            <Download className="size-[1.1rem]" aria-hidden="true" />
            {download.kind === "working" ? say.preparing : hasToken ? say.downloadAgain : say.download}
          </button>
          {download.kind === "error" && <p className="text-[0.95rem] text-dire">{download.message}</p>}
          <p className={note}>
            {withBold(say.step2Text, { folder: "gamestate_integration", cfg: "cfg" })}
          </p>
          <p className="break-all text-[0.85rem] text-white/45">
            Windows: {WINDOWS_PATH}
            <br />
            Mac: {MAC_PATH}
          </p>
        </Step>
        <Step number={3} title={say.step3}>
          <p className={`text-[1rem] ${connected ? "text-radiant" : "text-white/70"}`} aria-live="polite">
            {connected ? say.connected : waiting ? say.waiting : say.doFirst}
            {!connected && lastSeen !== null && say.lastData(Math.max(1, Math.round((now - lastSeen) / 60_000)))}
          </p>
          {waiting && !connected && <p className="text-[0.85rem] text-white/45">{say.nothingAfter}</p>}
        </Step>
      </ol>
    </section>
  );
}
