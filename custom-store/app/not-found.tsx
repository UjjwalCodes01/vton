import Link from "next/link";

export const metadata = { title: "Page not found", robots: { index: false, follow: false } };

export default function NotFound() {
  return (
    <main className="centre">
      <div className="signin">
        <div>
          <h1 className="display">Page not found</h1>
          <p className="sub" style={{ marginTop: 8 }}>
            That page doesn&apos;t exist in the Clothsy AI platform. Looking for the API docs? They&apos;re at{" "}
            <a href="https://clothsyai.fabricvton.com/docs/api">clothsyai.fabricvton.com/docs/api</a>.
          </p>
        </div>
        <Link className="btn violet" href="/">
          Back to overview
        </Link>
      </div>
    </main>
  );
}
