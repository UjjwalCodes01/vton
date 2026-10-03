#!/usr/bin/env bash
# Raw HTTP walk-through. Run on a server or your own machine — never in a browser.
# Requires: curl, jq. Spends 1 credit when the try-on succeeds.
set -euo pipefail
API="{{API_BASE_URL}}"
: "${CLOTHSY_API_KEY:?Set CLOTHSY_API_KEY first (export CLOTHSY_API_KEY=clothsy_live_...)}"
AUTH="Authorization: Bearer $CLOTHSY_API_KEY"

# 0. Check the key and your credits.
curl -sS "$API/account" -H "$AUTH"
echo

# 1. Upload the person photo (JPEG/PNG ≤ 4 MB; free; id valid 24 h).
#    Use a photo of a consenting adult — for example yourself.
IMAGE_ID=$(curl -sS -X POST "$API/images" -H "$AUTH" \
  -F "file=@person.jpg;type=image/jpeg" | jq -r .id)
echo "Uploaded: $IMAGE_ID"

# 2. Start the try-on. Idempotency-Key: 8–128 of A-Za-z0-9_-; reuse it when retrying.
KEY=$(uuidgen 2>/dev/null || date +%s%N)
TRYON_ID=$(curl -sS -X POST "$API/tryons" -H "$AUTH" \
  -H "Idempotency-Key: tryon-$KEY" \
  -H "Content-Type: application/json" \
  -d "{\"personImageId\":\"$IMAGE_ID\",\"garmentImageUrl\":\"https://cdn.example.com/denim-jacket.jpg\",\"title\":\"Cropped denim jacket\",\"consent\":true}" \
  | jq -r .id)
echo "Started: $TRYON_ID"

# 3. Poll every 2.5 s (limit: 60 polls a minute).
while true; do
  RESULT=$(curl -sS "$API/tryons/$TRYON_ID" -H "$AUTH")
  STATUS=$(echo "$RESULT" | jq -r .status)
  [ "$STATUS" != "pending" ] && break
  sleep 2.5
done
echo "$RESULT" | jq .   # resultUrl is valid for 24 h — caption it as AI-generated wherever you show it

# Alternative to steps 2–3 for scripts: POST $API/tryons/sync with the same headers/body and
# curl --max-time 90; it waits ~45 s and returns 200 (finished) or 202 (keep polling).
