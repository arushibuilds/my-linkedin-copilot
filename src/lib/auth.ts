// Single-user auth: one password from APP_PASSWORD, a signed cookie with an expiry.
// Uses Web Crypto so it runs in both middleware (edge) and route handlers (node).

export const SESSION_COOKIE = "copilot_session";
const MAX_AGE_DAYS = 30;

function secret() {
  const s = process.env.SESSION_SECRET || process.env.APP_PASSWORD;
  if (!s) throw new Error("Set SESSION_SECRET and APP_PASSWORD");
  return s;
}

async function hmac(data: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSessionToken() {
  const exp = Date.now() + MAX_AGE_DAYS * 86400_000;
  return `${exp}.${await hmac(String(exp))}`;
}

export async function verifySessionToken(token: string | undefined) {
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return safeEqual(sig, await hmac(exp));
}

export async function checkPassword(input: string) {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return false;
  // Compare digests so timing doesn't leak the password length.
  return safeEqual(await hmac(`pw:${input}`), await hmac(`pw:${expected}`));
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE_DAYS * 86400,
};
