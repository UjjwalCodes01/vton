"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ShoppingCart,
  Star,
  Sparkles,
  X,
  Heart,
  Share2,
  Ruler,
  LoaderCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PRODUCTS, type ProductTryOnGarment } from "../../../lib/demo-data";
import "../../demo.css";

export default function ProductDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const product = PRODUCTS.find((p) => p.id === id);

  const [activeImage, setActiveImage] = useState(product ? product.galleryImages[0] : "");
  const [selectedSize, setSelectedSize] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const [isTryOnOpen, setIsTryOnOpen] = useState(false);
  const [tryOnPreview, setTryOnPreview] = useState(product ? product.image : "");
  const [selectedGarmentId, setSelectedGarmentId] = useState<number | null>(null);
  const [generatedGarmentId, setGeneratedGarmentId] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const generationTimeoutRef = useRef<number | null>(null);

  const garments: ProductTryOnGarment[] = product?.tryOnExperience?.garments ?? PRODUCTS.slice(0, 6).map((item) => ({
    id: item.id,
    label: item.name,
    garmentImage: item.image,
    resultImage: item.demoTryOn.resultPhoto,
  }));

  const addToCart = () => {
    if (!product) {
      return;
    }

    if (!selectedSize) {
      toast.error("Please select a size first");
      return;
    }
    setCartCount((c) => c + 1);
    toast.success(`${product.name} added to cart!`, { description: `Size: ${selectedSize}` });
  };

  useEffect(() => {
    return () => {
      if (generationTimeoutRef.current) {
        window.clearTimeout(generationTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isTryOnOpen) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    } else {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    }
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [isTryOnOpen]);

  const openTryOn = () => {
    if (generationTimeoutRef.current) {
      window.clearTimeout(generationTimeoutRef.current);
      generationTimeoutRef.current = null;
    }

    setTryOnPreview(product?.tryOnExperience?.initialPersonImage ?? activeImage);
    setSelectedGarmentId(null);
    setGeneratedGarmentId(null);
    setIsGenerating(false);
    setIsTryOnOpen(true);
  };

  const closeTryOn = () => {
    if (generationTimeoutRef.current) {
      window.clearTimeout(generationTimeoutRef.current);
      generationTimeoutRef.current = null;
    }

    setIsGenerating(false);
    setSelectedGarmentId(null);
    setGeneratedGarmentId(null);
    setTryOnPreview(product?.tryOnExperience?.initialPersonImage ?? activeImage);
    setIsTryOnOpen(false);
  };

  const handleGarmentSelect = (garmentId: number) => {
    const garment = garments.find((item) => item.id === garmentId);
    if (!garment || isGenerating) {
      return;
    }

    setSelectedGarmentId(garmentId);
    setGeneratedGarmentId(null);
    setIsGenerating(true);

    if (generationTimeoutRef.current) {
      window.clearTimeout(generationTimeoutRef.current);
    }

    generationTimeoutRef.current = window.setTimeout(() => {
      setTryOnPreview(garment.resultImage);
      setGeneratedGarmentId(garmentId);
      setIsGenerating(false);
      generationTimeoutRef.current = null;
    }, 3000);
  };

  if (!product) {
    return (
      <div className="demo-shell" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <h2>Product not found.</h2>
        <Link href="/demo" style={{ marginLeft: 16, color: "#0d9488", textDecoration: "underline" }}>Back to Store</Link>
      </div>
    );
  }

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
                openTryOn();
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

      {/* ── Virtual Try-On Modal (Simulation) ── */}
      <AnimatePresence>
        {isTryOnOpen && (
          <motion.div
            className="tryon-backdrop"
            data-lenis-prevent="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) closeTryOn(); }}
          >
            <motion.div
              className="tryon-modal"
              data-lenis-prevent="true"
              initial={{ scale: 0.93, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.93, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
            >
              <button className="tryon-close" onClick={closeTryOn} aria-label="Close">
                <X size={18} />
              </button>

              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div className="tryon-powered" style={{ marginBottom: "16px" }}>
                  <Sparkles size={12} />
                  <span>Powered by FabricVTON AI</span>
                </div>
                <h2 className="tryon-title" style={{ textAlign: "center", marginBottom: "8px" }}>
                  Virtual Try-On
                </h2>
                <p className="tryon-subtitle" style={{ textAlign: "center", marginBottom: "28px" }}>
                  Choose a garment below to generate the try-on preview.
                </p>
              </div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="tryon-step-container"
                style={{ display: "flex", flexDirection: "column", gap: "16px" }}
              >
                <div className="tryon-demo-stage">
                  <div className="tryon-demo-image-wrap">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={tryOnPreview}
                      alt={generatedGarmentId ? "Generated try-on result" : product.name}
                      className={`tryon-demo-image ${isGenerating ? "is-generating" : ""}`}
                    />

                    {generatedGarmentId ? (
                      <div className="tryon-result-badge">
                        <Sparkles size={10} /> AI Generated
                      </div>
                    ) : null}

                    <AnimatePresence>
                      {isGenerating && (
                        <motion.div
                          className="tryon-demo-loader"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          <LoaderCircle size={28} className="tryon-demo-loader-icon" />
                          <p>Generating virtual try-on...</p>
                          <span>This takes about 3 seconds</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="tryon-garment-strip">
                    {garments.map((garment) => {
                      const isSelected = selectedGarmentId === garment.id;
                      const isGenerated = generatedGarmentId === garment.id;

                      return (
                        <button
                          key={garment.id}
                          type="button"
                          className={`tryon-garment-thumb ${isSelected ? "selected" : ""} ${isGenerated ? "generated" : ""}`}
                          onClick={() => handleGarmentSelect(garment.id)}
                          disabled={isGenerating}
                          aria-label={`Try on ${garment.label}`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={garment.garmentImage}
                            alt={garment.label}
                            className="tryon-garment-thumb-img"
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "12px" }}>
                  <button
                    onClick={() => {
                      closeTryOn();
                      addToCart();
                    }}
                    style={{
                      width: "100%",
                      padding: "14px",
                      background: "#0d9488",
                      color: "white",
                      borderRadius: "12px",
                      fontWeight: 600,
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: "8px",
                    }}
                    disabled={isGenerating}
                  >
                    <ShoppingCart size={18} />
                    Add to Cart
                  </button>
                </div>
              </motion.div>

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
