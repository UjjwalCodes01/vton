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
