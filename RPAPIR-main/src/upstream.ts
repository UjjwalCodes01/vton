import { required } from "./config.js";

const parsedUpstream = new URL(required("UPSTREAM_BASE_URL"));
if (parsedUpstream.protocol !== "https:") {
  throw new Error("UPSTREAM_BASE_URL must use HTTPS");
}

const upstreamPath = process.env.UPSTREAM_PATH ?? "/v1/request";
if (!upstreamPath.startsWith("/") || upstreamPath.startsWith("//") || upstreamPath.includes("#")) {
  throw new Error("UPSTREAM_PATH must be a relative path such as /v1/request");
}

export const upstream = {
  baseUrl: parsedUpstream.toString().replace(/\/$/, ""),
  path: upstreamPath
};
