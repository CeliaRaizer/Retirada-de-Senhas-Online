# Deploy com Docker

## Pré-requisitos
- Docker e Docker Compose instalados
- Portas livres: **80** (site), **3000** (API, opcional/debug), **3306** (MySQL, opcional/debug)

## Passo a passo

1. **Configurar variáveis de ambiente**
   ```bash
   cp .env.example .env
   ```
   Abra o `.env` e ajuste pelo menos:
   - `JWT_SECRET` — gere um valor aleatório, ex: `openssl rand -hex 32`
   - `DB_PASSWORD` — senha do MySQL
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — se for usar login com Google (opcional; sem isso só o login por e-mail/senha funciona)

   Se for acessar de outra máquina/domínio (não `localhost`), ajuste também
   `FRONTEND_URL` e `BACKEND_URL` pra URL pública real.

2. **Subir tudo**
   ```bash
   docker compose up --build
   ```
   Na primeira vez isso vai:
   - Baixar a imagem do MySQL e criar o banco `bdsenha` já com todas as tabelas (via `backend/db/init.sql`)
   - Buildar a imagem do backend (Node/Express)
   - Buildar a imagem do frontend (Vite build → servido pelo Nginx)

3. **Acessar**
   - Site: http://localhost
   - Painel admin: http://localhost/admin
     - Login padrão: `admin@sistema.com` / `admin123` — **troque assim que entrar**
   - Painel do atendente: http://localhost/atendente
   - Telão: http://localhost/telao

4. **Rodar em segundo plano**
   ```bash
   docker compose up -d --build
   ```

5. **Parar**
   ```bash
   docker compose down
   ```
   Isso mantém o banco de dados (volume `db_data`). Pra apagar os dados também:
   ```bash
   docker compose down -v
   ```

## Como o tráfego flui

```
navegador → :80 (Nginx, container "frontend")
              ├── /            → arquivos estáticos da SPA (React)
              ├── /api/*       → proxy → backend:3000
              ├── /auth/*      → proxy → backend:3000
              └── /socket.io/* → proxy → backend:3000 (WebSocket)
```

O front e o back ficam na **mesma origem** do ponto de vista do navegador
(tudo em `:80`), então não existe problema de CORS em produção — mesmo o
código do front chamando `fetch("/api/...")` em caminho relativo.

## Rodar sem Docker (desenvolvimento)

Continua funcionando exatamente como antes:
```bash
cd backend && cp .env.example .env && npm install && npm run dev
cd frontend && npm install && npm run dev
```

## Estrutura adicionada

```
.
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── .env.example
│   └── db/
│       └── init.sql          ← schema completo do banco
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── .dockerignore
    └── .env.example
```

## Observações

- **E-mail**: o serviço usa Ethereal (SMTP de teste, não entrega e-mail
  de verdade — gera um link de "preview" no log do backend). Pra produção
  real, troque `backend/src/services/emailService.js` por um provedor
  SMTP de verdade (Gmail, SendGrid, SES, etc.) usando variáveis de ambiente.
- **HTTPS**: este setup serve em HTTP puro (porta 80). Pra produção com
  domínio público, o mais simples é colocar um proxy como o Caddy ou o
  Traefik na frente (ou um Nginx com Certbot) cuidando do certificado
  TLS e repassando pra esse `frontend` na 80 internamente.
- **Senha do admin padrão**: troque a senha `admin123` assim que possível
  pelo próprio painel, ou apague a linha do `init.sql` antes do primeiro
  `docker compose up` e crie o admin manualmente no banco.
