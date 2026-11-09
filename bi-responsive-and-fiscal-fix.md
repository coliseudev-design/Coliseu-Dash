# Padronização Responsiva Auto-Adaptável (`B.I IA.`) & Correção do Módulo Fiscal

## Escopo & Decisões Confirmadas
- **Projeto:** Coliseu Dash (`WEB` + `BACKEND` — React 18 / Tailwind 3.4 / Node.js Express + PostgreSQL).
- **Isolamento:** Estrito ao `B.I IA.` (`v3.0`) sem alterar os nomes dos menus na Sidebar e preservando o layout legado `Dash 1.0`.
- **Decisão 1 (`Fiscal`):** Trazer por padrão todos os documentos faturados de Saída e Entrada (`dash_cargas` XML + `dash_vendas` faturadas/entradas, incluindo empresas cujo SyncAgent grava apenas `numero_pedido` ou `dash_vendas_itens.numero_nota`), com seletor rápido **"Todos"** vs **"Somente c/ NF-e"**.
- **Decisão 2 (`Topo & Filtros`):** Manter o nome da tela sutil apenas no `Header.tsx` superior, remover títulos gigantes repetidos dentro das páginas e unificar `Período` + filtros secundários em **uma única barra compacta auto-adaptável**.
- **Decisão 3 (`Valores em Reais`):** Exibir sempre o valor integral em reais (`R$ 13.790.459,93`) usando tipografia fluida (`clamp()` + `tabular-nums`), ícone compacto no canto superior direito do label (100% da largura horizontal livre para o valor) e tratamento seguro para variações percentuais extremas (`> +999%`).

## Tarefas de Execução

### Fase 1: Backend (`middleware/`)
- [x] **1.1 `middleware/src/routes/fiscal.js`**: Suportar `?apenas_nfe=true|false` (default `false`), enriquecer `numero_nota`/`chave_nfe`/`cfop` a partir de `dash_vendas_itens` quando ausente no cabeçalho, retornar saídas faturadas e entradas (`es=2`, `cli_tipo='2'`, `cfop >= 1000 AND cfop < 4000`) sem depender exclusivamente de `v.numero_nota > 0`, diferenciando `modelo_doc` (`NF-e (XML)`, `NF-e / NFC-e`, `Nota / Pedido ERP`).
- [x] **1.2 `middleware/src/db/schema.sql`**: Remover `DROP MATERIALIZED VIEW IF EXISTS mv_dash_vendas_diario;` solto e garantir `CREATE MATERIALIZED VIEW IF NOT EXISTS mv_dash_vendas_diario` + índice único para eliminar erros recorrentes no sync.

### Fase 2: Fundação Responsiva (`frontend/src/`)
- [x] **2.1 `frontend/src/utils/format.ts` & `frontend/src/index.css`**: Adicionar `formatGrowthPct()` para variações percentuais extremas e classes utilitárias fluidas (`bi-kpi-value`, `bi-kpi-hero`, `bi-filter-bar`, `bi-select`).
- [x] **2.2 `frontend/src/components/PeriodFilter.tsx`**: Permitir wrap fluido dos botões de período (zero corte em `Últimos 12 meses` / `Personalizado` em 1280px–1366px) e compactar o seletor `De / Até` inline.
- [x] **2.3 `frontend/src/layouts/v3.0/Header.tsx`, `DashboardLayout.tsx` & `BiDashboard.tsx`**: Desativar teleporte de filtros para o Header, tornar o `Header.tsx` sutil e resiliente (`h-12 sm:h-[52px]`), e ajustar paddings responsivos do container principal.

### Fase 3: Padronização dos 12 Menus e Abas do `B.I IA.`
- [x] **3.1 `HomeV1.tsx` & `VisaoEstrategicaV3.tsx` (`/` — Visão Estratégica)**: Unificar barra de filtros compacta no modo `B.I IA.` e eliminar encavalamento dos valores (`R$ 6.208.672,22`) com os ícones nos 4 cards inferiores e Hero KPI.
- [x] **3.2 `ComparativoVendas.tsx` (`/comparativo-vendas` — Análise Comparativa)**: Redistribuir controles e selects (`Vendedor`, `Cidade`, `Marca`, `Categoria`) sem truncar labels e aplicar tipografia fluida nos 3 KPIs.
- [x] **3.3 `SalesIntelligenceDashboard.tsx` (`/bi` — Monitor de Vendas)**: Remover título gigante `VISÃO ESTRATÉGICA`, unificar `Período + Vendedor + Marca` em barra única compacta, aplicar `clamp()` nos KPIs e remover cores roxas residuais (`Purple Ban`).
- [x] **3.4 `SellerHubDashboard.tsx` (`/hub-vendedor` — Desempenho da Equipe)**: Remover banner gigante `HUB DO VENDEDOR`, unificar `Período + Vendedor + Cidade + Marca` em barra única e tratar percentuais extremos (`+31043261.1%`).
- [x] **3.5 `CustomerAnalyticsDashboard.tsx` (`/bi/customer-analytics` — Visão Geral da Carteira)**: Unificar `Período + Vendedor + Cidade` em barra única compacta e reorganizar os 8 KPI cards (`xl:grid-cols-4`, subtítulo `Meta CS` separado do valor).
- [x] **3.6 `Radar360Dashboard.tsx` (`/bi/customer` — Cliente 360)**: Remover título gigante repetido, compactar barra de busca/filtros e ajustar KPIs da ficha 360.
- [x] **3.7 `SupplierAnalyticsDashboard.tsx` (`/bi/supplier` — Hub do Fornecedor)**: Compactar barra superior (`Período`, `Marca`, `Cidade`, abas internas) e padronizar KPI cards fluidos.
- [x] **3.8 `FinancialIntelligenceDashboard.tsx` (`/bi/finance` — Gestão de Caixa)**: Remover título repetido `Módulo Financeiro`, unificar abas + `Caixa` + `Período` em barra compacta e ajustar KPIs.
- [x] **3.9 `ComparativeAnalysisDashboard.tsx` (`/bi/comparative` — Análise de Rentabilidade)**: Compactar filtros e ajustar KPIs para `xl:grid-cols-4` com `clamp()`.
- [x] **3.10 `ABCAnalysisDashboard.tsx` (`/bi/abc` — Dinâmica de Inventário)**: Remover título repetido `Gestão de inventário`, compactar filtros/abas e ajustar KPIs monetários.
- [x] **3.11 `PurchasesDashboard.tsx` (`/bi/compras` — Gestão de Compras)**: Remover título repetido `GESTÃO DE COMPRAS`, unificar abas + ações em barra compacta e ajustar KPIs.
- [x] **3.12 `FiscalDashboard.tsx` (`/bi/fiscal` — Fiscal)**: Adicionar alternador `"Todos"` vs `"Somente c/ NF-e"`, compactar barra única de filtros e aplicar KPIs auto-adaptáveis sem colisão.

### Fase 4: Verificação, Deploy & Git Push
- [x] **4.1** Validar `node --check` no middleware e `npm run build` (`vite build`) no frontend.
- [x] **4.2** Validar ausência de cores proibidas (`Purple Ban`) nos arquivos alterados.
- [x] **4.3** `git commit` + `git push origin main` e validação ao vivo nos containers `dashboard-middleware-*` e `dashboard-frontend-*` em `dashboard.coliseusistemas.com.br`.
