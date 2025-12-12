# API Calendar + n8n

API em Node.js (Express) para autenticar usuários com Google (OAuth2) e criar calendários via um workflow no n8n.

## Requisitos
- Node.js 18+ (ou Docker + Docker Compose)
- Uma conta Google Cloud com OAuth Client (tipo Web)
- Uma instância do n8n acessível por URL pública

## Configuração do Google OAuth
1. Acesse Google Cloud Console > APIs & Services > Credentials
2. Crie um OAuth 2.0 Client ID (tipo Web) com Authorized redirect URI apontando para:
   - `http://localhost:3000/auth/google/callback` (ou a URL pública do seu servidor)
3. Habilite a API "Google Calendar API" em APIs & Services > Library

## Variáveis de ambiente
Crie um arquivo `.env` na raiz com:

```bash
PORT=3000
APP_BASE_URL=http://localhost:3000
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxx
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
N8N_WEBHOOK_URL=https://seu-n8n.example.com/webhook/create-calendar
N8N_WEBHOOK_URL_SHEETS=https://seu-n8n.example.com/webhook/create-sheet

# Database Configuration (PostgreSQL)
DB_HOST=postgres
DB_PORT=5432
DB_NAME=api_calendar
DB_USER=api_calendar_user
DB_PASSWORD=<senha-forte-aqui>

# Encryption Key (gerar com: openssl rand -base64 32)
ENCRYPTION_KEY=<chave-de-32-bytes-base64>
```

**🔐 Segurança**: Os tokens OAuth agora são armazenados de forma segura em PostgreSQL com criptografia AES-256 via pgcrypto. Consulte [SECURITY_SETUP.md](./SECURITY_SETUP.md) para instruções detalhadas de configuração.

## Instalação e execução

### Opção 1: Execução Local (sem Docker)
1. Instale dependências
```powershell
npm install
```
2. Inicie o servidor
```powershell
npm run dev
```
A API ficará em `http://localhost:3000`.

### Opção 2: Execução com Docker 🐳

#### Pré-requisitos
- [Docker](https://docs.docker.com/get-docker/) instalado
- [Docker Compose](https://docs.docker.com/compose/install/) instalado

#### Desenvolvimento
```bash
# Iniciar em modo desenvolvimento (com hot reload)
docker-compose --profile dev up

# Ou em background
docker-compose --profile dev up -d

# Ver logs
docker-compose logs -f

# Parar containers
docker-compose --profile dev down
```

#### Produção
```bash
# Build e iniciar em modo produção
docker-compose --profile prod up -d

# Ver logs
docker-compose logs -f api-calendar-prod

# Parar
docker-compose --profile prod down
```

#### Comandos Úteis
```bash
# Rebuild da imagem (após mudanças no código)
docker-compose build

# Acessar shell do container
docker-compose exec api-calendar sh

# Ver status dos containers
docker-compose ps

# Remover volumes (cuidado: apaga dados!)
docker-compose down -v
```

#### Troubleshooting Docker
- **Porta 3000 já em uso**: Mude a porta no `docker-compose.yml` (ex: `"3001:3000"`)
- **Erro de permissão em `./data`**: Verifique permissões da pasta ou crie manualmente
- **Container não inicia**: Verifique se o arquivo `.env` existe e está configurado
- **Hot reload não funciona**: Certifique-se de estar usando o perfil `dev`
- **Erro de conexão com banco**: Execute `npm run test-db` para diagnosticar problemas


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

## Segurança e Armazenamento

### 🔐 Armazenamento Seguro de Tokens
Os tokens OAuth são armazenados com segurança usando:
- **PostgreSQL** com criptografia via extensão `pgcrypto`
- **Criptografia AES-256** para access_token e refresh_token
- **Chave de criptografia** armazenada em variável de ambiente
- **Isolamento** via container Docker

### 📚 Documentação de Segurança
- [SECURITY_SETUP.md](./SECURITY_SETUP.md) - Guia completo de configuração
- [CREDENTIALS_SETUP.md](./CREDENTIALS_SETUP.md) - Configuração rápida

### 🔧 Scripts Úteis
```bash
# Testar conexão com banco de dados
npm run test-db

# Migrar tokens existentes do arquivo para PostgreSQL
npm run migrate
```

## Observações
- Escopos usados: `openid email profile https://www.googleapis.com/auth/calendar`
- Tokens são criptografados e armazenados em PostgreSQL
- Para produção, use credenciais diferentes e considere AWS Secrets Manager ou HashiCorp Vault

## Saúde
- `GET /health` retorna `{ status: "ok" }`.

## Licença
MIT
