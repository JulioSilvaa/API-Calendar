import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request) {
  const cookieStore = await cookies();
  
  // Need to mimic the options used to set it to clear it properly?
  // Next.js cookies().delete() usually works if path is same.
  // The original used: path: "/", sameSite: "lax", secure: ..., httpOnly: true
  // We can just use delete('user_email').
  
  cookieStore.delete("user_email");
  
  const response = NextResponse.json({ ok: true });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(request) {
  const cookieStore = await cookies();
  cookieStore.delete("user_email");
  
  // Original redirect to /
  const base = process.env.APP_BASE_URL || "http://localhost:3000";
  const response = NextResponse.redirect(base);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
