# Coliseu Dash

Dashboard corporativo para Coliseu / Compensados Mama com sincronização automática Firebird → Cloud e painel gerencial em tempo real.

## Visão Geral do Projeto
- **Nome**: Coliseu Dash
- **Objetivo**: Dashboard corporativo (tema branco) com 11 módulos de BI lendo dados sincronizados do Firebird local (`COMPENSADOSMAMA1203.FDB`).
- **Arquitetura**:
  1. **Agente local (Windows)** em Python lê o `.FDB` via driver `fdb` e envia batches JSON autenticados.
  2. **Backend edge (Hono + TypeScript)** em Cloudflare Workers/Pages expõe API REST e ingere os batches.
  3. **Banco Cloudflare D1** (SQLite serverless) armazena as tabelas `sync_*`, usuários, sessões e auditoria.
  4. **Frontend React 19 + Vite + Tailwind** consome a API via TanStack Query; gráficos em Recharts.
- **Stack final**: Hono ^4.12 · TypeScript · Cloudflare D1 · React 19 · Vite 6 · Tailwind CSS · Recharts · Zustand · TanStack Query · Python 3.11 (agente).

## URLs
- **Local (sandbox)**: http://localhost:3000
- **Sandbox público**: https://3000-ia2csgsrny43ulehjl75o-2b54fc91.sandbox.novita.ai
- **API Health**: `/api/health`
- **Login**: `/login` (usuários abaixo — senha vazia)

## Credenciais de Demonstração (sem senha)
| Email                    | Perfil  |
|--------------------------|---------|
| admin@coliseu.com        | admin   |
| gerente@coliseu.com      | gerente |
| viewer@coliseu.com       | viewer  |

> Para testes, o campo **senha** pode ficar em branco — o login aceita string vazia para qualquer um dos três usuários.

## Funcionalidades Concluídas
### Backend (Hono sobre Cloudflare Workers)
- [x] Autenticação JWT (24h) + refresh (`POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/refresh`, `POST /api/auth/logout`)
- [x] Middleware `authMiddleware` (JWT) e `syncApiKeyMiddleware` (`X-Sync-Api-Key`) — proteção contra SQL‑injection via whitelist de tabelas/colunas
- [x] Endpoint unificado de ingestão: `POST /api/sync/ingest` (tabela + rows + mode=upsert|truncate)
- [x] **11 módulos funcionais** com KPIs, séries temporais, filtros por período e busca:
  - `/api/vendas` · `/api/financeiro` · `/api/lucratividade` · `/api/comissoes`
  - `/api/ranking` · `/api/estatisticas` · `/api/compras` · `/api/devolucoes`
  - `/api/produtos` · `/api/clientes` · `/api/log`
- [x] CORS restrito a origens configuradas
- [x] Healthcheck `/api/health`

### Frontend (React 19 + Vite + Tailwind)
- [x] Layout corporativo branco (sidebar + header + área principal)
- [x] Login com redirect automático
- [x] 13 páginas: Home, Login + 11 módulos
- [x] Gráficos Recharts (linha, barra, pizza)
- [x] TanStack Query para cache/refetch automático
- [x] Zustand para sessão/auth
- [x] Web Worker de sincronização (`syncWorker.ts`) para polling e cache offline
- [x] Axios interceptor injeta JWT automaticamente

### Agente Python (Windows)
- [x] `coliseu_sync_agent.py` — serviço em loop com APScheduler
- [x] Conecta no Firebird via `fdb` e consulta as 11 tabelas‑fonte
- [x] Envia batches de até 500 linhas por POST
- [x] Retries exponenciais + logging em arquivo
- [x] `.env.example` com todas as variáveis (FDB + API)
- [x] README com instruções Windows (venv, Task Scheduler, NSSM como serviço)

### Banco D1 / Dados
- [x] Migration inicial (`migrations/0001_initial_schema.sql`) com 11 tabelas sync + `usuarios_web`, `sessoes`, `auditoria`, `cache_queries`
- [x] Seed com 3 usuários + 5 vendedores + ~10k linhas transacionais demo (Compensados Mama)
- [x] Todos os índices de performance criados

## Mapa de Endpoints (com parâmetros principais)

### Auth
- `POST /api/auth/login` → body `{email, senha}` → retorna `{token, user}`
- `GET  /api/auth/me` → JWT
- `POST /api/auth/refresh` → JWT
- `POST /api/auth/logout` → JWT
- `GET  /api/auth/usuarios` → JWT (lista de usuários cadastrados)

### Sync (para o agente Python)
- `POST /api/sync/ingest` → header `X-Sync-Api-Key` · body `{tabela, rows[], mode}`
- `GET  /api/sync/status` → JWT · status de cada tabela sincronizada
- `GET  /api/sync/metadata` → JWT
- `GET  /api/sync/log?limit=N` → JWT
- `POST /api/sync/start` → JWT (registra pedido de sync manual)

### Módulos (todos protegidos por JWT — `?period=today|thisMonth|last30|last12m|custom&start=YYYY-MM-DD&end=...`)
| Módulo | Rotas |
|---|---|
| **Vendas** | `/kpis`, `/serie-temporal`, `/por-vendedor`, `/por-cliente`, `/detalhes` |
| **Financeiro** | `/contas-receber`, `/contas-pagar`, `/fluxo-caixa`, `/kpis` |
| **Lucratividade** | `/kpis`, `/margem-bruta`, `/lucro-liquido`, `/comparativo` |
| **Comissões** | `/kpis`, `/ranking`, `/detalhes` |
| **Ranking** | `/vendedores`, `/produtos`, `/clientes` |
| **Estatísticas** | `/overview`, `/crescimento`, `/distribuicao` |
| **Compras** | `/kpis`, `/por-fornecedor`, `/serie-temporal` |
| **Devoluções** | `/kpis`, `/por-motivo`, `/por-periodo`, `/detalhes` |
| **Produtos** | `/lista`, `/categorias`, `/kpis` |
| **Clientes** | `/lista`, `/kpis` |
| **Log** | `/atividades`, `/usuarios-ativos`, `/operacoes-frequentes`, `/kpis` |

## Arquitetura de Dados

### Tabelas de Sincronização (D1)
`sync_clientes`, `sync_produtos`, `sync_vendedores`, `sync_fornecedores`,
`sync_vendas`, `sync_vendas_itens`, `sync_comissoes`, `sync_financeiro`,
`sync_compras`, `sync_devolucoes`, `sync_log_atividades`

Cada uma possui `id` (PK D1) + `id_firebird` (UNIQUE — chave do sistema legado) + `synced_at`.

### Tabelas de Aplicação
- `usuarios_web` (id, email, senha_hash, nome, perfil, ativo)
- `sessoes` (id, usuario_id, token_hash, expires_at)
- `auditoria` (id, usuario_id, acao, recurso, detalhes, ip, data)
- `cache_queries` (chave, valor_json, expires_at)

### Fluxo de Dados
```
Firebird (C:\...\COMPENSADOSMAMA1203.FDB)
    │   (fdb driver — a cada 5min)
    ▼
coliseu_sync_agent.py  —POST JSON (X-Sync-Api-Key)→  /api/sync/ingest
                                                          │
                                                          ▼
                                               Cloudflare D1 (sync_*)
                                                          │
                                                          ▼
            Frontend React  ←— JWT /api/{modulo}/*  ← Hono (queries D1)
```

## Guia Rápido do Usuário
1. Abra a URL do dashboard (`/`).
2. Faça login com `admin@coliseu.com` (senha em branco).
3. Navegue pelos módulos na sidebar esquerda.
4. Use o filtro de período no topo de cada página (hoje, mês atual, últimos 30 dias, últimos 12 meses, customizado).
5. Para **atualizar dados em produção**, rode o agente Python no servidor Windows que tem o Firebird:
   ```cmd
   cd python-agent
   python -m venv venv
   venv\Scripts\activate
   pip install -r requirements.txt
   copy .env.example .env
   :: edite .env com a URL de produção e chave
   python coliseu_sync_agent.py
   ```

## Como Rodar Localmente (sandbox)
```bash
cd /home/user/webapp
npm install
npx wrangler d1 migrations apply coliseu-dash-production --local
npx wrangler d1 execute coliseu-dash-production --local --file=./migrations/seed.sql
npm run build                      # gera dist/ com worker + assets do frontend
pm2 start ecosystem.config.cjs     # sobe wrangler pages dev na porta 3000
curl http://localhost:3000/api/health
```

## Deployment (Cloudflare Pages)
```bash
# 1. Autenticar (já configurado no sandbox)
npx wrangler whoami

# 2. Criar D1 remoto (uma vez)
npx wrangler d1 create coliseu-dash-production
# → copiar database_id para wrangler.jsonc

# 3. Aplicar migrations em produção
npx wrangler d1 migrations apply coliseu-dash-production

# 4. Criar projeto Pages (uma vez)
npx wrangler pages project create coliseu-dash \
  --production-branch main --compatibility-date 2026-04-13

# 5. Configurar secrets
npx wrangler pages secret put JWT_SECRET      --project-name coliseu-dash
npx wrangler pages secret put SYNC_API_KEY    --project-name coliseu-dash

# 6. Build + Deploy
npm run build
npx wrangler pages deploy dist --project-name coliseu-dash
```

## Segurança
- JWT HS256 com expiração de 24h + refresh token
- Agente usa header dedicado `X-Sync-Api-Key` (não expõe JWT)
- Whitelist de tabelas/colunas em `/api/sync/ingest` (impede SQL injection em nomes)
- Prepared statements em **todas** as queries D1
- CORS restrito pelas origens configuradas em `wrangler.jsonc`
- Tokens nunca logados; auditoria em `auditoria` para operações sensíveis

## Estrutura de Diretórios
```
webapp/
├── src/                            # Backend Hono
│   ├── index.tsx                   # Entry + SPA fallback via c.env.ASSETS
│   └── api/
│       ├── lib/                    # jwt.ts, middleware.ts, types.ts, periodo.ts
│       └── routes/                 # auth, sync, 11 módulos
├── frontend/                       # React SPA
│   ├── src/
│   │   ├── pages/                  # Login + 11 módulos + Home
│   │   ├── components/             # DashboardLayout, Sidebar, Header, KpiCard...
│   │   ├── hooks/                  # useAuth, usePeriodo, useApi
│   │   ├── services/               # api.ts (axios), auth.ts
│   │   ├── store/                  # authStore (zustand)
│   │   └── workers/                # syncWorker.ts (Web Worker)
│   └── vite.config.ts              # build para /home/user/webapp/public/
├── migrations/
│   ├── 0001_initial_schema.sql     # 15 tabelas + índices
│   └── seed.sql                    # dados demo
├── public/                         # assets servidos pelo worker
│   ├── index.html                  # bundle React
│   ├── assets/                     # js/css com hash
│   └── _redirects                  # /*  /index.html 200 (fallback SPA)
├── python-agent/                   # agente Windows
│   ├── coliseu_sync_agent.py
│   ├── requirements.txt            # fdb, requests, apscheduler, python-dotenv
│   ├── .env.example
│   └── README.md
├── dist/                           # output do build (worker + assets mesclados)
├── wrangler.jsonc                  # bindings D1 + vars
├── ecosystem.config.cjs            # PM2
└── package.json
```

## Pendente / Próximos Passos
- [ ] Deploy em Cloudflare Pages (precisa API token do usuário na aba Deploy)
- [ ] Push para GitHub (precisa autorização GitHub na aba #github)
- [ ] Customização visual fina (cores da marca Coliseu, logo real)
- [ ] Módulo de exportação PDF/Excel
- [ ] Sentry/LogRocket no frontend
- [ ] Roadmap futuro: alertas em tempo real, app mobile (PWA), multi‑filial

## Deployment Status
- **Plataforma**: Cloudflare Pages (config pronta, deploy pendente de autorização)
- **Ambiente local**: ✅ Ativo (PM2 / porta 3000)
- **Dados demo**: ✅ Carregados (seed.sql aplicado)
- **Última atualização**: 2026-04-17
