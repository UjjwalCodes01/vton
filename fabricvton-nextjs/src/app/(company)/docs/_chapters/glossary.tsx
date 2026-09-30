export const toc = [];
export const sources: number[] = [];

const TERMS: [string, string][] = [
  ["Virtual try-on (VTON)", "Generating a photograph of a person wearing a garment from separate photographs of the person and the garment"],
  ["Diffusion model", "A generative model that creates an image by removing noise step by step"],
  ["MMDiT", "Multimodal diffusion transformer, which processes image and condition tokens in shared attention"],
  ["LoRA", "Low-rank adaptation, a way to fine-tune a large model by training small added matrices"],
  ["Try-off", "Generating a flat product image of a garment from a photograph of someone wearing it"],
  ["Distillation", "Training a smaller or faster model to reproduce a larger model's outputs"],
  ["FID and KID", "Fréchet and Kernel Inception Distances, which measure how close generated images are to real ones as a set"],
  ["SSIM and LPIPS", "Structural and learned perceptual similarity between an output and its ground truth"],
  ["Kendall τ", "A rank correlation used here to measure agreement between metrics and human raters"],
  ["Krippendorff's alpha", "A measure of agreement between human annotators"],
  ["Monk Skin Tone scale", "A ten-point skin tone scale created by Dr Ellis Monk and published by Google for inclusive evaluation"],
  ["CIEDE2000", "A standard formula for perceived colour difference"],
  ["Garment family", "A group of garments that fail in similar ways, such as tops, outerwear or draped garments"],
  ["Garment presentation", "How the garment photograph shows the item: flat, folded as sold, on a hanger or mannequin, or worn by another person"],
  ["Draped or wrapped garment", "A garment whose worn shape comes from wrapping, folding or tying on the body rather than from its cut alone, such as a saree, sarong, shawl or wrap dress"],
  ["DPIIT", "Department for Promotion of Industry and Internal Trade, which recognises startups in India"],
  ["Video try-on", "Dressing a person in a garment across a whole video, keeping identity, motion and the garment consistent from frame to frame"],
  ["Live try-on", "Video try-on on a camera stream as it arrives, with each frame drawn in about 33 to 66 milliseconds"],
  ["Frames per second (fps)", "How many new images a video system produces each second; live video needs about 15 to 30"],
  ["Causal generation", "Drawing each frame only from past frames and the current input, never future ones, which live video requires"],
  ["Self-forcing", "Training a video model on its own generated frames so that small errors do not build up over time"],
  ["KV cache", "Stored attention keys and values from earlier frames, reused so that each new frame is fast to compute"],
  ["WebRTC", "The open standard browsers use for live video calls, used here to stream the camera to the GPU and back"],
  ["VFID", "Video Fréchet Inception Distance, a measure of how close generated videos are to real ones as a set"],
];

export function Body() {
  return (
    <dl className="dx-glossary">
      {TERMS.map(([k, v], i) => (
        <div key={k} data-reveal style={{ transitionDelay: `${Math.min(i, 10) * 30}ms` }}>
          <dt id={k.toLowerCase().replace(/[^a-z0-9]+/g, "-")}>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}
