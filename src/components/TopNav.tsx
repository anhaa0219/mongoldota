"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, useState, type MouseEvent } from "react";
import { Logo } from "@/components/Logo";
import { navItems } from "@/lib/site-content";

/** A match page belongs to History; every other page is its own section. */
function sectionOf(pathname: string) {
  return pathname.startsWith("/matches") ? "/history" : pathname;
}

/** Pulses while the page behind this link is still loading. */
function NavLabel({ label }: { label: string }) {
  const { pending } = useLinkStatus();
  return <span className={pending ? "animate-pulse" : undefined}>{label}</span>;
}

export function TopNav() {
  const pathname = usePathname();
  // The section just clicked: the underline slides there at once, before the page arrives.
  const [clickedHref, setClickedHref] = useState<string | null>(null);
  const [lastPathname, setLastPathname] = useState(pathname);
  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    setClickedHref(null);
  }
  const activeHref = clickedHref ?? sectionOf(pathname);

  const navRef = useRef<HTMLElement>(null);
  const underlineRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const nav = navRef.current;
    const underline = underlineRef.current;
    if (!nav || !underline) return;

    function placeUnderline() {
      if (!nav || !underline) return;
      const link = nav.querySelector<HTMLElement>('[data-active="true"]');
      underline.style.opacity = link ? "1" : "0";
      if (!link) return;
      underline.style.width = `${link.offsetWidth}px`;
      underline.style.transform = `translateX(${link.offsetLeft}px)`;
    }

    placeUnderline();
    // Slide only after the first placement, so it does not fly in from the corner on load.
    const frame = requestAnimationFrame(() => underline.setAttribute("data-ready", "true"));
    // Fonts loading or the window resizing move the links.
    const observer = new ResizeObserver(placeUnderline);
    observer.observe(nav);
    for (const link of nav.querySelectorAll("a")) observer.observe(link);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [activeHref]);

  function markClicked(event: MouseEvent, href: string) {
    // Ctrl/Cmd/Shift-click opens a new tab: this page stays where it is.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    setClickedHref(href);
  }

  return (
    <header className="relative z-20 flex items-center gap-6 px-5 pt-6 md:px-0 lg:h-[7.5rem] lg:items-start lg:pt-[4.4rem]">
      <div className="shrink-0 md:hidden">
        <Logo />
      </div>
      <nav
        ref={navRef}
        aria-label="Sections"
        className="relative flex min-w-0 flex-1 gap-8 overflow-x-auto pb-[0.1rem] md:justify-center lg:gap-[4.9rem] lg:overflow-visible lg:pr-[9.5rem]"
      >
        {navItems.map((item) => {
          const isActive = item.href === activeHref;
          const isCurrentPage = item.href === sectionOf(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isCurrentPage ? "page" : undefined}
              data-active={isActive ? "true" : undefined}
              onClick={(event) => markClicked(event, item.href)}
              className={`shrink-0 whitespace-nowrap pb-[0.35rem] font-display text-[1.375rem] uppercase tracking-[0.04em] transition-[color,translate] duration-200 hover:-translate-y-[0.1rem] ${
                isActive ? "text-accent" : "text-white hover:text-accent"
              }`}
            >
              <NavLabel label={item.label} />
            </Link>
          );
        })}
        <span
          ref={underlineRef}
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 h-[0.12rem] rounded-full bg-accent opacity-0 shadow-[0_0_0.8rem_rgb(254_186_135/0.7)] data-[ready=true]:transition-[transform,width,opacity] data-[ready=true]:duration-300 data-[ready=true]:ease-out motion-reduce:transition-none"
        />
      </nav>
    </header>
  );
}
