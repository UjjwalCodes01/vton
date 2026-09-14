/** One headline number in a bordered tile, used on the Dashboard and Analytics pages. */
export function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail?: string;
}) {
  return (
    <s-box padding="base" borderWidth="base" borderRadius="base" borderColor="base">
      <s-stack gap="small-200">
        <s-text color="subdued">{label}</s-text>
        <s-heading>{value.toLocaleString("en-US")}</s-heading>
        {detail && <s-text color="subdued">{detail}</s-text>}
      </s-stack>
    </s-box>
  );
}
