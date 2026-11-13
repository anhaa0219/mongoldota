import { SignOutButton } from "@clerk/nextjs";
import { LogOut } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

const iconClass = "size-[1.9rem] stroke-[1.5]";

export function Sidebar() {
  return (
    <aside className="relative z-10 hidden w-[9.375rem] shrink-0 flex-col items-center border-r border-white/15 bg-white/[0.06] shadow-[inset_-1px_0_0_rgb(255_255_255/0.05)] backdrop-blur-2xl backdrop-saturate-150 md:flex">
      <div className="mt-[3.75rem]">
        <Logo />
      </div>

      <div className="mt-auto flex w-full flex-col items-center gap-[3.75rem] border-t border-white/[0.08] pb-[5rem] pt-[5.1rem]">
        <ThemeToggle className={iconClass} />
        <LanguageSwitcher className={iconClass} />
        <SignOutButton>
          <button
            type="button"
            aria-label="Log out"
            title="Log out"
            className="text-white/55 transition-colors hover:text-accent"
          >
            <LogOut className={iconClass} />
          </button>
        </SignOutButton>
      </div>
    </aside>
  );
}
