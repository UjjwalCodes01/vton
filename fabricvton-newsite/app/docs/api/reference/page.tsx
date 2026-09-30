import { redirect } from "next/navigation";

/** The old single reference page was split into one page per endpoint. */
export default function ReferenceMoved() {
  redirect("/docs/api/endpoints/create-try-on");
}
