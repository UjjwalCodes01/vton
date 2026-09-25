import { PRODUCT_HUNT_URL } from "../_lib/site";

const LOGO = "https://ph-files.imgix.net/28e28ac7-0d96-4ae3-b59e-4c7ba22ddb8c.png?auto=compress,format&codec=mozjpeg&cs=strip&fit=crop&h=128&w=128";

/** Clothsy AI's Product Hunt listing, styled to the site instead of Product Hunt's inline-styled embed. */
export default function ProductHuntCard() {
  return (
    <a
      className="fv-ph"
      href={`${PRODUCT_HUNT_URL}?embed=true&utm_source=embed&utm_medium=post_embed`}
      target="_blank"
      rel="noopener noreferrer"
      data-magnet
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="fv-ph-logo" src={LOGO} alt="" width={56} height={56} loading="lazy" />
      <span className="fv-ph-body">
        <span className="fv-ph-kicker">
          <svg width="14" height="14" viewBox="0 0 40 40" aria-hidden="true">
            <circle cx="20" cy="20" r="20" fill="#FF6154" />
            <path d="M22.7 20H17v-6h5.7a3 3 0 0 1 0 6Zm0-10H13v20h4v-6h5.7a7 7 0 0 0 0-14Z" fill="#fff" />
          </svg>
          Featured on Product Hunt
        </span>
        <span className="fv-ph-title">Clothsy AI</span>
        <span className="fv-ph-text">See Yourself In Every Outfit</span>
      </span>
      <span className="fv-ph-cta">
        Check it out <span className="fv-arrow fv-arrow--up" aria-hidden="true">↗</span>
      </span>
    </a>
  );
}
