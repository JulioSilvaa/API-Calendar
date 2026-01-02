import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserTokens } from "../../../utils/storage";

export async function GET() {
  const cookieStore = await cookies();
  const userEmail = cookieStore.get("user_email");
  const email = userEmail?.value || null;
  
  let hasTokens = false;
  let avatarUrl = null;
  let googleEmail = null;
  if (email) {
    try {
        const tokens = await getUserTokens(email);
        hasTokens = !!tokens;
        avatarUrl = tokens?.avatar_url || null;
        googleEmail = tokens?.google_email || null;
    } catch (e) {
        console.error("Error checking tokens", e);
    }
  }

  return NextResponse.json({ email, hasTokens, avatarUrl, googleEmail });
}
