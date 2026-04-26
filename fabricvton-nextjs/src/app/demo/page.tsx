"use client";

import "./demo.css";
import { useState } from "react";
import Link from "next/link";
import { ShoppingCart, Star, Sparkles, ArrowLeft, Heart } from "lucide-react";
import { toast } from "sonner";
import { PRODUCTS } from "../lib/demo-data";

export default function DemoStore() {
  const [cartCount, setCartCount] = useState(0);
  const [liked, setLiked] = useState<Set<number>>(new Set());

  return (
    <div className="demo-shell">
      {/* ── Announcement Bar ── */}
      <div className="demo-announcement">
        <Sparkles size={13} />
        <span>This is a <strong>live demo store</strong> powered by FabricVTON — click any product to Try It On</span>
        <Link href="/" className="demo-announcement-cta">Get it for your store →</Link>
      </div>

      {/* ── Store Header ── */}
      <header className="demo-header">
        <div className="demo-header-inner">
          <Link href="/" className="demo-back-link">
            <ArrowLeft size={15} />
            <span>Back to FabricVTON</span>
          </Link>
          <div className="demo-brand">
            <span className="demo-brand-name">Thread & Co.</span>
          </div>
          <div className="demo-header-right">
            <button
              className="demo-cart-btn"
              onClick={() => toast.info(`${cartCount} items in cart`)}
              aria-label="Cart"
            >
              <ShoppingCart size={20} />
              {cartCount > 0 && <span className="demo-cart-badge">{cartCount}</span>}
            </button>
          </div>
        </div>
        <nav className="demo-nav">
          <a href="#">New Arrivals</a>
          <a href="#">Men</a>
          <a href="#">Women</a>
          <a href="#">Sale</a>
        </nav>
      </header>

      {/* ── Hero Banner ── */}
      <div className="demo-hero-banner">
        <p className="demo-hero-eyebrow">New Collection</p>
        <h1 className="demo-hero-title">Summer Essentials</h1>
        <p className="demo-hero-sub">Click on any product to see the <strong>Virtual Try-On</strong> gallery in action.</p>
      </div>

      {/* ── Products Grid ── */}
      <main className="demo-products-container">
        <div className="demo-section-header">
          <h2>All Products</h2>
          <p>{PRODUCTS.length} items</p>
        </div>
        <div className="demo-products-grid">
          {PRODUCTS.map((p) => (
            <article key={p.id} className="demo-product-card">
              <Link href={`/demo/product/${p.id}`} className="demo-product-image-wrap" style={{ display: "block" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image} alt={p.name} className="demo-product-img" loading="lazy" />
                {p.badge && <span className="demo-product-badge">{p.badge}</span>}
                <button
                  className={`demo-like-btn ${liked.has(p.id) ? "liked" : ""}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setLiked((l) => { const n = new Set(l); n.has(p.id) ? n.delete(p.id) : n.add(p.id); return n; });
                  }}
                  aria-label="Wishlist"
                >
                  <Heart size={16} fill={liked.has(p.id) ? "currentColor" : "none"} />
                </button>
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
                    <Star key={i} size={11} fill={i < Math.floor(p.rating) ? "#f59e0b" : "none"} stroke="#f59e0b" />
                  ))}
                  <span>{p.rating} ({p.reviews.toLocaleString()})</span>
                </div>
                <div className="demo-product-price" style={{ marginBottom: "0" }}>
                  <span className="demo-price">${p.price}</span>
                  {p.originalPrice && <span className="demo-original-price">${p.originalPrice}</span>}
                </div>
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
            <Link href="/" className="demo-footer-link">FabricVTON</Link>
            {" "}— Install it on your Shopify store for free.
          </p>
          <Link href="/" className="demo-footer-cta">
            Get FabricVTON for your store →
          </Link>
        </div>
      </footer>
    </div>
  );
}
