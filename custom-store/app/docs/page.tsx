import { redirect } from "next/navigation";

/**
 * The portal's Documentation link goes to the developer docs on the main site,
 * so there is one set of docs to keep correct rather than two drifting apart.
 */
export default function Docs() {
  redirect("https://clothsyai.fabricvton.com/docs/api");
}
