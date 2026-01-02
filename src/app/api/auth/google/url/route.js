import { resolveRedirectUri, getOAuthClient, SCOPES } from "../../../../../utils/auth-helpers";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const redirectUri = resolveRedirectUri(request);
    const oauth2Client = getOAuthClient(redirectUri);
    const { searchParams } = new URL(request.url);
    const state = searchParams.get("state") || "";
    
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: SCOPES,
      include_granted_scopes: true,
      state,
      redirect_uri: redirectUri,
    });
    
    return NextResponse.json({
      message: "Use esta URL para iniciar o login com Google",
      authUrl: url,
      redirectUri,
      scopes: SCOPES,
    });
  } catch (e) {
    return NextResponse.json({ error: "Falha ao montar URL de login", details: e.message }, { status: 500 });
  }
}
