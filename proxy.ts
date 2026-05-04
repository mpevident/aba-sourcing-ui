import { NextResponse, type NextRequest } from "next/server";

// Auth temporarily disabled per Michael (2026-05-01).
// Renamed from middleware.ts -> proxy.ts for Next 16 (the `middleware` file
// convention is deprecated). To re-enable auth, restore the proxy body from
// the historical middleware in commit 52781b4.
export async function proxy(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
