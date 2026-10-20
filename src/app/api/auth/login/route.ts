import { NextResponse } from "next/server";
import { checkPassword, cookieOptions, createSessionToken, SESSION_COOKIE } from "@/lib/auth";

export async function POST(req: Request) {
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  if (!process.env.APP_PASSWORD) return NextResponse.json({ error: "APP_PASSWORD is not set on the server." }, { status: 500 });
  if (!password || !(await checkPassword(password))) return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await createSessionToken(), cookieOptions);
  return res;
}
