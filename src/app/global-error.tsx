"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { useWords } from "@/lib/i18n/use-words";
import "./globals.css";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  retry: () => void;
}

/**
 * Replaces the root layout when it crashes: reports the error to Sentry and offers a retry.
 * It renders outside WordsProvider, so the words are English.
 */
export default function GlobalError({ error, retry }: GlobalErrorProps) {
  const words = useWords().common.crash;

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-dvh items-center justify-center p-[1.5rem]">
        <main className="glass-panel flex max-w-[28rem] flex-col items-center gap-[0.9rem] rounded-[1.4rem] p-[2rem] text-center">
          <h1 className="font-display text-[1.6rem] uppercase tracking-[0.06em] text-ink">{words.title}</h1>
          <p className="text-[0.95rem] text-muted">{words.text}</p>
          <button
            type="button"
            onClick={() => retry()}
            className="rounded-full bg-accent px-[2rem] py-[0.6rem] font-display text-[1.1rem] uppercase tracking-[0.06em] text-ink transition hover:brightness-110"
          >
            {words.retry}
          </button>
        </main>
      </body>
    </html>
  );
}
