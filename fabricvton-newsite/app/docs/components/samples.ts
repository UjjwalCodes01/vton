import { API_ORIGIN } from "../../lib/site";

/** Example values shared by every page, so the samples agree with each other. */
export const TRYON_ID = "7f3c2a9e-1d4b-4c1e-9a55-2b8f0c6d4e10";
/** Real ids are opaque, signed and longer (up to 600 characters): store them as text, never a short column. */
export const IMAGE_ID =
  "img_eyJhIjoiYWNjXzlYcjJrVjRuIiwiayI6Imxvb2tzL2FwaS9hY2NfOVhyMmtWNG4vN2YzYzJhOWUuanBnIiwiZSI6MTc5MTAwMDAwMH0.Qm9H3xkV2tTnR7wLp0sY8cJd4fA6uZ1eNqWb5gXyKhM";
export const RESULT_URL = `${API_ORIGIN}/i/eyJ...`;
export const PERSON_URL = "https://your-bucket.example.com/shopper.jpg";
export const GARMENT_URL = "https://your-cdn.example.com/denim-jacket.jpg";
export const TITLE = "Cropped denim jacket";

export const RES_UPLOADED = `{
  "id": "${IMAGE_ID}",
  "expiresAt": "2026-10-01T09:30:00.000Z"
}`;

export const RES_PENDING = `{
  "id": "${TRYON_ID}",
  "status": "pending",
  "pollUrl": "/api/v1/tryons/${TRYON_ID}"
}`;

export const RES_SUCCESS = `{
  "id": "${TRYON_ID}",
  "status": "success",
  "resultUrl": "${RESULT_URL}"
}`;

export const RES_FAILED = `{
  "id": "${TRYON_ID}",
  "status": "failed",
  "resultUrl": null,
  "message": "That try-on did not finish. Your credit has been returned."
}`;

export const RES_CREDITS = `{
  "credits": 42,
  "scope": "account"
}`;
