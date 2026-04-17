import type { Metadata } from "next";
import StickyHeader from "../components/StickyHeader";

export const metadata: Metadata = {
	title: "Privacy Policy | FabricVTON",
	description: "Privacy Policy for the FabricVTON Shopify App.",
};

export default function PrivacyPage() {
	return (
		<div className="landing-shell">
			<div className="bg-glow bg-glow-one" />
			<div className="bg-glow bg-glow-two" />

			<StickyHeader />

			<main
				className="container main-content"
				style={{
					maxWidth: "800px",
					margin: "0 auto",
					textAlign: "left",
					paddingTop: "6rem",
					paddingBottom: "4rem",
				}}
			>
				<h1 style={{ fontSize: "2.5rem", fontWeight: "bold", marginBottom: "0.5rem" }}>Privacy Policy (Merchants)</h1>
				<p style={{ color: "var(--fv-subdued)", marginBottom: "1.5rem" }}>
					Effective Date: April 17, 2026
				</p>

                <div style={{ marginBottom: "2rem" }}>
                    <p style={{ fontSize: "0.875rem", color: "var(--fv-subdued)", marginBottom: "0.25rem" }}>Looking for the privacy policy for the Virtual Try-On Widget?</p>
                    <a href="/privacy/widget" style={{ color: "var(--fv-foreground)", fontWeight: "500", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        View Shopper/End-User Privacy Policy <span>→</span>
                    </a>
                </div>

                <div style={{ backgroundColor: "white", border: "1px solid #111827", borderRadius: "6px", padding: "1.5rem", color: "#374151", marginBottom: "3rem", lineHeight: "1.6" }}>
                    This Privacy Policy describes how FabricVTON (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) collects, uses, and
					discloses information in connection with your installation and use of our Shopify
					application (the &quot;App&quot;). This policy is directed at <strong style={{ color: "#111827" }}>Merchants</strong> (Store Owners).
                </div>

				<section style={{ marginBottom: "3rem" }}>
					<h2 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "1.5rem", marginBottom: "1rem", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "0.5rem" }}>
						<span style={{ color: "#10B981" }}>1.</span> Introduction
					</h2>
					<p style={{ color: "var(--fv-subdued)", lineHeight: "1.6" }}>
						As a Shopify Merchant, you trust us with your store data and your customers&apos; experience. We
						are committed to protecting this information. When you install the App, you act as the <strong style={{ color: "var(--fv-foreground)" }}>Data Controller</strong> for your customers&apos; data, and we act as the <strong style={{ color: "var(--fv-foreground)" }}>Data Processor</strong>.
					</p>
				</section>

				<section style={{ marginBottom: "3rem" }}>
					<h2 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "1.5rem", marginBottom: "1rem", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "0.5rem" }}>
						<span style={{ color: "#10B981" }}>2.</span> Information We Collect from Merchants
					</h2>
					
					<ul style={{ listStyleType: "none", padding: 0, display: "flex", flexDirection: "column", gap: "1rem", color: "var(--fv-subdued)" }}>
						<li style={{ display: "flex", alignItems: "flex-start", gap: "8px", lineHeight: "1.6" }}>
							<span style={{ color: "#10B981", fontSize: "1.5rem", lineHeight: "1" }}>•</span>
							<span><strong style={{ color: "var(--fv-foreground)" }}>Shopify Account Info:</strong> Name, email address, shop domain, and contact details (via Shopify API).</span>
						</li>
						<li style={{ display: "flex", alignItems: "flex-start", gap: "8px", lineHeight: "1.6" }}>
							<span style={{ color: "#10B981", fontSize: "1.5rem", lineHeight: "1" }}>•</span>
							<span><strong style={{ color: "var(--fv-foreground)" }}>Billing Information:</strong> We do not store credit card details directly; billing is handled via Shopify&apos;s Billing API.</span>
						</li>
						<li style={{ display: "flex", alignItems: "flex-start", gap: "8px", lineHeight: "1.6" }}>
							<span style={{ color: "#10B981", fontSize: "1.5rem", lineHeight: "1" }}>•</span>
							<span><strong style={{ color: "var(--fv-foreground)" }}>Studio Assets:</strong> If you use the FabricVTON Studio to generate marketing images, we process the model photos and product images you upload.</span>
						</li>
                        <li style={{ display: "flex", alignItems: "flex-start", gap: "8px", lineHeight: "1.6" }}>
							<span style={{ color: "#10B981", fontSize: "1.5rem", lineHeight: "1" }}>•</span>
							<span><strong style={{ color: "var(--fv-foreground)" }}>Customer Data (On your behalf):</strong> We collect and process your customers&apos; photos and emails (if enabled) to provide the Virtual Try-On service. <strong style={{ color: "var(--fv-foreground)" }}>Note: You do not have access to view customer uploaded photos or generated try-on results.</strong> Even when customers use the &quot;Share&quot; feature to send results to friends, this does not grant you access to view these images. See the <a href="/privacy/widget" style={{ color: "#10B981", textDecoration: "underline" }}>Widget Privacy Policy</a> for details.</span>
						</li>
					</ul>
				</section>

				<section style={{ marginBottom: "3rem" }}>
					<h2 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "1.5rem", marginBottom: "1rem", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "0.5rem" }}>
						<span style={{ color: "#10B981" }}>3.</span> How We Use Merchant Information
					</h2>
					
					<ul style={{ listStyleType: "none", padding: 0, display: "flex", flexDirection: "column", gap: "1rem", color: "var(--fv-subdued)" }}>
						<li style={{ display: "flex", alignItems: "flex-start", gap: "8px", lineHeight: "1.6" }}>
							<span style={{ color: "#10B981", fontSize: "1.5rem", lineHeight: "1" }}>•</span>
							<span>To provide and operate the Service (generating AI images).</span>
						</li>
						<li style={{ display: "flex", alignItems: "flex-start", gap: "8px", lineHeight: "1.6" }}>
							<span style={{ color: "#10B981", fontSize: "1.5rem", lineHeight: "1" }}>•</span>
							<span>To process billing and subscription management.</span>
						</li>
						<li style={{ display: "flex", alignItems: "flex-start", gap: "8px", lineHeight: "1.6" }}>
							<span style={{ color: "#10B981", fontSize: "1.5rem", lineHeight: "1" }}>•</span>
							<span>To communicate with you regarding updates, support, or billing issues.</span>
						</li>
                        <li style={{ display: "flex", alignItems: "flex-start", gap: "8px", lineHeight: "1.6" }}>
							<span style={{ color: "#10B981", fontSize: "1.5rem", lineHeight: "1" }}>•</span>
							<span>To provide you with analytics (e.g., &quot;35% conversion uplift&quot;).</span>
						</li>
					</ul>
				</section>

				<section style={{ marginBottom: "3rem" }}>
					<h2 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "1.5rem", marginBottom: "1rem", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "0.5rem" }}>
						<span style={{ color: "#10B981" }}>4.</span> Data Processing &amp; Security
					</h2>
					<p style={{ marginBottom: "1.5rem", color: "var(--fv-subdued)" }}>We adhere to strict data security standards:</p>

					<ul style={{ listStyleType: "none", padding: 0, display: "flex", flexDirection: "column", gap: "1rem", color: "var(--fv-subdued)" }}>
						<li style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
							<span style={{ color: "#10B981", fontSize: "1.5rem", lineHeight: "1" }}>•</span>
							<span><strong style={{ color: "var(--fv-foreground)" }}>Encryption:</strong> All data is encrypted in transit (TLS) and at rest.</span>
						</li>
						<li style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
							<span style={{ color: "#10B981", fontSize: "1.5rem", lineHeight: "1" }}>•</span>
							<span><strong style={{ color: "var(--fv-foreground)" }}>Data Retention:</strong> Customer photos are <strong style={{ color: "var(--fv-foreground)" }}>automatically deleted after 7 days</strong>. Merchant account data is retained as long as the App is installed.</span>
						</li>
						<li style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
							<span style={{ color: "#10B981", fontSize: "1.5rem", lineHeight: "1" }}>•</span>
							<span><strong style={{ color: "var(--fv-foreground)" }}>AI Training:</strong> We <strong style={{ color: "var(--fv-foreground)" }}>DO NOT</strong> use your or your customers&apos; data to train our AI models.</span>
						</li>
					</ul>
				</section>

				<section style={{ marginBottom: "3rem" }}>
					<h2 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "1.5rem", marginBottom: "1rem", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "0.5rem" }}>
						<span style={{ color: "#10B981" }}>5.</span> Third-Party Subprocessors
					</h2>
					<p style={{ marginBottom: "1.5rem", color: "var(--fv-subdued)" }}>We use the following trusted services to run our infrastructure:</p>

					<ul style={{ listStyleType: "none", padding: 0, display: "flex", flexDirection: "column", gap: "1rem", color: "var(--fv-subdued)" }}>
						<li style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
							<span style={{ color: "#10B981", fontSize: "1.5rem", lineHeight: "1" }}>•</span>
							<span><strong style={{ color: "var(--fv-foreground)" }}>Shopify:</strong> Platform and Billing.</span>
						</li>
						<li style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
							<span style={{ color: "#10B981", fontSize: "1.5rem", lineHeight: "1" }}>•</span>
							<span><strong style={{ color: "var(--fv-foreground)" }}>Google Cloud (Vertex AI):</strong> Image generation (Enterprise-grade privacy).</span>
						</li>
						<li style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
							<span style={{ color: "#10B981", fontSize: "1.5rem", lineHeight: "1" }}>•</span>
							<span><strong style={{ color: "var(--fv-foreground)" }}>Render:</strong> Server hosting.</span>
						</li>
						<li style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
							<span style={{ color: "#10B981", fontSize: "1.5rem", lineHeight: "1" }}>•</span>
							<span><strong style={{ color: "var(--fv-foreground)" }}>PostHog:</strong> Product analytics.</span>
						</li>
						<li style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
							<span style={{ color: "#10B981", fontSize: "1.5rem", lineHeight: "1" }}>•</span>
							<span><strong style={{ color: "var(--fv-foreground)" }}>Sentry:</strong> Error monitoring.</span>
						</li>
						<li style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
							<span style={{ color: "#10B981", fontSize: "1.5rem", lineHeight: "1" }}>•</span>
							<span><strong style={{ color: "var(--fv-foreground)" }}>Crisp:</strong> Customer support chat.</span>
						</li>
					</ul>
				</section>

				<section style={{ marginBottom: "3rem" }}>
					<h2 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "1.5rem", marginBottom: "1rem" }}>
						<span style={{ color: "#10B981" }}>6.</span> Your Privacy Policy (Template)
					</h2>
					<p style={{ marginBottom: "1.5rem", color: "var(--fv-subdued)" }}>
						Since you are the Data Controller, you may need to update your store&apos;s privacy policy to
						inform your customers about the Virtual Try-On feature. You can copy/paste the section
						below:
					</p>

					<div style={{ backgroundColor: "#F0F7FF", border: "1px solid #BFDBFE", borderRadius: "8px", padding: "1.5rem", marginTop: "1rem" }}>
						<p style={{ color: "#475569", fontWeight: "500", marginBottom: "1rem" }}>Suggested Text for Your Privacy Policy:</p>

						<div style={{ backgroundColor: "white", border: "1px solid #111827", borderRadius: "6px", padding: "1.5rem", color: "#374151" }}>
                            <p style={{ fontWeight: "700", color: "#111827", marginBottom: "1.5rem" }}>Virtual Try-On Feature</p>

                            <p style={{ marginBottom: "1.5rem" }}>
                                Our store uses FabricVTON, a virtual try-on application that allows you to see how products look on you before making a purchase.
                            </p>

                            <p style={{ marginBottom: "1.5rem" }}>
                                <strong style={{ color: "#111827" }}>How it works:</strong> When you choose to use the virtual try-on feature, you will be asked to
                                upload a photo of yourself. This photo is processed securely using artificial
                                intelligence to generate a virtual try-on image.
                            </p>

                            <p style={{ marginBottom: "1.5rem" }}>
                                <strong style={{ color: "#111827" }}>Data Privacy:</strong> Your uploaded photo and the generated result are processed solely for
                                this purpose and are <strong style={{ color: "#111827" }}>automatically deleted after 7 days</strong>. Your photos are NOT used
                                to train AI models.
                            </p>

                            <p style={{ marginBottom: "0" }}>
                                For more details, please refer to the{" "}
                                <a href="https://www.fabricvton.com/privacy" style={{ color: "#10B981", textDecoration: "underline", fontWeight: "500" }}>
                                    FabricVTON Widget Privacy Policy
                                </a>.
                            </p>
                        </div>
					</div>
				</section>

				<section style={{ marginBottom: "3rem" }}>
					<h2 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "1.5rem", marginBottom: "1rem", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "0.5rem" }}>
						<span style={{ color: "#10B981" }}>7.</span> Contact Us
					</h2>

					<div style={{ backgroundColor: "white", border: "1px solid #111827", borderRadius: "6px", padding: "1.5rem", color: "#374151", marginTop: "1rem" }}>
						<ul style={{ listStyleType: "disc", paddingLeft: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem", margin: 0 }}>
							<li>
								<strong style={{ color: "#111827" }}>General:</strong>{" "}
								<a href="mailto:contact@fabricvton.com" style={{ color: "#10B981", textDecoration: "underline" }}>contact@fabricvton.com</a>
							</li>
							<li>
								<strong style={{ color: "#111827" }}>Support:</strong>{" "}
								<a href="mailto:support@fabricvton.com" style={{ color: "#10B981", textDecoration: "underline" }}>support@fabricvton.com</a>
							</li>
						</ul>
					</div>
				</section>

				<section style={{ marginBottom: "3rem" }}>
					<h2 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "1.5rem", marginBottom: "1rem", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "0.5rem" }}>
						<span style={{ color: "#10B981" }}>8.</span> Legal
					</h2>

					<div style={{ marginTop: "1rem", lineHeight: "1.8", color: "var(--fv-subdued)" }}>
						<p style={{ marginBottom: "0.5rem" }}>
							<strong style={{ color: "var(--fv-foreground)" }}>Publisher:</strong> FabricVTON, New York, USA.
						</p>
						<p>
							<strong style={{ color: "var(--fv-foreground)" }}>Hosting:</strong> Vercel Inc., Covina, CA, USA.
						</p>
					</div>
				</section>
			</main>
		</div>
	);
}
