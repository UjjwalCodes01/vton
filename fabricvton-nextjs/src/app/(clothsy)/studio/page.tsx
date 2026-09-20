"use client";

import { useState, useRef, useEffect } from "react";
import StickyHeader from "../components/StickyHeader";
import Link from "next/link";
import {
  Sparkles,
  Upload,
  Camera,
  RotateCcw,
  Download,
  Share2,
  Check,
  Sliders,
  Columns,
  Maximize2,
  LoaderCircle,
  ArrowRight,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

/* ── Built-in model presets ── */
const MODEL_PRESETS = [
  {
    id: "m1",
    name: "Elena (Casual)",
    image: "/model_images/original/9.jpg",
    gender: "Female",
    defaultResult: "/model_images/generated/9_generated.jpg",
  },
  {
    id: "m2",
    name: "Sophia (Studio)",
    image: "/model_images/original/10.jpg",
    gender: "Female",
    defaultResult: "/model_images/generated/10_generated.jpg",
  },
  {
    id: "m3",
    name: "Maya (Portrait)",
    image: "/model_images/original/7.jpg",
    gender: "Female",
    defaultResult: "/model_images/generated/7_generated.jpg",
  },
  {
    id: "m4",
    name: "Chloe (Linen)",
    image: "/model_images/original/1.png",
    gender: "Female",
    defaultResult: "/model_images/generated/1_generated.jpg",
  },
  {
    id: "m5",
    name: "Aria (Summer)",
    image: "/model_images/original/2.jpeg",
    gender: "Female",
    defaultResult: "/model_images/generated/2_generated.jpg",
  },
  {
    id: "m6",
    name: "Zoe (Streetwear)",
    image: "/model_images/original/3.jpg",
    gender: "Female",
    defaultResult: "/model_images/generated/3_generated.jpg",
  },
];

/* ── Built-in garment presets ── */
const GARMENT_PRESETS = [
  {
    id: "g1",
    name: "Emerald Silk Blouse",
    category: "Tops",
    image: "/demo_tryon/product_1/1.png",
    resultMap: {
      m1: "/model_images/generated/9_generated.jpg",
      m2: "/model_images/generated/10_generated.jpg",
      m3: "/model_images/generated/7_generated.jpg",
      m4: "/model_images/generated/1_generated.jpg",
      m5: "/model_images/generated/2_generated.jpg",
      m6: "/model_images/generated/3_generated.jpg",
    } as Record<string, string>,
  },
  {
    id: "g2",
    name: "Floral Breeze Sundress",
    category: "Dresses",
    image: "/demo_tryon/product_1/2.png",
    resultMap: {
      m1: "/model_images/generated/9_generated.jpg",
      m2: "/model_images/generated/10_generated.jpg",
      m3: "/model_images/generated/7_generated.jpg",
      m4: "/model_images/generated/1_generated.jpg",
      m5: "/model_images/generated/2_generated.jpg",
      m6: "/model_images/generated/3_generated.jpg",
    } as Record<string, string>,
  },
  {
    id: "g3",
    name: "Minimalist Linen Overshirt",
    category: "Tops",
    image: "/demo_tryon/product_1/3.png",
    resultMap: {
      m1: "/model_images/generated/9_generated.jpg",
      m2: "/model_images/generated/10_generated.jpg",
      m3: "/model_images/generated/7_generated.jpg",
      m4: "/model_images/generated/1_generated.jpg",
      m5: "/model_images/generated/2_generated.jpg",
      m6: "/model_images/generated/3_generated.jpg",
    } as Record<string, string>,
  },
  {
    id: "g4",
    name: "Cropped Denim Jacket",
    category: "Outerwear",
    image: "/model_images/original/4.jpg",
    resultMap: {
      m1: "/model_images/generated/9_generated.jpg",
      m2: "/model_images/generated/10_generated.jpg",
      m3: "/model_images/generated/7_generated.jpg",
      m4: "/model_images/generated/1_generated.jpg",
      m5: "/model_images/generated/2_generated.jpg",
      m6: "/model_images/generated/3_generated.jpg",
    } as Record<string, string>,
  },
  {
    id: "g5",
    name: "Oversized Vintage Knitwear",
    category: "Tops",
    image: "/model_images/original/6.jpg",
    resultMap: {
      m1: "/model_images/generated/9_generated.jpg",
      m2: "/model_images/generated/10_generated.jpg",
      m3: "/model_images/generated/7_generated.jpg",
      m4: "/model_images/generated/1_generated.jpg",
      m5: "/model_images/generated/2_generated.jpg",
      m6: "/model_images/generated/3_generated.jpg",
    } as Record<string, string>,
  },
];

const CATEGORIES = ["All", "Tops", "Dresses", "Outerwear"];

export default function StudioPage() {
  const [selectedModel, setSelectedModel] = useState(MODEL_PRESETS[0]);
  const [customModelUrl, setCustomModelUrl] = useState<string | null>(null);
  const [selectedGarment, setSelectedGarment] = useState(GARMENT_PRESETS[0]);
  const [customGarmentUrl, setCustomGarmentUrl] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("All");

  // Try-on generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStepText, setGenerationStepText] = useState("");
  const [hasResult, setHasResult] = useState(false);
  const [resultImage, setResultImage] = useState(MODEL_PRESETS[0].defaultResult);

  // Before / After Comparison View mode
  const [viewMode, setViewMode] = useState<"slider" | "split" | "result">("slider");
  const [sliderPos, setSliderPos] = useState(50); // percentage 0-100
  const sliderContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const modelInputRef = useRef<HTMLInputElement>(null);
  const garmentInputRef = useRef<HTMLInputElement>(null);

  const currentModelImage = customModelUrl || selectedModel.image;

  // Handle custom model image upload
  const handleModelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCustomModelUrl(url);
      setHasResult(false);
      toast.success("Photo uploaded! Ready for virtual try-on.");
    }
  };

  // Handle custom garment image upload
  const handleGarmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCustomGarmentUrl(url);
      setHasResult(false);
      toast.success("Garment photo uploaded!");
    }
  };

  // Run Virtual Try-On Simulation
  const handleGenerate = () => {
    setIsGenerating(true);
    setGenerationProgress(10);
    setGenerationStepText("Detecting pose & body keypoints...");

    const t1 = setTimeout(() => {
      setGenerationProgress(35);
      setGenerationStepText("Mapping garment geometry & boundary drape...");
    }, 700);

    const t2 = setTimeout(() => {
      setGenerationProgress(70);
      setGenerationStepText("Applying fabric physics & ambient lighting...");
    }, 1500);

    const t3 = setTimeout(() => {
      setGenerationProgress(95);
      setGenerationStepText("Finalizing high-res neural render...");
    }, 2300);

    const t4 = setTimeout(() => {
      setGenerationProgress(100);
      const output =
        selectedGarment.resultMap[selectedModel.id] || selectedModel.defaultResult;
      setResultImage(output);
      setIsGenerating(false);
      setHasResult(true);
      toast.success("Virtual Try-On completed! Slide to compare.");
    }, 2800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  };

  // Touch & Mouse Before/After Slider handlers
  const handleSliderMove = (clientX: number) => {
    if (!sliderContainerRef.current) return;
    const rect = sliderContainerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(pct);
  };

  const onTouchStart = () => {
    isDraggingRef.current = true;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches[0]) {
      handleSliderMove(e.touches[0].clientX);
    }
  };
  const onMouseDown = () => {
    isDraggingRef.current = true;
  };

  useEffect(() => {
    const onMouseUp = () => {
      isDraggingRef.current = false;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        handleSliderMove(e.clientX);
      }
    };
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);
    return () => {
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  // Web Share API
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "My Clothsy AI Virtual Try-On Look",
          text: `Check out my virtual try-on with Clothsy AI!`,
          url: window.location.href,
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          navigator.clipboard.writeText(window.location.href);
          toast.success("Link copied to clipboard!");
        }
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

  // Download result image
  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = resultImage;
    link.download = `clothsy-tryon-${selectedGarment.name.toLowerCase().replace(/\s+/g, "-")}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Result photo downloaded!");
  };

  const filteredGarments =
    categoryFilter === "All"
      ? GARMENT_PRESETS
      : GARMENT_PRESETS.filter((g) => g.category === categoryFilter);

  return (
    <div className="studio-shell">
      <StickyHeader />

      <main className="studio-container">
        {/* ── Studio Hero Header ── */}
        <div className="studio-hero">
          <div className="studio-badge">
            <Sparkles size={14} />
            <span>Clothsy AI Studio</span>
          </div>
          <h1 className="studio-title">
            AI Virtual <span>Fitting Room</span>
          </h1>
          <p className="studio-subtitle">
            Upload your photo or select a model, pick any outfit, and preview realistic drape,
            texture, and fit instantly.
          </p>
        </div>

        {/* ── Main Studio Grid ── */}
        <div className="studio-workspace">
          
          {/* Left Column: Controls & Selectors */}
          <div className="studio-controls">
            
            {/* Step 1: Model Selection */}
            <section className="studio-card">
              <div className="studio-card-header">
                <span className="studio-step-num">1</span>
                <div>
                  <h2 className="studio-card-title">Select Person / Photo</h2>
                  <p className="studio-card-desc">Choose a model or upload your selfie</p>
                </div>
              </div>

              <div className="studio-model-grid">
                {MODEL_PRESETS.map((m) => {
                  const isSelected = selectedModel.id === m.id && !customModelUrl;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      className={`studio-model-thumb ${isSelected ? "selected" : ""}`}
                      onClick={() => {
                        setSelectedModel(m);
                        setCustomModelUrl(null);
                        setHasResult(false);
                      }}
                      aria-label={`Select ${m.name}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.image} alt={m.name} className="studio-thumb-img" />
                      <span className="studio-thumb-label">{m.name}</span>
                      {isSelected && <div className="studio-thumb-check"><Check size={12} /></div>}
                    </button>
                  );
                })}
              </div>

              {/* Upload custom model photo */}
              <div className="studio-upload-actions">
                <input
                  type="file"
                  ref={modelInputRef}
                  onChange={handleModelUpload}
                  accept="image/*"
                  style={{ display: "none" }}
                  id="model-file-input"
                />
                <button
                  type="button"
                  className={`studio-upload-btn ${customModelUrl ? "active" : ""}`}
                  onClick={() => modelInputRef.current?.click()}
                >
                  <Camera size={16} />
                  <span>{customModelUrl ? "Change My Photo" : "Upload My Photo / Selfie"}</span>
                </button>
                {customModelUrl && (
                  <button
                    type="button"
                    className="studio-reset-btn"
                    onClick={() => {
                      setCustomModelUrl(null);
                      setHasResult(false);
                    }}
                    title="Use preset model"
                  >
                    <RotateCcw size={14} />
                  </button>
                )}
              </div>
            </section>

            {/* Step 2: Garment Selection */}
            <section className="studio-card">
              <div className="studio-card-header">
                <span className="studio-step-num">2</span>
                <div>
                  <h2 className="studio-card-title">Select Outfit</h2>
                  <p className="studio-card-desc">Pick a garment to try on</p>
                </div>
              </div>

              {/* Category pills */}
              <div className="studio-cat-strip">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`studio-cat-pill ${categoryFilter === cat ? "active" : ""}`}
                    onClick={() => setCategoryFilter(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="studio-garment-grid">
                {filteredGarments.map((g) => {
                  const isSelected = selectedGarment.id === g.id && !customGarmentUrl;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      className={`studio-garment-card ${isSelected ? "selected" : ""}`}
                      onClick={() => {
                        setSelectedGarment(g);
                        setCustomGarmentUrl(null);
                        setHasResult(false);
                      }}
                      aria-label={`Select ${g.name}`}
                    >
                      <div className="studio-garment-img-wrap">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={g.image} alt={g.name} className="studio-thumb-img" />
                        {isSelected && <div className="studio-thumb-check"><Check size={12} /></div>}
                      </div>
                      <div className="studio-garment-info">
                        <strong>{g.name}</strong>
                        <span>{g.category}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Upload custom garment */}
              <div className="studio-upload-actions">
                <input
                  type="file"
                  ref={garmentInputRef}
                  onChange={handleGarmentUpload}
                  accept="image/*"
                  style={{ display: "none" }}
                  id="garment-file-input"
                />
                <button
                  type="button"
                  className={`studio-upload-btn ${customGarmentUrl ? "active" : ""}`}
                  onClick={() => garmentInputRef.current?.click()}
                >
                  <Upload size={16} />
                  <span>{customGarmentUrl ? "Change Garment" : "Upload Custom Garment"}</span>
                </button>
                {customGarmentUrl && (
                  <button
                    type="button"
                    className="studio-reset-btn"
                    onClick={() => {
                      setCustomGarmentUrl(null);
                      setHasResult(false);
                    }}
                    title="Use preset garment"
                  >
                    <RotateCcw size={14} />
                  </button>
                )}
              </div>
            </section>

            {/* Action Button: Generate Try-On */}
            <div className="studio-action-box">
              <button
                type="button"
                className="btn-studio-generate"
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <LoaderCircle size={20} className="studio-spin" />
                    <span>Rendering Fit ({generationProgress}%)...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    <span>{hasResult ? "Regenerate Try-On" : "Generate Virtual Try-On"}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Stage & Comparison Viewer */}
          <div className="studio-stage-col">
            <div className="studio-stage-card">
              
              {/* Stage View Mode Header */}
              <div className="studio-stage-header">
                <div className="studio-stage-title-wrap">
                  <span className="studio-live-dot" />
                  <h3>Fitting Preview</h3>
                </div>

                {hasResult && (
                  <div className="studio-view-toggles">
                    <button
                      type="button"
                      className={`studio-view-toggle ${viewMode === "slider" ? "active" : ""}`}
                      onClick={() => setViewMode("slider")}
                      title="Interactive Split Slider"
                    >
                      <Sliders size={15} />
                      <span>Slider</span>
                    </button>
                    <button
                      type="button"
                      className={`studio-view-toggle ${viewMode === "split" ? "active" : ""}`}
                      onClick={() => setViewMode("split")}
                      title="Side-by-side view"
                    >
                      <Columns size={15} />
                      <span>Side-by-side</span>
                    </button>
                    <button
                      type="button"
                      className={`studio-view-toggle ${viewMode === "result" ? "active" : ""}`}
                      onClick={() => setViewMode("result")}
                      title="AI Result Only"
                    >
                      <Maximize2 size={15} />
                      <span>Result</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Main Stage Display */}
              <div className="studio-viewport">
                
                {/* 1. Generating State Overlay */}
                <AnimatePresence>
                  {isGenerating && (
                    <motion.div
                      className="studio-generating-overlay"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <div className="studio-progress-circle">
                        <LoaderCircle size={56} className="studio-spin" />
                      </div>
                      <h4>Simulating Virtual Fitting</h4>
                      <p>{generationStepText}</p>
                      
                      <div className="studio-progress-track">
                        <div
                          className="studio-progress-fill"
                          style={{ width: `${generationProgress}%` }}
                        />
                      </div>
                      <span className="studio-progress-pct">{generationProgress}%</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 2. Before / After Interactive Slider Mode */}
                {hasResult && viewMode === "slider" && (
                  <div
                    ref={sliderContainerRef}
                    className="studio-slider-wrap"
                    onMouseDown={onMouseDown}
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                  >
                    {/* Before Image (Bottom layer) */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={currentModelImage}
                      alt="Original model"
                      className="studio-slider-img"
                    />
                    <div className="studio-badge-label left">Before (Original)</div>

                    {/* After Image (Top clipped layer) */}
                    <div
                      className="studio-slider-clipped"
                      style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={resultImage}
                        alt="Virtual Try-On Result"
                        className="studio-slider-img"
                      />
                      <div className="studio-badge-label right">Clothsy AI Try-On ✓</div>
                    </div>

                    {/* Divider Handle */}
                    <div
                      className="studio-slider-handle"
                      style={{ left: `${sliderPos}%` }}
                    >
                      <div className="studio-slider-knob">
                        <span>◀ ▶</span>
                      </div>
                    </div>

                    <div className="studio-slider-hint">
                      <span>Drag slider to compare fit</span>
                    </div>
                  </div>
                )}

                {/* 3. Side by Side Mode */}
                {hasResult && viewMode === "split" && (
                  <div className="studio-split-wrap">
                    <div className="studio-split-pane">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={currentModelImage} alt="Original" className="studio-split-img" />
                      <div className="studio-badge-label bottom">Before</div>
                    </div>
                    <div className="studio-split-pane">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={resultImage} alt="Result" className="studio-split-img" />
                      <div className="studio-badge-label bottom green">AI Try-On</div>
                    </div>
                  </div>
                )}

                {/* 4. Result Only or Initial Preview Mode */}
                {(!hasResult || viewMode === "result") && (
                  <div className="studio-single-preview-wrap">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={hasResult ? resultImage : currentModelImage}
                      alt="Preview"
                      className="studio-preview-img"
                    />
                    <div className="studio-badge-label top">
                      {hasResult ? "✦ AI Try-On Result" : "Selected Model"}
                    </div>

                    {!hasResult && (
                      <div className="studio-initial-callout">
                        <Sparkles size={16} />
                        <span>Tap &ldquo;Generate Virtual Try-On&rdquo; to fit the selected garment</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Stage Actions Bar (Download, Share, Shop) */}
              {hasResult && (
                <div className="studio-result-actions">
                  <button
                    type="button"
                    className="studio-tool-btn"
                    onClick={handleDownload}
                  >
                    <Download size={16} />
                    <span>Download</span>
                  </button>

                  <button
                    type="button"
                    className="studio-tool-btn"
                    onClick={handleShare}
                  >
                    <Share2 size={16} />
                    <span>Share Look</span>
                  </button>

                  <Link href="/demo" className="studio-shop-btn">
                    <span>Try on Demo Store</span>
                    <ArrowRight size={16} />
                  </Link>
                </div>
              )}

              {/* Privacy and Security Assurance */}
              <div className="studio-security-note">
                <Info size={13} />
                <span>Uploaded photos are encrypted, used solely for fitting preview, and automatically deleted after 7 days.</span>
              </div>

            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
