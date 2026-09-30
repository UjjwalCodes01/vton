"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Method } from "./Reference";
import { DOC_PAGES } from "./pages";

export default function DocsNav() {
  const pathname = usePathname();
  const groups = [...new Set(DOC_PAGES.map((page) => page.group))];
  const navRef = useRef<HTMLElement>(null);

  // On phones the nav is one sideways-scrolling row; bring the current page's
  // pill into view. Scrolls only the row itself, never the page.
  useEffect(() => {
    const nav = navRef.current;
    const current = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !current || nav.scrollWidth <= nav.clientWidth) return;
    nav.scrollLeft = current.offsetLeft - nav.offsetLeft - 16;
  }, [pathname]);

  return (
    <nav className="doc-nav" aria-label="API documentation" ref={navRef}>
      {groups.map((group) => (
        <div key={group}>
          <p>{group}</p>
          {DOC_PAGES.filter((page) => page.group === group).map((page) => (
            <Link key={page.href} href={page.href} aria-current={pathname === page.href ? "page" : undefined}>
              {page.method ? <Method method={page.method} /> : null}
              {page.label}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
