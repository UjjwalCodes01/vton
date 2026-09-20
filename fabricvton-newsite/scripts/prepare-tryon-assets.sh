#!/bin/zsh
# Builds the web-sized try-on sample images in public/tryon/ from the full-size sample sets that
# ship with the main FabricVTON app (fabricvton-nextjs/public/demo_tryon). macOS only: uses sips + cwebp.
#
#   zsh scripts/prepare-tryon-assets.sh
#
# Each set is one shopper photo plus six garments and the six pre-rendered try-on results for that
# shopper. Output per set: person.webp, look-N.webp (880px wide), garment-N.webp (240px wide).
set -eu

HERE="${0:A:h}/.."
SRC="$HERE/../fabricvton-nextjs/public/demo_tryon"
OUT="$HERE/public/tryon"
TMP="$(mktemp -d)"

typeset -A SETS
SETS=(product_1 coats product_3 denim product_4 shirts)

for src name in ${(kv)SETS}; do
  mkdir -p "$OUT/$name"
  sips --resampleWidth 880 "$SRC/$src/person.png" --out "$TMP/p.png" >/dev/null
  cwebp -quiet -q 80 "$TMP/p.png" -o "$OUT/$name/person.webp"
  for i in 1 2 3 4 5 6; do
    sips --resampleWidth 880 "$SRC/$src/output_garment_${i}_1.png" --out "$TMP/l.png" >/dev/null
    cwebp -quiet -q 80 "$TMP/l.png" -o "$OUT/$name/look-$i.webp"
    sips --resampleWidth 240 "$SRC/$src/$i.png" --out "$TMP/g.png" >/dev/null
    cwebp -quiet -q 82 "$TMP/g.png" -o "$OUT/$name/garment-$i.webp"
  done
done

echo "wrote $OUT"
du -sh "$OUT"/*
