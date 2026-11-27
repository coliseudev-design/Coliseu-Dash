import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePeriodStore, periodToParams } from '../../store/periodStore';
import { useBranchParam } from '../../contexts/BranchContext';
import PeriodFilter from '../../components/PeriodFilter';
import { useBranchPeriodQuery, useApiQuery } from '../../hooks/useApi';
import api from '../../services/api';
import { 
  Users, UserPlus, UserMinus, Activity, AlertCircle, 
  Search, ChevronLeft, ChevronRight, ChevronDown, Award, EyeOff, FileText,
  TrendingUp, TrendingDown, Phone, Mail, Printer, Download, Copy, Check, X, MessageCircle
} from 'lucide-react';
import { formatBRL, formatNum } from '../../utils/format';
import clsx from 'clsx';

function parsePhone(rawPhone?: string) {
  if (!rawPhone) return { display: '—', isWhatsApp: false, waLink: '' };
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.length < 8) {
    const trimmed = rawPhone.trim();
    if (!trimmed || trimmed === '()' || trimmed === '() -' || trimmed === '( ) - -' || trimmed === '-') {
      return { display: '—', isWhatsApp: false, waLink: '' };
    }
    return { display: trimmed, isWhatsApp: false, waLink: '' };
  }
  if (digits.length === 11) {
    const ddd = digits.substring(0, 2);
    const num = digits.substring(2);
    return {
      display: `(${ddd}) ${num.substring(0, 5)}-${num.substring(5)}`,
      isWhatsApp: true,
      waLink: `https://wa.me/55${digits}`
    };
  }
  if (digits.length === 10) {
    const ddd = digits.substring(0, 2);
    const num = digits.substring(2);
    const isMobile = num.startsWith('9') || num.startsWith('8');
    return {
      display: `(${ddd}) ${num.substring(0, 4)}-${num.substring(4)}`,
      isWhatsApp: isMobile,
      waLink: isMobile ? `https://wa.me/55${digits}` : ''
    };
  }
  if (digits.startsWith('55') && (digits.length === 13 || digits.length === 12)) {
    const national = digits.substring(2);
    const ddd = national.substring(0, 2);
    const num = national.substring(2);
    const is11 = national.length === 11;
    const isMobile = is11 || num.startsWith('9') || num.startsWith('8');
    return {
      display: `(${ddd}) ${is11 ? `${num.substring(0, 5)}-${num.substring(5)}` : `${num.substring(0, 4)}-${num.substring(4)}`}`,
      isWhatsApp: isMobile,
      waLink: isMobile ? `https://wa.me/${digits}` : ''
    };
  }
  return { display: rawPhone, isWhatsApp: false, waLink: '' };
}

export default function CustomerAnalyticsDashboard() {
  const navigate = useNavigate();
  const periodState = usePeriodStore();
  const branchParam = useBranchParam();

  // Filtro global unificado do período + filial
  const globalFilter = useMemo<any>(() => ({
    ...periodToParams(periodState),
    ...branchParam
  }), [periodState, branchParam]);

  // Estados locais dos filtros principais
  const [selectedVendedor, setSelectedVendedor] = useState<string>('todas');
  const [selectedCidade, setSelectedCidade] = useState<string>('todas');

  // Listas auxiliares para os filtros suspensos
  const sellersQuery = useBranchPeriodQuery<any>('/ranking/vendedores', { limit: 100 });
  const citiesQuery = useBranchPeriodQuery<any>('/ranking/cidades', { limit: 100 });

  // Estados locais da listagem geral
  const [search, setSearch] = useState<string>('');
  const [tempoInativo, setTempoInativo] = useState<string>('Qualquer Inatividade');
  const [ordenacao, setOrdenacao] = useState<string>('Mais inativos primeiro (Alerta)');
  const [page, setPage] = useState<number>(1);
  const limit = 15;

  // Estados de exportação PDF e E-mail
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('Relatório - Visão Geral da Carteira de Clientes');
  const [copiedReport, setCopiedReport] = useState(false);

  // Debounce ou trigger instantâneo do search
  const [searchDebounced, setSearchDebounced] = useState<string>('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Params dinâmicos dos endpoints
  const analyticsParams = useMemo(() => ({
    ...globalFilter,
    vendedor_id: selectedVendedor,
    cidade: selectedCidade
  }), [globalFilter, selectedVendedor, selectedCidade]);

  const listParams = useMemo(() => ({
    ...globalFilter,
    vendedor_id: selectedVendedor,
    cidade: selectedCidade,
    search: searchDebounced,
    tempo_inativo: tempoInativo,
    ordenacao,
    limit,
    offset: (page - 1) * limit
  }), [globalFilter, selectedVendedor, selectedCidade, searchDebounced, tempoInativo, ordenacao, page]);

  // Queries
  const analytics = useBranchPeriodQuery<any>('/clientes/analytics-full', analyticsParams);
  const list = useApiQuery<any>('/clientes/lista', listParams);

  // Lista consolidada de vendedores (une analytics.available_sellers e sellersQuery)
  const sellersList = useMemo(() => {
    const map = new Map<string, string>();
    (analytics.data?.available_sellers || []).forEach((s: any) => {
      if (s?.id && s?.nome) map.set(String(s.id), String(s.nome));
    });
    (sellersQuery.data?.data || []).forEach((s: any) => {
      if (s?.id && s?.nome && !map.has(String(s.id))) {
        map.set(String(s.id), String(s.nome));
      }
    });
    return Array.from(map.entries())
      .map(([id, nome]) => ({ id, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [analytics.data?.available_sellers, sellersQuery.data?.data]);

  // Lista consolidada de cidades
  const citiesList = useMemo(() => {
    const set = new Set<string>();
    (analytics.data?.available_cities || []).forEach((c: string) => {
      if (c) set.add(c);
    });
    (citiesQuery.data?.data || []).forEach((c: any) => {
      const name = c?.nome || c?.cidade;
      if (name) set.add(name);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [analytics.data?.available_cities, citiesQuery.data?.data]);

  const selectedVendedorNome = useMemo(() => {
    if (selectedVendedor === 'todas') return 'Todos os Vendedores';
    return sellersList.find(s => String(s.id) === String(selectedVendedor))?.nome || selectedVendedor;
  }, [selectedVendedor, sellersList]);

  // Auxiliares de loading geral
  const isLoading = analytics.isLoading;

  const kpis = analytics.data?.kpis || {
    total_clientes: 0,
    mes_atual: 0,
    mes_anterior: 0,
    novos_clientes: 0,
    sem_vendas_atual: 0,
    sem_vendas_anterior: 0
  };

  const totalClientes = kpis.total_clientes || 1;
  const retencaoPct = totalClientes > 0 ? (kpis.mes_atual / totalClientes) * 100 : 0;
  const churnPct = totalClientes > 0 ? (kpis.sem_vendas_atual / totalClientes) * 100 : 0;
  const semVendasAtualPct = totalClientes > 0 ? (kpis.sem_vendas_atual / totalClientes) * 100 : 0;
  const semVendasAnteriorPct = totalClientes > 0 ? (kpis.sem_vendas_anterior / totalClientes) * 100 : 0;

  const totalPages = Math.ceil((list.data?.total || 0) / limit) || 1;

  // Função para buscar lista expandida para o relatório (PDF ou E-mail)
  const fetchFullReportClients = async () => {
    try {
      const { data } = await api.get('/clientes/lista', {
        params: {
          ...listParams,
          limit: 500,
          offset: 0
        }
      });
      return data?.data || list.data?.data || [];
    } catch {
      return list.data?.data || [];
    }
  };

  // Geração de PDF / Impressão formatada com todas as informações da tela + telefone
  const handleGeneratePdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const reportClients = await fetchFullReportClients();
      const recorrentes = analytics.data?.recorrentes || [];
      const churn = analytics.data?.churn || [];
      const emissionDate = new Date().toLocaleString('pt-BR');

      const printWindow = window.open('', '_blank', 'width=1150,height=850');
      if (!printWindow) {
        alert('Permita pop-ups no navegador para gerar o PDF do relatório.');
        return;
      }

      const html = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8" />
          <title>Relatório - Visão Geral da Carteira</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; background: #fff; padding: 20px; font-size: 11px; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 14px; }
            .title { font-size: 17px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.4px; }
            .subtitle { font-size: 11px; color: #475569; margin-top: 3px; font-weight: 600; }
            .meta { text-align: right; font-size: 10px; color: #475569; line-height: 1.5; }
            .filters-bar { display: flex; flex-wrap: wrap; gap: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; margin-bottom: 14px; font-size: 10px; }
            .filter-item { font-weight: 600; color: #334155; }
            .filter-item strong { color: #0f172a; }
            .section-title { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #1e293b; margin: 12px 0 6px; letter-spacing: 0.5px; border-left: 3px solid #2563eb; padding-left: 7px; }
            .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px; }
            .kpi-card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 10px; background: #ffffff; }
            .kpi-label { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #64748b; }
            .kpi-val { font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 3px; font-family: monospace; }
            .kpi-sub { font-size: 9px; color: #64748b; margin-top: 2px; }
            .two-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
            table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
            th { background: #f1f5f9; color: #334155; font-weight: 800; text-transform: uppercase; text-align: left; padding: 6px 7px; border-bottom: 1px solid #cbd5e1; font-size: 8.5px; }
            td { padding: 5px 7px; border-bottom: 1px solid #e2e8f0; color: #1e293b; vertical-align: middle; }
            tr:nth-child(even) td { background: #f8fafc; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
            .font-bold { font-weight: 700; }
            .badge-danger { color: #dc2626; font-weight: 700; }
            .badge-warning { color: #d97706; font-weight: 700; }
            .badge-success { color: #059669; font-weight: 700; }
            @media print {
              body { padding: 8px; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">Visão Geral da Carteira de Clientes</div>
              <div class="subtitle">Relatório Analítico de Atividade, Recorrência, Inatividade e Contatos</div>
            </div>
            <div class="meta">
              <div><strong>Emitido em:</strong> ${emissionDate}</div>
              <div><strong>Total listado:</strong> ${reportClients.length} de ${list.data?.total || reportClients.length} clientes</div>
            </div>
          </div>

          <div class="filters-bar">
            <div class="filter-item"><strong>Vendedor:</strong> ${selectedVendedorNome}</div>
            <div class="filter-item">•</div>
            <div class="filter-item"><strong>Cidade:</strong> ${selectedCidade === 'todas' ? 'Todas' : selectedCidade}</div>
            <div class="filter-item">•</div>
            <div class="filter-item"><strong>Filtro Inatividade:</strong> ${tempoInativo}</div>
            <div class="filter-item">•</div>
            <div class="filter-item"><strong>Ordenação:</strong> ${ordenacao}</div>
            ${searchDebounced ? `<div class="filter-item">•</div><div class="filter-item"><strong>Busca:</strong> "${searchDebounced}"</div>` : ''}
          </div>

          <div class="section-title">1. Indicadores da Carteira</div>
          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-label">Total de Clientes</div>
              <div class="kpi-val">${formatNum(kpis.total_clientes)}</div>
              <div class="kpi-sub">Base ativa cadastrada</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Mês Atual (Com Venda)</div>
              <div class="kpi-val">${formatNum(kpis.mes_atual)}</div>
              <div class="kpi-sub">Clientes positivados</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Mês Anterior</div>
              <div class="kpi-val">${formatNum(kpis.mes_anterior)}</div>
              <div class="kpi-sub">Comparativo período anterior</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Taxa de Retenção</div>
              <div class="kpi-val">${retencaoPct.toFixed(1)}%</div>
              <div class="kpi-sub">Meta CS: 28.0%</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Novos Clientes</div>
              <div class="kpi-val">${formatNum(kpis.novos_clientes)}</div>
              <div class="kpi-sub">Novos no período</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Sem Vendas (Mês Atual)</div>
              <div class="kpi-val">${formatNum(kpis.sem_vendas_atual)} (${semVendasAtualPct.toFixed(1)}%)</div>
              <div class="kpi-sub">Sem compras no período</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Sem Vendas (Mês Anterior)</div>
              <div class="kpi-val">${formatNum(kpis.sem_vendas_anterior)} (${semVendasAnteriorPct.toFixed(1)}%)</div>
              <div class="kpi-sub">Inatividade anterior</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Risco de Churn</div>
              <div class="kpi-val">${churnPct.toFixed(1)}%</div>
              <div class="kpi-sub">Inativos sobre a base</div>
            </div>
          </div>

          <div class="two-cols">
            <div>
              <div class="section-title">2. Top 10 Maior Recorrência</div>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Cliente</th>
                    <th>Telefone</th>
                    <th class="text-right">Pedidos</th>
                    <th class="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${recorrentes.map((c: any) => `
                    <tr>
                      <td class="font-mono font-bold">#${c.rank}</td>
                      <td>
                        <div class="font-bold">${c.name || '—'}</div>
                        <div style="font-size:8px;color:#64748b;">Última: ${c.ultimo_pedido ? new Date(c.ultimo_pedido).toLocaleDateString('pt-BR') : '—'}</div>
                      </td>
                      <td class="font-mono">${parsePhone(c.telefone).display}</td>
                      <td class="text-right font-mono font-bold">${c.pedidos}</td>
                      <td class="text-right font-mono font-bold">${formatBRL(c.total_gasto || 0)}</td>
                    </tr>
                  `).join('') || '<tr><td colspan="5" class="text-center">Sem registros</td></tr>'}
                </tbody>
              </table>
            </div>

            <div>
              <div class="section-title">3. Top 10 Menos Recorrência (Alerta)</div>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Cliente</th>
                    <th>Telefone</th>
                    <th class="text-right">Pedidos</th>
                    <th class="text-right">Inativo</th>
                  </tr>
                </thead>
                <tbody>
                  ${churn.map((c: any) => `
                    <tr>
                      <td class="font-mono font-bold badge-danger">#${c.rank}</td>
                      <td>
                        <div class="font-bold">${c.name || '—'}</div>
                        <div style="font-size:8px;color:#64748b;">Última: ${c.ultimo_pedido ? new Date(c.ultimo_pedido).toLocaleDateString('pt-BR') : '—'}</div>
                      </td>
                      <td class="font-mono">${parsePhone(c.telefone).display}</td>
                      <td class="text-right font-mono">${c.pedidos}</td>
                      <td class="text-right font-mono badge-danger">${c.dias_inativo} dias</td>
                    </tr>
                  `).join('') || '<tr><td colspan="5" class="text-center">Sem registros</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>

          <div class="section-title">4. Listagem Geral de Clientes da Carteira (${reportClients.length} registros)</div>
          <table>
            <thead>
              <tr>
                <th>Cliente / Razão Social</th>
                <th>CNPJ / CPF</th>
                <th>Telefone</th>
                <th>Cidade / UF</th>
                <th>Vendedor Resp.</th>
                <th class="text-right">Pedidos</th>
                <th class="text-right">Total Comprado</th>
                <th>Última Compra</th>
                <th class="text-right">Inatividade</th>
              </tr>
            </thead>
            <tbody>
              ${reportClients.map((c: any) => {
                const phone = parsePhone(c.telefone).display;
                const diasStr = c.dias_inativo === 999 ? 'Sem Compras' : `${c.dias_inativo} dias`;
                const badgeClass = c.dias_inativo > 90 ? 'badge-danger' : c.dias_inativo > 30 ? 'badge-warning' : 'badge-success';
                return `
                  <tr>
                    <td class="font-bold">${c.nome || '—'}</td>
                    <td class="font-mono">${c.documento || '—'}</td>
                    <td class="font-mono font-bold">${phone}</td>
                    <td>${c.cidade ? `${c.cidade}/${c.estado || ''}` : '—'}</td>
                    <td>${c.vendedor_resp || '—'}</td>
                    <td class="text-right font-mono font-bold">${formatNum(c.qtd_pedidos || 0)}</td>
                    <td class="text-right font-mono font-bold">${formatBRL(c.total_gasto || 0)}</td>
                    <td class="font-mono">${c.ultimo_pedido ? new Date(c.ultimo_pedido).toLocaleDateString('pt-BR') : '—'}</td>
                    <td class="text-right font-mono ${badgeClass}">${diasStr}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 350);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Monta texto estruturado para envio por e-mail / cópia
  const buildEmailReportText = () => {
    const clients = list.data?.data || [];
    const recorrentes = analytics.data?.recorrentes || [];
    const churn = analytics.data?.churn || [];

    const lines: string[] = [
      `RELATÓRIO - VISÃO GERAL DA CARTEIRA DE CLIENTES`,
      `Emitido em: ${new Date().toLocaleString('pt-BR')}`,
      `Vendedor: ${selectedVendedorNome} | Cidade: ${selectedCidade === 'todas' ? 'Todas' : selectedCidade} | Filtro: ${tempoInativo}`,
      `------------------------------------------------------------`,
      `RESUMO DE INDICADORES:`,
      `• Total de Clientes: ${formatNum(kpis.total_clientes)}`,
      `• Clientes Ativos (Mês Atual): ${formatNum(kpis.mes_atual)}`,
      `• Clientes Ativos (Mês Anterior): ${formatNum(kpis.mes_anterior)}`,
      `• Taxa de Retenção: ${retencaoPct.toFixed(1)}%`,
      `• Novos Clientes: ${formatNum(kpis.novos_clientes)}`,
      `• Sem Vendas (Mês Atual): ${formatNum(kpis.sem_vendas_atual)} (${semVendasAtualPct.toFixed(1)}%)`,
      `• Risco de Churn: ${churnPct.toFixed(1)}%`,
      ``,
      `TOP CLIENTES COM MAIOR RECORRÊNCIA:`,
      ...recorrentes.slice(0, 10).map((c: any) =>
        `  #${c.rank} ${c.name} | Tel: ${parsePhone(c.telefone).display} | ${c.pedidos} ped. | ${formatBRL(c.total_gasto || 0)}`
      ),
      ``,
      `CLIENTES COM MENOS RECORRÊNCIA (ALERTA INATIVIDADE):`,
      ...churn.slice(0, 10).map((c: any) =>
        `  #${c.rank} ${c.name} | Tel: ${parsePhone(c.telefone).display} | ${c.dias_inativo} dias sem comprar | Última: ${c.ultimo_pedido ? new Date(c.ultimo_pedido).toLocaleDateString('pt-BR') : '—'}`
      ),
      ``,
      `LISTAGEM DA CARTEIRA DE CLIENTES (COM TELEFONE):`,
      ...clients.map((c: any) =>
        `• ${c.nome} (${c.documento || 'S/ DOC'}) | Tel: ${parsePhone(c.telefone).display} | Cidade: ${c.cidade ? `${c.cidade}/${c.estado || ''}` : '—'} | Vend: ${c.vendedor_resp || '—'} | Pedidos: ${c.qtd_pedidos} | Total: ${formatBRL(c.total_gasto || 0)} | Inativo: ${c.dias_inativo === 999 ? 'Sem Compras' : `${c.dias_inativo} dias`}`
      )
    ];
    return lines.join('\n');
  };

  const handleSendMailto = () => {
    const body = buildEmailReportText();
    const mailtoUrl = `mailto:${encodeURIComponent(emailTo.trim())}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(body.slice(0, 1800))}`;
    window.location.href = mailtoUrl;
  };

  const handleCopyReport = async () => {
    try {
      await navigator.clipboard.writeText(buildEmailReportText());
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <div aria-label="Análise de Clientes Dashboard" className="space-y-4 animate-in fade-in duration-300 min-w-0">
      
      {/* BARRA ÚNICA COMPACTA DE FILTROS (PERÍODO + VENDEDOR + CIDADE + AÇÕES DE RELATÓRIO) */}
      <div className="bi-filter-bar">
        <PeriodFilter />

        <div className="flex flex-wrap items-center gap-2 flex-1 sm:flex-initial justify-end ml-auto min-w-0">
          {/* Vendedor */}
          <div className="relative flex-1 sm:flex-initial min-w-[185px] max-w-[260px]">
            <select
              aria-label="Filtrar por Vendedor"
              value={selectedVendedor}
              onChange={(e) => {
                setSelectedVendedor(e.target.value);
                setPage(1);
              }}
              className="bi-select w-full appearance-none pr-7 truncate"
            >
              <option value="todas">Vendedor: Todos ({sellersList.length})</option>
              {sellersList.map((v: any) => (
                <option key={v.id} value={v.id}>{v.nome}</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
          </div>

          {/* Cidade */}
          <div className="relative flex-1 sm:flex-initial min-w-[165px] max-w-[240px]">
            <select
              aria-label="Filtrar por Cidade"
              value={selectedCidade}
              onChange={(e) => {
                setSelectedCidade(e.target.value);
                setPage(1);
              }}
              className="bi-select w-full appearance-none pr-7 truncate uppercase"
            >
              <option value="todas">Cidade: Todas ({citiesList.length})</option>
              {citiesList.map((cidadeNome: string) => (
                <option key={cidadeNome} value={cidadeNome}>{cidadeNome}</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
          </div>

          {/* Botão Gerar PDF */}
          <button
            type="button"
            onClick={handleGeneratePdf}
            disabled={isGeneratingPdf}
            className="h-8 px-3 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-xs cursor-pointer whitespace-nowrap"
            title="Gerar relatório completo da carteira em PDF com telefones"
          >
            <Printer size={13} />
            <span>{isGeneratingPdf ? 'Gerando PDF...' : 'Gerar PDF'}</span>
          </button>

          {/* Botão Enviar por E-mail */}
          <button
            type="button"
            onClick={() => setIsEmailModalOpen(true)}
            className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-xs cursor-pointer whitespace-nowrap"
            title="Enviar relatório da carteira por e-mail"
          >
            <Mail size={13} />
            <span>Enviar por E-mail</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-80 text-text-secondary">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mr-3 mb-2"></div>
          <span className="text-xs font-extrabold uppercase tracking-widest text-text-secondary">Carregando painel de clientes...</span>
        </div>
      ) : (
        <>
          {/* SEÇÃO 1: ATIVIDADE POR PERÍODO */}
          <div className="space-y-2">
            <span className="text-[10px] font-black text-text-secondary/80 uppercase tracking-wider pl-1 block">Atividade por Período</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
              
              {/* Card 1: Total de Clientes */}
              <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10px] font-bold text-text-secondary/80 uppercase tracking-wider truncate">Total de Clientes</span>
                  <div className="w-7 h-7 bg-brand-500/10 text-brand-500 rounded-lg flex items-center justify-center shrink-0">
                    <Users size={15} />
                  </div>
                </div>
                <span className="font-black text-text-primary block font-mono bi-kpi-value">
                  {formatNum(kpis.total_clientes)}
                </span>
                <span className="text-[10px] text-text-secondary block font-semibold mt-1 truncate">Base ativa cadastrada</span>
              </div>

              {/* Card 2: Mês Atual */}
              <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10px] font-bold text-text-secondary/80 uppercase tracking-wider truncate">Mês Atual</span>
                  <div className="w-7 h-7 bg-emerald-500/10 text-emerald-500 rounded-lg flex items-center justify-center shrink-0">
                    <TrendingUp size={15} />
                  </div>
                </div>
                <span className="font-black text-text-primary block font-mono bi-kpi-value">
                  {formatNum(kpis.mes_atual)}
                </span>
                <span className="text-[10px] text-text-secondary block font-semibold mt-1 truncate">Clientes com venda</span>
              </div>

              {/* Card 3: Mês Anterior */}
              <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10px] font-bold text-text-secondary/80 uppercase tracking-wider truncate">Mês Anterior</span>
                  <div className="w-7 h-7 bg-slate-500/10 text-slate-500 rounded-lg flex items-center justify-center shrink-0">
                    <TrendingDown size={15} />
                  </div>
                </div>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-black text-text-primary font-mono bi-kpi-value">
                    {formatNum(kpis.mes_anterior)}
                  </span>
                  <span className={clsx(
                    "text-[10.5px] font-mono font-extrabold flex items-center whitespace-nowrap",
                    (kpis.mes_atual - kpis.mes_anterior) >= 0 ? "text-success" : "text-red-500"
                  )}>
                    {(kpis.mes_atual - kpis.mes_anterior) >= 0 ? '▲' : '▼'}{' '}
                    {formatNum(Math.abs(kpis.mes_atual - kpis.mes_anterior))}
                  </span>
                </div>
                <span className="text-[10px] text-text-secondary block font-semibold mt-1 truncate">Clientes com venda</span>
              </div>

              {/* Card 4: Retenção */}
              <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10px] font-bold text-text-secondary/80 uppercase tracking-wider truncate">Retenção</span>
                  <div className={clsx(
                    "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                    retencaoPct >= 28 ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                  )}>
                    <Activity size={15} />
                  </div>
                </div>
                <span className="font-black text-text-primary block font-mono bi-kpi-value">
                  {retencaoPct.toFixed(1)}%
                </span>
                <span className="text-[10px] text-text-secondary block font-semibold mt-1 truncate">
                  Peso s/ base · <strong className="text-text-primary font-mono">Meta CS: 28.0%</strong>
                </span>
              </div>

            </div>
          </div>

          {/* SEÇÃO 2: OPORTUNIDADES E RISCO */}
          <div className="space-y-2">
            <span className="text-[10px] font-black text-text-secondary/80 uppercase tracking-wider pl-1 block">Oportunidades e Risco</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
              
              {/* Card 1: Novos Clientes */}
              <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10px] font-bold text-text-secondary/80 uppercase tracking-wider truncate">Novos Clientes</span>
                  <div className="w-7 h-7 bg-brand-500/10 text-brand-500 rounded-lg flex items-center justify-center shrink-0">
                    <UserPlus size={15} />
                  </div>
                </div>
                <span className="font-black text-text-primary block font-mono bi-kpi-value">
                  {formatNum(kpis.novos_clientes)}
                </span>
                <span className="text-[10px] text-text-secondary block font-semibold mt-1 truncate">
                  Novos no período · <strong className="text-text-primary font-mono">Meta: 21</strong>
                </span>
              </div>

              {/* Card 2: Sem Vendas (Mês Atual) */}
              <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10px] font-bold text-text-secondary/80 uppercase tracking-wider truncate">Sem Vendas (Mês Atual)</span>
                  <div className="w-7 h-7 bg-red-500/10 text-red-500 rounded-lg flex items-center justify-center shrink-0">
                    <UserMinus size={15} />
                  </div>
                </div>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-black text-text-primary font-mono bi-kpi-value">
                    {formatNum(kpis.sem_vendas_atual)}
                  </span>
                  <span className="text-[10.5px] text-text-secondary font-mono font-bold">({semVendasAtualPct.toFixed(1)}%)</span>
                </div>
                <span className="text-[10px] text-text-secondary block font-semibold mt-1 truncate">Sem compras no período</span>
              </div>

              {/* Card 3: Sem Vendas (Mês Anterior) */}
              <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10px] font-bold text-text-secondary/80 uppercase tracking-wider truncate">Sem Vendas (Mês Anterior)</span>
                  <div className="w-7 h-7 bg-orange-500/10 text-orange-600 rounded-lg flex items-center justify-center shrink-0">
                    <AlertCircle size={15} />
                  </div>
                </div>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-black text-text-primary font-mono bi-kpi-value">
                    {formatNum(kpis.sem_vendas_anterior)}
                  </span>
                  <span className="text-[10.5px] text-text-secondary font-mono font-bold">({semVendasAnteriorPct.toFixed(1)}%)</span>
                </div>
                <span className="text-[10px] text-text-secondary block font-semibold mt-1 truncate">Inatividade histórica anterior</span>
              </div>

              {/* Card 4: Risco de Churn */}
              <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10px] font-bold text-text-secondary/80 uppercase tracking-wider truncate">Risco de Churn</span>
                  <div className={clsx(
                    "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                    churnPct <= 72 ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                  )}>
                    <Activity size={15} />
                  </div>
                </div>
                <span className="font-black text-text-primary block font-mono bi-kpi-value">
                  {churnPct.toFixed(1)}%
                </span>
                <span className="text-[10px] text-text-secondary block font-semibold mt-1 truncate">
                  Inativos s/ base · <strong className="text-text-primary font-mono">Meta: 72.0%</strong>
                </span>
              </div>

            </div>
          </div>

          {/* RANKINGS DE RECORRÊNCIA E RISCOS */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            
            {/* Clientes com Maior Recorrência */}
            <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-6 flex flex-col min-h-[380px] transition-all">
              <div className="flex items-center gap-2 border-b border-divider/20 pb-3 mb-4">
                <Award className="text-brand-500" size={18} />
                <h3 className="text-sm font-extrabold text-text-primary uppercase tracking-wider">Clientes com Maior Recorrência</h3>
              </div>

              <div className="flex-1 text-xs pr-1 space-y-1">
                {analytics.data?.recorrentes?.map((c: any, index: number) => {
                  const maxOrders = analytics.data.recorrentes[0]?.pedidos || 1;
                  const share = (c.pedidos / maxOrders) * 100;
                  const phoneInfo = parsePhone(c.telefone);
                  return (
                    <div key={c.id || index} className="relative flex justify-between items-center py-2 px-3 rounded-lg overflow-hidden group hover:bg-bg-secondary/45 transition-colors">
                      <div 
                        className="absolute left-0 top-0 bottom-0 bg-brand-500/5 group-hover:bg-brand-500/10 transition-all duration-500" 
                        style={{ width: `${share}%` }} 
                      />
                      <span className="relative z-10 text-text-secondary truncate font-medium text-xs flex-1 min-w-0 mr-3 flex items-center gap-2.5" title={c.name}>
                        <span className={clsx(
                          "font-mono text-xs min-w-[20px]", 
                          c.rank === 1 ? "text-amber-500 font-black" : c.rank === 2 ? "text-slate-400 font-black" : c.rank === 3 ? "text-orange-600 font-black" : "text-text-muted font-bold"
                        )}>
                          #{c.rank}
                        </span>
                        <div className="min-w-0">
                          <span className="truncate text-text-primary font-bold group-hover:text-brand-500 transition-colors block text-xs">{c.name}</span>
                          <span className="text-[10px] text-text-secondary font-medium flex flex-wrap items-center gap-x-2">
                            <span>Última compra: {c.ultimo_pedido ? new Date(c.ultimo_pedido).toLocaleDateString('pt-BR') : '—'}</span>
                            {phoneInfo.display !== '—' && (
                              <span className="inline-flex items-center gap-1 font-mono text-text-primary/80">
                                • <Phone size={9} className="text-brand-500" /> {phoneInfo.display}
                              </span>
                            )}
                          </span>
                        </div>
                      </span>
                      <div className="relative z-10 text-right shrink-0 flex flex-col font-mono text-xs items-end">
                        <span className="font-extrabold text-brand-500 text-xs">{c.pedidos} pedidos</span>
                        <span className="text-[9px] text-text-secondary">{formatBRL(c.total_gasto)}</span>
                      </div>
                    </div>
                  );
                })}
                {(!analytics.data?.recorrentes || analytics.data.recorrentes.length === 0) && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6">
                    <EyeOff size={24} className="text-text-muted mb-1 stroke-[1.5]" />
                    <span className="text-xs text-text-muted font-bold">Nenhum cliente faturado.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Clientes com Menos Recorrência */}
            <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-6 flex flex-col min-h-[380px] transition-all">
              <div className="flex items-center gap-2 border-b border-divider/20 pb-3 mb-4">
                <AlertCircle className="text-red-500" size={18} />
                <h3 className="text-sm font-extrabold text-text-primary uppercase tracking-wider">Clientes com Menos Recorrência</h3>
              </div>

              <div className="flex-1 text-xs pr-1 space-y-1">
                {analytics.data?.churn?.map((c: any, index: number) => {
                  const maxDias = analytics.data.churn[0]?.dias_inativo || 1;
                  const share = (c.dias_inativo / maxDias) * 100;
                  const phoneInfo = parsePhone(c.telefone);
                  return (
                    <div key={c.id || index} className="relative flex justify-between items-center py-2 px-3 rounded-lg overflow-hidden group hover:bg-bg-secondary/45 transition-colors">
                      <div 
                        className="absolute left-0 top-0 bottom-0 bg-red-500/5 group-hover:bg-red-500/10 transition-all duration-500" 
                        style={{ width: `${share}%` }} 
                      />
                      <span className="relative z-10 text-text-secondary truncate font-medium text-xs flex-1 min-w-0 mr-3 flex items-center gap-2.5" title={c.name}>
                        <span className="font-mono text-xs min-w-[20px] text-red-500 font-extrabold">#{c.rank}</span>
                        <div className="min-w-0">
                          <span className="truncate text-text-primary font-bold group-hover:text-red-500 transition-colors block text-xs">{c.name}</span>
                          <span className="text-[10px] text-red-500 font-black flex flex-wrap items-center gap-x-2">
                            <span>{c.dias_inativo} dias sem comprar</span>
                            {phoneInfo.display !== '—' && (
                              <span className="inline-flex items-center gap-1 font-mono text-text-secondary font-semibold">
                                • <Phone size={9} className="text-red-500" /> {phoneInfo.display}
                              </span>
                            )}
                          </span>
                        </div>
                      </span>
                      <div className="relative z-10 text-right shrink-0 flex flex-col font-mono text-xs items-end">
                        <span className="font-extrabold text-text-primary text-xs">{c.pedidos} pedidos</span>
                        <span className="text-[9px] text-text-secondary">
                          Último: {c.ultimo_pedido ? new Date(c.ultimo_pedido).toLocaleDateString('pt-BR') : '—'}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {(!analytics.data?.churn || analytics.data.churn.length === 0) && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6">
                    <EyeOff size={24} className="text-text-muted mb-1 stroke-[1.5]" />
                    <span className="text-xs text-text-muted font-bold">Nenhum cliente em risco.</span>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* LISTAGEM GERAL DE CLIENTES */}
          <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-6 space-y-4">
            
            <div className="border-b border-divider/20 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-text-primary uppercase tracking-wider flex items-center gap-2">
                  <FileText className="text-brand-500" size={16} />
                  Listagem Geral de Clientes
                </h3>
                <p className="text-[10px] text-text-secondary font-bold mt-0.5">
                  Todos os clientes ativos com filtro por vendedor, inatividade, telefone e exportação em PDF / E-mail.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleGeneratePdf}
                  disabled={isGeneratingPdf}
                  className="h-8 px-3 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <Download size={13} />
                  <span>{isGeneratingPdf ? 'Gerando PDF...' : 'Gerar PDF'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEmailModalOpen(true)}
                  className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <Mail size={13} />
                  <span>Enviar por E-mail</span>
                </button>
              </div>
            </div>

            {/* BARRA DE FILTROS DA LISTA (BUSCA + VENDEDOR + INATIVIDADE + ORDENAÇÃO) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search */}
              <div className="relative w-full">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar por nome, CNPJ ou telefone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-9 pl-9 pr-4 bg-bg-secondary border border-divider text-text-primary rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all duration-300 shadow-sm"
                />
              </div>

              {/* Filtro por Vendedor na Listagem */}
              <div className="relative w-full">
                <select
                  aria-label="Filtrar Listagem por Vendedor"
                  value={selectedVendedor}
                  onChange={(e) => {
                    setSelectedVendedor(e.target.value);
                    setPage(1);
                  }}
                  className="appearance-none h-9 px-3 bg-bg-secondary border border-divider text-text-primary rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all duration-300 w-full cursor-pointer pr-9 shadow-sm"
                >
                  <option value="todas">Vendedor: Todos ({sellersList.length})</option>
                  {sellersList.map((v: any) => (
                    <option key={v.id} value={v.id}>{v.nome}</option>
                  ))}
                </select>
                <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
              </div>

              {/* Tempo Inativo */}
              <div className="relative w-full">
                <select
                  value={tempoInativo}
                  onChange={(e) => {
                    setTempoInativo(e.target.value);
                    setPage(1);
                  }}
                  className="appearance-none h-9 px-3 bg-bg-secondary border border-divider text-text-primary rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all duration-300 w-full cursor-pointer pr-9 shadow-sm"
                >
                  <option value="Qualquer Inatividade">Qualquer Inatividade</option>
                  <option value="Ativos (Comprou no mês)">Ativos (Comprou no mês)</option>
                  <option value="Inativo > 30 dias">Inativo &gt; 30 dias</option>
                  <option value="Inativo > 60 dias">Inativo &gt; 60 dias</option>
                  <option value="Inativo > 90 dias">Inativo &gt; 90 dias</option>
                  <option value="Sem compras / Churn">Sem compras / Churn</option>
                </select>
                <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
              </div>

              {/* Ordenação */}
              <div className="relative w-full">
                <select
                  value={ordenacao}
                  onChange={(e) => {
                    setOrdenacao(e.target.value);
                    setPage(1);
                  }}
                  className="appearance-none h-9 px-3 bg-bg-secondary border border-divider text-text-primary rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all duration-300 w-full cursor-pointer pr-9 shadow-sm"
                >
                  <option value="Mais inativos primeiro (Alerta)">Mais inativos primeiro (Alerta)</option>
                  <option value="Mais ativos primeiro">Mais ativos primeiro</option>
                  <option value="Maior faturamento">Maior faturamento</option>
                  <option value="Menor faturamento">Menor faturamento</option>
                  <option value="Ordem alfabética">Ordem alfabética</option>
                </select>
                <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
              </div>
            </div>

            {/* TABELA DE DADOS */}
            {list.isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-500 mr-3 mb-2"></div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-text-secondary">Buscando listagem...</span>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-divider">
                <table className="min-w-full divide-y divide-divider/25 text-left text-xs">
                  <thead className="bg-bg-secondary text-text-secondary uppercase text-[10px] font-black tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Cliente</th>
                      <th className="px-4 py-3">Telefone</th>
                      <th className="px-4 py-3">Cidade</th>
                      <th className="px-4 py-3">Vendedor Resp.</th>
                      <th className="px-4 py-3 text-right">Pedidos</th>
                      <th className="px-4 py-3 text-right">Total Comprado</th>
                      <th className="px-4 py-3">Última Compra</th>
                      <th className="px-4 py-3 text-right">Dias Inativo</th>
                      <th className="px-4 py-3 text-right">Risco Churn</th>
                      <th className="px-4 py-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-divider/10 bg-bg-primary text-text-primary text-[10.5px] font-medium">
                    {list.data?.data?.map((c: any) => {
                      const riskLevel = c.dias_inativo > 90 ? '99%' : c.dias_inativo > 60 ? '75%' : c.dias_inativo > 30 ? '40%' : '0%';
                      const phoneInfo = parsePhone(c.telefone);
                      return (
                        <tr key={c.id} className="hover:bg-bg-secondary/20 transition-colors">
                          {/* Cliente */}
                          <td className="px-4 py-2 min-w-[200px]">
                            <span className="block font-bold text-text-primary truncate max-w-[220px] text-[11px]">{c.nome}</span>
                            <span className="block text-[8.5px] text-text-secondary/70 font-mono mt-0.5">{c.documento || '—'}</span>
                          </td>
                          {/* Telefone */}
                          <td className="px-4 py-2 whitespace-nowrap">
                            {phoneInfo.display !== '—' ? (
                              phoneInfo.isWhatsApp ? (
                                <a
                                  href={phoneInfo.waLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 font-mono font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                                  title="Conversar no WhatsApp"
                                >
                                  <MessageCircle size={12} />
                                  <span>{phoneInfo.display}</span>
                                </a>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 font-mono font-semibold text-text-primary">
                                  <Phone size={11} className="text-text-secondary" />
                                  <span>{phoneInfo.display}</span>
                                </span>
                              )
                            ) : (
                              <span className="text-text-muted">—</span>
                            )}
                          </td>
                          {/* Cidade */}
                          <td className="px-4 py-2 text-text-secondary font-bold uppercase truncate max-w-[120px]">
                            {c.cidade ? `${c.cidade}/${c.estado}` : '—'}
                          </td>
                          {/* Vendedor */}
                          <td className="px-4 py-2 text-text-secondary truncate max-w-[150px]">
                            {c.vendedor_resp || '—'}
                          </td>
                          {/* Pedidos */}
                          <td className="px-4 py-2 text-right font-mono font-bold">
                            {formatNum(c.qtd_pedidos)}
                          </td>
                          {/* Total Comprado */}
                          <td className="px-4 py-2 text-right font-mono font-bold text-text-primary">
                            {formatBRL(c.total_gasto || 0)}
                          </td>
                          {/* Última Compra */}
                          <td className="px-4 py-2 text-text-secondary font-mono">
                            {c.ultimo_pedido ? new Date(c.ultimo_pedido).toLocaleDateString('pt-BR') : '—'}
                          </td>
                          {/* Dias Inativo */}
                          <td className="px-4 py-2 text-right font-mono">
                            <span className={clsx(
                              "px-2 py-0.5 rounded-md font-bold text-[9px]",
                              c.dias_inativo > 90 ? "bg-red-500/10 text-red-500" :
                              c.dias_inativo > 30 ? "bg-orange-500/10 text-orange-600" :
                              "bg-emerald-500/10 text-emerald-600"
                            )}>
                              {c.dias_inativo === 999 ? 'Sem Compras' : `${c.dias_inativo} dias`}
                            </span>
                          </td>
                          {/* Risco Churn */}
                          <td className="px-4 py-2 text-right font-mono">
                            <span className={clsx(
                              "font-black text-[10.5px]",
                              c.dias_inativo > 90 ? "text-red-500" :
                              c.dias_inativo > 30 ? "text-orange-500" :
                              "text-emerald-600"
                            )}>
                              {riskLevel}
                            </span>
                          </td>
                          {/* Ações */}
                          <td className="px-4 py-2 text-center">
                            <button
                              onClick={() => navigate(`/bi/customer?id=${c.id}`)}
                              className="px-2 py-0.5 bg-bg-secondary hover:bg-brand-500 hover:text-white border border-divider text-text-primary text-[9px] font-black rounded-lg transition-all cursor-pointer shadow-sm uppercase tracking-wider"
                            >
                              Ver Ficha
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {(!list.data?.data || list.data.data.length === 0) && (
                      <tr>
                        <td colSpan={10} className="px-4 py-8 text-center text-text-secondary font-bold">
                          Nenhum cliente encontrado com os filtros selecionados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* PAGINAÇÃO */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 border-t border-divider/10">
                <span className="text-[10px] text-text-secondary font-bold">
                  Página {page} de {totalPages} ({list.data?.total || 0} clientes)
                </span>
                
                <div className="flex gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-divider bg-bg-secondary hover:bg-bg-tertiary disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-sm"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded-lg border border-divider bg-bg-secondary hover:bg-bg-tertiary disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-sm"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}

          </div>
        </>
      )}

      {/* MODAL DE ENVIO DE RELATÓRIO POR E-MAIL */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-bg-primary border border-divider shadow-2xl rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="px-5 py-3.5 border-b border-divider flex items-center justify-between bg-bg-secondary/40">
              <div className="flex items-center gap-2">
                <Mail size={17} className="text-emerald-500" />
                <h3 className="text-sm font-extrabold text-text-primary uppercase tracking-wider">
                  Enviar Relatório da Carteira por E-mail
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEmailModalOpen(false)}
                className="p-1 text-text-secondary hover:text-text-primary rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">
                    E-mail do Destinatário
                  </label>
                  <input
                    type="email"
                    placeholder="exemplo@empresa.com.br"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    className="w-full h-9 px-3 bg-bg-secondary border border-divider rounded-lg text-xs font-semibold text-text-primary outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">
                    Assunto
                  </label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="w-full h-9 px-3 bg-bg-secondary border border-divider rounded-lg text-xs font-semibold text-text-primary outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-text-secondary uppercase">
                    Prévia do Conteúdo (Com Indicadores, Rankings e Telefones)
                  </label>
                  <span className="text-[10px] font-bold text-brand-500">
                    Vendedor: {selectedVendedorNome}
                  </span>
                </div>
                <textarea
                  readOnly
                  rows={11}
                  value={buildEmailReportText()}
                  className="w-full p-3 bg-bg-secondary/60 border border-divider rounded-xl font-mono text-[10.5px] text-text-primary outline-none resize-y"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-divider">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleGeneratePdf}
                    disabled={isGeneratingPdf}
                    className="h-9 px-3.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Printer size={14} />
                    <span>{isGeneratingPdf ? 'Gerando PDF...' : 'Baixar / Imprimir PDF'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyReport}
                    className="h-9 px-3.5 bg-bg-secondary hover:bg-bg-tertiary border border-divider text-text-primary rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    {copiedReport ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    <span>{copiedReport ? 'Copiado!' : 'Copiar Texto Completo'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEmailModalOpen(false)}
                    className="h-9 px-3 text-text-secondary hover:text-text-primary font-bold text-xs cursor-pointer"
                  >
                    Fechar
                  </button>
                  <button
                    type="button"
                    onClick={handleSendMailto}
                    className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                  >
                    <Mail size={14} />
                    <span>Abrir no Cliente de E-mail</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
