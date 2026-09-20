import { JOURNAL_POSTS } from "../_lib/content";
import { delay } from "../_lib/style";
import { Slot } from "./Slot";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });

/**
 * Not rendered on the homepage yet: `SHOW_JOURNAL` in _lib/site.ts is false until a real post is
 * published. Drafts render as static cards with no date and no link.
 */
export default function Journal() {
  if (JOURNAL_POSTS.length === 0) return null;

  return (
    <section className="fv-section" id="journal" aria-labelledby="journal-title">
      <div className="fv-wrap">
        <div className="fv-research-head" data-reveal>
          <p className="fv-eyebrow">JOURNAL</p>
          <h2 className="fv-h2" id="journal-title">
            What we are learning.
          </h2>
        </div>

        <ul className="fv-cards">
          {JOURNAL_POSTS.map((post, i) => {
            const published = post.status === "published";
            return (
              <li key={post.slug} data-reveal style={delay(i * 60)}>
                <article className="fv-card">
                  <div className="fv-card-media">
                    <Slot slot={post.image} sizes="(max-width: 639px) 100vw, 33vw" />
                  </div>
                  <div className="fv-card-body">
                    <span className="fv-card-no">
                      {published && post.publishedAt ? formatDate(post.publishedAt) : "In progress"}
                    </span>
                    {published ? (
                      <a className="fv-h3" href={`/journal/${post.slug}`}>
                        {post.title}
                      </a>
                    ) : (
                      <h3 className="fv-h3">{post.title}</h3>
                    )}
                    <p className="fv-card-desc">{post.excerpt}</p>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
