# Modernização Sidebar B.I IA. (`v3.0`) + Parâmetro Vendas c/ NF + Módulo Fiscal

## Goal
1. Modernizar o layout da Sidebar e Header do **B.I IA.** (`v3.0`) aplicando a **Solução A** (cards brancos elevados, badges circulares pastel sem roxo, lista contínua sem subtítulos repetitivos e rodapé enxuto sem logo duplicada), **mantendo 100% dos nomes existentes** e isolando o `Dash 1.0` (`v1.0`).
2. Adicionar em **Configurações → Parâmetros** (`/bi/parametros`) o controle global por empresa **"Visualizar somente vendas com Nota Fiscal vinculada"** (`numero_nota > 0` ou `chave_nfe` preenchida).
3. Criar o novo módulo **`Fiscal`** (`/bi/fiscal`, RBAC `bi_fiscal`) exibindo todas as **Notas Fiscais Emitidas** e **Notas de Entrada**, com KPIs, filtros e modal de itens da nota.

## Tasks
- [x] **Socratic Gate & Planejamento**: Solução A + Itens 2 e 3 + regras de Parâmetros e Fiscal aprovados pelo usuário.
- [x] **Backend — Migration `011` & RBAC**: Criar `dash_configuracoes_tenant`, índices fiscais e registrar permissões `bi_fiscal` e `config_parametros`.
- [x] **Backend — Parâmetros de Vendas c/ NF**: Criar `tenantSettings.js`, propagar `onlyNfSales` via `bindDbContext` (somente `B.I IA.`), aplicar em `cfop.js` / `estatisticas.js` / `bi.js` e expor `GET/PUT /api/configuracoes/parametros`.
- [x] **Backend — API Fiscal (`/api/fiscal`)**: Implementar `/resumo`, `/notas` (unificando `dash_cargas` + `dash_vendas` sem duplicidade para `SAIDA` e `ENTRADA`) e `/notas/:origem/:id`.
- [x] **Frontend — Sidebar `v3.0` (Solução A + Rodapé Enxuto) & Header `v3.0`**: Aplicar layout fiel à referência mantendo nomes atuais + adicionar `Fiscal` e `Parâmetros`.
- [x] **Frontend — Telas `ParametrosBi.tsx` e `FiscalDashboard.tsx` + `Grupos.tsx` + `App.tsx`**: Implementar UI moderna Light/Dark sem roxo, exportação CSV, cópia de Chave NF-e e modal de itens.
- [x] **Verificação, Deploy Isolado (`dashboard.coliseusistemas.com.br`) & Git Push**: Compilar, validar endpoints reais em produção e realizar commit + push.
