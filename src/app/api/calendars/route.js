import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import axios from "axios";
import { getUserTokens, upsertUserTokens } from "../../../utils/storage";

export async function POST(request) {
  try {
    const body = await request.json();
    const { calendar, fullName, email: emailFromForm, phone, document, address } = body || {};
    const rawCompany =
      (body && (body.companyName ?? body?.calendar?.companyName)) ||
      "";
    const companyName = String(rawCompany).trim();
    
    const cep = address?.cep || null;
    const cleanPhone = phone ? phone.replace(/\D/g, '') : null;
    const cleanDocument = document ? document.replace(/\D/g, '') : null;
    const cleanCep = cep ? cep.replace(/\D/g, '') : null;
    
    const cookieStore = await cookies();
    const authenticatedEmail = cookieStore.get("user_email")?.value;
    
    const formEmail = emailFromForm || authenticatedEmail;
    
    if (!calendar || !calendar.summary) {
      return NextResponse.json({ error: "Parâmetros inválidos: calendar.summary é obrigatório" }, { status: 400 });
    }
    if (!companyName) {
      return NextResponse.json({ error: "Parâmetros inválidos: companyName é obrigatório" }, { status: 400 });
    }
    if (!authenticatedEmail) {
      return NextResponse.json({ error: "Usuário não autenticado. Faça login com Google primeiro." }, { status: 401 });
    }
    
    let tokens = await getUserTokens(authenticatedEmail);
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
        tokens = await upsertUserTokens(authenticatedEmail, {
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

    const calendarWithCompany = { ...calendar, companyName };
    const payload = {
      email: formEmail,
      authenticatedEmail,
      tokens,
      calendar: calendarWithCompany,
      companyName,
      fullName: fullName || null,
      phone: cleanPhone,
      document: cleanDocument,
      cep: cleanCep,
      address: address || null,
      hitempEmail: process.env.HITEMP_EMAIL || null,
    };

    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    if (!webhookUrl)
      return NextResponse.json({ error: "N8N_WEBHOOK_URL não configurado" }, { status: 500 });

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
          const { access_token, expires_in, scope, token_type } = refreshResp.data || {};
          if (!access_token)
            throw new Error("refresh_token falhou (sem access_token)");
          const expiry_date = Date.now() + Number(expires_in || 0) * 1000;
          tokens = await upsertUserTokens(authenticatedEmail, { // Was email in original, but authenticatedEmail seems correct as it is key
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
    const calendarId = raw.calendarId || raw.id || raw?.calendar?.id || null;

    let qrCodeUrl = null;
    const evolutionApiUrl = process.env.EVOLUTION_API_URL;
    const evolutionApiKey = process.env.EVOLUTION_API_KEY;

    if (evolutionApiUrl && evolutionApiKey && companyName) {
      try {
        let qrCodeData;
        
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
          
          if (createResponse.data.qrcode?.base64 || createResponse.data.base64) {
            qrCodeData = createResponse.data;
          } else {
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
          }
          
        } catch (error) {
          console.error(`[Evolution] Erro:`, error.response?.data || error.message);
          
          const isAlreadyExists = error.response?.status === 409 || 
                                 (error.response?.status === 403 && 
                                  JSON.stringify(error.response?.data).includes('already in use'));
          
          if (isAlreadyExists) {
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
          } else {
            throw error;
          }
        }

        const qrBase64 = qrCodeData.base64 || 
                        qrCodeData.qrcode?.base64 || 
                        qrCodeData.code || 
                        qrCodeData.qr ||
                        qrCodeData.pairingCode;

        if (qrBase64) {
          qrCodeUrl = qrBase64.startsWith('data:')  ? qrBase64 : `data:image/png;base64,${qrBase64}`;
        } else {
          console.error('[Evolution] QR Code não encontrado na resposta:', qrCodeData);
        }
      } catch (evolutionError) {
        console.error('❌ Erro ao gerar QR Code via Evolution API:', {
          message: evolutionError.message,
          status: evolutionError.response?.status,
          data: evolutionError.response?.data
        });
      }
    } else {
      console.warn('⚠️ Evolution API não configurada (EVOLUTION_API_URL ou EVOLUTION_API_KEY ausente)');
    }

    return NextResponse.json({
      message: raw.message || "Calendário criado com sucesso",
      status: "success",
      qrCodeUrl,
      calendarId,
      companyName,
      n8n: raw,
    }, { status: 201 });

  } catch (err) {
    console.error('❌ Erro ao criar calendário:', {
      message: err.message,
      status: err?.response?.status,
      data: err?.response?.data
    });
    
    const status = err?.response?.status || 500;
    const errorData = err?.response?.data || {};
    
    let userMessage = "Falha ao criar calendário";
    let errorDetails = err.message;
    let errorType = "UNKNOWN_ERROR";
    
    if (status === 401) {
      userMessage = "Sessão expirada";
      errorDetails = "Sua sessão com o Google expirou. Por favor, faça login novamente.";
      errorType = "AUTH_EXPIRED";
    }
    else if (status === 403) {
      userMessage = "Permissão negada";
      errorDetails = "Você não tem permissão para criar calendários. Verifique as permissões da sua conta Google.";
      errorType = "PERMISSION_DENIED";
    }
    else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      userMessage = "Tempo esgotado";
      errorDetails = "O servidor n8n não respondeu a tempo. Tente novamente em alguns instantes.";
      errorType = "TIMEOUT";
    }
    else if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      userMessage = "Erro de conexão";
      errorDetails = "Não foi possível conectar ao servidor n8n. Verifique se o serviço está ativo.";
      errorType = "CONNECTION_ERROR";
    }
    else if (status >= 500) {
      userMessage = "Erro no servidor n8n";
      
      const n8nError = errorData?.message || 
                      errorData?.error?.message || 
                      errorData?.errorDetails?.message ||
                      "O workflow do n8n encontrou um erro ao processar sua solicitação.";
      
      errorDetails = n8nError;
      errorType = "N8N_WORKFLOW_ERROR";
    }
    else if (status === 400) {
      userMessage = "Dados inválidos";
      errorDetails = errorData?.message || errorData?.error || "Os dados enviados são inválidos. Verifique o formulário.";
      errorType = "VALIDATION_ERROR";
    }
    else if (status >= 400 && status < 500) {
      userMessage = `Erro ${status}`;
      errorDetails = errorData?.message || errorData?.error || err.message;
      errorType = "CLIENT_ERROR";
    }
    
    return NextResponse.json({
      error: userMessage,
      details: errorDetails,
      errorType,
      status,
      ...(process.env.NODE_ENV !== 'production' && {
        debug: {
          originalError: err.message,
          responseData: errorData,
          stack: err.stack?.split('\n').slice(0, 3)
        }
      })
    }, { status });
  }
}
