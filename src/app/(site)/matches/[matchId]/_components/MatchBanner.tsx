import { CountUp } from "@/app/(site)/_components/CountUp";
import { formatDuration } from "@/lib/format";
import type { MatchView, ScoreboardPlayer } from "../_utils/match-view-types";
import { useWords } from "@/lib/i18n/use-words";

/** Result, score and match facts. `ago` is computed on the server ("2 h ago"). */
export function MatchBanner({ view, ago, linked }: { view: MatchView; ago: string; linked: ScoreboardPlayer | undefined }) {
  const say = useWords().match.banner;
  const { header } = view;
  const winner = header.radiantWin ? "radiant" : "dire";
  const youWon = linked ? linked.team === winner : null;

  return (
    <header className="rise-in relative overflow-hidden rounded-[1.8rem] border border-white/10 px-[1.6rem] py-[1.4rem]">
      {/* Winning side's colour washes in from its corner */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 -z-10 opacity-60 ${
          header.radiantWin
            ? "bg-[radial-gradient(ellipse_at_0%_0%,rgb(146_200_74/0.35),transparent_60%)]"
            : "bg-[radial-gradient(ellipse_at_100%_0%,rgb(226_73_47/0.35),transparent_60%)]"
        }`}
      />
      <div className="flex flex-wrap items-end justify-between gap-[1rem]">
        <div>
          <p className="text-[0.95rem] uppercase tracking-[0.14em] text-white/55">
            {header.ranked ? say.ranked : say.unranked} · {formatDuration(header.durationSeconds)} · {ago} · {say.matchId(view.matchId)}
          </p>
          <h1 className="title-metal font-display text-[3rem] uppercase leading-none lg:text-[4.2rem]">
            {say.victory(header.radiantWin ? "Radiant" : "Dire")}
          </h1>
          {youWon !== null && (
            <p className={`mt-[0.4rem] text-[1.1rem] font-medium ${youWon ? "text-radiant" : "text-dire"}`}>
              {youWon ? say.youWon(linked?.hero.name ?? "") : say.youLost(linked?.hero.name ?? "")}
            </p>
          )}
        </div>
        <p className="font-display text-[3.4rem] leading-none tabular-nums" aria-label={say.score(header.radiantScore, header.direScore)}>
          <span className="text-radiant">
            <CountUp value={header.radiantScore} />
          </span>
          <span className="mx-[0.6rem] text-white/30">:</span>
          <span className="text-dire">
            <CountUp value={header.direScore} />
          </span>
        </p>
      </div>
      {!view.parsed && (
        <p className="mt-[0.8rem] text-[0.95rem] text-white/55">
          {say.notParsed}
        </p>
      )}
    </header>
  );
}
