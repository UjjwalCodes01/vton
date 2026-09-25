/**
 * Bibliography for research and journal pages. Every entry is a published, publicly available source,
 * checked against its arXiv / publisher page on 2026-09-25. Keys are referenced from research.ts and the journal posts.
 */

export type Ref = { authors: string; title: string; venue: string; year: number; url: string };

export const REFS: Record<string, Ref> = {
  viton: { authors: "Han et al.", title: "VITON: An Image-based Virtual Try-on Network", venue: "CVPR", year: 2018, url: "https://arxiv.org/abs/1711.08447" },
  cpvton: { authors: "Wang et al.", title: "Toward Characteristic-Preserving Image-based Virtual Try-On Network", venue: "ECCV", year: 2018, url: "https://arxiv.org/abs/1807.07688" },
  vitonhd: { authors: "Choi et al.", title: "VITON-HD: High-Resolution Virtual Try-On via Misalignment-Aware Normalization", venue: "CVPR", year: 2021, url: "https://arxiv.org/abs/2103.16874" },
  hrviton: { authors: "Lee et al.", title: "High-Resolution Virtual Try-On with Misalignment and Occlusion-Handled Conditions", venue: "ECCV", year: 2022, url: "https://arxiv.org/abs/2206.14180" },
  tryondiffusion: { authors: "Zhu et al.", title: "TryOnDiffusion: A Tale of Two UNets", venue: "CVPR", year: 2023, url: "https://arxiv.org/abs/2306.08276" },
  ladivton: { authors: "Morelli et al.", title: "LaDI-VTON: Latent Diffusion Textual-Inversion Enhanced Virtual Try-On", venue: "ACM Multimedia", year: 2023, url: "https://arxiv.org/abs/2305.13501" },
  stableviton: { authors: "Kim et al.", title: "StableVITON: Learning Semantic Correspondence with Latent Diffusion Model for Virtual Try-On", venue: "CVPR", year: 2024, url: "https://arxiv.org/abs/2312.01725" },
  idmvton: { authors: "Choi et al.", title: "Improving Diffusion Models for Authentic Virtual Try-on in the Wild", venue: "ECCV", year: 2024, url: "https://arxiv.org/abs/2403.05139" },
  ootdiffusion: { authors: "Xu et al.", title: "OOTDiffusion: Outfitting Fusion based Latent Diffusion for Controllable Virtual Try-on", venue: "AAAI", year: 2025, url: "https://arxiv.org/abs/2403.01779" },
  catvton: { authors: "Chong et al.", title: "CatVTON: Concatenation Is All You Need for Virtual Try-On with Diffusion Models", venue: "ICLR", year: 2025, url: "https://arxiv.org/abs/2407.15886" },
  mmvto: { authors: "Zhu et al.", title: "M&M VTO: Multi-Garment Virtual Try-On and Editing", venue: "CVPR", year: 2024, url: "https://arxiv.org/abs/2406.04542" },
  dresscode: { authors: "Morelli et al.", title: "Dress Code: High-Resolution Multi-Category Virtual Try-On", venue: "ECCV", year: 2022, url: "https://arxiv.org/abs/2204.08532" },

  ldm: { authors: "Rombach et al.", title: "High-Resolution Image Synthesis with Latent Diffusion Models", venue: "CVPR", year: 2022, url: "https://arxiv.org/abs/2112.10752" },

  fid: { authors: "Heusel et al.", title: "GANs Trained by a Two Time-Scale Update Rule Converge to a Local Nash Equilibrium", venue: "NeurIPS", year: 2017, url: "https://arxiv.org/abs/1706.08500" },
  kid: { authors: "Bińkowski et al.", title: "Demystifying MMD GANs", venue: "ICLR", year: 2018, url: "https://arxiv.org/abs/1801.01401" },
  lpips: { authors: "Zhang et al.", title: "The Unreasonable Effectiveness of Deep Features as a Perceptual Metric", venue: "CVPR", year: 2018, url: "https://arxiv.org/abs/1801.03924" },
  ssim: { authors: "Wang, Bovik, Sheikh & Simoncelli", title: "Image Quality Assessment: From Error Visibility to Structural Similarity", venue: "IEEE Transactions on Image Processing", year: 2004, url: "https://doi.org/10.1109/TIP.2003.819861" },
  dists: { authors: "Ding et al.", title: "Image Quality Assessment: Unifying Structure and Texture Similarity", venue: "IEEE TPAMI", year: 2022, url: "https://arxiv.org/abs/2004.07728" },
  clip: { authors: "Radford et al.", title: "Learning Transferable Visual Models From Natural Language Supervision", venue: "ICML", year: 2021, url: "https://arxiv.org/abs/2103.00020" },

  progdistill: { authors: "Salimans & Ho", title: "Progressive Distillation for Fast Sampling of Diffusion Models", venue: "ICLR", year: 2022, url: "https://arxiv.org/abs/2202.00512" },
  consistency: { authors: "Song et al.", title: "Consistency Models", venue: "ICML", year: 2023, url: "https://arxiv.org/abs/2303.01469" },
  lcm: { authors: "Luo et al.", title: "Latent Consistency Models: Synthesizing High-Resolution Images with Few-Step Inference", venue: "arXiv", year: 2023, url: "https://arxiv.org/abs/2310.04378" },
  add: { authors: "Sauer et al.", title: "Adversarial Diffusion Distillation", venue: "ECCV", year: 2024, url: "https://arxiv.org/abs/2311.17042" },

  openpose: { authors: "Cao et al.", title: "OpenPose: Realtime Multi-Person 2D Pose Estimation Using Part Affinity Fields", venue: "IEEE TPAMI", year: 2021, url: "https://arxiv.org/abs/1812.08008" },
  densepose: { authors: "Güler, Neverova & Kokkinos", title: "DensePose: Dense Human Pose Estimation In The Wild", venue: "CVPR", year: 2018, url: "https://arxiv.org/abs/1802.00434" },
  dwpose: { authors: "Yang et al.", title: "Effective Whole-body Pose Estimation with Two-stages Distillation", venue: "ICCV Workshops (CV4Metaverse)", year: 2023, url: "https://arxiv.org/abs/2307.15880" },
  schp: { authors: "Li et al.", title: "Self-Correction for Human Parsing", venue: "IEEE TPAMI", year: 2022, url: "https://arxiv.org/abs/1910.09777" },
  sam2: { authors: "Ravi et al.", title: "SAM 2: Segment Anything in Images and Videos", venue: "ICLR", year: 2025, url: "https://arxiv.org/abs/2408.00714" },

  baraff1998: { authors: "Baraff & Witkin", title: "Large Steps in Cloth Simulation", venue: "SIGGRAPH", year: 1998, url: "https://doi.org/10.1145/280814.280821" },
  snug: { authors: "Santesteban, Otaduy & Casas", title: "SNUG: Self-Supervised Neural Dynamic Garments", venue: "CVPR", year: 2022, url: "https://arxiv.org/abs/2204.02219" },
  hood: { authors: "Grigorev et al.", title: "HOOD: Hierarchical Graphs for Generalized Modelling of Clothing Dynamics", venue: "CVPR", year: 2023, url: "https://arxiv.org/abs/2212.07242" },
  deschaintre2018: { authors: "Deschaintre et al.", title: "Single-Image SVBRDF Capture with a Rendering-Aware Deep Network", venue: "ACM Transactions on Graphics (SIGGRAPH)", year: 2018, url: "https://doi.org/10.1145/3197517.3201378" },

  mvvton: { authors: "Wang et al.", title: "MV-VTON: Multi-View Virtual Try-On with Diffusion Models", venue: "AAAI", year: 2025, url: "https://arxiv.org/abs/2404.17364" },
  tunnel: { authors: "Xu et al.", title: "Tunnel Try-on: Excavating Spatial-temporal Tunnels for High-quality Virtual Try-on in Videos", venue: "ACM Multimedia", year: 2024, url: "https://arxiv.org/abs/2404.17571" },
  fwgan: { authors: "Dong et al.", title: "FW-GAN: Flow-navigated Warping GAN for Video Virtual Try-on", venue: "ICCV", year: 2019, url: "https://openaccess.thecvf.com/content_ICCV_2019/html/Dong_FW-GAN_Flow-Navigated_Warping_GAN_for_Video_Virtual_Try-On_ICCV_2019_paper.html" },

  behave: { authors: "Bhatnagar et al.", title: "BEHAVE: Dataset and Method for Tracking Human Object Interactions", venue: "CVPR", year: 2022, url: "https://virtualhumans.mpi-inf.mpg.de/behave/" },
  c2pa: { authors: "Coalition for Content Provenance and Authenticity", title: "C2PA: an open technical standard for the origin and edits of digital content", venue: "c2pa.org", year: 2024, url: "https://c2pa.org/" },
  euaiact: { authors: "European Union", title: "Regulation (EU) 2024/1689 (Artificial Intelligence Act), Article 50", venue: "Official Journal of the EU", year: 2024, url: "https://eur-lex.europa.eu/eli/reg/2024/1689/oj" },
};

export function formatRef(r: Ref) {
  return `${r.authors} ${r.title}. ${r.venue}, ${r.year}.`;
}
