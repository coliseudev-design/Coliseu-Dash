import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePeriodStore, periodToParams, PERIOD_OPTIONS } from '../../store/periodStore';
import { useBranchParam } from '../../contexts/BranchContext';
import PeriodFilter from '../../components/PeriodFilter';
import { useBranchPeriodQuery, useApiQuery } from '../../hooks/useApi';
import api from '../../services/api';
import { 
  Users, UserPlus, UserMinus, Activity, AlertCircle, 
  Search, ChevronLeft, ChevronRight, ChevronDown, Award, EyeOff, FileText,
  TrendingUp, TrendingDown, Phone, Printer, Download, MessageCircle
} from 'lucide-react';
import { formatBRL, formatNum } from '../../utils/format';
import clsx from 'clsx';

function formatSelectedPeriodDisplay(periodState: { period: string; startDate?: string; endDate?: string }) {
  const now = new Date();
  const fmt = (d: Date) => d.toLocaleDateString('pt-BR');
  const labelObj = PERIOD_OPTIONS.find(p => p.key === periodState.period);
  const baseLabel = labelObj ? labelObj.label : 'Período Atual';

  if (periodState.period === 'today') {
    return `Hoje (${fmt(now)})`;
  }
  if (periodState.period === 'yesterday') {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    return `Ontem (${fmt(y)})`;
  }
  if (periodState.period === 'last7') {
    const s = new Date(now);
    s.setDate(s.getDate() - 7);
    return `Últimos 7 dias (${fmt(s)} a ${fmt(now)})`;
  }
  if (periodState.period === 'thisMonth') {
    const s = new Date(now.getFullYear(), now.getMonth(), 1);
    return `Mês Atual (${fmt(s)} a ${fmt(now)})`;
  }
  if (periodState.period === 'lastMonth') {
    const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const e = new Date(now.getFullYear(), now.getMonth(), 0);
    return `Mês Anterior (${fmt(s)} a ${fmt(e)})`;
  }
  if (periodState.period === 'last12m') {
    const s = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    return `Últimos 12 Meses (${fmt(s)} a ${fmt(now)})`;
  }
  if (periodState.period === 'custom' && periodState.startDate && periodState.endDate) {
    const [sy, sm, sd] = periodState.startDate.split('-');
    const [ey, em, ed] = periodState.endDate.split('-');
    return `Personalizado (${sd}/${sm}/${sy} a ${ed}/${em}/${ey})`;
  }
  return baseLabel;
}

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

  // Estado de exportação PDF
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

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

  // Geração de PDF em estilo Relatório Corporativo (somente listagem de clientes, sem CNPJ)
  const handleGeneratePdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const reportClients = await fetchFullReportClients();
      const emissionDate = new Date().toLocaleString('pt-BR');
      const periodoSelecionado = formatSelectedPeriodDisplay(periodState);
      const totalPedidosRelatorio = reportClients.reduce((acc: number, c: any) => acc + Number(c.qtd_pedidos || 0), 0);
      const valorTotalRelatorio = reportClients.reduce((acc: number, c: any) => acc + Number(c.total_gasto || 0), 0);

      const printWindow = window.open('', '_blank', 'width=1180,height=860');
      if (!printWindow) {
        alert('Permita pop-ups no navegador para gerar o PDF do relatório.');
        return;
      }

      const html = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8" />
          <title>Relatório de Carteira de Clientes</title>
          <style>
            @page { size: A4 landscape; margin: 12mm; }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              color: #0f172a;
              background: #ffffff;
              padding: 16px 20px;
              font-size: 11px;
              line-height: 1.4;
            }
            .report-header {
              border-bottom: 2px solid #0f172a;
              padding-bottom: 12px;
              margin-bottom: 14px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }
            .report-title {
              font-size: 18px;
              font-weight: 800;
              color: #0f172a;
              text-transform: uppercase;
              letter-spacing: 0.6px;
            }
            .report-subtitle {
              font-size: 11px;
              color: #475569;
              margin-top: 3px;
              font-weight: 600;
            }
            .report-emission {
              text-align: right;
              font-size: 10px;
              color: #334155;
              line-height: 1.5;
            }
            .params-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 10px;
              background: #f8fafc;
              border: 1px solid #cbd5e1;
              border-radius: 6px;
              padding: 10px 14px;
              margin-bottom: 16px;
            }
            .param-box {
              display: flex;
              flex-direction: column;
              border-right: 1px solid #e2e8f0;
              padding-right: 10px;
            }
            .param-box:last-child {
              border-right: none;
              padding-right: 0;
            }
            .param-label {
              font-size: 8.5px;
              font-weight: 800;
              text-transform: uppercase;
              color: #64748b;
              letter-spacing: 0.5px;
              margin-bottom: 2px;
            }
            .param-value {
              font-size: 11px;
              font-weight: 700;
              color: #0f172a;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              border: 1px solid #cbd5e1;
              font-size: 10px;
            }
            thead th {
              background: #1e293b;
              color: #ffffff;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.4px;
              padding: 8px 10px;
              border: 1px solid #334155;
              font-size: 9px;
              text-align: left;
              white-space: nowrap;
            }
            tbody td {
              padding: 7px 10px;
              border: 1px solid #e2e8f0;
              color: #1e293b;
              vertical-align: middle;
            }
            tbody tr:nth-child(even) td {
              background: #f8fafc;
            }
            tfoot td {
              background: #f1f5f9;
              color: #0f172a;
              font-weight: 800;
              padding: 8px 10px;
              border: 1px solid #cbd5e1;
              font-size: 10.5px;
            }
            .text-right { text-align: right !important; }
            .text-center { text-align: center !important; }
            .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
            .font-bold { font-weight: 700; }
            .status-danger { color: #b91c1c; font-weight: 700; }
            .status-warning { color: #b45309; font-weight: 700; }
            .status-success { color: #047857; font-weight: 700; }
            @media print {
              body { padding: 0; }
              thead { display: table-header-group; }
              tfoot { display: table-footer-group; }
              tr { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="report-header">
            <div>
              <div class="report-title">Relatório de Carteira de Clientes</div>
              <div class="report-subtitle">Listagem Comercial de Clientes, Telefones de Contato, Vendedor e Histórico de Compras</div>
            </div>
            <div class="report-emission">
              <div><strong>Data de Emissão:</strong> ${emissionDate}</div>
              <div><strong>Clientes no Relatório:</strong> ${reportClients.length} de ${list.data?.total || reportClients.length} registros</div>
            </div>
          </div>

          <div class="params-grid">
            <div class="param-box">
              <span class="param-label">Período Selecionado</span>
              <span class="param-value">${periodoSelecionado}</span>
            </div>
            <div class="param-box">
              <span class="param-label">Vendedor</span>
              <span class="param-value">${selectedVendedorNome}</span>
            </div>
            <div class="param-box">
              <span class="param-label">Cidade</span>
              <span class="param-value">${selectedCidade === 'todas' ? 'Todas as Cidades' : selectedCidade}</span>
            </div>
            <div class="param-box">
              <span class="param-label">Filtro de Inatividade / Ordem</span>
              <span class="param-value">${tempoInativo} • ${ordenacao}${searchDebounced ? ` • Busca: "${searchDebounced}"` : ''}</span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th class="text-center" style="width: 38px;">#</th>
                <th style="width: 65px;">Cód.</th>
                <th>Nome do Cliente</th>
                <th style="width: 125px;">Telefone</th>
                <th style="width: 140px;">Cidade / UF</th>
                <th style="width: 155px;">Vendedor</th>
                <th class="text-right" style="width: 75px;">Pedidos</th>
                <th class="text-right" style="width: 115px;">Valor Total</th>
                <th class="text-center" style="width: 95px;">Última Compra</th>
                <th class="text-right" style="width: 95px;">Inatividade</th>
              </tr>
            </thead>
            <tbody>
              ${reportClients.map((c: any, idx: number) => {
                const phone = parsePhone(c.telefone).display;
                const diasStr = c.dias_inativo === 999 ? 'Sem Compras' : `${c.dias_inativo} dias`;
                const statusClass = c.dias_inativo > 90 ? 'status-danger' : c.dias_inativo > 30 ? 'status-warning' : 'status-success';
                return `
                  <tr>
                    <td class="text-center font-mono">${idx + 1}</td>
                    <td class="font-mono font-bold">${c.id || '—'}</td>
                    <td class="font-bold">${c.nome || '—'}</td>
                    <td class="font-mono font-bold">${phone}</td>
                    <td>${c.cidade ? `${c.cidade}${c.estado ? ` / ${c.estado}` : ''}` : '—'}</td>
                    <td>${c.vendedor_resp || '—'}</td>
                    <td class="text-right font-mono font-bold">${formatNum(c.qtd_pedidos || 0)}</td>
                    <td class="text-right font-mono font-bold">${formatBRL(c.total_gasto || 0)}</td>
                    <td class="text-center font-mono">${c.ultimo_pedido ? new Date(c.ultimo_pedido).toLocaleDateString('pt-BR') : '—'}</td>
                    <td class="text-right font-mono ${statusClass}">${diasStr}</td>
                  </tr>
                `;
              }).join('') || '<tr><td colspan="10" class="text-center">Nenhum cliente encontrado para os filtros informados.</td></tr>'}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="6">TOTAL GERAL (${reportClients.length} clientes listados)</td>
                <td class="text-right font-mono">${formatNum(totalPedidosRelatorio)}</td>
                <td class="text-right font-mono">${formatBRL(valorTotalRelatorio)}</td>
                <td colspan="2"></td>
              </tr>
            </tfoot>
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

  return (
    <div aria-label="Análise de Clientes Dashboard" className="space-y-4 animate-in fade-in duration-300 min-w-0">
      
      {/* BARRA ÚNICA COMPACTA DE FILTROS (PERÍODO + VENDEDOR + CIDADE + GERAR PDF) */}
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
            title="Gerar relatório de clientes em PDF"
          >
            <Printer size={13} />
            <span>{isGeneratingPdf ? 'Gerando PDF...' : 'Gerar PDF'}</span>
          </button>
        </div>
      </div>

      {isLoading && !analytics.data ? (
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
                  Todos os clientes ativos com filtro por vendedor, inatividade, telefone e exportação de relatório em PDF.
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
            {list.isLoading && !list.data ? (
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

    </div>
  );
}
