# API Calendar + n8n

API em Node.js (Express) para autenticar usuários com Google (OAuth2) e criar calendários via um workflow no n8n.

## Requisitos
- Node.js 18+
- Uma conta Google Cloud com OAuth Client (tipo Web)
- Uma instância do n8n acessível por URL pública

## Configuração do Google OAuth
1. Acesse Google Cloud Console > APIs & Services > Credentials
2. Crie um OAuth 2.0 Client ID (tipo Web) com Authorized redirect URI apontando para:
   - `http://localhost:3000/auth/google/callback` (ou a URL pública do seu servidor)
3. Habilite a API "Google Calendar API" em APIs & Services > Library

## Variáveis de ambiente
Crie um arquivo `.env` na raiz com:

```
PORT=3000
APP_BASE_URL=http://localhost:3000
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxx
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
N8N_WEBHOOK_URL=https://seu-n8n.example.com/webhook/create-calendar
N8N_WEBHOOK_URL_SHEETS=https://seu-n8n.example.com/webhook/create-sheet
```

Dica: salve as credenciais em segurança (ex.: gerenciador de segredos). Este projeto salva tokens por e-mail em `data/tokens.json` para fins de demonstração.

## Instalação e execução
1. Instale dependências
```powershell
npm install
```
2. Inicie o servidor
```powershell
npm run dev
```
A API ficará em `http://localhost:3000`.

## Fluxo de autenticação
- Inicie: abra no navegador `http://localhost:3000/auth/google/initiate`
- Faça login e aceite permissões
- No callback, os tokens são salvos por e-mail

## Endpoint para criar calendário
 Rota: `POST /calendars`
 Body JSON (agora pode incluir `companyName` opcional):
```json
{
  "email": "user@example.com",
  "calendar": {
    "summary": "Calendário do Cliente",
    "description": "Criado via API",
    "timeZone": "America/Sao_Paulo"
  }
}
```
 Resultado: a API encaminha ao webhook do n8n com os tokens desse usuário + (se enviado) `companyName`. O n8n executa a criação do calendário pela Google API e retorna a resposta.

## Workflow do n8n (resumo)
1. Webhook (POST): recebe `email`, `tokens`, `calendar` do body (configure a URL pública do n8n em `N8N_WEBHOOK_URL`).
2. Nó HTTP Request: criar calendário
  - Método: POST
  - URL: `https://www.googleapis.com/calendar/v3/calendars`
  - Body: `={{ $json["calendar"] }}` (RAW JSON)
  - Headers: `Content-Type: application/json`
  - Autorização: selecione "None" e adicione header `Authorization: Bearer {{$json["tokens"]["access_token"]}}`
3. Retorne a resposta do Google (payload já estruturado pelo nó HTTP).

Exemplo de workflow em `n8n/workflows/create-calendar.json`.

## Criar Planilha (Google Sheets)
- Escopo adicional necessário: `https://www.googleapis.com/auth/spreadsheets`
- Endpoint: `POST /sheets`
- Body JSON:
```json
{
  "email": "user@example.com",
  "sheet": { "properties": { "title": "Minha Planilha" } },
  "companyName": "Empresa XYZ"
}
```
- Variável de ambiente: `N8N_WEBHOOK_URL_SHEETS` apontando para o webhook do n8n.
- Workflow n8n:
  1) Webhook (POST)
  2) HTTP Request
     - Método: POST
     - URL: `https://sheets.googleapis.com/v4/spreadsheets`
     - Auth: None
     - Headers: `Authorization: Bearer {{$json["tokens"]["access_token"]}}`, `Content-Type: application/json`
     - Body (RAW JSON): `={{ $json["sheet"] }}`
  3) (Opcional) Set para retornar apenas: `spreadsheetId`, `properties.title`, `spreadsheetUrl`.

## Observações
- Escopos usados: `openid email profile https://www.googleapis.com/auth/calendar`
- Para produção, substitua o storage local por um banco de dados e implemente rotação/cripto de tokens.
-- Caso queira adicionar verificação de integridade no futuro, você pode implementar assinatura manualmente, mas neste estado simplificado não há cabeçalho de assinatura.

## Saúde
- `GET /health` retorna `{ status: "ok" }`.

## Licença
MIT
