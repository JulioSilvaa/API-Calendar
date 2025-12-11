import express from "express";
import axios from "axios";
import { getUserTokens, upsertUserTokens } from "../utils/storage.js";

const router = express.Router();

// POST /events
// body: { calendarId: string, event: object, email?: string, companyName?: string }
// Garante que o evento tenha o attendee da conta Hitemp e encaminha ao n8n
router.post("/", async (req, res) => {
  try {
    const { calendarId, event: rawEvent } = req.body || {};
    const emailFromBody = req.body?.email;
    const emailFromCookie = req.cookies?.user_email;
    const email = emailFromBody || emailFromCookie;
    const companyName = (req.body?.companyName || "").trim();
    const hitempEmail = process.env.HITEMP_EMAIL || "";

    if (!email) {
      return res
        .status(401)
        .json({ error: "Usuário não autenticado. Faça login com Google." });
    }
    if (!calendarId) {
      return res
        .status(400)
        .json({ error: "calendarId é obrigatório para criar um evento" });
    }
    if (!rawEvent || typeof rawEvent !== "object") {
      return res
        .status(400)
        .json({ error: "event é obrigatório e deve ser um objeto" });
    }

    // Recupera tokens do usuário
    let tokens = await getUserTokens(email);
    if (!tokens || (!tokens.access_token && !tokens.refresh_token)) {
      return res.status(404).json({
        error: "Tokens do usuário não encontrados. Faça o OAuth primeiro.",
      });
    }

    // Renova access_token se estiver ausente ou prestes a expirar
    const needsRefresh =
      !tokens.access_token ||
      (tokens.expiry_date && Date.now() > Number(tokens.expiry_date) - 60_000);
    if (needsRefresh) {
      if (!tokens.refresh_token) {
        return res.status(401).json({
          error:
            "Sessão expirada e sem refresh_token. Peça para refazer o login.",
        });
      }
      const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
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
          { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
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

    // Injeta attendee da Hitemp se configurado
    const event = { ...rawEvent };
    if (hitempEmail) {
      const attendees = Array.isArray(event.attendees) ? event.attendees : [];
      const hasHitemp = attendees.some(
        (a) => a && (a.email || a) === hitempEmail
      );
      if (!hasHitemp) {
        attendees.push({ email: hitempEmail });
      }
      event.attendees = attendees;
    }

    const webhookUrl = process.env.N8N_EVENT_WEBHOOK_URL;
    if (!webhookUrl) {
      return res
        .status(500)
        .json({ error: "N8N_EVENT_WEBHOOK_URL não configurado" });
    }

    const payload = {
      email,
      tokens,
      calendarId,
      event,
      companyName,
      hitempEmail: hitempEmail || null,
    };

    const headers = { "Content-Type": "application/json" };

    let response;
    try {
      response = await axios.post(webhookUrl, payload, { headers, timeout: 15000 });
    } catch (errPost) {
      const status = errPost?.response?.status;
      const body = errPost?.response?.data;
      const httpCodeInside = body?.errorDetails?.httpCode || body?.httpCode;
      const is401 = status === 401 || String(httpCodeInside) === "401";
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
          payload.tokens = tokens;
          response = await axios.post(webhookUrl, payload, {
            headers,
            timeout: 15000,
          });
        } catch (errRetry) {
          throw errRetry;
        }
      } else {
        throw errPost;
      }
    }

    const raw = response?.data || {};
    const eventId = raw.id || raw.eventId || raw?.data?.id || null;
    res.status(201).json({
      message: raw.message || "Evento criado",
      eventId,
      calendarId,
      attendees: (raw.attendees || raw?.data?.attendees || event.attendees) || [],
      n8n: raw,
    });
  } catch (err) {
    console.error(err?.response?.data || err.message);
    const status = err?.response?.status || 500;
    res.status(status).json({
      error: "Falha ao criar evento via n8n",
      details: err?.response?.data || err.message,
    });
  }
});

export default router;
