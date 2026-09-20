import Link from "next/link";
import { ArrowRight } from "./components/icons";

export default function NotFound() {
  return (
    <main id="main" tabIndex={-1} className="lost">
      <div className="shell narrow">
        <p className="eyebrow eyebrow-violet">404</p>
        <h1 className="display">
          This page <em>isn&apos;t here.</em>
        </h1>
        <p className="lede">The link may be old, or the page may have moved.</p>
        <div className="hero-ctas">
          <Link className="btn btn-dark" href="/">
            Back to home <ArrowRight className="btn-arrow" />
          </Link>
          <Link className="btn btn-ghost" href="/resources">
            Browse the guides
          </Link>
        </div>
      </div>
    </main>
  );
}
