"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { MatchDetailPanel } from "@/components/MatchDetailPanel";
import { heroPortrait } from "@/lib/hero-images";
import type { MatchDetail } from "@/types/opendota";

/** Everything a History row shows before it is opened. Plain data (server -> client). */
export interface MatchRowData {
  id: number;
  heroName: string;
  heroSlug: string;
  won: boolean;
  ranked: boolean;
  kills: number;
  deaths: number;
  assists: number;
  gpm: number;
  durationMinutes: number;
  ago: string;
  /** 6 entries; null is an empty slot. */
  itemImages: (string | null)[];
}

type DetailState =
  | { status: "idle" | "loading" }
  | { status: "ready"; detail: MatchDetail }
  | { status: "failed"; message: string };

const FAILED = "Could not load this match. Try again.";

async function loadDetail(matchId: number): Promise<DetailState> {
  try {
    const response = await fetch(`/api/matches/${matchId}`);
    const body: unknown = await response.json();
    if (response.ok) return { status: "ready", detail: body as MatchDetail };
    const hasMessage = typeof body === "object" && body !== null && "error" in body && typeof body.error === "string";
    return { status: "failed", message: hasMessage ? String(body.error) : FAILED };
  } catch {
    return { status: "failed", message: FAILED };
  }
}

function DetailBody({ state, matchId, onCheckAgain }: { state: DetailState; matchId: number; onCheckAgain: () => void }) {
  if (state.status === "ready") return <MatchDetailPanel detail={state.detail} matchId={matchId} onCheckAgain={onCheckAgain} />;
  if (state.status === "failed") return <p className="text-[1.1rem] text-dire">{state.message}</p>;
  return <div className="h-[7rem] animate-pulse rounded-[0.8rem] bg-white/5" />;
}

/** One History row; opening it loads the match details once. */
export function MatchRow({ match }: { match: MatchRowData }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<DetailState>({ status: "idle" });

  async function load() {
    setDetail({ status: "loading" });
    setDetail(await loadDetail(match.id));
  }

  async function toggle() {
    setOpen(!open);
    if (open || detail.status === "loading" || detail.status === "ready") return;
    await load();
  }

  // The panel paints --panel-tint under its pointer light (a bg-* class would replace the light).
  const tint = match.won
    ? "[--panel-tint:linear-gradient(90deg,rgb(146_200_74/0.13),transparent_32%)]"
    : "[--panel-tint:linear-gradient(90deg,rgb(226_73_47/0.13),transparent_32%)]";
  const wasOpened = detail.status !== "idle";

  return (
    <li className={`glass-panel group/row overflow-hidden rounded-[1.2rem] ${tint}`}>
      <div className="flex items-stretch">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex min-w-0 flex-1 flex-wrap items-center gap-x-[1.2rem] gap-y-[0.6rem] px-[1rem] py-[0.7rem] text-left transition-colors hover:bg-white/5 active:scale-[0.995] md:grid md:grid-cols-[minmax(11rem,1fr)_6.5rem_5.2rem_4.2rem_5.6rem_auto_1.3rem]"
      >
        <span className="flex min-w-[11rem] flex-1 items-center gap-[0.9rem]">
          <span className="relative block h-[2.5rem] w-[4.4rem] shrink-0 overflow-hidden rounded-[0.4rem] bg-white/10">
            {match.heroSlug && <Image unoptimized src={heroPortrait(match.heroSlug)} alt="" fill sizes="4.5rem" className="object-cover transition-transform duration-300 group-hover/row:scale-110" />}
          </span>
          <span className="flex min-w-0 flex-col gap-[0.25rem] leading-tight">
            <span className="truncate text-[1.15rem] font-medium text-white">{match.heroName}</span>
            <span className="flex items-center gap-[0.4rem] text-[0.85rem] font-semibold uppercase tracking-wider">
              <span className={`rounded-full px-[0.55rem] py-[0.05rem] ${match.won ? "bg-radiant/20 text-radiant" : "bg-dire/20 text-dire"}`}>
                {match.won ? "Win" : "Loss"}
              </span>
              {match.ranked && <span className="rounded-full bg-white/10 px-[0.55rem] py-[0.05rem] text-white/70">Ranked</span>}
            </span>
          </span>
        </span>
        <span className="font-display text-[1.4rem] tabular-nums text-white" aria-label={`${match.kills} kills, ${match.deaths} deaths, ${match.assists} assists`}>
          {match.kills}/<span className="text-dire/90">{match.deaths}</span>/{match.assists}
        </span>
        <span className="text-[1rem] tabular-nums text-white/75">
          {match.gpm} <span className="text-[0.85rem] text-white/45">GPM</span>
        </span>
        <span className="whitespace-nowrap text-[0.95rem] tabular-nums text-white/65">{match.durationMinutes} min</span>
        <span className="whitespace-nowrap text-[0.95rem] text-white/50">{match.ago}</span>
        <span className="flex gap-[0.25rem]" aria-hidden="true">
          {match.itemImages.map((image, slot) => (
            <span key={slot} className="relative block h-[1.6rem] w-[2.2rem] overflow-hidden rounded-[0.25rem] bg-white/5">
              {image && <Image unoptimized src={image} alt="" fill sizes="2.5rem" className="object-cover" />}
            </span>
          ))}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`ml-auto size-[1.3rem] text-white/50 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <Link
        href={`/matches/${match.id}`}
        aria-label={`Full match: ${match.heroName}, ${match.won ? "win" : "loss"}, ${match.ago}`}
        className="flex shrink-0 items-center gap-[0.4rem] border-l border-white/10 px-[0.8rem] text-[0.95rem] font-medium text-accent transition-colors hover:bg-accent/10 md:px-[1rem]"
      >
        <span className="hidden md:inline">Full match</span>
        <ExternalLink className="size-[1.1rem] md:hidden" aria-hidden="true" />
      </Link>
      </div>
      {/* The row grows from 0 to its content's height; the details stay mounted once loaded */}
      <div className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="min-h-0 overflow-hidden" inert={!open}>
          {wasOpened && (
            <div className="border-t border-white/10 px-[1rem] py-[1.2rem]">
              <DetailBody state={detail} matchId={match.id} onCheckAgain={load} />
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
