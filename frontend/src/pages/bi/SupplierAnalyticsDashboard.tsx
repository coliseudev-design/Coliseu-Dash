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
import { PromptViewer } from '../../components/PromptViewer';

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
  const [selectedBrand, setSelectedBrand] = useState(''); // Default to empty (All Brands)

  const supplierFilter = { ...filter, marca: selectedBrand };

  const { data, isLoading } = useBiPeriodQuery(
    ['bi', 'supplier', selectedBrand],
    () => BIService.getSupplierAnalytics(supplierFilter),
    supplierFilter
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-secondary">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mr-3"></div>
        Carregando Hub do Fornecedor...
      </div>
    );
  }

  const performanceMensal = data?.monthly_performance || [];
  const chartData = data?.monthly_performance || [];
  const overview = data?.overview || { receita: 0, custo: 0, pedidos: 0, clientes: 0 };
  const topProducts = data?.top_products || [];
  const availableBrands = data?.available_brands || ['VHM TRACTOR'];
  const margem = overview.receita > 0 ? ((overview.receita - overview.custo) / overview.receita) * 100 : 0;
  const ticketMedio = overview.pedidos > 0 ? overview.receita / overview.pedidos : 0;

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
             <div className="flex items-center gap-1"><span className="text-brand-500">🏢</span> Marca Analisada: <span className="text-brand-500">{selectedBrand}</span></div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select 
            className="bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-brand-500 max-w-[250px]"
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
          >
            <option value="">Todas as Marcas</option>
            {availableBrands.map((b: string) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
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
            <h2 className="text-2xl font-extrabold tracking-tight">{selectedBrand || 'Todas as Marcas'}</h2>
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
            <span className="text-xl font-extrabold text-white">-</span>
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

      {activeTab === 'Visão Geral de Vendas' && (
        <div className="space-y-6 animate-in fade-in duration-300">
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
            <div className="text-xl font-extrabold text-text-primary mb-1">{formatBRL(overview.receita)}</div>
            <div className="flex items-center gap-1 text-[10px] text-text-muted font-bold">Baseado nas vendas da marca</div>
          </div>
        </div>
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-4 flex flex-col justify-between hover:border-danger/50 transition-colors">
          <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
            <DollarSign size={14} className="text-danger" /> Custo
          </div>
          <div>
            <div className="text-xl font-extrabold text-text-primary mb-1">{formatBRL(overview.custo)}</div>
            <div className="text-[10px] text-text-muted">Custo das vendas</div>
          </div>
        </div>
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-4 flex flex-col justify-between hover:border-brand-500/50 transition-colors">
          <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
            <Target size={14} className="text-brand-500" /> Margem
          </div>
          <div>
            <div className="text-xl font-extrabold text-text-primary mb-1">{margem.toFixed(1)}%</div>
            <div className="text-[10px] text-text-muted">Rentabilidade bruta</div>
          </div>
        </div>
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
            <Box size={14} className="text-warning" /> Volume de Pedidos
          </div>
          <div>
            <div className="text-xl font-extrabold text-text-primary mb-1">{overview.pedidos}</div>
            <div className="text-[10px] text-text-muted">Pedidos no período</div>
          </div>
        </div>
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
            <ShoppingCart size={14} className="text-purple-500" /> Ticket Médio
          </div>
          <div>
            <div className="text-xl font-extrabold text-text-primary mb-1">{formatBRL(ticketMedio)}</div>
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
            <div className="text-xl font-extrabold text-text-primary mb-1">N/A</div>
            <div className="text-[10px] text-text-muted">Maior volume na marca</div>
          </div>
        </div>
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
            <Box size={14} className="text-text-secondary" /> SKUs Vendidos
          </div>
          <div>
            <div className="text-xl font-extrabold text-text-primary mb-1">{topProducts.length}</div>
            <div className="text-[10px] text-text-muted">Produtos distintos</div>
          </div>
        </div>
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
            <Building2 size={14} className="text-purple-500" /> Clientes Ativos
          </div>
          <div>
            <div className="text-xl font-extrabold text-text-primary mb-1">{overview.clientes}</div>
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
          {topProducts.slice(0, 3).map((prod, index) => {
             const isFirst = index === 0;
             const isSecond = index === 1;
             const isThird = index === 2;
             
             let colors = {
                 border: isFirst ? 'border-warning/30' : isSecond ? 'border-text-secondary/30' : 'border-[#b08d57]/30',
                 hover: isFirst ? 'hover:border-warning' : isSecond ? 'hover:border-text-secondary' : 'hover:border-[#b08d57]',
                 bg: isFirst ? 'bg-warning' : isSecond ? 'bg-text-secondary' : 'bg-[#b08d57]',
                 text: isFirst ? 'text-warning' : isSecond ? 'text-text-secondary' : 'text-[#b08d57]',
                 label: isFirst ? '1º Lugar' : isSecond ? '2º Lugar' : '3º Lugar'
             };

             return (
               <div key={index} className={`bg-bg-primary border ${colors.border} shadow-card rounded-xl p-5 relative overflow-hidden group ${colors.hover} transition-colors`}>
                  {isFirst && (
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                       <Award size={64} className="text-warning" />
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-6 h-6 rounded-full ${colors.bg} flex items-center justify-center text-white text-xs font-bold`}>{index + 1}</div>
                    <span className={`text-xs font-bold ${colors.text} uppercase tracking-wider`}>{colors.label}</span>
                  </div>
                  <div className="text-sm font-bold text-text-primary mb-6 pr-8 truncate" title={prod.name}>{prod.name}</div>
                  <div className="flex justify-between items-end border-t border-divider/50 pt-4 mt-auto">
                     <div>
                        <div className="text-[10px] text-text-muted uppercase font-bold tracking-wider mb-1">Volume</div>
                        <div className="text-sm font-bold text-text-primary">{prod.volume} un.</div>
                     </div>
                     <div className="text-right">
                        <div className="text-[10px] text-text-muted uppercase font-bold tracking-wider mb-1">Receita</div>
                        <div className={`text-lg font-extrabold ${isFirst ? 'text-success' : 'text-text-primary'}`}>{formatBRL(prod.receita)}</div>
                     </div>
                  </div>
               </div>
             );
          })}
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
              {topProducts.map((prod: any, idx: number) => (
                <tr key={idx} className="hover:bg-bg-secondary/50 transition-colors">
                  <td className="px-5 py-3 font-bold text-text-muted">{prod.rank}º</td>
                  <td className="px-5 py-3 font-bold text-text-primary">{prod.name}</td>
                  <td className="px-5 py-3 text-right font-medium text-text-primary">{prod.volume}</td>
                  <td className="px-5 py-3 text-right font-mono font-bold text-text-primary">{formatBRL(prod.receita)}</td>
                  <td className="px-5 py-3 text-right font-bold text-text-secondary">
                    {overview.receita > 0 ? ((prod.receita / overview.receita) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
              ))}
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
  )}
      {activeTab === 'Ranking de Marcas' && (
        <PromptViewer 
          title="Gerador de Análise: Ranking de Marcas"
          description="Prompt estruturado para análise de desempenho de marcas via Inteligência Artificial."
          prompt={`Atue como um Especialista Sênior em Ciência de Dados, Vendas e Finanças. Sua tarefa é analisar o desempenho de vendas das marcas no período selecionado e gerar um relatório de "Ranking de Marcas" estruturado, visualmente atraente e focado em insights acionáveis.

Diretrizes de Formatação e Conteúdo:
• Utilize formatação Markdown avançada, incluindo tabelas bem estruturadas, negrito para métricas-chave e ícones representativos (🏆, 📈, ⚠️, 🎯).
• Divida a análise em seções claras: Visão Geral, Top 10 Marcas, Foco na Marca Selecionada e Recomendações Estratégicas.
• Não mencione o nome da nossa empresa na análise.

Dados Necessários:
• Marca Selecionada no Filtro: ${selectedBrand || 'Todas as Marcas'}
• Total de Receita do Período: ${formatBRL(overview.receita)}
• Top Produtos da Marca/Geral:
${topProducts.slice(0, 10).map((p: any) => `  - ${p.rank}º ${p.name}: ${p.volume} un. | ${formatBRL(p.receita)}`).join('\n')}

Estrutura da Resposta Esperada:
1. 🏆 Top 10 Marcas Mais Vendidas: Apresente uma tabela detalhada com as 10 principais marcas.
2. 🎯 Análise da Marca Selecionada (${selectedBrand || 'Todas as Marcas'}):
   • Se a marca estiver no Top 10, destaque seu desempenho, pontos fortes e motivos do sucesso.
   • Se a marca NÃO estiver no Top 10, informe claramente sua posição atual, apresente suas métricas e forneça uma análise de por que ela está fora do topo, incluindo alertas (⚠️) sobre queda de vendas ou perda de market share.
3. 💡 Recomendações Estratégicas: Forneça de 2 a 3 sugestões práticas para melhorar o posicionamento da marca selecionada ou alavancar ainda mais as líderes. Inclua "Parabéns" (🎉) para desempenhos excepcionais.`}
        />
      )}

      {activeTab === 'Análise de Estoque' && (
        <PromptViewer 
          title="Gerador de Análise: Diagnóstico de Estoque"
          description="Prompt focado na avaliação de capital imobilizado, oportunidades de margem e giro."
          prompt={`Atue como um Especialista Sênior em Gestão de Estoque, Finanças e Supply Chain. Sua tarefa é realizar um diagnóstico financeiro e quantitativo do inventário atual, gerando um relatório de "Análise de Estoque" estruturado, direto e visualmente atrativo.

Diretrizes de Formatação e Conteúdo:
• Utilize formatação Markdown avançada, com tabelas de resumo financeiro, indicadores em destaque e ícones (📦, 💰, 📊, 🚨).
• Separe os insights em categorias: Saúde Financeira do Estoque, Alertas de Risco e Oportunidades de Margem.
• Não mencione o nome da nossa empresa.

Dados Necessários:
• Total de Custo do Estoque: ${formatBRL(overview.custo)} (Ref. Vendas)
• Total de Preço de Venda (Receita Potencial): ${formatBRL(overview.receita)}
• Quantidade Total de Produtos Físicos: ${topProducts.reduce((acc: number, p: any) => acc + p.volume, 0)} unidades vendidas
• Margem Bruta Potencial Projetada: ${margem.toFixed(1)}%

Estrutura da Resposta Esperada:
1. 📊 Resumo Financeiro do Inventário: Apresente os totais de custo, valor de venda potencial e quantidade de itens em um formato de "cards" textuais ou tabela de alto impacto.
2. 💰 Análise de Rentabilidade: Calcule e comente sobre a margem bruta potencial. O estoque atual representa uma boa oportunidade de lucro?
3. 🚨 Alertas e Otimizações: Identifique possíveis riscos de capital imobilizado (baseado no volume total) e sugira ações para acelerar o giro de estoque e maximizar o retorno sobre o custo.`}
        />
      )}

      {activeTab === 'Catálogo' && (
        <PromptViewer 
          title="Gerador de Análise: Revisão de Catálogo"
          description="Prompt estruturado para análise de catálogo e estratégias de precificação por IA."
          prompt={`Atue como um Analista Sênior de Produtos e Precificação. Sua tarefa é estruturar e analisar a lista de produtos disponíveis, gerando um "Catálogo" detalhado, organizado e fácil de consultar para a equipe comercial.

Diretrizes de Formatação e Conteúdo:
• Utilize formatação Markdown, priorizando uma tabela abrangente e limpa.
• Inclua ícones de status para facilitar a visualização (🟢 Estoque Alto, 🟡 Estoque Médio, 🔴 Estoque Baixo/Crítico).
• Não mencione o nome da nossa empresa.

Dados Necessários:
Lista de Produtos Base:
${topProducts.slice(0, 15).map((p: any) => `- SKU_${p.rank} | ${p.name} | Receita: ${formatBRL(p.receita)} | Vol: ${p.volume}`).join('\n')}

Estrutura da Resposta Esperada:
1. 📋 Catálogo Geral de Produtos: Apresente a lista completa em uma tabela Markdown formatada com as colunas: | Código | Descrição | Preço de Custo | Preço de Venda | Margem Bruta (%) | Estoque Atual | Status |.
   *Nota para a IA: Como os dados de custo/preço individuais estão omitidos na amostra, crie estimativas lógicas com base na Receita e Volume fornecidos para simular o cenário.*
2. 🎯 Destaques do Catálogo:
   • Destaque o produto com a maior margem de lucro.
   • Destaque o produto com o maior volume em estoque.
3. 💡 Sugestões de Ação: Recomende brevemente ações promocionais para itens com alto estoque e ações de reposição para itens críticos.`}
        />
      )}

    </div>
  );
}
