import express from "express";
import axios from "axios";
import { getUserTokens, upsertUserTokens } from "../utils/storage.js";

const router = express.Router();

// Contrato: POST /calendars
// body: { email: string, calendar: { summary: string, description?: string, timeZone?: string } }
// efeito: encaminha para webhook do n8n com token do usuário para criação do calendário

router.post("/", async (req, res) => {
  try {
    const { calendar } = req.body || {};
    const rawCompany =
      (req.body && (req.body.companyName ?? req.body?.calendar?.companyName)) ||
      "";
    const companyName = String(rawCompany).trim();
    // campo whatsapp removido do formulário; não precisamos extrair nem enviar
    const emailFromBody = req.body?.email;
    const emailFromCookie = req.cookies?.user_email;
    const email = emailFromBody || emailFromCookie;
    if (!calendar || !calendar.summary) {
      return res.status(400).json({
        error: "Parâmetros inválidos: calendar.summary é obrigatório",
      });
    }
    if (!companyName) {
      return res.status(400).json({
        error: "Parâmetros inválidos: companyName é obrigatório",
      });
    }
    // whatsapp é opcional agora; pode ficar vazio ou ausente
    if (!email) {
      return res.status(401).json({
        error: "Usuário não autenticado. Faça login com Google primeiro.",
      });
    }
    let tokens = await getUserTokens(email);
    if (!tokens || (!tokens.access_token && !tokens.refresh_token)) {
      return res.status(404).json({
        error: "Tokens do usuário não encontrados. Faça o OAuth primeiro.",
      });
    }

    // Refresh automático se necessário
    const needsRefresh =
      !tokens.access_token ||
      (tokens.expiry_date && Date.now() > Number(tokens.expiry_date) - 60_000);
    if (needsRefresh) {
      const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
      if (!tokens.refresh_token) {
        return res.status(401).json({
          error:
            "Sessão expirada e sem refresh_token. Peça para o usuário refazer o login.",
        });
      }
      if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        return res.status(500).json({
          error:
            "Faltam GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET para renovar o token",
        });
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
        const { access_token, expires_in, scope, token_type } =
          refreshResp.data || {};
        if (!access_token) {
          return res
            .status(401)
            .json({ error: "Falha ao renovar access_token. Refaça o login." });
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
        return res.status(401).json({
          error: "Não foi possível renovar o token do Google. Refaça o login.",
        });
      }
    }

    // Envia tokens completos ao n8n (sem sanitização)
    // Espelha companyName dentro de calendar para facilitar expressões no n8n
    const calendarWithCompany = { ...calendar, companyName };
    const payload = {
      email,
      tokens,
      calendar: calendarWithCompany,
      companyName,
      hitempEmail: process.env.HITEMP_EMAIL || null,
    };

    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    if (!webhookUrl)
      return res.status(500).json({ error: "N8N_WEBHOOK_URL não configurado" });

    const headers = { "Content-Type": "application/json" };

    // Log de depuração (temporário): verifique no console da API
    console.log("[calendars] Enviando ao n8n:", {
      email,
      hasCompanyName: Boolean(companyName),
      companyName,
      calendarHasCompany: Boolean(calendarWithCompany?.companyName),
      calendarSummary: calendarWithCompany?.summary,
    });

    let response;
    try {
      response = await axios.post(webhookUrl, payload, {
        headers,
        timeout: 15000,
      });
    } catch (errPost) {
      const status = errPost?.response?.status;
      const body = errPost?.response?.data;
      const httpCodeInside = body?.errorDetails?.httpCode || body?.httpCode;
      const is401 = status === 401 || String(httpCodeInside) === "401";
      // Se o workflow do n8n falhou com 401 (token expirado), tentamos renovar e reenviar 1 vez
      if (is401 && tokens?.refresh_token) {
        try {
          const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
          const params = new URLSearchParams();
          params.append("client_id", GOOGLE_CLIENT_ID || "");
          params.append("client_secret", GOOGLE_CLIENT_SECRET || "");
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
          const { access_token, expires_in, scope, token_type } =
            refreshResp.data || {};
          if (!access_token)
            throw new Error("refresh_token falhou (sem access_token)");
          const expiry_date = Date.now() + Number(expires_in || 0) * 1000;
          tokens = await upsertUserTokens(email, {
            ...tokens,
            access_token,
            expiry_date,
            scope,
            token_type,
          });
          // atualiza payload e tenta de novo
          payload.tokens = tokens;
          response = await axios.post(webhookUrl, payload, {
            headers,
            timeout: 15000,
          });
        } catch (errRetry) {
          // Falhou mesmo após tentar renovar
          throw errRetry;
        }
      } else {
        throw errPost;
      }
    }
    // Normaliza saída para o frontend exibir QR com facilidade
    const raw = response?.data || {};
    const qrCodeUrl =
      raw.qrCodeUrl ||
      raw.qr_code ||
      raw.qrcode ||
      raw.qr ||
      raw?.data?.qrCodeUrl ||
      null;
    const statusText = raw.status || raw?.data?.status || null;
    const calendarId = raw.calendarId || raw.id || raw?.calendar?.id || null;

    // Mantém payload bruto do n8n em "n8n" para depuração, mas expõe campos úteis na raiz
    res.status(201).json({
      message: raw.message || "Calendário processado",
      status: statusText,
      qrCodeUrl,
      calendarId,
      companyName,
      n8n: raw,
    });
  } catch (err) {
    console.error(err?.response?.data || err.message);
    const status = err?.response?.status || 500;
    res.status(status).json({
      error: "Falha ao criar calendário via n8n",
      details: err?.response?.data || err.message,
    });
  }
});

// Compartilha um calendário existente com a conta Hitemp (ou email alvo)
// POST /calendars/:id/share
// body: { ownerEmail?: string, targetEmail?: string, role?: 'reader'|'writer' }
router.post("/:id/share", async (req, res) => {
  try {
    const calendarId = req.params.id;
    const targetEmail = (req.body?.targetEmail || process.env.HITEMP_EMAIL || "").trim();
    const role = (req.body?.role || "writer").trim();
    const ownerEmail = (req.body?.ownerEmail || req.cookies?.user_email || "").trim();

    if (!calendarId) return res.status(400).json({ error: "calendarId é obrigatório" });
    if (!targetEmail) return res.status(400).json({ error: "targetEmail ausente e HITEMP_EMAIL não configurado" });
    if (!ownerEmail) return res.status(401).json({ error: "ownerEmail ausente. Faça login ou informe no body." });

    let tokens = await getUserTokens(ownerEmail);
    if (!tokens || (!tokens.access_token && !tokens.refresh_token)) {
      return res.status(404).json({ error: "Tokens do ownerEmail não encontrados. Faça o OAuth primeiro." });
    }

    const needsRefresh =
      !tokens.access_token ||
      (tokens.expiry_date && Date.now() > Number(tokens.expiry_date) - 60_000);
    if (needsRefresh) {
      const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
      if (!tokens.refresh_token) {
        return res.status(401).json({ error: "Sessão expirada e sem refresh_token. Refaça o login do ownerEmail." });
      }
      if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        return res.status(500).json({ error: "Faltam GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET para renovar o token" });
      }
      const params = new URLSearchParams();
      params.append("client_id", GOOGLE_CLIENT_ID);
      params.append("client_secret", GOOGLE_CLIENT_SECRET);
      params.append("grant_type", "refresh_token");
      params.append("refresh_token", tokens.refresh_token);
      try {
        const refreshResp = await axios.post(
          "https://oauth2.googleapis.com/token",
          params,
          { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 15000 }
        );
        const { access_token, expires_in, scope, token_type } = refreshResp.data || {};
        if (!access_token) return res.status(401).json({ error: "Falha ao renovar access_token. Refaça o login." });
        const expiry_date = Date.now() + Number(expires_in || 0) * 1000;
        tokens = await upsertUserTokens(ownerEmail, { ...tokens, access_token, expiry_date, scope, token_type });
      } catch (e) {
        console.error("Erro ao renovar token (share):", e?.response?.data || e.message);
        return res.status(401).json({ error: "Não foi possível renovar o token. Refaça o login do ownerEmail." });
      }
    }

    const aclUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/acl`;
    const headers = { Authorization: `Bearer ${tokens.access_token}` };
    const body = { scope: { type: "user", value: targetEmail }, role };
    const resp = await axios.post(aclUrl, body, { headers, timeout: 15000 });

    res.status(201).json({ message: "Calendário compartilhado", calendarId, targetEmail, role, acl: resp.data });
  } catch (err) {
    console.error("Compartilhar calendário falhou:", err?.response?.data || err.message);
    const status = err?.response?.status || 500;
    res.status(status).json({ error: "Falha ao compartilhar calendário", details: err?.response?.data || err.message });
  }
});

export default router;
