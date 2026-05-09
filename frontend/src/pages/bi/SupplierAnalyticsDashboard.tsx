import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useBiPeriodQuery } from '../../hooks/useBiPeriodQuery';
import { BIService } from '../../services/biApi';
import { BiPeriodFilter } from '../../types/bi.types';
import { 
  Building2, TrendingUp, TrendingDown, DollarSign, Target, Award, 
  MapPin, Users, ShoppingCart, Activity, ShieldCheck, Box, ChevronDown, Search
} from 'lucide-react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatBRL, formatBRLCompact, formatNum } from '../../utils/format';
import clsx from 'clsx';

// Badge Comparativo para tabelas
const DeltaBadge = ({ pct }: { pct: number | null }) => {
  if (pct === null) return <span className="text-text-muted">-</span>;
  const isUp = pct > 0;
  const isDown = pct < 0;
  return (
    <div className={clsx(
      "inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md",
      isUp ? "bg-success/10 text-success" : isDown ? "bg-danger/10 text-danger" : "bg-text-muted/10 text-text-muted"
    )}>
      {isUp && <TrendingUp size={12} className="mr-1" />}
      {isDown && <TrendingDown size={12} className="mr-1" />}
      {Math.abs(pct).toFixed(1)}%
    </div>
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-bg-primary border border-border shadow-card-hover p-4 rounded-xl z-50">
        <p className="text-text-primary font-bold mb-2 pb-2 border-b border-divider">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex justify-between items-center gap-4 text-sm mb-1">
            <span className="text-text-secondary flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
              {entry.name}:
            </span>
            <span className="font-bold text-text-primary">
              {entry.name.includes('Valor') || entry.name.includes('Receita')
                ? formatBRL(entry.value)
                : entry.name.includes('Margem') 
                  ? `${entry.value.toFixed(1)}%` 
                  : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function SupplierAnalyticsDashboard() {
  const { filter } = useOutletContext<{ filter: BiPeriodFilter }>();
  const [activeTab, setActiveTab] = useState('Visão Geral de Vendas');

  const { isLoading } = useBiPeriodQuery(
    ['bi', 'supplier'],
    BIService.getSupplierAnalytics,
    filter
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-secondary">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mr-3"></div>
        Carregando Hub do Fornecedor...
      </div>
    );
  }

  // Mocks explicitly matching the requested layout image
  const performanceMensal = [
    { mes: 'Mar / 2026', vendas: 1170.00, cresc_vendas: -78.5, qtde: 2, cresc_qtde: -80.0 },
    { mes: 'Fev / 2026', vendas: 5438.50, cresc_vendas: -73.2, qtde: 5, cresc_qtde: -66.7 },
    { mes: 'Jan / 2026', vendas: 20317.10, cresc_vendas: 168.6, qtde: 15, cresc_qtde: 66.7 },
    { mes: 'Dez / 2025', vendas: 7563.10, cresc_vendas: 47.6, qtde: 9, cresc_qtde: 0.0 },
    { mes: 'Nov / 2025', vendas: 5125.50, cresc_vendas: 119.5, qtde: 9, cresc_qtde: 350.0 },
    { mes: 'Out / 2025', vendas: 2335.00, cresc_vendas: null, qtde: 2, cresc_qtde: null },
  ];

  const chartData = [
    { mes: '05/2025', valor: 2000, qtde: 2, margem: 15 },
    { mes: '06/2025', valor: 32000, qtde: 18, margem: 45 },
    { mes: '07/2025', valor: 15000, qtde: 12, margem: 50 },
    { mes: '08/2025', valor: 12000, qtde: 8, margem: 52 },
    { mes: '09/2025', valor: 6000, qtde: 4, margem: 48 },
    { mes: '10/2025', valor: 4000, qtde: 3, margem: 20 },
    { mes: '11/2025', valor: 5125, qtde: 9, margem: 18 },
    { mes: '12/2025', valor: 7563, qtde: 9, margem: 30 },
    { mes: '01/2026', valor: 20317, qtde: 15, margem: 58 },
    { mes: '02/2026', valor: 5438, qtde: 5, margem: 62 },
    { mes: '03/2026', valor: 1170, qtde: 2, margem: 10 },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-10">
      
      {/* HEADER & FILTERS */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-4 mb-2">
        <div>
          <h2 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Building2 size={24} className="text-brand-500" />
            Hub de Fornecedores
          </h2>
          <p className="text-sm text-text-secondary mt-1">Análise de performance, rentabilidade e argumentos de negociação.</p>
          <div className="flex items-center gap-4 mt-3 text-xs font-semibold text-text-muted">
             <div className="flex items-center gap-1"><span className="text-brand-500">📅</span> Período Analisado: <span className="text-brand-500">Últimos 12 Meses</span></div>
             <div className="flex items-center gap-1"><span className="text-brand-500">🏢</span> Marca: <span className="text-brand-500">4AM COMPENSADOS LTDA</span></div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-bg-primary border border-border rounded-lg px-3 py-2 flex items-center gap-2 min-w-[200px]">
             <span className="text-sm text-text-primary flex-1 truncate">4AM COMPENSADOS LTDA</span>
             <ChevronDown size={14} className="text-text-muted" />
          </div>
          <div className="bg-bg-primary border border-border rounded-lg px-3 py-2 flex items-center gap-2">
             <span className="text-sm text-text-primary">Últimos 12 Meses</span>
             <ChevronDown size={14} className="text-text-muted" />
          </div>
          <button className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors">
            <Search size={16} /> Analisar
          </button>
        </div>
      </div>

      {/* ORANGE BANNER */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-600 rounded-xl p-5 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6 text-white relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute right-0 top-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
        
        <div className="flex items-center gap-4 z-10">
          <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
            <Target size={32} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">4AM COMPENSADOS LTDA</h2>
            <p className="text-orange-100 font-medium text-sm">Raio-X de Performance no Período</p>
          </div>
        </div>

        <div className="flex items-center gap-4 z-10">
          <div className="bg-white text-orange-600 rounded-xl px-4 py-3 flex items-center gap-3 shadow-md">
            <div className="text-2xl font-extrabold bg-orange-100 rounded-full w-10 h-10 flex items-center justify-center">8º</div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-400">Posição no Ranking</span>
              <span className="text-xs font-bold text-orange-600">Período Selecionado</span>
            </div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl px-4 py-3 flex flex-col justify-center shadow-md">
            <span className="text-[10px] font-black uppercase tracking-wider text-orange-100">Share da Empresa</span>
            <span className="text-xl font-extrabold text-white">3,8%</span>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="flex items-center gap-6 border-b border-border px-2">
        {['Visão Geral de Vendas', 'Ranking de Marcas', 'Análise de Estoque', 'Catálogo'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={clsx(
              "pb-3 text-sm font-bold uppercase tracking-wide transition-colors relative flex items-center gap-2",
              activeTab === tab ? "text-brand-500" : "text-text-muted hover:text-text-primary"
            )}
          >
            {tab === 'Visão Geral de Vendas' && <Activity size={16} />}
            {tab === 'Ranking de Marcas' && <Target size={16} />}
            {tab === 'Análise de Estoque' && <Box size={16} />}
            {tab === 'Catálogo' && <ShoppingCart size={16} />}
            {tab}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-500 rounded-t-full"></div>
            )}
          </button>
        ))}
      </div>

      {/* PERFORMANCE MENSAL TABLE */}
      <div className="bg-bg-primary border border-border shadow-card rounded-xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-divider">
          <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider">Performance Mensal</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-bg-secondary/30 text-[10px] text-text-muted uppercase font-bold tracking-wider">
                <th className="px-5 py-3">MÊS / ANO</th>
                <th className="px-5 py-3 text-right">TOTAL VENDAS (R$)</th>
                <th className="px-5 py-3 text-center">CRESCIMENTO (VENDAS)</th>
                <th className="px-5 py-3 text-right">QTDE. VENDIDA</th>
                <th className="px-5 py-3 text-center">CRESCIMENTO (QTDE.)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider/30 text-xs">
              {performanceMensal.map((row, i) => (
                <tr key={i} className="hover:bg-bg-secondary/50 transition-colors">
                  <td className="px-5 py-3 font-bold text-text-primary">{row.mes}</td>
                  <td className="px-5 py-3 text-right font-mono font-bold text-text-primary">{formatBRL(row.vendas)}</td>
                  <td className="px-5 py-3 text-center"><DeltaBadge pct={row.cresc_vendas} /></td>
                  <td className="px-5 py-3 text-right font-bold text-text-primary">{row.qtde}</td>
                  <td className="px-5 py-3 text-center"><DeltaBadge pct={row.cresc_qtde} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* ROW 1 */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-4 flex flex-col justify-between hover:border-success/50 transition-colors">
          <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
            <DollarSign size={14} className="text-success" /> Receita Total
          </div>
          <div>
            <div className="text-xl font-extrabold text-text-primary mb-1">{formatBRL(94744.50)}</div>
            <div className="flex items-center gap-1 text-[10px] text-success font-bold"><TrendingUp size={12}/> 32.9% <span className="font-medium text-text-muted">vs período anterior</span></div>
          </div>
        </div>
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-4 flex flex-col justify-between hover:border-danger/50 transition-colors">
          <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
            <DollarSign size={14} className="text-danger" /> Custo
          </div>
          <div>
            <div className="text-xl font-extrabold text-text-primary mb-1">{formatBRL(42326.50)}</div>
            <div className="text-[10px] text-text-muted">Custo das vendas</div>
          </div>
        </div>
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-4 flex flex-col justify-between hover:border-brand-500/50 transition-colors">
          <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
            <Target size={14} className="text-brand-500" /> Margem
          </div>
          <div>
            <div className="text-xl font-extrabold text-text-primary mb-1">55,3%</div>
            <div className="text-[10px] text-text-muted">Rentabilidade bruta</div>
          </div>
        </div>
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
            <Box size={14} className="text-warning" /> Volume de Pedidos
          </div>
          <div>
            <div className="text-xl font-extrabold text-text-primary mb-1">48</div>
            <div className="text-[10px] text-text-muted">Pedidos no período</div>
          </div>
        </div>
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
            <ShoppingCart size={14} className="text-purple-500" /> Ticket Médio
          </div>
          <div>
            <div className="text-xl font-extrabold text-text-primary mb-1">{formatBRL(1973.84)}</div>
            <div className="text-[10px] text-text-muted">Valor médio por pedido</div>
          </div>
        </div>

        {/* ROW 2 */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
            <Award size={14} className="text-blue-500" /> Principal Cliente
          </div>
          <div>
            <div className="text-sm font-extrabold text-text-primary mb-1 leading-tight break-words">NORTH FACE LOGÍSTICA E TRANSPORTES LTDA</div>
            <div className="text-[10px] text-text-muted mt-2">Maior comprador</div>
          </div>
        </div>
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
            <MapPin size={14} className="text-text-secondary" /> Cidade Destaque
          </div>
          <div>
            <div className="text-xl font-extrabold text-text-primary mb-1">N/A</div>
            <div className="text-[10px] text-text-muted">Mais vendas no período</div>
          </div>
        </div>
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
            <Users size={14} className="text-brand-500" /> Vendedor Destaque
          </div>
          <div>
            <div className="text-xl font-extrabold text-text-primary mb-1">ARAL</div>
            <div className="text-[10px] text-text-muted">Maior volume na marca</div>
          </div>
        </div>
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
            <Box size={14} className="text-text-secondary" /> SKUs Vendidos
          </div>
          <div>
            <div className="text-xl font-extrabold text-text-primary mb-1">2</div>
            <div className="text-[10px] text-text-muted">Produtos distintos</div>
          </div>
        </div>
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
            <Building2 size={14} className="text-purple-500" /> Clientes Ativos
          </div>
          <div>
            <div className="text-xl font-extrabold text-text-primary mb-1">40</div>
            <div className="text-[10px] text-text-muted">Compraram no período</div>
          </div>
        </div>
      </div>

      {/* TOP 3 PRODUTOS EM VENDAS */}
      <div>
        <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
          <Award size={18} className="text-warning" /> Top 3 Produtos em Vendas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1st Place */}
          <div className="bg-bg-primary border border-warning/30 shadow-card rounded-xl p-5 relative overflow-hidden group hover:border-warning transition-colors">
             <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Award size={64} className="text-warning" />
             </div>
             <div className="flex items-center gap-2 mb-3">
               <div className="w-6 h-6 rounded-full bg-warning flex items-center justify-center text-white text-xs font-bold">1</div>
               <span className="text-xs font-bold text-warning uppercase tracking-wider">1º Lugar</span>
             </div>
             <div className="text-sm font-bold text-text-primary mb-6 pr-8 truncate" title="COMP NAVAL 18MM 7,10 X 2,50 M">COMP NAVAL 18MM 7,10 X 2,50 M</div>
             <div className="flex justify-between items-end border-t border-divider/50 pt-4 mt-auto">
                <div>
                   <div className="text-[10px] text-text-muted uppercase font-bold tracking-wider mb-1">Volume</div>
                   <div className="text-sm font-bold text-text-primary">59 un.</div>
                </div>
                <div className="text-right">
                   <div className="text-[10px] text-text-muted uppercase font-bold tracking-wider mb-1">Receita</div>
                   <div className="text-lg font-extrabold text-success">{formatBRL(74234.50)}</div>
                </div>
             </div>
          </div>

          {/* 2nd Place */}
          <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 relative overflow-hidden group hover:border-text-secondary transition-colors">
             <div className="flex items-center gap-2 mb-3">
               <div className="w-6 h-6 rounded-full bg-text-secondary flex items-center justify-center text-white text-xs font-bold">2</div>
               <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">2º Lugar</span>
             </div>
             <div className="text-sm font-bold text-text-primary mb-6 pr-8 truncate" title="COMP NAVAL 18MM 8,00 X 2,50 M">COMP NAVAL 18MM 8,00 X 2,50 M</div>
             <div className="flex justify-between items-end border-t border-divider/50 pt-4 mt-auto">
                <div>
                   <div className="text-[10px] text-text-muted uppercase font-bold tracking-wider mb-1">Volume</div>
                   <div className="text-sm font-bold text-text-primary">15 un.</div>
                </div>
                <div className="text-right">
                   <div className="text-[10px] text-text-muted uppercase font-bold tracking-wider mb-1">Receita</div>
                   <div className="text-lg font-extrabold text-text-primary">{formatBRL(20510.00)}</div>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* EVOLUÇÃO DE VENDAS NO PERÍODO (ComposedChart) */}
      <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider">Evolução de Vendas no Período</h3>
          <div className="bg-bg-secondary border border-border rounded-lg px-3 py-1 flex items-center gap-2 text-xs font-medium">
             Gráfico de Barras <ChevronDown size={14} className="text-text-muted" />
          </div>
        </div>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.3} />
              <XAxis dataKey="mes" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="left" tickFormatter={(v) => formatBRLCompact(v)} tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-bg-tertiary)', opacity: 0.3 }} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '20px' }} iconType="circle" />
              <Bar yAxisId="left" dataKey="valor" name="Valor Total" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Line yAxisId="right" type="monotone" dataKey="qtde" name="Quantidade" stroke="#10B981" strokeWidth={2} dot={{ r: 4, fill: '#10B981', strokeWidth: 0 }} />
              <Line yAxisId="right" type="monotone" dataKey="margem" name="Margem (%)" stroke="#F59E0B" strokeWidth={2} dot={{ r: 4, fill: '#F59E0B', strokeWidth: 0 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* RANKING DE PRODUTOS VENDIDOS */}
      <div className="bg-bg-primary border border-border shadow-card rounded-xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-divider flex justify-between items-center">
          <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider">Ranking de Produtos Vendidos</h3>
          <div className="bg-bg-secondary border border-border rounded-lg px-3 py-1 flex items-center gap-2 text-xs font-medium">
             Top 30 <ChevronDown size={14} className="text-text-muted" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-bg-secondary/30 text-[10px] text-text-muted uppercase font-bold tracking-wider">
                <th className="px-5 py-3 w-16">POS</th>
                <th className="px-5 py-3">PRODUTO</th>
                <th className="px-5 py-3 text-right">QTDE. VENDIDA</th>
                <th className="px-5 py-3 text-right">VALOR TOTAL (R$)</th>
                <th className="px-5 py-3 text-right">PARTICIPAÇÃO (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider/30 text-xs">
              <tr className="hover:bg-bg-secondary/50 transition-colors">
                <td className="px-5 py-3 font-bold text-text-muted">1º</td>
                <td className="px-5 py-3 font-bold text-text-primary">COMP NAVAL 18MM 7,10 X 2,50 M</td>
                <td className="px-5 py-3 text-right font-medium text-text-primary">59</td>
                <td className="px-5 py-3 text-right font-mono font-bold text-text-primary">{formatBRL(74234.50)}</td>
                <td className="px-5 py-3 text-right font-bold text-text-secondary">78,4%</td>
              </tr>
              <tr className="hover:bg-bg-secondary/50 transition-colors">
                <td className="px-5 py-3 font-bold text-text-muted">2º</td>
                <td className="px-5 py-3 font-bold text-text-primary">COMP NAVAL 18MM 8,00 X 2,50 M</td>
                <td className="px-5 py-3 text-right font-medium text-text-primary">15</td>
                <td className="px-5 py-3 text-right font-mono font-bold text-text-primary">{formatBRL(20510.00)}</td>
                <td className="px-5 py-3 text-right font-bold text-text-secondary">21,6%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* INTELIGÊNCIA DE NEGOCIAÇÃO */}
      <div className="mt-8">
        <h3 className="font-bold text-text-primary text-base flex items-center gap-2 mb-4">
          <ShieldCheck size={20} className="text-brand-500" /> Inteligência de Negociação
        </h3>
        
        <div className="bg-bg-primary border border-border shadow-card rounded-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-divider">
            <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider">Recomendações Estratégicas</h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="bg-success/5 border border-success/20 rounded-lg p-4 flex gap-4">
              <div className="mt-0.5"><TrendingUp size={18} className="text-success" /></div>
              <div>
                <h4 className="font-bold text-success text-sm mb-1">Tendência de Crescimento Forte</h4>
                <p className="text-sm text-text-secondary">A marca cresceu 32.9%. Ótimo momento para negociar maiores volumes de compra com desconto.</p>
              </div>
            </div>
            <div className="bg-success/5 border border-success/20 rounded-lg p-4 flex gap-4">
              <div className="mt-0.5"><Target size={18} className="text-success" /></div>
              <div>
                <h4 className="font-bold text-success text-sm mb-1">Rentabilidade Elevada</h4>
                <p className="text-sm text-text-secondary">A marca apresenta excelente margem de lucro médio. Considere realizar campanhas de incentivo para a equipe de vendas focar nestes produtos.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
