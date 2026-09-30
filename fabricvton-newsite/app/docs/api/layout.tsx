import type { ReactNode } from "react";
import DocsNav from "../components/DocsNav";

export default function ApiDocsLayout({ children }: { children: ReactNode }) {
  return (
    <main id="main" tabIndex={-1} className="docs">
      <div className="shell docs-shell">
        <aside className="docs-side">
          <p className="docs-side-title">Try-on API</p>
          <DocsNav />
        </aside>
        <article className="docs-main">{children}</article>
      </div>
    </main>
  );
}
