import { redirect } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { requirePortalSession } from "@/lib/session";
import { PageHead, Shell } from "@/components/Shell";
import { Playground } from "@/components/Playground";

export default async function PlaygroundPage() {
  const session = await requirePortalSession();

  let data;
  try {
    data = await api.me(session);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/session/expired");
    throw error;
  }

  return (
    <Shell active="/playground" account={data.account}>
      <PageHead
        title="Playground"
        subtitle="Try the engine on any photo and any product, without touching a store."
      />
      <Playground credits={data.account.credits} />
    </Shell>
  );
}
