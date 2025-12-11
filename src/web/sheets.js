import express from "express";
import axios from "axios";
import { getUserTokens, upsertUserTokens } from "../utils/storage.js";

const router = express.Router();

// Contrato: POST /sheets
// body: { email?: string, sheet: { properties: { title: string } }, companyName?: string }
// Efeito: encaminha para webhook do n8n (N8N_WEBHOOK_URL_SHEETS) com tokens do usuário para criar planilha

router.post("/", async (req, res) => {
  try {
    const { sheet, companyName } = req.body || {};
    const emailFromBody = req.body?.email;
    const emailFromCookie = req.cookies?.user_email;
    const email = emailFromBody || emailFromCookie;

    if (!sheet || !sheet?.properties?.title) {
      return res.status(400).json({
        error: "Parâmetros inválidos: sheet.properties.title é obrigatório",
      });
    }
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

    const payload = { email, tokens, sheet, companyName };

    const webhookUrl = process.env.N8N_WEBHOOK_URL_SHEETS;
    if (!webhookUrl)
      return res
        .status(500)
        .json({ error: "N8N_WEBHOOK_URL_SHEETS não configurado" });

    const headers = { "Content-Type": "application/json" };

    const response = await axios.post(webhookUrl, payload, {
      headers,
      timeout: 15000,
    });
    res.status(201).json({
      message: "Solicitação enviada ao n8n (sheets)",
      n8n: response.data,
    });
  } catch (err) {
    console.error(err?.response?.data || err.message);
    const status = err?.response?.status || 500;
    res.status(status).json({
      error: "Falha ao criar planilha via n8n",
      details: err?.response?.data || err.message,
    });
  }
});

export default router;
