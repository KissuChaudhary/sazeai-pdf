import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Basic sanity checks
  const contentLength = request.headers.get("content-length");
  const userAgent = request.headers.get("user-agent") || "";

  // 1. Block huge requests immediately (e.g. > 2MB)
  // Our app only accepts JSON payloads for text, 100k chars is roughly 100KB-200KB.
  // 2MB is a safe upper limit for overhead.
  if (contentLength && parseInt(contentLength) > 2 * 1024 * 1024) {
    return new NextResponse(JSON.stringify({ error: "Payload too large" }), {
      status: 413,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2. Block known bad bots (simple user-agent check)
  // This is a low-level filter; Turnstile handles the smart stuff.
  // REMOVE "bot" and "crawler" as they are too generic and block standard browsers or tools sometimes
  const badBots = ["curl", "wget", "python-requests", "scrapy"];
  if (badBots.some((bot) => userAgent.toLowerCase().includes(bot))) {
     return new NextResponse(JSON.stringify({ error: "Bot detected" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 3. Enforce allowed methods (optional but good for strict APIs)
  if (request.nextUrl.pathname.startsWith("/api/summarize") && request.method !== "POST") {
     return new NextResponse(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", "Allow": "POST" },
    });
  }

  return NextResponse.next();
}

// Only run on API routes
export const config = {
  matcher: "/api/:path*",
};
