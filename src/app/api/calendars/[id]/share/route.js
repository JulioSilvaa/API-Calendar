import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import axios from "axios";
import { getUserTokens, upsertUserTokens } from "../../../../../utils/storage";

export async function POST(request, { params }) {
  try {
    const calendarId = params.id;
    const body = await request.json();
    const targetEmail = (body?.targetEmail || process.env.HITEMP_EMAIL || "").trim();
    const role = (body?.role || "writer").trim();
    
    const cookieStore = await cookies();
    const ownerEmail = (body?.ownerEmail || cookieStore.get("user_email")?.value || "").trim();

    if (!calendarId) return NextResponse.json({ error: "calendarId é obrigatório" }, { status: 400 });
    if (!targetEmail) return NextResponse.json({ error: "targetEmail ausente e HITEMP_EMAIL não configurado" }, { status: 400 });
    if (!ownerEmail) return NextResponse.json({ error: "ownerEmail ausente. Faça login ou informe no body." }, { status: 401 });

    let tokens = await getUserTokens(ownerEmail);
    if (!tokens || (!tokens.access_token && !tokens.refresh_token)) {
      return NextResponse.json({ error: "Tokens do ownerEmail não encontrados. Faça o OAuth primeiro." }, { status: 404 });
    }

    const needsRefresh =
      !tokens.access_token ||
      (tokens.expiry_date && Date.now() > Number(tokens.expiry_date) - 60_000);
      
    if (needsRefresh) {
      const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
      if (!tokens.refresh_token) {
        return NextResponse.json({ error: "Sessão expirada e sem refresh_token. Refaça o login do ownerEmail." }, { status: 401 });
      }
      if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        return NextResponse.json({ error: "Faltam GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET para renovar o token" }, { status: 500 });
      }
      
      try {
        const urlParams = new URLSearchParams();
        urlParams.append("client_id", GOOGLE_CLIENT_ID);
        urlParams.append("client_secret", GOOGLE_CLIENT_SECRET);
        urlParams.append("grant_type", "refresh_token");
        urlParams.append("refresh_token", tokens.refresh_token);
        
        const refreshResp = await axios.post(
          "https://oauth2.googleapis.com/token",
          urlParams,
          { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 15000 }
        );
        const { access_token, expires_in, scope, token_type } = refreshResp.data || {};
        if (!access_token) return NextResponse.json({ error: "Falha ao renovar access_token. Refaça o login." }, { status: 401 });
        const expiry_date = Date.now() + Number(expires_in || 0) * 1000;
        tokens = await upsertUserTokens(ownerEmail, { ...tokens, access_token, expiry_date, scope, token_type });
      } catch (e) {
        console.error("Erro ao renovar token (share):", e?.response?.data || e.message);
        return NextResponse.json({ error: "Não foi possível renovar o token. Refaça o login do ownerEmail." }, { status: 401 });
      }
    }

    const aclUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/acl`;
    const headers = { Authorization: `Bearer ${tokens.access_token}` };
    const googleBody = { scope: { type: "user", value: targetEmail }, role };
    const resp = await axios.post(aclUrl, googleBody, { headers, timeout: 15000 });

    return NextResponse.json({ message: "Calendário compartilhado", calendarId, targetEmail, role, acl: resp.data }, { status: 201 });
  } catch (err) {
    console.error("Compartilhar calendário falhou:", err?.response?.data || err.message);
    const status = err?.response?.status || 500;
    return NextResponse.json({ error: "Falha ao compartilhar calendário", details: err?.response?.data || err.message }, { status });
  }
}
