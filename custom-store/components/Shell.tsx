import Link from "next/link";
import { signOut } from "@/app/actions";

const ICONS: Record<string, string> = {
  overview: "M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  generations: "M4 5h16v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM8 13l2.5-3 2 2.5L15 9l3 4",
  playground: "M12 3v5m0 8v5M3 12h5m8 0h5M6.3 6.3l3.5 3.5m4.4 4.4 3.5 3.5m0-11.4-3.5 3.5m-4.4 4.4-3.5 3.5",
  billing: "M3 7h18v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM3 7l2-3h14l2 3M3 11h18",
  stores: "M4 9h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM3 9l1.6-4.4A1 1 0 0 1 5.5 4h13a1 1 0 0 1 .9.6L21 9",
  docs: "M6 4h9l4 4v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM14 4v5h5M9 13h6M9 17h6",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z",
};

function Icon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}

const MAIN: [string, string, string][] = [
  ["/", "Overview", "overview"],
  ["/playground", "Playground", "playground"],
  ["/generations", "Generations", "generations"],
  ["/billing", "Billing", "billing"],
];

const ACCOUNT: [string, string, string][] = [
  ["/settings", "Stores & settings", "settings"],
  ["/docs", "Documentation", "docs"],
];

export function Shell({
  active,
  account,
  children,
}: {
  active: string;
  account: { email: string; name: string | null; avatarUrl: string | null };
  children: React.ReactNode;
}) {
  const initial = (account.name || account.email).trim().charAt(0).toUpperCase();

  return (
    <div className="app">
      <aside className="side">
        <div className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brand-mark" src="/icon.png" alt="" width={28} height={28} />
          <span className="brand-text">
            <b>Clothsy AI</b>
            <em>platform</em>
          </span>
        </div>

        <nav className="nav">
          {MAIN.map(([href, label, icon]) => (
            <Link key={href} href={href} className={`nav-link${href === active ? " is-active" : ""}`}>
              <Icon name={icon} />
              <span>{label}</span>
            </Link>
          ))}

          <span className="nav-label">Account</span>
          {ACCOUNT.map(([href, label, icon]) => (
            <Link key={href} href={href} className={`nav-link${href === active ? " is-active" : ""}`}>
              <Icon name={icon} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="side-foot">
          <div className="me">
            {account.avatarUrl ? (
              // Google's avatar, straight from their CDN.
              // eslint-disable-next-line @next/next/no-img-element
              <img className="me-avatar" src={account.avatarUrl} alt="" width={30} height={30} />
            ) : (
              <span className="me-avatar">{initial}</span>
            )}
            <span className="me-text">
              <b>{account.name || account.email.split("@")[0]}</b>
              <span>{account.email}</span>
            </span>
          </div>
          <form action={signOut}>
            <button className="link-btn" type="submit">Sign out</button>
          </form>
        </div>
      </aside>

      <main className="main">
        <div className="main-inner">{children}</div>
      </main>
    </div>
  );
}

export function PageHead({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <header className="page-head">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 18, flexWrap: "wrap" }}>
        <div>
          <h1 className="display">{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {actions}
      </div>
    </header>
  );
}
