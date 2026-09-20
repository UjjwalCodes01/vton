import type { Status } from "../lib/site";

/**
 * Marks a capability that the interactive preview demonstrates but the shipped widget does not have yet.
 * Renders nothing once the capability's status in lib/site.ts is "live".
 */
export default function PreviewTag({ status, className = "" }: { status: Status; className?: string }) {
  if (status === "live") return null;
  return (
    <span className={`preview-tag ${className}`.trim()} title="Shown in the interactive preview. Not in the store widget yet.">
      Preview
    </span>
  );
}
