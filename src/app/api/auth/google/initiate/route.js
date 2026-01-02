import { resolveRedirectUri, getOAuthClient, SCOPES } from "../../../../../utils/auth-helpers";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const redirectUri = resolveRedirectUri(request);
    const oauth2Client = getOAuthClient(redirectUri);
    const { searchParams } = new URL(request.url);
    const state = searchParams.get("state") || "";
    const debug = searchParams.get("debug");

    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: SCOPES,
      include_granted_scopes: true,
      state,
      redirect_uri: redirectUri,
    });

    if (debug === "1") {
      return NextResponse.json({
        message: "Auth URL (debug)",
        authUrl: url,
        redirectUri,
        scopes: SCOPES,
      });
    }

    return NextResponse.redirect(url);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao iniciar OAuth" }, { status: 500 });
  }
}
