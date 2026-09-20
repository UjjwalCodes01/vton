"use client";

import Image from "next/image";
import { useId, useState } from "react";
import { garmentSrc } from "../lib/tryon-data";
import ShadePicker from "./ShadePicker";

/**
 * "It lives on your product page." A mock product page with the merchant's own Add to cart button and the
 * Clothsy Try it on button beside it, restyled live with the settings a store can actually change:
 * label, button colour (a swatch or any shade), text colour and corner radius. (The button's font comes
 * from the store's theme.)
 */

const SWATCHES = [
  { name: "Black", value: "#000000" },
  { name: "Violet", value: "#5b21e8" },
  { name: "Forest", value: "#1f4d3a" },
  { name: "Brick", value: "#b0413e" },
  { name: "Navy", value: "#1b1735" },
];

const DEFAULT_LABEL = "Try It On";

export default function StoreDemo() {
  const [label, setLabel] = useState(DEFAULT_LABEL);
  const [color, setColor] = useState(SWATCHES[0].value);
  const [text, setText] = useState<"#ffffff" | "#000000">("#ffffff");
  const [radius, setRadius] = useState(4);
  const [shadeOpen, setShadeOpen] = useState(true);
  const id = useId();
  const custom = !SWATCHES.some((sw) => sw.value === color);

  return (
    <div className="sd">
      <div className="sd-pdp" aria-label="Example product page">
        <div className="sd-img">
          <Image src={garmentSrc("coats", 1)} alt="A tan belted trench coat (sample product)" width={240} height={320} unoptimized />
        </div>
        <div className="sd-info">
          <small>Sample store</small>
          <h3 className="display">Belted trench</h3>
          <div className="sd-sizes" aria-hidden="true">
            {["XS", "S", "M", "L"].map((s) => (
              <span key={s}>{s}</span>
            ))}
          </div>
          <span className="sd-add">Add to cart</span>
          <span className="sd-try" style={{ background: color, color: text, borderRadius: radius }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 20.5s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 8a4.3 4.3 0 0 1 7.5 2.5c0 5.4-7.5 10-7.5 10Z" />
            </svg>
            {label.trim() || DEFAULT_LABEL}
          </span>
        </div>
      </div>

      <form className="sd-controls" onSubmit={(e) => e.preventDefault()} aria-label="Customise the Try it on button">
        <div className="sd-field">
          <label htmlFor={`${id}-label`}>Button label</label>
          <input id={`${id}-label`} type="text" value={label} maxLength={24} onChange={(e) => setLabel(e.target.value)} placeholder={DEFAULT_LABEL} />
        </div>

        <fieldset className="sd-field">
          <legend>Button colour</legend>
          <div className="sd-swatches">
            {SWATCHES.map((sw) => (
              <button key={sw.value} type="button" className="sd-swatch" style={{ background: sw.value }} aria-label={sw.name} aria-pressed={color === sw.value} onClick={() => setColor(sw.value)} />
            ))}
            <button
              type="button"
              className="sd-custom"
              aria-label="Custom shade"
              aria-expanded={shadeOpen}
              aria-controls={`${id}-shade`}
              aria-pressed={custom}
              onClick={() => setShadeOpen((open) => !open)}
            />
          </div>
          <div className="sd-picker" id={`${id}-shade`} data-open={shadeOpen}>
            <div>
              <p className="sd-hint">Or drag in the graph for any shade.</p>
              <ShadePicker value={color} onChange={setColor} />
            </div>
          </div>
        </fieldset>

        <fieldset className="sd-field">
          <legend>Text colour</legend>
          <div className="seg" role="group" aria-label="Text colour">
            <button type="button" aria-pressed={text === "#ffffff"} onClick={() => setText("#ffffff")}>
              Light
            </button>
            <button type="button" aria-pressed={text === "#000000"} onClick={() => setText("#000000")}>
              Dark
            </button>
          </div>
        </fieldset>

        <div className="sd-field">
          <label htmlFor={`${id}-radius`}>
            Corner radius <output>{radius}px</output>
          </label>
          <input id={`${id}-radius`} type="range" min={0} max={50} value={radius} onChange={(e) => setRadius(Number(e.target.value))} />
        </div>

        <p className="sd-note">
          On Shopify, drag the Try it on block wherever you want it on the product template. On WooCommerce it sits below Add to cart, or use the block or shortcode.
        </p>
      </form>
    </div>
  );
}
