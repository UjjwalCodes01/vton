type IconProps = { className?: string };

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
  "aria-hidden": true,
};

export const ArrowRight = ({ className }: IconProps) => (
  <svg {...base} className={className} width="18" height="18">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export const ArrowUpRight = ({ className }: IconProps) => (
  <svg {...base} className={className} width="18" height="18">
    <path d="M7 17 17 7M8 7h9v9" />
  </svg>
);

export const Play = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className} width="12" height="12">
    <path d="M8 5.5v13l11-6.5z" />
  </svg>
);

export const Search = ({ className }: IconProps) => (
  <svg {...base} className={className} width="19" height="19">
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </svg>
);

export const ChevronDown = ({ className }: IconProps) => (
  <svg {...base} className={className} width="18" height="18">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const Check = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className} width="16" height="16">
    <circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.14" />
    <path d="m8 12.4 2.6 2.6L16 9.6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Sparkle = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className} width="16" height="16">
    <path d="M12 2.5 13.9 9 20.5 11 13.9 13 12 19.5 10.1 13 3.5 11 10.1 9z" />
  </svg>
);

export const Upload = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M12 16V4m0 0L8 8m4-4 4 4" />
    <path d="M4 16v2.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V16" />
  </svg>
);

export const Hanger = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M12 9.5a2.4 2.4 0 1 1 2.4-2.4" />
    <path d="M12 9.5 4.3 15a1.4 1.4 0 0 0 .8 2.5h13.8a1.4 1.4 0 0 0 .8-2.5L12 9.5Z" />
  </svg>
);

export const Wand = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="m5 19 9-9" />
    <path d="M16.5 4.5 15 6l3 3 1.5-1.5a2.1 2.1 0 0 0-3-3Z" />
    <path d="M8 4.5 8.7 6.3 10.5 7l-1.8.7L8 9.5l-.7-1.8L5.5 7l1.8-.7Z" />
  </svg>
);

export const Shield = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M12 3.5 5.5 6v5.6c0 4 2.7 7.1 6.5 8.4 3.8-1.3 6.5-4.4 6.5-8.4V6L12 3.5Z" />
    <path d="m9.3 12 1.9 1.9 3.5-3.6" />
  </svg>
);

export const Bolt = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M13 3 5.5 13.2h5.2L11 21l7.5-10.2h-5.2L13 3Z" />
  </svg>
);

export const Headset = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M5 13v-1a7 7 0 0 1 14 0v1" />
    <path d="M19 13.5v3a3.5 3.5 0 0 1-3.5 3.5H13" />
    <rect x="3" y="12.5" width="3.4" height="5.5" rx="1.5" />
    <rect x="17.6" y="12.5" width="3.4" height="5.5" rx="1.5" />
  </svg>
);

export const Eye = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M2.8 12S6.3 6 12 6s9.2 6 9.2 6-3.5 6-9.2 6-9.2-6-9.2-6Z" />
    <circle cx="12" cy="12" r="2.6" />
  </svg>
);

export const Bag = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M5.5 8h13l1 12h-15l1-12Z" />
    <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
  </svg>
);

export const Share = ({ className }: IconProps) => (
  <svg {...base} className={className} width="18" height="18">
    <path d="M12 15V4m0 0L8.5 7.5M12 4l3.5 3.5" />
    <path d="M6 11.5v6A1.5 1.5 0 0 0 7.5 19h9a1.5 1.5 0 0 0 1.5-1.5v-6" />
  </svg>
);

export const Swap = ({ className }: IconProps) => (
  <svg {...base} className={className} width="18" height="18">
    <path d="M4 8h13m0 0-3-3m3 3-3 3" />
    <path d="M20 16H7m0 0 3-3m-3 3 3 3" />
  </svg>
);

export const Close = ({ className }: IconProps) => (
  <svg {...base} className={className} width="18" height="18">
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
);

export const Photo = ({ className }: IconProps) => (
  <svg {...base} className={className} width="18" height="18">
    <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="m4 17 5-4.5 3.5 3 2.5-2 5 4" />
  </svg>
);

export const Lock = ({ className }: IconProps) => (
  <svg {...base} className={className} width="18" height="18">
    <rect x="5" y="10.5" width="14" height="9.5" rx="2.2" />
    <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
  </svg>
);

export const LinkIcon = ({ className }: IconProps) => (
  <svg {...base} className={className} width="18" height="18">
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
    <path d="M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1" />
  </svg>
);

export const Download = ({ className }: IconProps) => (
  <svg {...base} className={className} width="18" height="18">
    <path d="M12 4v11m0 0-3.5-3.5M12 15l3.5-3.5" />
    <path d="M5 19h14" />
  </svg>
);

export const Cart = ({ className }: IconProps) => (
  <svg {...base} className={className} width="18" height="18">
    <path d="M3.5 5h2.2l1.6 9.2a1.5 1.5 0 0 0 1.5 1.3h7.6a1.5 1.5 0 0 0 1.5-1.2L19 8H6.2" />
    <circle cx="9.5" cy="19" r="1.2" />
    <circle cx="16" cy="19" r="1.2" />
  </svg>
);

export const Mail = ({ className }: IconProps) => (
  <svg {...base} className={className} width="18" height="18">
    <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
    <path d="m4.5 8 7.5 5.5L19.5 8" />
  </svg>
);

export const Instagram = ({ className }: IconProps) => (
  <svg {...base} className={className} width="18" height="18">
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" />
  </svg>
);

export const LinkedIn = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className} width="16" height="16">
    <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4v11.25H3V9.75Zm6.5 0h3.83v1.54h.05c.53-1 1.84-2.06 3.79-2.06 4.05 0 4.8 2.66 4.8 6.13V21h-4v-5.02c0-1.2-.02-2.74-1.67-2.74-1.67 0-1.93 1.3-1.93 2.65V21h-3.87V9.75Z" />
  </svg>
);

export const XLogo = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className} width="16" height="16">
    <path d="M17.75 3h3.1l-6.77 7.74L22 21h-6.2l-4.86-6.36L5.4 21H2.3l7.24-8.27L2 3h6.36l4.4 5.82L17.75 3Zm-1.09 16.15h1.72L7.4 4.75H5.55l11.11 14.4Z" />
  </svg>
);
