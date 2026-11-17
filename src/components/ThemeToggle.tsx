"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect } from "react";
import { usePreference } from "@/lib/use-preference";

const themes = ["dark", "light"] as const;

/**
 * Night / light mode switch. Sets `data-theme` on <html> and remembers the choice.
 * Light-mode colours still need to be defined in globals.css under [data-theme="light"].
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = usePreference("theme", themes, "dark");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggle = () => setTheme(theme === "dark" ? "light" : "dark");

  const label = theme === "dark" ? "Switch to light mode" : "Switch to night mode";

  return (
    <button type="button" onClick={toggle} aria-label={label} title={label} className="grid size-[3.6rem] place-items-center rounded-full text-white transition-colors hover:bg-white/10 hover:text-accent">
      {/* The key replays the pop each time the theme flips */}
      <span key={theme} className="pop-in block">
        {theme === "dark" ? <Moon className={className} /> : <Sun className={className} />}
      </span>
    </button>
  );
}
