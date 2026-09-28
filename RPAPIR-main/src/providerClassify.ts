export type ProviderKind = "success" | "quota" | "auth" | "temporary" | "error";

export function classifyProviderResponse(status: number, bodyText: string): ProviderKind {
  if (status >= 200 && status < 300) return "success";
  const text = bodyText.toLowerCase();

  if (
    status === 401 || status === 403 ||
    text.includes("invalid api key") ||
    text.includes("invalid_api_key") ||
    text.includes("invalidapikey") ||
    text.includes("invalidaccesstoken") ||
    text.includes("revoked")
  ) return "auth";

  if (
    status === 402 ||
    text.includes("creditinsufficiency") ||
    text.includes("quota exceeded") ||
    text.includes("quota_exceeded") ||
    text.includes("insufficient quota") ||
    text.includes("insufficient_quota") ||
    text.includes("insufficient units") ||
    text.includes("insufficient credits") ||
    text.includes("not enough units") ||
    text.includes("not enough credits") ||
    text.includes("out of quota")
  ) return "quota";

  if ([408, 425, 429, 500, 502, 503, 504].includes(status)) return "temporary";
  return "error";
}
