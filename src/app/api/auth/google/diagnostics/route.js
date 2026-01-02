import { resolveRedirectUri } from "../../../../../utils/auth-helpers";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const resolved = resolveRedirectUri(request);
    
    // Construct request info manually as Request object differs from Express req
    const proto = request.headers.get("x-forwarded-proto");
    const host = request.headers.get("host");

    return NextResponse.json({
      message: "Diagnóstico OAuth",
      usingRedirectUri: resolved,
      envRedirectUri: process.env.GOOGLE_REDIRECT_URI,
      notes: [
        "A redirect URI precisa estar cadastrada no Google Cloud exatamente igual à usada aqui.",
        "Se estiver usando ngrok/Cloudflare, use GOOGLE_REDIRECT_URI=auto e adicione a URL pública no Google Cloud.",
        "Para localhost, adicione http://localhost:3000/api/auth/google/callback e/ou http://127.0.0.1:3000/api/auth/google/callback nas URIs autorizadas.",
      ],
      request: {
        protocol: proto || "http", // Approximation
        host: host,
        xForwardedProto: proto || null,
        xForwardedHost: request.headers.get("x-forwarded-host") || null,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: "Falha no diagnóstico", details: e.message }, { status: 500 });
  }
}
