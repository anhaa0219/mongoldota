"use client";

import { Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { refreshLabel } from "@/lib/advice-refresh";

/** "Updated 2h ago · new advice in 9h 58m", ticking every minute. `initialNow` is the server's clock, so the first render matches. */
export function AdviceTimer({ createdAt, initialNow }: { createdAt: number; initialNow: number }) {
  const [now, setNow] = useState(initialNow);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <p className="flex items-center gap-[0.35rem] text-[0.85rem] text-white/50" title="AI advice refreshes at most once every 12 hours">
      <Clock className="size-[0.85rem]" aria-hidden="true" />
      {refreshLabel(createdAt, now)}
    </p>
  );
}
