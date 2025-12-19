- **Node.js** + **Express** - API REST
- **PostgreSQL** - Banco de dados com criptografia
- **Google OAuth 2.0** - Autenticação segura
- **Docker** - Containerização e deploy

### Integrações
- **n8n** - Automação e orquestração de workflows
- **Google Calendar API** - Criação de calendários
- **Evolution API** - Integração WhatsApp Business

### Frontend
- **HTML5** + **CSS3** + **JavaScript** vanilla
- Design responsivo e moderno
- Validação de formulários em tempo real

## 📋 Como Funciona

### 1. Autenticação
O usuário faz login com sua conta Google. O sistema solicita permissões para:
- Acessar informações básicas do perfil
- Criar e gerenciar calendários
- Criar planilhas (opcional)

### 2. Preenchimento do Formulário
O usuário preenche:
- Nome completo
- Email de contato
- Telefone
- CPF/CNPJ
- Nome da empresa
- CEP (com busca automática de endereço)
- Número e complemento (após busca do CEP)

### 3. Processamento
1. Dados são enviados para o **n8n**
2. n8n cria o calendário no **Google Calendar**
3. Sistema gera **QR Code** via Evolution API
4. Dados são salvos de forma **criptografada** no PostgreSQL

### 4. Conexão WhatsApp
- Usuário escaneia o QR Code
- WhatsApp é conectado à instância
- Sistema verifica status da conexão automaticamente

## 🎯 Arquitetura

```
┌─────────────┐
│   Frontend  │ (HTML/CSS/JS)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Express    │ (Node.js API)
│   Server    │
└──────┬──────┘
       │
       ├──────────► PostgreSQL (Tokens criptografados)
       │
       ├──────────► n8n (Workflow automation)
       │                 │
       │                 ├──► Google Calendar API
       │                 └──► Evolution API
       │
       └──────────► Evolution API (WhatsApp QR Code)
```

## 🐳 Executando com Docker

### Desenvolvimento
```bash
# Iniciar todos os serviços
docker compose --profile dev up -d

# Ver logs
docker compose logs -f api-calendar

# Parar
docker compose --profile dev down
```

**Características do modo desenvolvimento**:
- ✅ Hot reload habilitado (mudanças no código refletem automaticamente)
- ✅ Informações de debug disponíveis
- ✅ Volumes montados para `src/` e `public/`
- ✅ `NODE_ENV=development`

### Produção
```bash
# Iniciar em modo produção
docker compose --profile prod up -d

# Parar
docker compose --profile prod down
```

**Características do modo produção**:
- ✅ Código otimizado e minificado
- ✅ Sem volumes de código fonte (código empacotado no container)
- ✅ Restart automático sempre (`restart: always`)
- ✅ Debug info desabilitado para segurança
- ✅ `NODE_ENV=production`

### Banco de Dados PostgreSQL

O PostgreSQL está disponível em ambos os perfis:
- **Porta**: 5432 (exposta para acesso externo)
- **Ferramentas**: Pode ser acessado via pgAdmin, DBeaver, etc.
- **Dados**: Persistidos no volume `postgres_data`

A aplicação estará disponível em: **http://localhost:3000**

## 📱 Funcionalidades

### ✅ Gestão de Calendários
- Criação automatizada via n8n
- Personalização por empresa
- Fuso horário configurável

### ✅ Integração WhatsApp
- Geração automática de QR Code
- Verificação de status de conexão
- Suporte para múltiplas instâncias

### ✅ Segurança
- OAuth 2.0 do Google
- Tokens criptografados (AES-256)
- Logout automático
- Dados sanitizados

### ✅ Interface Amigável
- Design moderno e responsivo
- Validação em tempo real
- Feedback visual de ações
- Máscaras para campos (telefone, CPF, CEP)
- **Busca automática de endereço por CEP** via ViaCEP API
- Campos de endereço revelados progressivamente

### ✅ Busca Automática de Endereço (Novo!)
Quando o usuário digita um CEP válido:
1. Sistema busca automaticamente na **API ViaCEP**
2. Campos de endereço são **revelados dinamicamente**
3. Dados preenchidos automaticamente:
   - Rua/Avenida
   - Bairro
   - Cidade
   - Estado
4. Usuário completa apenas **número** e **complemento** (opcional)
5. Endereço completo enviado estruturado para o n8n

## 🔄 Fluxo de Dados

### Criação de Calendário
```
1. Usuário preenche formulário
   ↓
2. Frontend valida dados
   ↓
3. API autentica usuário (OAuth)
   ↓
4. API envia para n8n webhook
   ↓
5. n8n cria calendário no Google
   ↓
6. API gera QR Code (Evolution)
   ↓
7. Frontend exibe QR Code
   ↓
8. Usuário conecta WhatsApp
```

### Dados Enviados ao n8n
```json
{
  "email": "cliente@example.com",
  "authenticatedEmail": "admin@empresa.com",
  "fullName": "João Silva",
  "phone": "11999999999",
  "document": "12345678900",
  "companyName": "Empresa XYZ",
  "address": {
    "cep": "01310-100",
    "street": "Avenida Paulista",
    "number": "1578",
    "complement": "Sala 101",
    "neighborhood": "Bela Vista",
    "city": "São Paulo",
    "state": "SP"
  },
  "calendar": {
    "summary": "Calendário Empresa XYZ",
    "timeZone": "America/Sao_Paulo"
  },
  "tokens": { ... }
}
```

## 🎨 Interface

### Página Principal
- Formulário de cadastro completo
- Autenticação Google integrada
- Validação em tempo real
- Feedback visual de erros
- **Busca automática de endereço** ao digitar CEP
- Campos de endereço exibidos dinamicamente

### Página QR Code
- Exibição do QR Code
- Timer de renovação
- Instruções de conexão
- Verificação automática de status

## 🔌 Endpoints da API

### Autenticação
- `GET /auth/google/initiate` - Inicia OAuth
- `GET /auth/google/callback` - Callback OAuth
- `POST /logout` - Desconecta usuário

### Calendários
- `POST /calendars` - Cria calendário via n8n

### WhatsApp
- `POST /check-connection` - Verifica conexão WhatsApp

### Utilidades
- `GET /health` - Status da API
- `GET /me` - Informações do usuário logado

## 🌟 Diferenciais

- **Totalmente Dockerizado** - Deploy simples e rápido
- **Criptografia de Ponta** - Tokens protegidos com AES-256
- **Automação Completa** - n8n orquestra todo o fluxo
- **Multi-instância** - Suporta múltiplas empresas
- **Sanitização de Dados** - Limpeza automática de campos
- **Busca de CEP Integrada** - Preenchimento automático via ViaCEP
- **Logs Detalhados** - Rastreamento completo de operações

## 📦 Estrutura do Projeto

```
api-calendar/
├── public/              # Frontend (HTML/CSS/JS)
│   ├── index.html      # Página principal
│   ├── qrcode.html     # Página do QR Code
│   ├── script.js       # Lógica do formulário
│   └── style.css       # Estilos
├── src/
│   ├── server.js       # Servidor Express
│   ├── web/            # Rotas da API
│   │   ├── auth.js     # Autenticação Google
│   │   ├── calendar.js # Gestão de calendários
│   │   └── evolution.js # Integração WhatsApp
│   └── utils/          # Utilitários
│       └── storage-postgres.js # Armazenamento seguro
├── docker-compose.yml  # Configuração Docker
├── Dockerfile          # Build da aplicação
└── init.sql           # Inicialização do banco
```

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para:
- Reportar bugs
- Sugerir novas funcionalidades
- Melhorar a documentação
- Enviar pull requests

## 📄 Licença

MIT - Sinta-se livre para usar este projeto!

---

**Desenvolvido com ❤️ usando Node.js, n8n e Evolution API**

