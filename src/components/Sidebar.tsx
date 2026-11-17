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

      <div className="mt-auto flex w-full flex-col items-center gap-[2.05rem] border-t border-white/[0.08] pb-[4.15rem] pt-[4.25rem]">
        <ThemeToggle className={iconClass} />
        <LanguageSwitcher className={iconClass} />
        <SignOutButton>
          <button
            type="button"
            aria-label="Log out"
            title="Log out"
            className="grid size-[3.6rem] place-items-center rounded-full text-white/55 transition-colors hover:bg-dire/15 hover:text-dire"
          >
            <LogOut className={iconClass} />
          </button>
        </SignOutButton>
      </div>
    </aside>
  );
}
