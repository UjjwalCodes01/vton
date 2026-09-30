import Link from "next/link";
import { DOC_PAGES } from "./pages";

/** Previous / next links at the foot of each docs page. */
export default function Pager({ current }: { current: string }) {
  const i = DOC_PAGES.findIndex((page) => page.href === current);
  const prev = i > 0 ? DOC_PAGES[i - 1] : null;
  const next = i >= 0 && i < DOC_PAGES.length - 1 ? DOC_PAGES[i + 1] : null;
  return (
    <nav className="doc-pager" aria-label="More documentation">
      {prev ? (
        <Link href={prev.href}>
          <span>Previous</span>
          {prev.label}
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link href={next.href} className="is-next">
          <span>Next</span>
          {next.label}
        </Link>
      ) : null}
    </nav>
  );
}
