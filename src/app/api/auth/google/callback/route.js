import { resolveRedirectUri, getOAuthClient } from "../../../../../utils/auth-helpers";
import { upsertUserTokens, findUserByGoogleEmail } from "../../../../../utils/storage.js";
import { google } from "googleapis";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  
  if (!code) {
    return new NextResponse("Missing code", { status: 400 });
  }

  try {
    const redirectUri = resolveRedirectUri(request);
    const oauth2Client = getOAuthClient(redirectUri);
    const { tokens } = await oauth2Client.getToken({
      code,
      redirect_uri: redirectUri,
    });
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const me = await oauth2.userinfo.get();
    const email = me.data.email;
    const picture = me.data.picture;
    if (!email) throw new Error("Não foi possível obter e-mail do usuário");

    // Check for existing session
    const cookieStore = await cookies();
    let existingUserEmail = cookieStore.get("user_email")?.value;
    
    // Logic:
    // If NOT logged in (no existingUserEmail), check if this Google Email is already linked to a Platform User.
    if (!existingUserEmail) {
        const linkedUser = await findUserByGoogleEmail(email);
        if (linkedUser) {
            console.log(`✓ Found existing account ${linkedUser.email} linked to Google email ${email}`);
            existingUserEmail = linkedUser.email; // "Log in" as the linked user
        }
    }

    const targetEmail = existingUserEmail || email;
    const googleEmail = email; // The email from Google Profile

    await upsertUserTokens(targetEmail, tokens, picture, googleEmail);

    // Cookie logic - Set if we are logging in (either fresh or via link)
    // We update the cookie if it wasn't set originally
    const currentCookie = cookieStore.get("user_email")?.value;
    if (!currentCookie) {
      const headers = request.headers;
      const isHttps =
        headers.get("x-forwarded-proto")?.includes("https") ||
        process.env.APP_BASE_URL?.startsWith("https://");

      cookieStore.set("user_email", targetEmail, {
        httpOnly: true,
        sameSite: "lax",
        secure: Boolean(isHttps),
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: "/",
      });
    }

    const base = process.env.APP_BASE_URL || "http://localhost:3000";
    return NextResponse.redirect(base);

  } catch (err) {
    console.error('❌ OAuth callback error:', {
      message: err.message,
      code: err.code,
      stack: err.stack?.split('\n').slice(0, 3)
    });
    
    let errorMessage = 'Falha ao concluir o login com Google';
    let errorDetails = err.message || 'Erro desconhecido';
    
    // Check if it's a database connection error
    if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'EAI_AGAIN' || 
        err.message?.includes('Connection terminated')) {
      errorMessage = 'Erro de conexão com banco de dados';
      errorDetails = 'Não foi possível salvar suas credenciais. Por favor, tente novamente em alguns instantes.';
    }
    
    return new NextResponse(`
      <!doctype html>
      <html lang="pt-br">
      <head><meta charset="utf-8"><title>Erro no login</title></head>
      <body style="font-family: system-ui; padding: 24px;">
        <h2>${errorMessage}</h2>
        <p style="color:#900">${errorDetails}</p>
        <p>Verifique no Google Cloud a Redirect URI autorizada e recarregue a página inicial.</p>
        <p><a href="/">Voltar para a página inicial</a></p>
      </body>
      </html>
    `, {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" }
    });
  }
}
