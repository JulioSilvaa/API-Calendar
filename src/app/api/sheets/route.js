import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import axios from "axios";
import { getUserTokens, upsertUserTokens } from "../../../utils/storage";

export async function POST(request) {
  try {
    const body = await request.json();
    const { sheet, companyName } = body || {};
    const emailFromBody = body?.email;
    const cookieStore = await cookies();
    const emailFromCookie = cookieStore.get("user_email")?.value;
    const email = emailFromBody || emailFromCookie;

    if (!sheet || !sheet?.properties?.title) {
      return NextResponse.json({ error: "Parâmetros inválidos: sheet.properties.title é obrigatório" }, { status: 400 });
    }
    if (!email) {
      return NextResponse.json({ error: "Usuário não autenticado. Faça login com Google primeiro." }, { status: 401 });
    }

    let tokens = await getUserTokens(email);
    if (!tokens || (!tokens.access_token && !tokens.refresh_token)) {
      return NextResponse.json({ error: "Tokens do usuário não encontrados. Faça o OAuth primeiro." }, { status: 404 });
    }

    // Refresh token logic
    const needsRefresh =
      !tokens.access_token ||
      (tokens.expiry_date && Date.now() > Number(tokens.expiry_date) - 60_000);
      
    if (needsRefresh) {
      const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
      if (!tokens.refresh_token) {
        return NextResponse.json({ error: "Sessão expirada e sem refresh_token. Peça para o usuário refazer o login." }, { status: 401 });
      }
      if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        return NextResponse.json({ error: "Faltam GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET para renovar o token" }, { status: 500 });
      }
      try {
        const params = new URLSearchParams();
        params.append("client_id", GOOGLE_CLIENT_ID);
        params.append("client_secret", GOOGLE_CLIENT_SECRET);
        params.append("grant_type", "refresh_token");
        params.append("refresh_token", tokens.refresh_token);
        const refreshResp = await axios.post(
          "https://oauth2.googleapis.com/token",
          params,
          {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            timeout: 15000,
          }
        );
        const { access_token, expires_in, scope, token_type } = refreshResp.data || {};
        if (!access_token) {
          return NextResponse.json({ error: "Falha ao renovar access_token. Refaça o login." }, { status: 401 });
        }
        const expiry_date = Date.now() + Number(expires_in || 0) * 1000;
        tokens = await upsertUserTokens(email, {
          ...tokens,
          access_token,
          expiry_date,
          scope,
          token_type,
        });
      } catch (e) {
        console.error("Erro ao renovar token:", e?.response?.data || e.message);
        return NextResponse.json({ error: "Não foi possível renovar o token do Google. Refaça o login." }, { status: 401 });
      }
    }

    const payload = { email, tokens, sheet, companyName };

    const webhookUrl = process.env.N8N_WEBHOOK_URL_SHEETS;
    if (!webhookUrl)
      return NextResponse.json({ error: "N8N_WEBHOOK_URL_SHEETS não configurado" }, { status: 500 });

    const headers = { "Content-Type": "application/json" };

    const response = await axios.post(webhookUrl, payload, {
      headers,
      timeout: 15000,
    });
    
    return NextResponse.json({
      message: "Solicitação enviada ao n8n (sheets)",
      n8n: response.data,
    }, { status: 201 });
  } catch (err) {
    console.error(err?.response?.data || err.message);
    const status = err?.response?.status || 500;
    return NextResponse.json({ error: "Falha ao criar planilha via n8n", details: err?.response?.data || err.message }, { status });
  }
}
