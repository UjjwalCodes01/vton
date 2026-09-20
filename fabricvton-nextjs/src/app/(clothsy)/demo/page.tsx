"use client";

import "./demo.css";
import { useState } from "react";
import Link from "next/link";
import { ShoppingCart, Star, Sparkles, ArrowLeft, Heart, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { PRODUCTS } from "../lib/demo-data";
import { CLOTHSY_HOME } from "../lib/site";

export default function DemoStore() {
  const [cartCount, setCartCount] = useState(0);
  const [liked, setLiked] = useState<Set<number>>(new Set());
  const [activeCategory, setActiveCategory] = useState("All");

  const categories = ["All", "New Arrivals", "Tops & Shirts", "Dresses", "Jackets", "Sale"];

  return (
    <div className="demo-shell">
      {/* ── Announcement Bar ── */}
      <div className="demo-announcement">
        <Sparkles size={13} />
        <span>
          This is a <strong>live demo store</strong> powered by FabricVTON & Clothsy AI — click any product to Try It On
        </span>
        <Link href={CLOTHSY_HOME} className="demo-announcement-cta">
          Get it for your store →
        </Link>
      </div>

      {/* ── Store Header ── */}
      <header className="demo-header">
        <div className="demo-header-inner">
          <Link href={CLOTHSY_HOME} className="demo-back-link">
            <ArrowLeft size={15} />
            <span>Home</span>
          </Link>

          <div className="demo-brand">
            <span className="demo-brand-name">Thread & Co.</span>
          </div>

          <div className="demo-header-right">
            <Link href="/studio" className="demo-studio-pill-btn" aria-label="Try-On Studio">
              <Wand2 size={13} />
              <span>Studio</span>
            </Link>

            <button
              className="demo-cart-btn"
              onClick={() => toast.info(`${cartCount} items in cart`)}
              aria-label="Cart"
            >
              <ShoppingCart size={19} />
              {cartCount > 0 && <span className="demo-cart-badge">{cartCount}</span>}
            </button>
          </div>
        </div>

        {/* Horizontal scrollable category pill bar on mobile */}
        <nav className="demo-nav" aria-label="Product Categories">
          <div className="demo-nav-scroll">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`demo-nav-item ${activeCategory === cat ? "active" : ""}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </nav>
      </header>

      {/* ── Hero Banner ── */}
      <div className="demo-hero-banner">
        <p className="demo-hero-eyebrow">Summer Collection 2026</p>
        <h1 className="demo-hero-title">Virtual Fitting Room</h1>
        <p className="demo-hero-sub">
          Tap <strong>Try On</strong> on any piece below to see our AI fit engine in action.
        </p>
      </div>

      {/* ── Products Grid ── */}
      <main className="demo-products-container">
        <div className="demo-section-header">
          <div>
            <h2>Featured Collection</h2>
            <span className="demo-section-count">{PRODUCTS.length} styles available</span>
          </div>
          <Link href="/studio" className="demo-custom-tryon-link">
            <Sparkles size={14} /> Custom Try-On Studio →
          </Link>
        </div>

        <div className="demo-products-grid">
          {PRODUCTS.map((p) => (
            <article key={p.id} className="demo-product-card">
              <Link
                href={`/demo/product/${p.id}`}
                className="demo-product-image-wrap"
                style={{ display: "block" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image} alt={p.name} className="demo-product-img" loading="lazy" />
                {p.badge && <span className="demo-product-badge">{p.badge}</span>}
                <button
                  className={`demo-like-btn ${liked.has(p.id) ? "liked" : ""}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setLiked((l) => {
                      const n = new Set(l);
                      n.has(p.id) ? n.delete(p.id) : n.add(p.id);
                      return n;
                    });
                  }}
                  aria-label="Wishlist"
                >
                  <Heart size={15} fill={liked.has(p.id) ? "currentColor" : "none"} />
                </button>

                {/* Desktop hover overlay */}
                <div className="demo-tryon-overlay">
                  <Sparkles size={14} />
                  View & Try On
                </div>
              </Link>

              <div className="demo-product-info">
                <p className="demo-product-brand">{p.brand}</p>
                <Link href={`/demo/product/${p.id}`} style={{ textDecoration: "none" }}>
                  <h3 className="demo-product-name">{p.name}</h3>
                </Link>
                <div className="demo-product-rating">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={11}
                      fill={i < Math.floor(p.rating) ? "#f59e0b" : "none"}
                      stroke="#f59e0b"
                    />
                  ))}
                  <span>
                    {p.rating} ({p.reviews.toLocaleString()})
                  </span>
                </div>
                <div className="demo-product-price">
                  <span className="demo-price">${p.price}</span>
                  {p.originalPrice && (
                    <span className="demo-original-price">${p.originalPrice}</span>
                  )}
                </div>

                {/* Mobile direct Try-On action button */}
                <Link
                  href={`/demo/product/${p.id}`}
                  className="demo-mobile-tryon-btn"
                  aria-label={`Try on ${p.name}`}
                >
                  <Sparkles size={13} />
                  <span>Try It On</span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </main>

      {/* ── Demo Store Footer ── */}
      <footer className="demo-store-footer">
        <div className="demo-footer-inner">
          <p className="demo-footer-brand">Thread & Co.</p>
          <p className="demo-footer-powered">
            Virtual Try-On powered by{" "}
            <Link href={CLOTHSY_HOME} className="demo-footer-link">
              Clothsy AI / FabricVTON
            </Link>{" "}
            — Free on Shopify.
          </p>
          <Link href={CLOTHSY_HOME} className="demo-footer-cta">
            Get Clothsy AI for your store →
          </Link>
        </div>
      </footer>
    </div>
  );
}
