const SECRET = process.env.TURNSTILE_SECRET_KEY || "default-secret-key-do-not-use-in-prod";

function normalizeIp(ip: string): string {
  const value = (ip || "").trim().toLowerCase();
  if (!value) return "";
  if (value === "::1") return "127.0.0.1";
  const ipv4Mapped = value.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (ipv4Mapped) return ipv4Mapped[1];
  return value;
}

export async function generateToken(ip: string): Promise<string> {
  const timestamp = Date.now();
  const payload = `${normalizeIp(ip)}:${timestamp}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );
  const signature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${payload}.${signature}`;
}

export async function verifyToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const [tokenIp, timestampStr] = payload.split(":");
  if (!tokenIp || !timestampStr) return false;

  // Skip strict IP matching to reduce false negatives behind proxies/CDNs

  // Verify timestamp (valid for 1 hour)
  const timestamp = parseInt(timestampStr, 10);
  if (Date.now() - timestamp > 3600 * 1000) return false;

  // Verify signature
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  
  // Convert hex signature back to buffer
  const signatureBytes = new Uint8Array(
    signature.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
  );

  return await crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes,
    encoder.encode(payload)
  );
}

export { normalizeIp };
