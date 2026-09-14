"use client";

import CalDemoButton from "./CalDemoButton";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SHOPIFY_APP_STORE_URL } from "../lib/site";

export default function StickyHeader() {
	const [isScrolled, setIsScrolled] = useState(false);

	useEffect(() => {
		const onScroll = () => {
			setIsScrolled(window.scrollY > 24);
		};

		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	return (
		<div className={`header-wrapper ${isScrolled ? "is-scrolled" : ""}`}>
			<header className="site-header">
				<div className="site-header-shell">
					<Link className="brand" href="/">
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img src="/fabricvton-removebg.png" alt="FabricVTON Logo" style={{ height: "40px", width: "auto" }} />
					</Link>

					<nav className="nav-links">
						<Link href="/#features">Features</Link>
						<Link href="/#pricing">Pricing</Link>
						<Link href="/#faq">FAQ</Link>
						<Link href="/about">About</Link>
						<Link href="/demo" className="nav-demo-link">Live Demo ✨</Link>
						<CalDemoButton className="cal-inline-trigger" label="Book a Demo" />
					</nav>

					<a
						className="btn btn-primary"
						href={SHOPIFY_APP_STORE_URL}
					>
						Install on Shopify
					</a>
				</div>
			</header>
		</div>
	);
}
