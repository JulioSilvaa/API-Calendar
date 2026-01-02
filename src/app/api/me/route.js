import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const userEmail = cookieStore.get("user_email");
  const email = userEmail?.value || null;
  return NextResponse.json({ email });
}
