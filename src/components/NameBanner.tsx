/** The ornate orange name plate that overlaps the bottom of the portrait. */
export function NameBanner({ name }: { name: string }) {
  return (
    <div className="relative mx-auto aspect-[405/137] w-[25.3rem] max-w-full">
      <svg viewBox="0 0 405 137" className="absolute inset-0 size-full" aria-hidden="true">
        <defs>
          <linearGradient id="banner-face" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffc35a" />
            <stop offset="0.55" stopColor="#f59a2a" />
            <stop offset="1" stopColor="#e07d14" />
          </linearGradient>
          <linearGradient id="banner-frame" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffe08a" />
            <stop offset="1" stopColor="#b4600c" />
          </linearGradient>
          <radialGradient id="banner-gem" cx="0.35" cy="0.35" r="0.7">
            <stop offset="0" stopColor="#ffd2b8" />
            <stop offset="0.35" stopColor="#ff6a3a" />
            <stop offset="1" stopColor="#9c1a08" />
          </radialGradient>
        </defs>

        {/* Leaves on the four corners */}
        <g fill="#f2a93b" stroke="#a85a0a" strokeWidth="1.5">
          <path d="M28 30 C10 26 4 10 6 2 C18 6 30 14 34 30 Z" />
          <path d="M28 107 C10 111 4 127 6 135 C18 131 30 123 34 107 Z" />
          <path d="M377 30 C395 26 401 10 399 2 C387 6 375 14 371 30 Z" />
          <path d="M377 107 C395 111 401 127 399 135 C387 131 375 123 371 107 Z" />
        </g>

        {/* Frame with top and bottom notches */}
        <path
          d="M30 24 H185 L195 14 H210 L220 24 H375 V113 H220 L210 123 H195 L185 113 H30 Z"
          fill="url(#banner-frame)"
          stroke="#7a3d06"
          strokeWidth="2"
        />
        <rect x="40" y="33" width="325" height="71" rx="4" fill="url(#banner-face)" stroke="#a5560a" strokeWidth="2" />
        <path d="M70 92 C150 40 280 34 345 46" stroke="#fff4d6" strokeOpacity="0.45" strokeWidth="2" fill="none" />

        {/* Gems on both ends */}
        <circle cx="30" cy="68" r="17" fill="#c98a1e" stroke="#7a3d06" strokeWidth="2" />
        <circle cx="30" cy="68" r="12" fill="url(#banner-gem)" />
        <circle cx="375" cy="68" r="17" fill="#c98a1e" stroke="#7a3d06" strokeWidth="2" />
        <circle cx="375" cy="68" r="12" fill="url(#banner-gem)" />
      </svg>
      <p className="absolute inset-0 grid place-items-center truncate px-[14%] text-center text-[1.8rem] font-semibold leading-none text-[#2a1608]">
        {name}
      </p>
    </div>
  );
}
