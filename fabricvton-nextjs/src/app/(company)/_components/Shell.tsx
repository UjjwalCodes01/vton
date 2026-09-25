import Footer from "./Footer";
import Motion from "./Motion";
import Nav from "./Nav";

/** Every company page: skip link, nav, the page itself, footer, and the motion engine (re-attached per page). */
export default function Shell({ current, children }: { current?: string; children: React.ReactNode }) {
  return (
    <>
      <a className="fv-skip" href="#main">
        Skip to content
      </a>
      <Nav current={current} />
      <main id="main">{children}</main>
      <Footer />
      <Motion />
    </>
  );
}
