"use client";

import { useState } from "react";
import { ArrowRight } from "../components/icons";

export default function NewsletterForm() {
  const [done, setDone] = useState(false);

  return done ? (
    <p className="news-done">Thanks — we’ll send the next update your way.</p>
  ) : (
    <form
      className="news-form"
      onSubmit={(event) => {
        event.preventDefault();
        // TODO: post to your email provider (Klaviyo / Mailchimp / Resend) before launch.
        setDone(true);
      }}
    >
      <label className="sr-only" htmlFor="newsletter-email">
        Email address
      </label>
      <input
        id="newsletter-email"
        name="email"
        type="email"
        required
        placeholder="Enter your email"
        autoComplete="email"
      />
      <button type="submit" aria-label="Subscribe">
        <ArrowRight />
      </button>
    </form>
  );
}
