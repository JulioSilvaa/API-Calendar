import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import crypto from "crypto";
import authRouter from "./web/auth.js";
import calendarRouter from "./web/calendar.js";
import sheetsRouter from "./web/sheets.js";
import eventsRouter from "./web/events.js";
import evolutionRouter from "./web/evolution.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(express.static("public"));
// Se estiver atrás de proxy/túnel (ngrok/Cloudflare), isso ajuda a detectar HTTPS corretamente
if (process.env.TRUST_PROXY?.toLowerCase() === "true") {
  app.set("trust proxy", true);
}

// Adiciona ID de correlação às requisições
app.use((req, res, next) => {
  const reqId = crypto.randomUUID
    ? crypto.randomUUID()
    : crypto.randomBytes(8).toString("hex");
  req.id = reqId;
  res.setHeader("x-request-id", reqId);
  next();
});

// Delega a home para arquivo estático: public/index.html
app.get("/", (req, res) => {
  res.sendFile("index.html", { root: "public" });
});

// Rotas para páginas legais
app.get("/privacy", (req, res) => {
  res.sendFile("privacy.html", { root: "public" });
});

app.get("/terms", (req, res) => {
  res.sendFile("terms.html", { root: "public" });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/auth/google", authRouter);
app.use("/calendars", calendarRouter);
app.use("/sheets", sheetsRouter);
app.use("/events", eventsRouter);
app.use("/evolution", evolutionRouter);

// Info de sessão simples
app.get("/me", (req, res) => {
  const email = req.cookies?.user_email || null;
  res.json({ email });
});

// Verificar status de conexão do WhatsApp via Evolution API
app.post("/check-connection", async (req, res) => {
  try {
    const { companyName } = req.body || {};
    
    if (!companyName) {
      return res.status(400).json({ 
        error: "companyName é obrigatório",
        connected: false 
      });
    }

    // Configurações da Evolution API
    const evolutionApiUrl = process.env.EVOLUTION_API_URL;
    const evolutionApiKey = process.env.EVOLUTION_API_KEY;
    
    if (!evolutionApiUrl || !evolutionApiKey) {
      console.log('⚠️ EVOLUTION_API_URL ou EVOLUTION_API_KEY não configurados');
      return res.json({ connected: false });
    }

    // Consultar status da instância na Evolution API
    const axios = (await import("axios")).default;
    const instanceName = companyName; // ou use alguma transformação se necessário
    
    const response = await axios.get(
      `${evolutionApiUrl}/instance/connectionState/${instanceName}`,
      { 
        headers: { 
          "apikey": evolutionApiKey,
          "Content-Type": "application/json"
        },
        timeout: 5000 
      }
    );

    // Evolution API retorna: { state: "open" | "close" | "connecting" }
    const state = response.data?.state || response.data?.instance?.state;
    const connected = state === "open";
    
    res.json({ 
      connected,
      status: state,
      instanceName,
      data: response.data 
    });
  } catch (err) {
    // Em caso de erro, assume que não está conectado
    console.error("❌ Erro ao verificar conexão:", err.message);
    res.json({ connected: false, error: err.message });
  }
});

// Logout: limpa cookie e redireciona para home
app.post("/logout", (req, res) => {
  // Use os mesmos atributos usados no set para garantir remoção em todos os navegadores
  const isHttps =
    req.headers["x-forwarded-proto"]?.includes("https") ||
    req.secure ||
    process.env.APP_BASE_URL?.startsWith("https://");
  res.clearCookie("user_email", {
    path: "/",
    sameSite: "lax",
    secure: Boolean(isHttps),
    httpOnly: true,
  });
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ ok: true });
});

// Opcional: também aceitar GET /logout para facilitar testes manuais no navegador
app.get("/logout", (req, res) => {
  const isHttps =
    req.headers["x-forwarded-proto"]?.includes("https") ||
    req.secure ||
    process.env.APP_BASE_URL?.startsWith("https://");
  res.clearCookie("user_email", {
    path: "/",
    sameSite: "lax",
    secure: Boolean(isHttps),
    httpOnly: true,
  });
  res.setHeader("Cache-Control", "no-store");
  res.redirect("/");
});

// 404 handler
app.use((req, res, next) => {
  if (res.headersSent) return next();
  res
    .status(404)
    .send(
      "Rota não encontrada. Tente /, /health, /auth/google/initiate, /auth/google/diagnostics, /auth/google/url ou POST /calendars"
    );
});

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error("Erro não tratado:", {
    id: req?.id,
    message: err?.message,
    stack: err?.stack,
  });
  const isProd = process.env.NODE_ENV === "production";
  const payload = { error: "Erro interno", id: req?.id };
  if (!isProd) {
    payload.details = { message: err?.message, path: req?.url };
  }
  res.status(500).json(payload);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
