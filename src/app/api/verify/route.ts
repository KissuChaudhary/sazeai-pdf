import { generateToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  let token;
  try {
    const body = await req.json();
    token = body.token;
  } catch {
    return Response.json({ success: false, message: "Invalid request" }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";

  if (!token) {
    return Response.json({ success: false, message: "Token missing" }, { status: 400 });
  }

  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    console.error("TURNSTILE_SECRET_KEY not set");
    // Fail open if env is missing? Or fail closed? 
    // User asked to implement it, so fail closed implies it must work.
    return Response.json({ success: false, message: "Server configuration error" }, { status: 500 });
  }

  const verifyUrl = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
  const result = await fetch(verifyUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      secret: secretKey,
      response: token,
      remoteip: ip,
    }),
  });

  const outcome = await result.json();
  if (outcome.success) {
    // Generate our signed session cookie
    const sessionToken = await generateToken(ip);

    // Set cookie
    (await cookies()).set("human_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 3600, // 1 hour
      path: "/",
    });

    return Response.json({ success: true });
  }

  return Response.json({ success: false, message: "Verification failed" }, { status: 400 });
}
