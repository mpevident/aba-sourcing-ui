import { NextResponse, type NextRequest } from "next/server";

// Auth temporarily disabled per Michael (2026-05-01).
export async function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
