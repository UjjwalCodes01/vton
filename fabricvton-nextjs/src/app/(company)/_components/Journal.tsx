import Image from "next/image";
import { JOURNAL_POSTS, type JournalPost } from "../_lib/content";
import { delay } from "../_lib/style";
import { Arrow } from "./Arrow";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });

function PostBody({ post, linked }: { post: JournalPost; linked: boolean }) {
  return (
    <>
      <div className="fv-post-media">
        <Image src={post.image.src} alt="" width={post.image.width} height={post.image.height} sizes="124px" unoptimized />
      </div>
      <div>
        <p className="fv-post-meta">
          {linked && post.publishedAt ? formatDate(post.publishedAt) : "In progress"}
        </p>
        <h3 className="fv-post-title">{post.title}</h3>
        <p className="fv-post-excerpt">{post.excerpt}</p>
      </div>
      {linked ? (
        <span className="fv-post-arrow" aria-hidden="true">
          →
        </span>
      ) : null}
    </>
  );
}

/**
 * Editorial cards. Drafts are static (no link, no date, no hover). A post only links, shows a date and
 * reacts to hover once its status is "published" in _lib/content.ts. Until then "View all posts" is hidden.
 */
export default function Journal() {
  const anyPublished = JOURNAL_POSTS.some((p) => p.status === "published");

  return (
    <section className="fv-section fv-journal" id="journal" aria-labelledby="journal-title">
      <div className="fv-wrap">
        <div className="fv-split">
          <div data-reveal>
            <p className="fv-eyebrow">FROM OUR JOURNAL</p>
            <h2 className="fv-h2" id="journal-title">
              Ideas, experiments and what we’re learning.
            </h2>
          </div>
          <div data-reveal style={delay(80)}>
            <p className="fv-lead">
              A behind-the-scenes look at our research, engineering and the problems we’re trying to understand.
            </p>
            {anyPublished ? (
              <a className="fv-link" href="/journal" data-magnet>
                View all posts <Arrow />
              </a>
            ) : null}
          </div>
        </div>

        <ul className="fv-posts">
          {JOURNAL_POSTS.map((post, i) => {
            const linked = post.status === "published";
            return (
              <li key={post.slug} data-reveal style={delay(i * 80)}>
                {linked ? (
                  <a className="fv-post is-link" href={`/journal/${post.slug}`} data-magnet>
                    <PostBody post={post} linked />
                  </a>
                ) : (
                  <article className="fv-post">
                    <PostBody post={post} linked={false} />
                  </article>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
