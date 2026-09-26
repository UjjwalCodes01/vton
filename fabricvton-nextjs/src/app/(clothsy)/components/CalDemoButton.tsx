"use client";

import { getCalApi } from "@calcom/embed-react";

type CalDemoButtonProps = {
	className?: string;
	label?: string;
};

const CAL_NAMESPACE = "demo";
const CAL_LINK = "fabricvton-hz9xbt/demo";
const BOOKING_URL = `https://cal.com/${CAL_LINK}`;
// Default script URL used by getCalApi; watched so a blocked/failed load can fall back to the booking page.
const EMBED_JS_URL = "https://app.cal.com/embed/embed.js";

// Set once the embed script has failed to load, so later clicks go straight to the booking page.
let embedFailed = false;
let watchingScript = false;

function openBookingPage() {
	const win = window.open(BOOKING_URL, "_blank");
	if (win) {
		win.opener = null;
	} else {
		window.location.assign(BOOKING_URL);
	}
}

/**
 * The Cal.com embed is third-party code, so it is only loaded when someone clicks this button, never on page load
 * (and so never before cookie consent). The button deliberately has no data-cal-* attributes: once the embed is
 * loaded it would otherwise open a second modal through its own document-wide click handler.
 */
export default function CalDemoButton({
	className = "btn btn-secondary",
	label = "Book a Demo",
}: CalDemoButtonProps) {
	async function handleClick() {
		if (embedFailed) {
			openBookingPage();
			return;
		}
		try {
			const cal = await getCalApi({ namespace: CAL_NAMESPACE });
			const script = watchingScript
				? null
				: document.querySelector<HTMLScriptElement>(`script[src="${EMBED_JS_URL}"]`);
			if (script) watchingScript = true;
			script?.addEventListener(
				"error",
				() => {
					embedFailed = true;
					openBookingPage();
				},
				{ once: true },
			);
			cal("ui", {
				hideEventTypeDetails: false,
				layout: "month_view",
			});
			cal("modal", {
				calLink: CAL_LINK,
				config: { layout: "month_view", useSlotsViewOnSmallScreen: "true" },
			});
		} catch {
			embedFailed = true;
			openBookingPage();
		}
	}

	return (
		<button type="button" className={className} onClick={handleClick}>
			{label}
		</button>
	);
}
