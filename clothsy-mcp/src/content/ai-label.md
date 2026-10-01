# AI-generated label

## What the API does

Every result image carries machine-readable AI-provenance metadata: an XMP block with the IPTC Digital Source Type `compositeWithTrainedAlgorithmicMedia` (a real photo combined with AI-generated content). It's always added and can't be turned off. It doesn't change how the image looks.

You can check it with ExifTool:

```
exiftool -XMP-iptcExt:DigitalSourceType result.jpg
```

## What you must still do

Metadata is invisible and fragile: CDNs, image optimisers and re-encoding can strip it. So:

1. **Caption every result visibly**, e.g. "AI-generated try-on", right next to the image.
2. **Say it in the alt text**, e.g. `alt="AI-generated preview of you wearing Cropped denim jacket"`.
3. **Keep the file intact** if you store it: save the downloaded bytes as-is instead of re-encoding them through an image library.

```html
<figure>
  <img src="RESULT_URL" alt="AI-generated preview of you wearing this item" />
  <figcaption>AI-generated try-on. Fit and colour may differ from the real item.</figcaption>
</figure>
```

This applies to every integration: HTTP API, SDK, `useTryOn` and `TryOnButton` (its dialog doesn't caption the result for you, so put a line such as "Try-on previews are AI-generated" next to the button).

Transparency rules for AI-generated images (such as Article 50 of the EU AI Act) are becoming common; labelling at the source plus a visible caption covers the typical expectations. This isn't legal advice.
