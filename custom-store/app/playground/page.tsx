import { redirect } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { requirePortalSession } from "@/lib/session";
import { PageHead, Shell } from "@/components/Shell";
import { Playground } from "@/components/Playground";

const API_BASE = (process.env.CLOTHSY_API_BASE || "https://fabricvton-api.onrender.com").replace(/\/+$/, "");

export default async function PlaygroundPage() {
  const session = await requirePortalSession();

  let data;
  try {
    data = await api.me(session);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/login?expired=1");
    throw error;
  }

  return (
    <Shell active="/playground" account={data.account}>
      <PageHead
        title="Playground"
        subtitle="Try the engine on any photo and any product, without touching a store."
      />
      <Playground credits={data.account.credits} apiBase={API_BASE} />
    </Shell>
  );
}
