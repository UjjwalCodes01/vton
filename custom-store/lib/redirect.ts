import { NextResponse } from "next/server";

/**
 * A redirect to a path on this site, sent as a relative Location.
 *
 * Next builds request.nextUrl from the address the server listens on. In a
 * container that is the task's own hostname (ip-10-…ec2.internal:3000 on ECS),
 * not the address the browser used, so an absolute redirect built from it sends
 * people to a host they cannot reach. A browser resolves a relative Location
 * against the URL it requested, whichever domain that was.
 */
export function redirectTo(path: string, status = 307) {
  return new NextResponse(null, { status, headers: { Location: path } });
}
