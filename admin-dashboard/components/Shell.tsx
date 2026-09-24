import Link from "next/link";
import { signOut } from "@/app/actions";

const NAV: [string, string, string][] = [
  ["/", "Overview", "M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"],
  ["/stores", "Stores", "M4 9h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM3 9l1.6-4.4A1 1 0 0 1 5.5 4h13a1 1 0 0 1 .9.6L21 9"],
  ["/analytics", "Analytics", "M5 20V11M12 20V5M19 20v-6"],
  ["/failures", "Failures", "M12 8v5m0 3.5v.5M10.3 4.3 2.8 17a1.5 1.5 0 0 0 1.3 2.2h15.8A1.5 1.5 0 0 0 21.2 17L13.7 4.3a1.5 1.5 0 0 0-2.6 0z"],
  ["/audit", "Audit log", "M8 4h8a2 2 0 0 1 2 2v14l-6-3-6 3V6a2 2 0 0 1 2-2z"],
];

export function Shell({ email, active, children }: { email: string; active: string; children: React.ReactNode }) {
  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          <span className="brand-mark">C</span>
          <b>Clothsy AI</b>
          <em>admin</em>
        </div>
        <nav>
          {NAV.map(([href, label, path]) => (
            <Link key={href} href={href} className={`nav-link${href === active ? " is-active" : ""}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={path} />
              </svg>
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="side-foot">
          <span className="who" title={email}>{email}</span>
          <form action={signOut}>
            <button className="link-btn" type="submit">Sign out</button>
          </form>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
