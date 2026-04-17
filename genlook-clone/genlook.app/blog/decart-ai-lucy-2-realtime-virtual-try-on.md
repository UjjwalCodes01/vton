---
title: "Decart AI's Lucy 2.0: The Real-Time Video Virtual Try-On Revolution"
metaShorterTitle: "Lucy 2.0: Real-Time Virtual Try-On"
description: "Decart AI just released Lucy 2.0, a real-time world transformation model that allows for live outfit changes in video. Here is what it means for fashion e-commerce."
date: "2026-01-28"
author: "Thibault Mathian"
category: "Industry News"
image: "/blog-images/lucy-2-realtime-try-on.jpg"
faq:
  - question: "What is Decart AI's Lucy 2.0?"
    answer: "Released on January 26, 2026, Lucy 2.0 is a state-of-the-art real-time world transformation model. It uses generative AI to transform live video feeds instantly—allowing for character swaps, outfit changes, and environment alterations at up to 30fps with near-zero latency."
  - question: "How does Lucy 2.0 differ from current Virtual Try-On tools?"
    answer: "Most current VTO tools (like Genlook) generate high-fidelity results on **static images**. Lucy 2.0 works on **live video streams**, allowing users to spin, walk, and move while the AI 'drapes' the clothing onto them in real-time without using 3D meshes."
  - question: "Is Lucy 2.0 available for Shopify stores yet?"
    answer: "Not directly. While the API is live, the compute cost for real-time video editing is currently around **$0.05/second**, making it prohibitively expensive for standard e-commerce sessions ($9.00 per user)."
  - question: "When will real-time video try-on be affordable?"
    answer: "We predict that within 6-12 months, optimization techniques like model distillation and dedicated inference chips (like Etched's Sohu) will drive costs down to the viable **$0.20 per session** range."
---

The "Holy Grail" of fashion e-commerce has always been the mirror experience.

Static images—even the high-fidelity AI ones we generate today—are a massive leap forward. But they lack the one thing that gives a shopper true confidence: **Physics.**

Does the fabric cling when I turn? Does the skirt swish when I walk? How does the light hit the velvet when I move?

This week (Jan 26), [Decart AI](https://decart.ai/) dropped a bombshell that brings us one step closer to answering those questions in real-time. They officially released [Lucy 2.0](https://lucy.decart.ai/), a "real-time world transformation model" that shifts generative video from offline rendering to live interaction.

While the demo reels show gamers changing skins on Twitch or transforming their rooms into cyberpunk cities, the implications for fashion retail are undeniable.

_Lucy 2.0 demo on LinkedIn:_  
<iframe src="https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:7422224206010028032?collapsed=1" height="895" width="504" frameborder="0" allowfullscreen="" title="Lucy 2.0 demo"></iframe>

## What is Lucy 2.0?

Lucy 2.0 is a generative video model that doesn't just create video—it *reskins* reality live.

Using a standard webcam feed, it can swap outfits, change backgrounds, or alter physical attributes at **30 frames per second (fps)** in 1080p resolution.

Unlike traditional AR (Augmented Reality) which overlays a rigid 3D model on top of you (often looking like a floating sticker), Lucy 2.0 uses **pure diffusion**. It "understands" the physics of the world through pixel-level prediction.
* It knows how a zipper separates cloth when you twist.
* It knows how a dress should fold when you sit.
* It does this without depth maps, green screens, or 3D meshes.

The result? A "magic mirror" where you can see yourself wearing any garment, moving naturally, with near-zero latency (under 40ms).

## The Barrier: Compute Cost ($0.05/sec)

If this technology exists, why isn't it on every Shopify store today?

**The Price Tag.**

Running a model like Lucy 2.0 requires immense GPU power (it was trained and demoed on massive clusters using NVIDIA H100s and Crusoe Cloud infrastructure).

According to Decart's current API pricing for real-time video editing:
* **Cost:** Approx. **$0.05 per second**.

Let's do the math for a typical e-commerce session:
* A user spends 3 minutes (180 seconds) "trying on" different outfits.
* Total Cost: **$9.00 per user session.**

For a merchant, that is unsustainable. In fashion e-commerce, where margins are tight, you cannot pay $9 just for a customer to *look* at a product.

## The Future: The $0.20 Target

However, in the world of AI, "unsustainable" today means "standard" tomorrow.

We are already seeing the cost of image generation plummet. Video is next. As hardware improves (look at Etched's "Sohu" chips designed specifically for transformers) and models become more efficient, that $0.05/second will drop rapidly.

**The Magic Number: $0.20 per session.**

If the cost drops to around $0.20 per session, the math changes.
* If a VTO session increases conversion rate by 2% or prevents a $15 return shipping cost, paying $0.20 for that experience is a no-brainer.

## What This Means for Genlook

At **Genlook**, we are obsessed with this trajectory.

Currently, we provide the market-leading **static** virtual try-on experience. It creates high-fidelity results instantly and affordably. This is the correct solution for 2026.

But we see 2027 coming.

We believe that within months, we will see optimized or open-source versions of models like Lucy 2.0. When the price hits that viable threshold, we will be ready to integrate this capability directly into our Shopify app.

Imagine your customers opening your product page, turning on their webcam, and seeing your new collection on themselves—live.

## Summary

Decart AI's Lucy 2.0 is a glimpse into the near future.
* **The Tech:** Real-time video generation with perfect physics (30fps).
* **The Pros:** No 3D models needed, instant gratification, high engagement.
* **The Cons:** Currently too expensive for retail ($0.05/sec).
* **The Prediction:** Prices will crash, and this will become the standard for high-end fashion retail by 2027.

Merchants, get ready. The mirror is coming online.

---

*Until real-time video becomes affordable, you can still give your customers the next best thing. [Try Genlook for free](https://apps.shopify.com/genlook-virtual-try-on?utm_source=g_landing&utm_medium=website&utm_campaign=blog-decart-ai-lucy-2-realtime-virtual-try-on) and let them try on your clothes using their photos today.*