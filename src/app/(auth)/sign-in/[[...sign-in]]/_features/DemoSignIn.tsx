"use client";

import { useSignIn } from "@clerk/nextjs";
import { Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useWords } from "@/lib/i18n/use-words";

/** A one-time sign-in token from our route; null when the demo is off or the route failed. */
async function fetchDemoTicket(): Promise<string | null> {
  try {
    const response = await fetch("/api/auth/demo", { method: "POST" });
    if (!response.ok) return null;
    const body: { ticket?: string } = await response.json();
    return body.ticket ?? null;
  } catch {
    return null;
  }
}

/** Demo day: one button under the Clerk card that signs in as the demo account (Steam already linked), no Google step. */
export function DemoSignIn() {
  const { signIn } = useSignIn();
  const router = useRouter();
  const words = useWords().shell.auth.demo;
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  async function signInAsDemo(): Promise<boolean> {
    const ticket = await fetchDemoTicket();
    if (!ticket) return false;

    const { error } = await signIn.ticket({ ticket });
    if (error || signIn.status !== "complete") return false;

    const finalized = await signIn.finalize({
      navigate: ({ decorateUrl }) => {
        const url = decorateUrl("/");
        if (url.startsWith("http")) window.location.href = url;
        else router.push(url);
      },
    });
    return finalized.error === null;
  }

  async function startDemo() {
    setIsSigningIn(true);
    setHasFailed(false);
    const isSignedIn = await signInAsDemo().catch(() => false);
    if (isSignedIn) return;
    setIsSigningIn(false);
    setHasFailed(true);
  }

  return (
    <div className="mt-[1.2rem] flex flex-col items-center gap-[0.6rem]">
      <button
        type="button"
        onClick={startDemo}
        disabled={isSigningIn}
        className="glass-panel glass-blur flex w-full items-center justify-center gap-[0.7rem] rounded-[0.75rem] px-[1.4rem] py-[1rem] text-[1.35rem] font-medium text-accent transition hover:bg-accent hover:text-ink disabled:opacity-60 disabled:hover:bg-transparent disabled:hover:text-accent"
      >
        <Zap className="size-[1.5rem]" aria-hidden="true" />
        {isSigningIn ? words.busy : words.button}
      </button>
      {hasFailed && (
        <p role="alert" className="text-[1.1rem] text-dire">
          {words.failed}
        </p>
      )}
    </div>
  );
}
