import { google } from "googleapis";

export function resolveRedirectUri(request) {
  const { GOOGLE_REDIRECT_URI } = process.env;
  if (GOOGLE_REDIRECT_URI && GOOGLE_REDIRECT_URI.toLowerCase() !== "auto") {
    return GOOGLE_REDIRECT_URI;
  }
  
  // Next.js Request object
  const proto = request.headers.get("x-forwarded-proto") || "http";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");

  // If behind a proxy that separates with comma (like some AWS ALBs), take the first one
  const protocol = proto.split(",")[0].trim();
  
  return `${protocol}://${host}/api/auth/google/callback`;
  // Note: Original was /auth/google/callback (Express). 
  // Next.js API route is /api/auth/google/callback. 
  // I must ensure the Google Cloud Console has this new URI authorized.
  // OR I can rewrite next.config.mjs to map /auth/google/callback to /api/auth/google/callback?
  // It's safer to use the /api/ prefix as it's standard for Next.js App Router.
  // I will assume the user will update Google Cloud Console or I should try to keep the old URL via rewrites.
  // Implementation Plan said: "API routes will move from src/web/*.js to src/app/api/..."
  // So I will use /api/auth/google/callback.
}

export function getOAuthClient(redirectUri) {
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

export const SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/spreadsheets",
];
