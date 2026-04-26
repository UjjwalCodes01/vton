"use client";

import "./demo.css";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShoppingCart, Star, Upload, Camera, Check, Sparkles, ArrowLeft, Heart, ChevronDown } from "lucide-react";
import { toast } from "sonner";

/* ── Model result images (fallback after processing) ── */
const MODEL_IMAGES = [
  "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=640&q=85",
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=640&q=85",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=640&q=85",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=640&q=85",
  "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=640&q=85",
];

/* ── Products ── */
const PRODUCTS = [
  {
    id: 1, name: "Classic White Oxford Shirt", brand: "Thread & Co. Basics",
    price: 89, originalPrice: 129, rating: 4.8, reviews: 2341, badge: "Bestseller",
    image: "https://images.unsplash.com/photo-1602810316498-ab67cf68c8e1?w=560&q=80",
    colors: ["#ffffff", "#f5f0e8", "#d1d5db"], sizes: ["XS", "S", "M", "L", "XL"],
    description: "A timeless oxford weave shirt crafted from 100% premium Egyptian cotton. Regular fit, button-down collar, and mother-of-pearl buttons. Perfect for any occasion.",
    material: "100% Egyptian Cotton", fit: "Regular",
  },
  {
    id: 2, name: "Midnight Navy Blazer", brand: "Thread & Co. Studio",
    price: 249, originalPrice: null, rating: 4.9, reviews: 891, badge: "New",
    image: "https://images.unsplash.com/photo-1594938298603-c8148c4b4769?w=560&q=80",
    colors: ["#1e3a5f", "#1c1c1c", "#6b7280"], sizes: ["XS", "S", "M", "L", "XL"],
    description: "Impeccably tailored from a fine Italian wool blend. Slim lapels, structured shoulders, and a clean back vent — the cornerstone of a modern wardrobe.",
    material: "80% Wool, 20% Polyester", fit: "Slim",
  },
  {
    id: 3, name: "Vintage Wash Denim Jacket", brand: "Thread & Co. Raw",
    price: 179, originalPrice: 220, rating: 4.7, reviews: 1543, badge: "-19% Off",
    image: "https://images.unsplash.com/photo-1601333144130-8cbb312386b6?w=560&q=80",
    colors: ["#5b7fa6", "#2c3e50", "#8b7355"], sizes: ["S", "M", "L", "XL", "XXL"],
    description: "Pre-washed for the perfect lived-in look. Classic trucker silhouette with brass buttons and heavyweight 12oz denim for a premium feel.",
    material: "100% Raw Denim", fit: "Relaxed",
  },
  {
    id: 4, name: "Minimal Black Turtleneck", brand: "Thread & Co. Essentials",
    price: 129, originalPrice: null, rating: 4.9, reviews: 3102, badge: "Top Rated",
    image: "https://images.unsplash.com/photo-1551489186-cf8726f514f8?w=560&q=80",
    colors: ["#1c1c1c", "#f5f0e8", "#6b7280"], sizes: ["XS", "S", "M", "L", "XL"],
    description: "Ultra-soft merino wool turtleneck designed for those who appreciate the power of simplicity. Ribbed cuffs and a perfectly weighted knit that holds its shape through seasons.",
    material: "100% Merino Wool", fit: "Slim",
  },
  {
    id: 5, name: "Earth Tone Linen Shirt", brand: "Thread & Co. Summer",
    price: 99, originalPrice: 130, rating: 4.6, reviews: 967, badge: "-24% Off",
    image: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=560&q=80",
    colors: ["#c4a882", "#8b7355", "#d4c5b0"], sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    description: "Woven from premium French linen, this relaxed-fit shirt breathes beautifully in warm weather. Camp collar, contrast stitching, and coconut shell buttons.",
    material: "100% French Linen", fit: "Relaxed",
  },
];

const PROCESSING_STEPS = [
  "Analyzing your photo...",
  "Mapping garment geometry...",
  "Rendering fabric physics...",
  "Finalizing your look...",
];

type TryOnStep = "upload" | "processing" | "result";

type Product = typeof PRODUCTS[0];

export default function DemoStore() {
  const [cartCount, setCartCount] = useState(0);
  const [liked, setLiked] = useState<Set<number>>(new Set());
  const [selectedSizes, setSelectedSizes] = useState<Record<number, string>>({});
  const [tryOnProduct, setTryOnProduct] = useState<Product | null>(null);
  const [tryOnStep, setTryOnStep] = useState<TryOnStep>("upload");
  const [progress, setProgress] = useState(0);
  const [processingMsg, setProcessingMsg] = useState(PROCESSING_STEPS[0]);
  const [resultIndex, setResultIndex] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Open try-on modal ── */
  const openTryOn = (product: Product) => {
    setTryOnProduct(product);
    setTryOnStep("upload");
    setProgress(0);
    setResultIndex(Math.floor(Math.random() * MODEL_IMAGES.length));
  };

  /* ── Start AI processing ── */
  const startProcessing = () => {
    setTryOnStep("processing");
    setProgress(0);
    let elapsed = 0;
    const DURATION = 7500;
    const TICK = 80;

    intervalRef.current = setInterval(() => {
      elapsed += TICK;
      const pct = Math.min((elapsed / DURATION) * 100, 100);
      setProgress(pct);
      const msgIdx = Math.min(
        Math.floor((elapsed / DURATION) * PROCESSING_STEPS.length),
        PROCESSING_STEPS.length - 1
      );
      setProcessingMsg(PROCESSING_STEPS[msgIdx]);
      if (elapsed >= DURATION) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setTryOnStep("result");
      }
    }, TICK);
  };

  /* ── Close modal ── */
  const closeModal = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTryOnProduct(null);
  };

  /* ── Add to cart ── */
  const addToCart = (product: Product) => {
    if (!selectedSizes[product.id]) {
      toast.error("Please select a size first");
      return;
    }
    setCartCount((c) => c + 1);
    toast.success(`${product.name} added to cart!`, { description: `Size: ${selectedSizes[product.id]}` });
  };

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  return (
    <div className="demo-shell">
      {/* ── Announcement Bar ── */}
      <div className="demo-announcement">
        <Sparkles size={13} />
        <span>This is a <strong>live demo store</strong> powered by FabricVTON — click "Try On" on any product</span>
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
        <p className="demo-hero-sub">Click the <strong>Try On</strong> button on any product to see it on you — instantly.</p>
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
              <div className="demo-product-image-wrap">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image} alt={p.name} className="demo-product-img" loading="lazy" />
                {p.badge && <span className="demo-product-badge">{p.badge}</span>}
                <button
                  className={`demo-like-btn ${liked.has(p.id) ? "liked" : ""}`}
                  onClick={() => setLiked((l) => { const n = new Set(l); n.has(p.id) ? n.delete(p.id) : n.add(p.id); return n; })}
                  aria-label="Wishlist"
                >
                  <Heart size={16} fill={liked.has(p.id) ? "currentColor" : "none"} />
                </button>
                {/* Try On overlay button */}
                <button className="demo-tryon-overlay" onClick={() => openTryOn(p)}>
                  <Sparkles size={14} />
                  Try On
                </button>
              </div>

              <div className="demo-product-info">
                <p className="demo-product-brand">{p.brand}</p>
                <h3 className="demo-product-name">{p.name}</h3>
                <div className="demo-product-rating">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={11} fill={i < Math.floor(p.rating) ? "#f59e0b" : "none"} stroke="#f59e0b" />
                  ))}
                  <span>{p.rating} ({p.reviews.toLocaleString()})</span>
                </div>
                <div className="demo-product-price">
                  <span className="demo-price">${p.price}</span>
                  {p.originalPrice && <span className="demo-original-price">${p.originalPrice}</span>}
                </div>

                {/* Size selector */}
                <div className="demo-size-row">
                  {p.sizes.map((s) => (
                    <button
                      key={s}
                      className={`demo-size-btn ${selectedSizes[p.id] === s ? "selected" : ""}`}
                      onClick={() => setSelectedSizes((prev) => ({ ...prev, [p.id]: s }))}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                {/* Color swatches */}
                <div className="demo-color-row">
                  {p.colors.map((c) => (
                    <span key={c} className="demo-color-swatch" style={{ background: c }} />
                  ))}
                </div>

                <div className="demo-product-actions">
                  <button className="demo-add-btn" onClick={() => addToCart(p)}>
                    <ShoppingCart size={14} /> Add to Cart
                  </button>
                  <button className="demo-tryon-btn" onClick={() => openTryOn(p)}>
                    <Sparkles size={14} /> Try On Free
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>

      {/* ── Try-On Modal ── */}
      <AnimatePresence>
        {tryOnProduct && (
          <motion.div
            className="tryon-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
          >
            <motion.div
              className="tryon-modal"
              initial={{ scale: 0.93, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.93, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
            >
              <button className="tryon-close" onClick={closeModal} aria-label="Close">
                <X size={18} />
              </button>

              {/* ─ STEP 1: UPLOAD ─ */}
              {tryOnStep === "upload" && (
                <div className="tryon-step">
                  <div className="tryon-powered">
                    <Sparkles size={11} />
                    <span>Powered by FabricVTON AI</span>
                  </div>
                  <h2 className="tryon-title">Virtual Try-On</h2>
                  <p className="tryon-subtitle">
                    See <strong>{tryOnProduct.name}</strong> on yourself in seconds
                  </p>
                  <div
                    className={`tryon-upload-zone ${dragActive ? "drag-active" : ""}`}
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={(e) => { e.preventDefault(); setDragActive(false); startProcessing(); }}
                    onClick={startProcessing}
                  >
                    <div className="tryon-upload-icon">
                      <Upload size={28} />
                    </div>
                    <p className="tryon-upload-main">Drop your photo here, or click to select</p>
                    <p className="tryon-upload-sub">JPG, PNG, WEBP — up to 10MB</p>
                    <p className="tryon-upload-demo-hint">← For this demo, click anywhere in this box</p>
                  </div>
                  <div className="tryon-upload-divider"><span>or</span></div>
                  <button className="tryon-camera-btn" onClick={startProcessing}>
                    <Camera size={16} /> Use Camera
                  </button>
                  <p className="tryon-privacy-note">
                    🔒 Your photo is deleted automatically after 7 days. Never used for AI training.
                  </p>
                </div>
              )}

              {/* ─ STEP 2: PROCESSING ─ */}
              {tryOnStep === "processing" && (
                <div className="tryon-step tryon-processing">
                  <div className="tryon-spinner-wrap">
                    <svg className="tryon-ring" viewBox="0 0 80 80" fill="none">
                      <circle cx="40" cy="40" r="34" stroke="#e2e8f0" strokeWidth="6" />
                      <circle
                        cx="40" cy="40" r="34"
                        stroke="url(#ring-grad)"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 34}`}
                        strokeDashoffset={`${2 * Math.PI * 34 * (1 - progress / 100)}`}
                        style={{ transition: "stroke-dashoffset 0.08s linear", transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
                      />
                      <defs>
                        <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#0d9488" />
                          <stop offset="100%" stopColor="#0891b2" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <span className="tryon-pct">{Math.round(progress)}%</span>
                  </div>
                  <h2 className="tryon-title">Generating your look</h2>
                  <motion.p
                    key={processingMsg}
                    className="tryon-processing-msg"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {processingMsg}
                  </motion.p>
                  <div className="tryon-steps-row">
                    {PROCESSING_STEPS.map((s, i) => {
                      const active = s === processingMsg;
                      const done = PROCESSING_STEPS.indexOf(processingMsg) > i;
                      return (
                        <div key={s} className={`tryon-step-dot ${active ? "active" : ""} ${done ? "done" : ""}`}>
                          {done ? <Check size={10} /> : <span>{i + 1}</span>}
                        </div>
                      );
                    })}
                  </div>
                  <p className="tryon-eta">Estimated time: ~8 seconds</p>
                </div>
              )}

              {/* ─ STEP 3: RESULT ─ */}
              {tryOnStep === "result" && (
                <div className="tryon-step tryon-result-step">
                  <div className="tryon-result-header">
                    <div className="tryon-powered tryon-success">
                      <Check size={11} />
                      <span>Try-on complete!</span>
                    </div>
                    <h2 className="tryon-title">Your look is ready</h2>
                    <p className="tryon-subtitle">{tryOnProduct.name}</p>
                  </div>
                  <div className="tryon-result-image-wrap">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={MODEL_IMAGES[resultIndex]}
                      alt="Your try-on result"
                      className="tryon-result-img"
                    />
                    <div className="tryon-result-badge">
                      <Sparkles size={10} />
                      AI Generated
                    </div>
                  </div>
                  <div className="tryon-result-product">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={tryOnProduct.image} alt={tryOnProduct.name} className="tryon-result-thumb" />
                    <div>
                      <p className="tryon-result-name">{tryOnProduct.name}</p>
                      <p className="tryon-result-price">${tryOnProduct.price}</p>
                    </div>
                  </div>
                  <div className="tryon-result-actions">
                    <button
                      className="btn-demo-primary"
                      onClick={() => {
                        setCartCount((c) => c + 1);
                        toast.success(`${tryOnProduct.name} added to cart!`);
                        closeModal();
                      }}
                    >
                      <ShoppingCart size={15} /> Add to Cart
                    </button>
                    <button
                      className="btn-demo-secondary"
                      onClick={() => {
                        setResultIndex((i) => (i + 1) % MODEL_IMAGES.length);
                        toast.info("Showing another model");
                      }}
                    >
                      Try Different Model
                    </button>
                  </div>
                  <p className="tryon-privacy-note">
                    🔒 This result will be auto-deleted in 7 days
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
