"use client";

import Image from "next/image";
import { useState } from "react";

const Arrow = () => <span aria-hidden="true">&#8594;</span>;

function ShopifyMark() {
  return <span className="shopify-mark" aria-hidden="true">S</span>;
}

function WooMark() {
  return <span className="woo-mark" aria-hidden="true">woo</span>;
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [split, setSplit] = useState(50);
  const [storiesOpen, setStoriesOpen] = useState(false);

  return (
    <main>
      <section className="hero-section" id="top">
        <nav className="nav shell" aria-label="Main navigation">
          <a className="wordmark" href="#top" aria-label="Clothsy AI home">Clothsy<span>AI</span></a>
          <div className="nav-links">
            <a href="#product">Product</a><a href="#brands">For brands</a><a href="#pricing">Pricing</a><a href="#resources">Resources</a>
          </div>
          <div className="nav-actions"><a className="login" href="#login">Log in</a><a className="button button-small" href="#install">Install free <Arrow /></a><button className="mobile-menu-button" type="button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label="Toggle navigation"><i /><i /><i /></button></div>
        </nav>
        <div className={`mobile-menu ${menuOpen ? "is-open" : ""}`}><a onClick={() => setMenuOpen(false)} href="#product">Product</a><a onClick={() => setMenuOpen(false)} href="#brands">For brands</a><a onClick={() => setMenuOpen(false)} href="#pricing">Pricing</a><a onClick={() => setMenuOpen(false)} href="#resources">Resources</a><a onClick={() => setMenuOpen(false)} href="#login">Log in</a></div>

        <div className="hero shell">
          <div className="hero-copy">
            <p className="eyebrow">YOUR WARDROBE<br />JUST SMARTER</p>
            <h1>TRY ON<br />ANY OUTFIT<br /><em>WITH AI.</em></h1>
            <p className="hero-description">Upload your photo, try any outfit, and see<br className="desktop-only" /> yourself instantly. No guesswork. No fitting<br className="desktop-only" /> rooms. Just you, in every look.</p>
            <div className="hero-ctas"><a className="button" href="#install">Try free <Arrow /></a><a className="demo-button" href="#how-it-works"><span className="play-icon">&#9654;</span> Watch demo</a></div>
            <div className="hero-stats"><div><b>10M+</b><span>OUTFITS TRIED</span></div><div><b>500K+</b><span>HAPPY USERS</span></div><div><b>200+</b><span>BRANDS ONBOARD</span></div></div>
          </div>
          <div className="hero-art" aria-label="A Clothsy AI virtual fitting room preview">
            <p className="hero-art-label"><strong>AI VIRTUAL<br />TRY ON.</strong><span>REAL FITS.<br />REAL YOU.</span></p>
            <Image src="/newtopportion.png" alt="Clothsy AI selfie-to-outfit virtual try-on preview" width={1465} height={1074} priority />
          </div>
        </div>
      </section>

      <section className="brand-strip" id="brands"><div className="shell brand-strip-inner">
        <div className="strip-integrations"><span className="platform"><ShopifyMark /> Shopify</span><span className="platform"><WooMark /> WooCommerce</span></div>
        <div className="trusted"><span>TRUSTED BY MODERN BRANDS</span><div><b>FASHION</b><i /> <b>JEWELLERY</b><i /> <b>LIFESTYLE</b><i /> <b>AND MORE</b></div></div>
        <div className="mobile-trust"><span>TRUSTED BY MODERN BRANDS</span><div className="mobile-trust-window"><div className="mobile-trust-track"><div><span className="platform"><ShopifyMark /> Shopify</span><span className="platform"><WooMark /> WooCommerce</span><b>FASHION</b><i /><b>JEWELLERY</b><i /><b>LIFESTYLE</b><i /><b>AND MORE</b></div><div aria-hidden="true"><span className="platform"><ShopifyMark /> Shopify</span><span className="platform"><WooMark /> WooCommerce</span><b>FASHION</b><i /><b>JEWELLERY</b><i /><b>LIFESTYLE</b><i /><b>AND MORE</b></div><div aria-hidden="true"><span className="platform"><ShopifyMark /> Shopify</span><span className="platform"><WooMark /> WooCommerce</span><b>FASHION</b><i /><b>JEWELLERY</b><i /><b>LIFESTYLE</b><i /><b>AND MORE</b></div></div></div></div>
      </div></section>

      <section className="product-section" id="product">
        <div className="product-copy">
          <p className="eyebrow">/ ABOUT CLOTHSY</p>
          <h2>SHOP FASHION<br />WITH CONFIDENCE.</h2>
          <p>Clothsy AI helps you visualize how clothes look on you before you buy. Powered by advanced AI, integrated directly into your Shopify store, and designed to increase conversions while reducing returns.</p>
          <a className="button button-small" href="#install">Get started <Arrow /></a>
          <div className="product-stats"><div><b>50K+</b><span>TRY-ONS</span></div><div><b>500+</b><span>STORES</span></div><div><b>99%</b><span>ACCURACY</span></div></div>
        </div>
        <div className="product-visual"><Image src="/mantryon-cutout.png" alt="Clothsy AI before-and-after fashion try-on preview" width={1536} height={1024} /></div>
      </section>

      <section className="how-section shell" id="how-it-works">
        <p className="eyebrow">HOW IT WORKS</p><h2>From browsing<br />to buying. <em>In seconds.</em></h2>
        <div className="how-grid">
          <article className="how-step"><span className="step-number">01</span><h3>Upload a photo</h3><p>Use a clear photo or<br />take a mirror selfie.</p><div className="photo-frame upload-frame"><Image src="/tryon-before.jpg" alt="Original shopper photo" width={640} height={960} /><span className="person-outline" aria-hidden="true">◯<b>⌒</b></span><span className="add-photo" aria-hidden="true">+</span></div></article>
          <div className="process-arrow" aria-hidden="true"><Arrow /></div>
          <article className="how-step"><span className="step-number">02</span><h3>Our AI does the magic</h3><p>We map the product onto you<br />with realistic fabric drape<br />and lighting.</p><div className="photo-frame split-frame" style={{ "--split": `${split}%` } as React.CSSProperties}><Image className="split-before" src="/tryon-before.jpg" alt="Blue try-on look" width={640} height={960} /><Image className="split-after" src="/tryon-after.jpg" alt="Black try-on look" width={1066} height={1475} /><span className="split-line" /><span className="split-handle">&#8596;</span><input className="split-slider" type="range" min="5" max="95" value={split} onChange={(event) => setSplit(Number(event.target.value))} aria-label="Compare blue and black try-on looks" /></div></article>
          <div className="process-arrow" aria-hidden="true"><Arrow /></div>
          <article className="how-step"><span className="step-number">03</span><h3>See yourself</h3><p>In seconds. Shop with<br />more confidence.</p><div className="result-wrap"><div className="photo-frame result-frame"><Image src="/tryon-after.jpg" alt="Shopper wearing an AI-generated outfit" width={1066} height={1475} /></div><aside className="outfit-rail" aria-label="Product options"><span className="outfit active">◒</span><span className="outfit">♧</span><span className="outfit">♜</span><span className="outfit">▥</span><a href="#install">Add to cart</a></aside></div></article>
        </div>
      </section>

      <section className="impact-section"><div className="shell impact-inner"><div><p className="eyebrow">REAL IMPACT</p><h2>Better<br />shopping for<br />a brighter future.</h2></div><ul><li><span><Arrow /></span> Higher conversions</li><li><span><Arrow /></span> Lower returns</li><li><span><Arrow /></span> More engaged customers</li></ul></div></section>

      <section className="testimonials shell" id="resources"><div className="section-heading"><div><p className="eyebrow">WHAT BRANDS SAY</p><h2>Real brands.<br />Real results.</h2></div><button className="story-toggle" type="button" onClick={() => setStoriesOpen((open) => !open)}>{storiesOpen ? "Show fewer stories" : "View all stories"} <Arrow /></button></div><div className={`quote-grid ${storiesOpen ? "is-expanded" : ""}`}><blockquote><span className="quote-mark">“</span><p>Our customers love how easy it is to try on. It&apos;s changed the way we sell online.</p><footer><b>A. Mehta</b><span>D2C Fashion Brand</span></footer></blockquote><blockquote><span className="quote-mark">“</span><p>Setup was seamless and the support team was amazing. Highly recommend.</p><footer><b>R. Kapoor</b><span>Jewellery Brand</span></footer></blockquote><blockquote><span className="quote-mark">“</span><p>We saw an immediate lift in engagement and add-to-cart rates.</p><footer><b>S. Verma</b><span>Lifestyle Brand</span></footer></blockquote>{storiesOpen && <><blockquote className="extra-story"><span className="quote-mark">“</span><p>It feels like a real fitting room, directly inside our store.</p><footer><b>N. Shah</b><span>Contemporary Fashion Brand</span></footer></blockquote><blockquote className="extra-story"><span className="quote-mark">“</span><p>Our shoppers are spending longer with every product page.</p><footer><b>K. Iyer</b><span>Premium Lifestyle Brand</span></footer></blockquote><blockquote className="extra-story"><span className="quote-mark">“</span><p>Customers are finally confident before they add to cart.</p><footer><b>P. Jain</b><span>Independent Designer</span></footer></blockquote></>}</div></section>

      <section className="closing-cta shell" id="install"><div><p className="eyebrow">READY TO GET STARTED</p><h2>Bring your products<br />to life with <em>Clothsy AI.</em></h2><p>Free to install. No credit card required.</p></div><div className="cta-actions"><a className="button" href="#top">Install on Shopify <Arrow /></a><span>or</span><a href="#how-it-works">Book a demo</a></div></section>

      <footer className="footer" id="pricing"><div className="shell footer-main"><div><a className="wordmark" href="#top">Clothsy<span>AI</span></a><p>Fashion fits better here.</p></div><div className="footer-links"><div><b>Product</b><a href="#product">For Brands</a><a href="#pricing">Pricing</a><a href="#resources">Resources</a></div><div><b>About</b><a href="#stories">Blog</a><a href="#how-it-works">Contact</a><a href="#top">Careers</a></div></div><div className="newsletter"><label htmlFor="email">Join our newsletter</label><div><input id="email" type="email" placeholder="Your email address" /><button aria-label="Join newsletter"><Arrow /></button></div><p className="socials">◎ &nbsp; in &nbsp; 𝕏 &nbsp; ▶</p></div></div><div className="shell footer-bottom"><span>© 2025 Clothsy AI. All rights reserved.</span><div><a href="#privacy">Privacy</a><a href="#terms">Terms</a><a href="#cookies">Cookies</a></div></div></footer>
    </main>
  );
}
