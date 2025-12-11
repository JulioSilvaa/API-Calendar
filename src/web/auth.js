import express from "express";
import { google } from "googleapis";
import { upsertUserTokens } from "../utils/storage.js";

const router = express.Router();

function resolveRedirectUri(req) {
  const { GOOGLE_REDIRECT_URI } = process.env;
  if (GOOGLE_REDIRECT_URI && GOOGLE_REDIRECT_URI.toLowerCase() !== "auto") {
    return GOOGLE_REDIRECT_URI;
  }
  const proto = (req.headers["x-forwarded-proto"] || req.protocol || "http")
    .split(",")[0]
    .trim();
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}/auth/google/callback`;
}

function getOAuthClient(redirectUri) {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error("Faltam variáveis de ambiente do Google OAuth");
  }
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    redirectUri
  );
}

const SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/spreadsheets",
];

router.get("/initiate", async (req, res) => {
  try {
    const redirectUri = resolveRedirectUri(req);
    const oauth2Client = getOAuthClient(redirectUri);
    // Log seguro para diagnóstico de redirect_uri_mismatch
    console.log("[OAuth] USING REDIRECT_URI =", redirectUri);
    const state = req.query.state || "";
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: SCOPES,
      include_granted_scopes: true,
      state,
      redirect_uri: redirectUri,
    });
    if (req.query.debug === "1") {
      return res.json({
        message: "Auth URL (debug)",
        authUrl: url,
        redirectUri,
        scopes: SCOPES,
      });
    }
    res.redirect(url);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao iniciar OAuth" });
  }
});

router.get("/callback", async (req, res) => {
  const { code, state } = req.query;
  if (!code) return res.status(400).send("Missing code");
  try {
    const redirectUri = resolveRedirectUri(req);
    const oauth2Client = getOAuthClient(redirectUri);
    console.log(
      "[OAuth callback] query =",
      req.query,
      "redirectUri =",
      redirectUri
    );
    const { tokens } = await oauth2Client.getToken({
      code,
      redirect_uri: redirectUri,
    });
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const me = await oauth2.userinfo.get();
    const email = me.data.email;
    if (!email) throw new Error("Não foi possível obter e-mail do usuário");

    await upsertUserTokens(email, tokens);

    // Define cookie de sessão com e-mail do usuário (sem dados sensíveis)
    const isHttps =
      req.headers["x-forwarded-proto"]?.includes("https") ||
      req.secure ||
      process.env.APP_BASE_URL?.startsWith("https://");
    const cookieOptions = {
      httpOnly: true,
      sameSite: "lax",
      secure: Boolean(isHttps),
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 dias
      path: "/",
    };
    res.cookie("user_email", email, cookieOptions);

    const base = process.env.APP_BASE_URL || "http://localhost:3000";
    res.redirect(base);
  } catch (err) {
    console.error(err);
    res.status(500).set("Content-Type", "text/html; charset=utf-8").end(`
      <!doctype html>
      <html lang="pt-br">
      <head><meta charset="utf-8"><title>Erro no login</title></head>
      <body style="font-family: system-ui; padding: 24px;">
        <h2>Falha ao concluir o login com Google</h2>
        <p style="color:#900">${
          err && err.message ? err.message : "Erro desconhecido"
        }</p>
        <p>Verifique no Google Cloud a Redirect URI autorizada e recarregue a página inicial.</p>
        <p><a href="/">Voltar para a página inicial</a></p>
      </body>
      </html>
    `);
  }
});

// Endpoint de diagnóstico para ajudar a resolver redirect_uri_mismatch
router.get("/diagnostics", (req, res) => {
  try {
    const resolved = resolveRedirectUri(req);
    res.json({
      message: "Diagnóstico OAuth",
      usingRedirectUri: resolved,
      envRedirectUri: process.env.GOOGLE_REDIRECT_URI,
      notes: [
        "A redirect URI precisa estar cadastrada no Google Cloud exatamente igual à usada aqui.",
        "Se estiver usando ngrok/Cloudflare, use GOOGLE_REDIRECT_URI=auto e adicione a URL pública no Google Cloud.",
        "Para localhost, adicione http://localhost:3000/auth/google/callback e/ou http://127.0.0.1:3000/auth/google/callback nas URIs autorizadas.",
      ],
      request: {
        protocol: req.protocol,
        host: req.headers.host,
        xForwardedProto: req.headers["x-forwarded-proto"] || null,
        xForwardedHost: req.headers["x-forwarded-host"] || null,
      },
    });
  } catch (e) {
    res.status(500).json({ error: "Falha no diagnóstico", details: e.message });
  }
});

export default router;

// Retorna a URL exata de autenticação (útil para copiar/colar e evitar fluxos de terceiros como o n8n Connect)
router.get("/url", (req, res) => {
  try {
    const redirectUri = resolveRedirectUri(req);
    const oauth2Client = getOAuthClient(redirectUri);
    const state = req.query.state || "";
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: SCOPES,
      include_granted_scopes: true,
      state,
      redirect_uri: redirectUri,
    });
    res.json({
      message: "Use esta URL para iniciar o login com Google",
      authUrl: url,
      redirectUri,
      scopes: SCOPES,
    });
  } catch (e) {
    res
      .status(500)
      .json({ error: "Falha ao montar URL de login", details: e.message });
  }
});
