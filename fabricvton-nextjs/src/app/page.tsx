import type { Metadata } from "next";
import StickyHeader from "./components/StickyHeader";

export const metadata: Metadata = {
	title: "FabricVTON - AI-Powered Virtual Try-On for Shopify Stores",
	description:
		"Transform your Shopify store with AI virtual try-ons. Let customers see how products look on them before buying. Proven to increase conversion by 35% and reduce returns.",
};

const howItWorks = [
	{
		step: "Step 1",
		title: "Snap or Upload",
		text: "Shoppers upload a photo or take a mirror selfie directly on the product page.",
	},
	{
		step: "Step 2",
		title: "Smart Processing",
		text: "We auto-crop and center the user for the perfect fit.",
	},
	{
		step: "Step 3",
		title: "AI Generation",
		text: "Our AI realistically maps the product onto the user, preserving fabric drape and lighting.",
	},
	{
		step: "Result",
		title: "Confidence & Buy",
		text: "Users visualize the fit, hesitation disappears, and conversion rates increase.",
	},
];

const features = [
	{
		title: "Lead Capture & Integrations",
		text: "Don't just sell, build your audience. Collect emails during the try-on process and sync them instantly to Shopify Segments or Klaviyo. Retarget users who tried but didn't buy with personalized automated flows.",
	},
	{
		title: "Virtual Try-On Widget",
		text: "The core experience. Let customers see themselves in your products instantly. Includes smart auto-cropping for perfect framing, privacy-first data handling (auto-delete after 7 days), and multi-language support for global reach.",
	},
	{
		title: "FabricVTON Studio",
		text: "Generate professional product photos without the photoshoot. Use AI models to create stunning UGC-style content for your social media, ads, and product pages directly from your dashboard. Uses the same credits as your plan.",
	},
	{
		title: "Actionable Analytics",
		text: "Stop guessing. Track the full customer journey from widget open to 'Add to Cart'. Visualize your funnel and measure the exact conversion lift provided by the try-on experience to prove ROI.",
	},
];

const pricing = [
	{
		name: "Free",
		price: "$0",
		items: ["10 monthly try-ons included"],
	},
	{
		name: "Starter",
		price: "$14.99/month",
		items: [
			"100 monthly try-ons included",
			"Additional try-ons at $0.17/try-on",
			"Customers Email Collection",
			"Standard Support",
		],
	},
	{
		name: "Growth",
		price: "$29/month",
		featured: true,
		items: [
			"250 monthly try-ons included",
			"Additional try-ons at $0.12/try-on",
			"Customers Email Collection",
			"Standard Support",
		],
	},
	{
		name: "Pro",
		price: "$99/month",
		items: [
			"1000 monthly generations included",
			"Additional try-ons at $0.10/try-on",
			"Customers Email Collection",
			"Remove fabricvton branding",
			"VIP Support",
		],
	},
];

const faqs = [
	{
		question: "How does FabricVTON work?",
		answer:
			"FabricVTON uses advanced AI technology to generate realistic virtual try-on images. Customers simply upload a photo of themselves, and our AI creates a new image showing how the garment would look on their body. The entire process takes just a few seconds.",
	},
	{
		question: "Is there a free plan?",
		answer:
			"Yes! Our Free plan includes 100 base generations and 5 monthly generations to keep testing. When you need more volume, choose a paid plan that fits your needs (Starter, Growth, or Pro), and only pay for additional usage beyond your monthly allocation. Pro lets you remove FabricVTON branding.",
	},
	{
		question: "How long does it take to set up?",
		answer:
			"Installation takes just a few minutes. Install FabricVTON from the Shopify App Store, configure which products or collections you want to enable it for, and the virtual try-on button will automatically appear on your product pages. No coding or theme modifications required.",
	},
	{
		question: "What types of clothing work best?",
		answer:
			"FabricVTON supports all types of clothing, but currently works best with upper body garments (tops, shirts, jackets) and dresses. We recommend using clear product images on a plain background for the best results.",
	},
	{
		question: "What if I need help or have questions?",
		answer:
			"We provide direct support to all our merchants. Reach out via email at support@fabricvton.app or through the in-app chat. You can also book a demo call to get personalized onboarding assistance.",
	},
];

const blogPosts = [
	{
		category: "Strategy",
		date: "2026-03-25",
		title: "Shopify x ChatGPT: Direct Shopping Is Here. How to Prepare Your Store.",
		excerpt: "Discover how the new Shopify and ChatGPT Instant Checkout integration works, and learn how to optimize your fashion store's product data and trust signals to win in Agentic Commerce.",
		link: "/blog/shopify-chatgpt-direct-shopping-how-to-prepare",
	},
	{
		category: "Industry Analysis",
		date: "2026-03-24",
		title: "12 AI Trends Revolutionizing the Fashion E-commerce Industry in 2026",
		excerpt: "From Generative AI Virtual Try-On to Agentic Commerce, discover the 12 key artificial intelligence trends reshaping fashion retail in 2026.",
		link: "/blog/12-ai-trends-revolutionizing-fashion-ecommerce-2026",
	},
	{
		category: "Marketing",
		date: "2026-03-16",
		title: "7 Proven Strategies to Increase Traffic to Your Shopify Fashion Store in 2026",
		excerpt: "Discover 7 proven strategies to increase high-quality traffic to your Shopify fashion store in 2026, featuring AI search optimization and virtual try-on.",
		link: "/blog/7-proven-strategies-to-increase-traffic-shopify-fashion-store",
	},
];



export default function HomePage() {
	return (
		<div className="landing-shell">
			<div className="bg-glow bg-glow-one" />
			<div className="bg-glow bg-glow-two" />

			<StickyHeader />

			<main className="container main-content">
				<section className="hero">
					<p className="eyebrow">Built for Shopify</p>
					<h1>
						Let customers <span>try-on your products, from anywhere.</span>
					</h1>
					<p className="hero-copy">
						FabricVTON is an AI-powered virtual fitting room that integrates seamlessly into your Shopify store. Give your customers the confidence to purchase by letting them see how clothes look on their own body, increasing conversions and reducing returns.
					</p>
					<div className="hero-actions">
						<a
							className="btn btn-primary"
							href="https://admin.shopify.com/?organization_id=212189841&no_redirect=true&redirect=/oauth/redirect_from_developer_dashboard?client_id%3D73cc9210c28108863a55bc041bddb1c0"
						>
							Install on Shopify
						</a>
						<a className="btn btn-secondary" href="https://demo.fabricvton.app/" target="_blank" rel="noreferrer">
							Book a Demo
						</a>
					</div>
				</section>

				<section className="section">
					<h2>What is FabricVTON?</h2>
					<p className="hero-copy">
						See how AI virtual try-on transforms the shopping experience in this short overview.
					</p>
				</section>

				<section className="section how-works-section">
					<div className="faq-header">
						<p className="faq-subtitle">How it works</p>
						<h2 className="single-line-title">From browsing to buying in seconds</h2>
						<p className="hero-copy">Give your customers the virtual fitting room experience they've been waiting for. No app downloads, just instant confidence.</p>
					</div>
					
					<div className="how-works-grid">
						<div className="how-works-line"></div>
						
						<div className="how-works-item">
							<div className="how-works-icon-box">
								<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z"></path><circle cx="12" cy="13" r="3"></circle></svg>
								<div className="how-works-pill">Step 1</div>
							</div>
							<div className="how-works-text">
								<h3>Snap or Upload</h3>
								<p>Shoppers upload a photo or take a mirror selfie directly on the product page.</p>
							</div>
						</div>

						<div className="how-works-item">
							<div className="how-works-icon-box">
								<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 7V5a2 2 0 0 1 2-2h2"></path><path d="M17 3h2a2 2 0 0 1 2 2v2"></path><path d="M21 17v2a2 2 0 0 1-2 2h-2"></path><path d="M7 21H5a2 2 0 0 1-2-2v-2"></path><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><path d="M9 9h.01"></path><path d="M15 9h.01"></path></svg>
								<div className="how-works-pill">Step 2</div>
							</div>
							<div className="how-works-text">
								<h3>Smart Processing</h3>
								<p>We auto-crop and center the user for the perfect fit.</p>
							</div>
						</div>

						<div className="how-works-item">
							<div className="how-works-icon-box">
								<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72"></path><path d="m14 7 3 3"></path><path d="M5 6v4"></path><path d="M19 14v4"></path><path d="M10 2v2"></path><path d="M7 8H3"></path><path d="M21 16h-4"></path><path d="M11 3H9"></path></svg>
								<div className="how-works-pill">Step 3</div>
							</div>
							<div className="how-works-text">
								<h3>AI Generation</h3>
								<p>Our AI realistically maps the product onto the user, preserving fabric drape and lighting.</p>
							</div>
						</div>

						<div className="how-works-item">
							<div className="how-works-icon-box">
								<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 10a4 4 0 0 1-8 0"></path><path d="M3.103 6.034h17.794"></path><path d="M3.4 5.467a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.667a2 2 0 0 0-.4-1.2l-2-2.667A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z"></path></svg>
								<div className="how-works-pill how-works-pill-result">Result</div>
							</div>
							<div className="how-works-text">
								<h3>Confidence & Buy</h3>
								<p>Users visualize the fit, hesitation disappears, and conversion rates increase.</p>
							</div>
						</div>

					</div>
				</section>

				<section id="features" className="section features-section">
					<div className="faq-header">
						<p className="faq-subtitle">Features</p>
						<h2 className="single-line-title">All-in-one Virtual Fitting Room</h2>
						<p className="hero-copy">Everything you need to increase conversions, capture leads, and create content—in one powerful app.</p>
					</div>
					
					<div className="features-grid">
						<div className="feature-card feature-highlight">
							<div>
								<h3>Lead Capture & Integrations</h3>
								<p>Don't just sell, build your audience. Collect emails during the try-on process and sync them instantly to Shopify Segments or Klaviyo. Retarget users who tried but didn't buy with personalized automated flows.</p>
							</div>
							<div className="feature-integrations">
								<span className="works-with">Works with:</span>
								<div className="integration-pills">
									<div className="integration-pill">
										<img alt="Shopify" src="/shopify-logo.png" />
										Shopify
									</div>
									<div className="integration-pill">
										<img alt="Klaviyo" src="/klaviyo-logo.png" />
										Klaviyo
									</div>
								</div>
								<a className="integrations-link" href="/integration">+ more on Integrations page</a>
							</div>
						</div>

						<div className="feature-card">
							<div>
								<h3>Virtual Try-On Widget</h3>
								<p>The core experience. Let customers see themselves in your products instantly. Includes smart auto-cropping for perfect framing, privacy-first data handling (auto-delete after 7 days), and multi-language support for global reach.</p>
							</div>
							<div className="feature-tags">
								<span>Auto-Crop</span>
								<span>Privacy First</span>
								<span>Multi-language</span>
							</div>
						</div>

						<div className="feature-card">
							<div>
								<h3>FabricVTON Studio</h3>
								<p>Generate professional product photos without the photoshoot. Use AI models to create stunning UGC-style content for your social media, ads, and product pages directly from your dashboard. Uses the same credits as your plan.</p>
							</div>
							<a className="feature-link" href="/studio">Explore Studio capabilities →</a>
						</div>

						<div className="feature-card">
							<div>
								<h3>Actionable Analytics</h3>
								<p>Stop guessing. Track the full customer journey from widget open to 'Add to Cart'. Visualize your funnel and measure the exact conversion lift provided by the try-on experience to prove ROI.</p>
							</div>
							<div className="feature-tags">
								<span>Funnel Tracking</span>
								<span>ROI Measurement</span>
								<span>Conversion Lift</span>
							</div>
						</div>
					</div>
				</section>

				<section id="pricing" className="section pricing-section">
					<div className="faq-header">
						<p className="faq-subtitle">Pricing</p>
						<h2 className="single-line-title">Start free. Scale as you grow.</h2>
						<p className="hero-copy">Simple usage-based pricing. No hidden fees or long-term contracts.</p>
					</div>
					<div className="pricing-cards">
						{pricing.map((plan) => (
							<article className={`pricing-card ${plan.featured ? "pricing-featured" : ""}`} key={plan.name}>
								<div className="pricing-header">
									<p className="pricing-plan-name">{plan.name}</p>
									<p className="pricing-plan-price">{plan.price}</p>
								</div>
								<ul className="pricing-plan-list">
									{plan.items.map((item) => (
										<li key={item}>{item}</li>
									))}
								</ul>
							</article>
						))}
					</div>
					
					<div className="pricing-cta-box">
						<div className="pricing-cta-inner">
							<h3>Not sure which plan is right for you?</h3>
							<p>Use our advanced Revenue Estimator to estimate your costs and potential revenue lift based on your specific traffic and conversion metrics.</p>
							<a href="/revenue-estimator" className="pricing-btn">
								<span>Open Revenue Estimator</span>
								<span className="arrow">→</span>
							</a>
						</div>
					</div>
				</section>

				<section id="about" className="section about-section">
					<div className="faq-header">
						<p className="faq-subtitle">About FabricVTON</p>
						<h2>Built by someone who gets it</h2>
						<p className="hero-copy">FabricVTON was created from real experience in the Shopify ecosystem and a personal frustration with online fashion shopping.</p>
					</div>
					<div className="about-grid">
						<div className="about-card">
							<h3>The Story</h3>
							<p className="about-text">
								After years of working in the Shopify and e-commerce ecosystem, I experienced the same frustration many shoppers face: buying clothes online always felt like a gamble. Will it fit? Will it look good on me?
							</p>
							<p className="about-text">
								Seeing fashion brands struggle with high return rates and hesitant customers, the solution became clear: let people see how clothes would actually look on them before buying. In 2025, with AI making this possible, FabricVTON was born.
							</p>
						</div>
						<div className="about-card">
							<h3>The Team</h3>
							
							<div className="team-member">
								<div className="team-avatar"><span>T</span></div>
								<div>
									<p className="team-name">Tejasvi</p>
									<p className="team-role">Founder</p>
								</div>
							</div>

							<div className="team-member">
								<div className="team-avatar"><span>R</span></div>
								<div>
									<p className="team-name">Rudra</p>
									<p className="team-role">Developer & Manager</p>
								</div>
							</div>

							<div className="team-member">
								<div className="team-avatar"><span>A</span></div>
								<div>
									<p className="team-name">Aaditya</p>
									<p className="team-role">Developer & Manager</p>
								</div>
							</div>

							<div className="team-member">
								<div className="team-avatar"><span>U</span></div>
								<div>
									<p className="team-name">Ujjwal</p>
									<p className="team-role">Developer & Manager</p>
								</div>
							</div>

						</div>
					</div>
				</section>

				<section id="blog" className="section blog-section">
					<div className="faq-header">
						<p className="faq-subtitle">From the blog</p>
						<h2>Growth Tips for Fashion E-Commerce</h2>
						<p className="hero-copy">Learn how to boost conversions, reduce returns, and stay competitive in today's e-commerce landscape.</p>
					</div>

					<div className="blog-grid">
						{blogPosts.map((post) => (
							<a className="blog-card group" key={post.title} href={post.link}>
								<div className="blog-meta">
									<span className="blog-category">{post.category}</span>
									<span className="blog-date">{post.date}</span>
								</div>
								<h3 className="blog-title">{post.title}</h3>
								<p className="blog-excerpt">{post.excerpt}</p>
								<div className="blog-readmore">
									Read article <span>→</span>
								</div>
							</a>
						))}
					</div>
					
					<div className="blog-footer">
						<a className="btn btn-secondary blog-view-all" href="/blog">
							View all articles <span>→</span>
						</a>
					</div>
				</section>

				<section id="faq" className="section faq-section">
					<div className="faq-header">
						<p className="faq-subtitle">FAQ</p>
						<h2>Frequently Asked Questions</h2>
						<p className="hero-copy">Everything you need to know about getting started with FabricVTON.</p>
					</div>
					<div className="faq-list">
						{faqs.map((faq) => (
							<details className="faq-item group" key={faq.question}>
								<summary className="faq-summary">
									{faq.question}
									<span className="faq-icon">↓</span>
								</summary>
								<div className="faq-content">{faq.answer}</div>
							</details>
						))}
					</div>
				</section>

				<section id="contact" className="cta">
					<h2>Ready to boost your sales?</h2>
					<p>Join the merchants who are already using FabricVTON to increase conversion rates and reduce returns.</p>
					<div className="hero-actions">
						<a
							className="btn btn-primary"
							href="https://admin.shopify.com/?organization_id=212189841&no_redirect=true&redirect=/oauth/redirect_from_developer_dashboard?client_id%3D73cc9210c28108863a55bc041bddb1c0"
						>
							Install FabricVTON
						</a>
						<a className="btn btn-secondary" href="mailto:hello@fabricvton.app" target="_blank" rel="noreferrer">
							Contact Us
						</a>
					</div>
				</section>
			</main>


		</div>
	);
}
