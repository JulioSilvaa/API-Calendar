import express from "express";
import axios from "axios";
import { getUserTokens, upsertUserTokens } from "../utils/storage.js";

const router = express.Router();

// Contrato: POST /calendars
// body: { email: string, calendar: { summary: string, description?: string, timeZone?: string } }
// efeito: encaminha para webhook do n8n com token do usuário para criação do calendário

router.post("/", async (req, res) => {
  try {
    const { calendar, fullName, email: emailFromForm, phone, document, cep } = req.body || {};
    const rawCompany =
      (req.body && (req.body.companyName ?? req.body?.calendar?.companyName)) ||
      "";
    const companyName = String(rawCompany).trim();
    
    // Email autenticado (do cookie) - usado para buscar tokens OAuth
    const authenticatedEmail = req.cookies?.user_email;
    
    // Email do formulário - enviado como dado adicional para o n8n
    const formEmail = emailFromForm || authenticatedEmail;
    
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
    if (!authenticatedEmail) {
      return res.status(401).json({
        error: "Usuário não autenticado. Faça login com Google primeiro.",
      });
    }
    
    // Buscar tokens usando o email autenticado (do Google OAuth)
    let tokens = await getUserTokens(authenticatedEmail);
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
        tokens = await upsertUserTokens(authenticatedEmail, {
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

    // Preparar payload completo com TODOS os dados do formulário
    // Limpar dados: remover caracteres especiais, manter apenas números
    const cleanPhone = phone ? phone.replace(/\D/g, '') : null;
    const cleanDocument = document ? document.replace(/\D/g, '') : null;
    const cleanCep = cep ? cep.replace(/\D/g, '') : null;
    
    const calendarWithCompany = { ...calendar, companyName };
    const payload = {
      email: formEmail, // Email do formulário (pode ser diferente do autenticado)
      authenticatedEmail, // Email usado para autenticação OAuth
      tokens,
      calendar: calendarWithCompany,
      companyName,
      // Dados adicionais do formulário (limpos, apenas números)
      fullName: fullName || null,
      phone: cleanPhone,
      document: cleanDocument,
      cep: cleanCep,
      hitempEmail: process.env.HITEMP_EMAIL || null,
    };

    console.log('📤 Enviando dados completos para n8n:', {
      authenticatedEmail,
      formEmail,
      companyName,
      fullName,
      phone: cleanPhone ? '***' + cleanPhone.slice(-4) : null,
      document: cleanDocument ? '***' + cleanDocument.slice(-4) : null,
      cep: cleanCep
    });

    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    if (!webhookUrl)
      return res.status(500).json({ error: "N8N_WEBHOOK_URL não configurado" });

    const headers = { "Content-Type": "application/json" };

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
    const calendarId = raw.calendarId || raw.id || raw?.calendar?.id || null;

    console.log('✅ Calendário criado com sucesso:', calendarId);

    // Após criar o calendário, gerar QR Code via Evolution API
    let qrCodeUrl = null;
    const evolutionApiUrl = process.env.EVOLUTION_API_URL;
    const evolutionApiKey = process.env.EVOLUTION_API_KEY;

    if (evolutionApiUrl && evolutionApiKey && companyName) {
      try {
        console.log(`[Evolution] Criando/conectando instância: ${companyName}`);
        console.log(`[Evolution] URL: ${evolutionApiUrl}`);
        
        let qrCodeData;
        
        // Criar ou reconectar instância
        try {
          const createResponse = await axios.post(
            `${evolutionApiUrl}/instance/create`,
            {
              instanceName: companyName,
              qrcode: true,
              integration: "WHATSAPP-BAILEYS"
            },
            {
              headers: {
                "apikey": evolutionApiKey,
                "Content-Type": "application/json"
              },
              timeout: 15000
            }
          );

          console.log(`[Evolution] Resposta create:`, createResponse.data);
          
          // Se a resposta já contém o QR Code
          if (createResponse.data.qrcode?.base64 || createResponse.data.base64) {
            qrCodeData = createResponse.data;
            console.log(`[Evolution] QR Code obtido na criação`);
          } else {
            // Aguarda um pouco e busca via /instance/connect
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const connectResponse = await axios.get(
              `${evolutionApiUrl}/instance/connect/${companyName}`,
              {
                headers: {
                  "apikey": evolutionApiKey
                },
                timeout: 10000
              }
            );
            
            qrCodeData = connectResponse.data;
            console.log(`[Evolution] QR Code obtido via connect`);
          }
          
        } catch (error) {
          console.error(`[Evolution] Erro:`, error.response?.data || error.message);
          
          // Se instância já existe (409 ou 403 com mensagem "already in use"), tenta apenas conectar
          const isAlreadyExists = error.response?.status === 409 || 
                                 (error.response?.status === 403 && 
                                  JSON.stringify(error.response?.data).includes('already in use'));
          
          if (isAlreadyExists) {
            console.log(`[Evolution] Instância já existe, obtendo QR Code...`);
            
            const connectResponse = await axios.get(
              `${evolutionApiUrl}/instance/connect/${companyName}`,
              {
                headers: {
                  "apikey": evolutionApiKey
                },
                timeout: 10000
              }
            );
            
            qrCodeData = connectResponse.data;
            console.log(`[Evolution] QR Code obtido de instância existente`);
          } else {
            throw error;
          }
        }

        // Extrair QR Code da resposta
        const qrBase64 = qrCodeData.base64 || 
                        qrCodeData.qrcode?.base64 || 
                        qrCodeData.code || 
                        qrCodeData.qr ||
                        qrCodeData.pairingCode;

        if (qrBase64) {
          qrCodeUrl = qrBase64.startsWith('data:') 
            ? qrBase64 
            : `data:image/png;base64,${qrBase64}`;
          console.log(`[Evolution] QR Code gerado com sucesso para: ${companyName}`);
        } else {
          console.error('[Evolution] QR Code não encontrado na resposta:', qrCodeData);
        }
      } catch (evolutionError) {
        console.error('❌ Erro ao gerar QR Code via Evolution API:', {
          message: evolutionError.message,
          status: evolutionError.response?.status,
          data: evolutionError.response?.data
        });
        // Não falha a requisição, apenas não retorna QR Code
      }
    } else {
      console.warn('⚠️ Evolution API não configurada (EVOLUTION_API_URL ou EVOLUTION_API_KEY ausente)');
    }

    // Retorna resposta completa para o frontend
    res.status(201).json({
      message: raw.message || "Calendário criado com sucesso",
      status: "success",
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
