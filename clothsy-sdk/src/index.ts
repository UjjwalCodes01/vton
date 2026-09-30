export { Clothsy, DEFAULT_BASE_URL, MAX_IMAGE_BYTES } from "./client.js";
export {
  ClothsyError,
  AuthenticationError,
  InsufficientCreditsError,
  ValidationError,
  RateLimitError,
  ServerError,
  ConnectionError,
  TryOnFailedError,
  TryOnTimeoutError,
  friendlyMessage,
} from "./errors.js";
export type {
  ClothsyOptions,
  CompletedTryOn,
  CreateTryOnParams,
  CreatedTryOn,
  FetchLike,
  ImageSource,
  TryOn,
  TryOnStatus,
  UploadOptions,
  UploadedImage,
  WaitOptions,
} from "./types.js";

export { Clothsy as default } from "./client.js";
