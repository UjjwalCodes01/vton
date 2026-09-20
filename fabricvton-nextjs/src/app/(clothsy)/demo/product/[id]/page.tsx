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
  Wand2,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { PRODUCTS, type ProductTryOnGarment } from "../../../lib/demo-data";
import "../../demo.css";
import { CLOTHSY_HOME } from "../../../lib/site";

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
  const [generationStep, setGenerationStep] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const generationTimeoutRef = useRef<number | null>(null);
  const stepIntervalRef = useRef<number | null>(null);

  const garments: ProductTryOnGarment[] =
    product?.tryOnExperience?.garments ??
    PRODUCTS.slice(0, 6).map((item) => ({
      id: item.id,
      label: item.name,
      garmentImage: item.image,
      resultImage: item.demoTryOn.resultPhoto,
    }));

  const addToCart = () => {
    if (!product) return;

    if (!selectedSize) {
      toast.error("Please select a size first");
      return;
    }
    setCartCount((c) => c + 1);
    toast.success(`${product.name} added to cart!`, {
      description: `Size: ${selectedSize}`,
    });
  };

  useEffect(() => {
    return () => {
      if (generationTimeoutRef.current) {
        window.clearTimeout(generationTimeoutRef.current);
      }
      if (stepIntervalRef.current) {
        window.clearInterval(stepIntervalRef.current);
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
    if (stepIntervalRef.current) {
      window.clearInterval(stepIntervalRef.current);
      stepIntervalRef.current = null;
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
    if (stepIntervalRef.current) {
      window.clearInterval(stepIntervalRef.current);
      stepIntervalRef.current = null;
    }

    setIsGenerating(false);
    setSelectedGarmentId(null);
    setGeneratedGarmentId(null);
    setTryOnPreview(product?.tryOnExperience?.initialPersonImage ?? activeImage);
    setIsTryOnOpen(false);
  };

  const generationSteps = [
    "Aligning model posture...",
    "Draping garment fabric...",
    "Rendering lighting & shadows...",
  ];

  const handleGarmentSelect = (garmentId: number) => {
    const garment = garments.find((item) => item.id === garmentId);
    if (!garment || isGenerating) return;

    setSelectedGarmentId(garmentId);
    setGeneratedGarmentId(null);
    setIsGenerating(true);
    setGenerationStep(0);

    if (generationTimeoutRef.current) {
      window.clearTimeout(generationTimeoutRef.current);
    }
    if (stepIntervalRef.current) {
      window.clearInterval(stepIntervalRef.current);
    }

    stepIntervalRef.current = window.setInterval(() => {
      setGenerationStep((s) => (s + 1) % generationSteps.length);
    }, 900);

    generationTimeoutRef.current = window.setTimeout(() => {
      if (stepIntervalRef.current) {
        window.clearInterval(stepIntervalRef.current);
      }
      setTryOnPreview(garment.resultImage);
      setGeneratedGarmentId(garmentId);
      setIsGenerating(false);
      generationTimeoutRef.current = null;
    }, 2800);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product?.name,
          text: `Check out ${product?.name} with Virtual Try-On!`,
          url: window.location.href,
        });
      } catch {}
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Product link copied!");
    }
  };

  if (!product) {
    return (
      <div
        className="demo-shell"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <h2>Product not found.</h2>
        <Link
          href="/demo"
          style={{
            marginTop: 16,
            color: "#0d9488",
            fontWeight: 700,
            textDecoration: "underline",
          }}
        >
          ← Back to Store
        </Link>
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
            <span>Store</span>
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
      </header>

      <main className="demo-pdp-container">
        <div className="demo-pdp-layout">
          {/* ── Left: Image Gallery ── */}
          <div className="demo-pdp-gallery">
            <div className="demo-pdp-main-image-wrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={activeImage} alt={product.name} className="demo-pdp-main-image" />
              {product.badge && <span className="demo-product-badge">{product.badge}</span>}
            </div>

            {/* Thumbnails strip */}
            {product.galleryImages.length > 1 && (
              <div className="demo-pdp-thumbnails">
                {product.galleryImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`demo-pdp-thumb-btn ${activeImage === img ? "active" : ""}`}
                    onClick={() => setActiveImage(img)}
                    aria-label={`Thumbnail ${idx + 1}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt="" className="demo-pdp-thumb-img" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Right: Product Details ── */}
          <div className="demo-pdp-details">
            <div className="demo-pdp-header">
              <span className="demo-pdp-brand">{product.brand}</span>
              <h1 className="demo-pdp-title">{product.name}</h1>
              <div className="demo-pdp-price-row">
                <span className="demo-pdp-price">${product.price}</span>
                {product.originalPrice && (
                  <span className="demo-pdp-original-price">${product.originalPrice}</span>
                )}
              </div>
            </div>

            <div className="demo-product-rating" style={{ marginBottom: 0 }}>
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={14}
                  fill={i < Math.floor(product.rating) ? "#f59e0b" : "none"}
                  stroke="#f59e0b"
                />
              ))}
              <span style={{ fontSize: "0.85rem", color: "#64748b", marginLeft: "8px" }}>
                {product.rating} ({product.reviews.toLocaleString()} reviews)
              </span>
            </div>

            <p className="demo-pdp-description">{product.description}</p>

            {/* Size Selector */}
            <div className="demo-pdp-section">
              <div className="demo-pdp-section-title">
                <span>Select Size</span>
                <button
                  type="button"
                  style={{
                    background: "none",
                    border: "none",
                    color: "#64748b",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                  }}
                  onClick={() => toast.info("Standard True-to-Size fit")}
                >
                  <Ruler size={14} /> Size Guide
                </button>
              </div>
              <div className="demo-pdp-size-grid">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    type="button"
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
              <button
                type="button"
                className="demo-pdp-tryon-btn"
                onClick={openTryOn}
              >
                <Sparkles size={18} />
                <span>Virtual Try-On (Try It On)</span>
              </button>

              <button type="button" className="demo-pdp-add-btn" onClick={addToCart}>
                <ShoppingCart size={18} />
                <span>Add to Cart</span>
              </button>

              <div className="demo-pdp-secondary-actions">
                <button
                  type="button"
                  className={`demo-pdp-sub-btn ${isLiked ? "liked" : ""}`}
                  onClick={() => {
                    setIsLiked((l) => !l);
                    toast.success(isLiked ? "Removed from Wishlist" : "Saved to Wishlist!");
                  }}
                >
                  <Heart size={16} fill={isLiked ? "#ef4444" : "none"} color={isLiked ? "#ef4444" : "currentColor"} />
                  <span>Wishlist</span>
                </button>
                <button
                  type="button"
                  className="demo-pdp-sub-btn"
                  onClick={handleShare}
                >
                  <Share2 size={16} />
                  <span>Share</span>
                </button>
              </div>
            </div>

            {/* Specs */}
            <div className="demo-pdp-specs">
              <p><span>Material:</span> {product.material}</p>
              <p><span>Fit:</span> {product.fit}</p>
              <p><span>Delivery:</span> Free express delivery & 30-day returns</p>
            </div>
          </div>
        </div>
      </main>

      {/* ── Mobile Sticky Bottom Action Bar ── */}
      <div className="demo-pdp-sticky-bar">
        <div className="demo-pdp-sticky-bar-inner">
          <div className="demo-pdp-sticky-price">
            <strong>${product.price}</strong>
            <span>{selectedSize ? `Size: ${selectedSize}` : "Choose size"}</span>
          </div>
          <button
            type="button"
            className="demo-pdp-sticky-tryon-btn"
            onClick={openTryOn}
          >
            <Sparkles size={16} />
            <span>Try On</span>
          </button>
          <button
            type="button"
            className="demo-pdp-sticky-add-btn"
            onClick={addToCart}
          >
            <ShoppingCart size={16} />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* ── Virtual Try-On Modal (Mobile Bottom-Sheet / Desktop Modal) ── */}
      <AnimatePresence>
        {isTryOnOpen && (
          <motion.div
            className="tryon-backdrop"
            data-lenis-prevent="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) closeTryOn();
            }}
          >
            <motion.div
              className="tryon-modal"
              data-lenis-prevent="true"
              initial={{ scale: 0.94, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 40 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
            >
              {/* Mobile drag handle */}
              <div className="tryon-sheet-handle" />

              <button
                type="button"
                className="tryon-close"
                onClick={closeTryOn}
                aria-label="Close"
              >
                <X size={18} />
              </button>

              <div className="tryon-modal-header-area">
                <div className="tryon-powered">
                  <Sparkles size={12} />
                  <span>Powered by Clothsy AI</span>
                </div>
                <h2 className="tryon-title">Virtual Try-On Fitting Room</h2>
                <p className="tryon-subtitle">
                  Tap any garment in the strip below to see how it fits on the model.
                </p>
              </div>

              <div className="tryon-step-container">
                <div className="tryon-demo-stage">
                  <div className="tryon-demo-image-wrap">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={tryOnPreview}
                      alt={generatedGarmentId ? "Generated try-on result" : product.name}
                      className={`tryon-demo-image ${isGenerating ? "is-generating" : ""}`}
                    />

                    {generatedGarmentId && !isGenerating && (
                      <div className="tryon-result-badge">
                        <Sparkles size={11} /> AI Try-On Rendered
                      </div>
                    )}

                    <AnimatePresence>
                      {isGenerating && (
                        <motion.div
                          className="tryon-demo-loader"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          <LoaderCircle size={32} className="tryon-demo-loader-icon" />
                          <p>Generating virtual try-on...</p>
                          <span>{generationSteps[generationStep]}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Horizontal Scrollable Garment Selector Strip */}
                  <div className="tryon-garment-scroll-container">
                    <div className="tryon-garment-strip">
                      {garments.map((garment) => {
                        const isSelected = selectedGarmentId === garment.id;
                        const isGenerated = generatedGarmentId === garment.id;

                        return (
                          <button
                            key={garment.id}
                            type="button"
                            className={`tryon-garment-thumb ${isSelected ? "selected" : ""} ${
                              isGenerated ? "generated" : ""
                            }`}
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
                            {isGenerated && (
                              <div className="tryon-garment-check">
                                <Check size={10} />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="tryon-modal-footer-actions">
                  <button
                    type="button"
                    className="tryon-modal-add-btn"
                    onClick={() => {
                      closeTryOn();
                      addToCart();
                    }}
                    disabled={isGenerating}
                  >
                    <ShoppingCart size={18} />
                    <span>Add this Look to Cart</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="demo-store-footer">
        <div className="demo-footer-inner">
          <p className="demo-footer-brand">Thread & Co.</p>
          <p className="demo-footer-powered">
            Virtual Try-On powered by{" "}
            <Link href={CLOTHSY_HOME} className="demo-footer-link">
              Clothsy AI / FabricVTON
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
