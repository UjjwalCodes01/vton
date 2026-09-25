"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CONSENT_EVENT, readConsent } from "../../_shared/CookieConsent";
import { RESEARCH_FORM_URL } from "../_lib/site";
import { Arrow } from "./Arrow";

const KEY = "fv_research_invite";

/**
 * A small invitation to the research team, bottom-right. It waits for the cookie toast to be answered so the two
 * never stack, appears once the visitor has scrolled past the hero, steps aside while the Careers section (which
 * says the same thing) is on screen, and never returns on this device once closed or used.
 */
export default function ResearchInvite({ waitForConsent }: { waitForConsent: boolean }) {
  const [eligible, setEligible] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [careersInView, setCareersInView] = useState(false);
  const [closed, setClosed] = useState(false);
  // The careers and contact pages already carry the same invitation.
  const quiet = ["/careers", "/contact"].includes(usePathname() ?? "");

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY)) return;
    } catch {
      /* storage blocked: show it, it just won't be remembered */
    }

    const check = () => {
      if (!waitForConsent || readConsent()) setEligible(true);
    };
    check();
    window.addEventListener(CONSENT_EVENT, check);

    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const careers = document.getElementById("careers");
    const io = careers ? new IntersectionObserver(([entry]) => setCareersInView(entry.isIntersecting), { threshold: 0.15 }) : null;
    if (careers && io) io.observe(careers);

    return () => {
      window.removeEventListener(CONSENT_EVENT, check);
      window.removeEventListener("scroll", onScroll);
      io?.disconnect();
    };
  }, [waitForConsent]);

  const close = () => {
    setClosed(true);
    try {
      localStorage.setItem(KEY, "closed");
    } catch {
      /* ignore */
    }
  };

  const show = eligible && scrolled && !careersInView && !closed && !quiet;

  return (
    <aside className="fv-invite" data-show={show} aria-label="Research team" aria-hidden={!show} inert={!show}>
      <button className="fv-invite-x" type="button" onClick={close} aria-label="Dismiss">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      <p className="fv-invite-eyebrow">
        <span className="fv-invite-dot" aria-hidden="true" />
        Now building
      </p>
      <p className="fv-invite-title">Join our virtual try-on research team</p>
      <p className="fv-invite-text">Fabric fidelity, drape, pose consistency and fast inference. Real research that ships.</p>
      <a className="fv-btn fv-btn--dark fv-btn--sm" href={RESEARCH_FORM_URL} target="_blank" rel="noopener noreferrer" onClick={close}>
        Apply in 2 minutes <Arrow dir="up" />
      </a>
    </aside>
  );
}
