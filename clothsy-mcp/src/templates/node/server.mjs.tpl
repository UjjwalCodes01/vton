// server.mjs — Node.js 18+ (run with: node --env-file=.env server.mjs on Node 20.6+)
import express from "express";
import multer from "multer";
import { Clothsy, InsufficientCreditsError, AuthenticationError, friendlyMessage } from "clothsy-ai";

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 4 * 1024 * 1024 } }); // API limit: 4 MB
const clothsy = new Clothsy(); // reads process.env.CLOTHSY_API_KEY — server-side only

/**
 * Look the product up in YOUR catalogue, on the server.
 * {{PRODUCT_LOOKUP_NOTE}}
 * Never trust an image URL sent by the browser.
 */
async function findProduct(productId) {
  // TODO: replace with the store's real product lookup.
  const products = {
    "denim-jacket": { title: "Cropped denim jacket", imageUrl: "https://cdn.example.com/denim-jacket.jpg" },
  };
  return products[productId] ?? null;
}

function sendError(res, error) {
  if (error instanceof InsufficientCreditsError || error instanceof AuthenticationError) {
    console.error("Clothsy try-on needs attention:", error.code); // alert your team; don't tell the shopper
  } else {
    console.error(error);
  }
  const status = error?.status && error.status >= 400 && error.status < 600 ? error.status : 502;
  res.status(status).json({ message: friendlyMessage(error) });
}

// POST /tryon — multipart: photo, productId, consent ("true"), requestId (8–128 of A-Za-z0-9_-)
app.post("/tryon", upload.single("photo"), async (req, res) => {
  if (req.body.consent !== "true") {
    return res.status(403).json({ message: "Please confirm you agree to your photo being processed." });
  }
  if (!req.file) return res.status(400).json({ message: "Please choose a photo." });
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(req.body.requestId || "")) {
    return res.status(400).json({ message: "Missing request id." });
  }
  const product = await findProduct(String(req.body.productId || ""));
  if (!product) return res.status(404).json({ message: "This product can't be tried on." });

  try {
    const photo = await clothsy.images.upload(req.file.buffer, {
      filename: "photo.jpg",
      contentType: req.file.mimetype === "image/png" ? "image/png" : "image/jpeg",
    });
    const tryon = await clothsy.tryons.create({
      person: { imageId: photo.id },
      garment: { url: product.imageUrl },
      title: product.title.slice(0, 120),
      consent: true,                        // the shopper ticked the consent box
      idempotencyKey: req.body.requestId,   // double clicks / retries never charge twice
    });
    res.status(202).json({ id: tryon.id });
  } catch (error) {
    sendError(res, error);
  }
});

// GET /tryon/:id — the browser polls this every 2.5 s
app.get("/tryon/:id", async (req, res) => {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(req.params.id)) return res.status(400).json({ message: "Bad id." });
  try {
    const tryon = await clothsy.tryons.retrieve(req.params.id);
    res.json({
      status: tryon.status,
      resultUrl: tryon.resultUrl,
      message: tryon.status === "failed" ? "We couldn't create your try-on. Please try another photo." : undefined,
    });
  } catch (error) {
    sendError(res, error);
  }
});

app.use(express.static("public")); // your storefront, including public/tryon.js
app.listen(process.env.PORT || 3000, () => console.log(`Listening on http://localhost:${process.env.PORT || 3000}`));
