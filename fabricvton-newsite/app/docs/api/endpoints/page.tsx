import { redirect } from "next/navigation";

/** There is no endpoints overview; send visitors to the endpoint most people are looking for. */
export default function EndpointsIndex() {
  redirect("/docs/api/endpoints/create-try-on");
}
