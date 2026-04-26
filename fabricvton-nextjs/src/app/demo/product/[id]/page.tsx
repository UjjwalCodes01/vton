"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ShoppingCart, Star, Sparkles, X, Heart, Share2, Ruler } from "lucide-react";
import { toast } from "sonner";
import { PRODUCTS, MODELS } from "../../../lib/demo-data";
import "../../demo.css";

export default function ProductDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const product = PRODUCTS.find((p) => p.id === id);

  const [activeImage, setActiveImage] = useState(product ? product.galleryImages[0] : "");
  const [selectedSize, setSelectedSize] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const [isTryOnOpen, setIsTryOnOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  if (!product) {
    return (
      <div className="demo-shell" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <h2>Product not found.</h2>
        <Link href="/demo" style={{ marginLeft: 16, color: "#0d9488", textDecoration: "underline" }}>Back to Store</Link>
      </div>
    );
  }

  const addToCart = () => {
    if (!selectedSize) {
      toast.error("Please select a size first");
      return;
    }
    setCartCount((c) => c + 1);
    toast.success(`${product.name} added to cart!`, { description: `Size: ${selectedSize}` });
  };

  return (
    <div className="demo-shell">
      {/* ── Store Header (Shared) ── */}
      <header className="demo-header">
        <div className="demo-header-inner">
          <Link href="/demo" className="demo-back-link">
            <ArrowLeft size={15} />
            <span>Back to Store</span>
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
      </header>

      <main className="demo-pdp-container">
        <div className="demo-pdp-layout">
          
          {/* ── Left: Image Gallery ── */}
          <div className="demo-pdp-gallery">
            <div className="demo-pdp-main-image-wrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={activeImage} alt={product.name} className="demo-pdp-main-image" />
            </div>
            <div className="demo-pdp-thumbnails">
              {product.galleryImages.map((img, idx) => (
                <button
                  key={idx}
                  className={`demo-pdp-thumb-btn ${activeImage === img ? "active" : ""}`}
                  onClick={() => setActiveImage(img)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt={`Thumbnail ${idx + 1}`} className="demo-pdp-thumb-img" />
                </button>
              ))}
            </div>
          </div>

          {/* ── Right: Product Details ── */}
          <div className="demo-pdp-details">
            <div className="demo-pdp-header">
              <span className="demo-pdp-brand">{product.brand}</span>
              <h1 className="demo-pdp-title">{product.name}</h1>
              <div className="demo-pdp-price-row">
                <span className="demo-pdp-price">${product.price}</span>
                {product.originalPrice && <span className="demo-pdp-original-price">${product.originalPrice}</span>}
              </div>
            </div>

            <div className="demo-product-rating" style={{ marginBottom: 0 }}>
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={14} fill={i < Math.floor(product.rating) ? "#f59e0b" : "none"} stroke="#f59e0b" />
              ))}
              <span style={{ fontSize: "0.85rem", color: "#64748b", marginLeft: "8px" }}>
                {product.rating} ({product.reviews.toLocaleString()} reviews)
              </span>
            </div>

            <p className="demo-pdp-description">{product.description}</p>

            {/* Size Selector */}
            <div className="demo-pdp-section">
              <div className="demo-pdp-section-title">
                Select Size
                <button style={{ background: "none", border: "none", color: "#64748b", display: "flex", alignItems: "center", gap: "4px", fontSize: "0.75rem", cursor: "pointer" }}>
                  <Ruler size={14} /> Size Guide
                </button>
              </div>
              <div className="demo-pdp-size-grid">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    className={`demo-pdp-size-btn ${selectedSize === s ? "selected" : ""}`}
                    onClick={() => setSelectedSize(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="demo-pdp-actions">
              <button className="demo-pdp-add-btn" onClick={addToCart}>
                Add to Cart
              </button>
              <button className="demo-pdp-tryon-btn" onClick={() => {
                setIsTryOnOpen(true);
                setSelectedModel(null);
              }}>
                <Sparkles size={18} />
                Virtual Try-On
              </button>
              <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
                <button style={{ flex: 1, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", color: "#374151", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}>
                  <Heart size={16} /> Wishlist
                </button>
                <button style={{ flex: 1, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", color: "#374151", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}>
                  <Share2 size={16} /> Share
                </button>
              </div>
            </div>

            {/* Specs */}
            <div className="demo-pdp-specs">
              <p><span>Material:</span> {product.material}</p>
              <p><span>Fit:</span> {product.fit}</p>
              <p><span>Shipping:</span> Free 2-day delivery</p>
            </div>
          </div>
        </div>
      </main>

      {/* ── Virtual Try-On Modal (Model Selector) ── */}
      <AnimatePresence>
        {isTryOnOpen && (
          <motion.div
            className="tryon-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) setIsTryOnOpen(false); }}
          >
            <motion.div
              className="tryon-modal"
              initial={{ scale: 0.93, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.93, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              style={{ maxWidth: "480px" }}
            >
              <button className="tryon-close" onClick={() => setIsTryOnOpen(false)} aria-label="Close">
                <X size={18} />
              </button>

              <div className="tryon-powered" style={{ marginBottom: "12px" }}>
                <Sparkles size={11} />
                <span>Powered by FabricVTON AI</span>
              </div>
              <h2 className="tryon-title" style={{ textAlign: "left", marginBottom: "4px" }}>
                See it on a model
              </h2>
              <p className="tryon-subtitle" style={{ textAlign: "left", marginBottom: "24px" }}>
                Select a model to instantly see how the {product.name} looks.
              </p>

              {/* If a model is selected, show the try-on result */}
              {selectedModel ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="tryon-result-step"
                  style={{ display: "flex", flexDirection: "column", gap: "16px" }}
                >
                  <div className="tryon-result-image-wrap" style={{ maxWidth: "100%", aspectRatio: "3/4" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={product.tryOnResults[selectedModel]}
                      alt="Try-on result"
                      className="tryon-result-img"
                    />
                    <div className="tryon-result-badge">
                      <Sparkles size={10} /> AI Generated
                    </div>
                  </div>
                  <button 
                    className="btn-demo-secondary" 
                    onClick={() => setSelectedModel(null)}
                    style={{ width: "100%" }}
                  >
                    View Another Model
                  </button>
                </motion.div>
              ) : (
                /* Otherwise, show the 4 models */
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="tryon-model-grid"
                >
                  {MODELS.map((model) => (
                    <button
                      key={model.id}
                      className="tryon-model-btn"
                      onClick={() => {
                        toast.success(`Applying clothes to ${model.name}...`);
                        // Slight delay to simulate AI fast processing for the demo
                        setTimeout(() => setSelectedModel(model.id), 400);
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={model.image} alt={model.name} className="tryon-model-img" />
                      <span className="tryon-model-name">{model.name}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="demo-store-footer">
        <div className="demo-footer-inner">
          <p className="demo-footer-brand">Thread & Co.</p>
          <p className="demo-footer-powered">
            Virtual Try-On powered by{" "}
            <Link href="/" className="demo-footer-link">FabricVTON</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
