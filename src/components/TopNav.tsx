"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { navItems } from "@/lib/site-content";

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="relative z-20 flex items-center gap-6 px-5 pt-6 md:px-0 lg:h-[7.5rem] lg:items-start lg:pt-[4.4rem]">
      <div className="shrink-0 md:hidden">
        <Logo />
      </div>
      <nav
        aria-label="Sections"
        className="flex flex-1 gap-8 overflow-x-auto md:justify-center lg:gap-[4.9rem] lg:overflow-visible lg:pr-[9.5rem]"
      >
        {navItems.map((item) => {
          const isActive = item.href === pathname;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`shrink-0 whitespace-nowrap border-b-[0.1rem] pb-[0.25rem] font-display text-[1.375rem] uppercase tracking-[0.04em] transition-colors ${
                isActive
                  ? "border-accent text-accent"
                  : "border-transparent text-white hover:text-accent"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
