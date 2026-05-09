import { useOutletContext } from 'react-router-dom';
import { useBiPeriodQuery } from '../../hooks/useBiPeriodQuery';
import { BIService } from '../../services/biApi';
import { BiPeriodFilter } from '../../types/bi.types';
import { TrendingUp, TrendingDown, DollarSign, Box, Target, Trophy } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell } from 'recharts';
import { formatBRL, formatBRLCompact, formatNum } from '../../utils/format';
import { CHART_COLORS } from '../../utils/chartColors';
import clsx from 'clsx';

// Badge Comparativo
const ComparisonBadge = ({ pct }: { pct: number }) => {
  const isUp = pct > 0;
  const isDown = pct < 0;
  return (
    <div className={clsx(
      "flex items-center text-xs font-bold px-2 py-1 rounded-md mt-1 w-fit",
      isUp ? "bg-success/10 text-success" : isDown ? "bg-danger/10 text-danger" : "bg-text-muted/10 text-text-muted"
    )}>
      {isUp && <TrendingUp size={14} className="mr-1" />}
      {isDown && <TrendingDown size={14} className="mr-1" />}
      {Math.abs(pct).toFixed(1)}%
    </div>
  );
};

// Delta Badge para Tabelas
const DeltaBadge = ({ pct }: { pct: number }) => {
  const isUp = pct > 0;
  const isDown = pct < 0;
  return (
    <div className={clsx(
      "flex items-center justify-end text-xs font-bold",
      isUp ? "text-success" : isDown ? "text-danger" : "text-text-muted"
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
      <div className="bg-bg-primary border border-border shadow-card-hover p-3 rounded-lg z-50">
        <p className="text-text-secondary text-xs mb-1 font-medium">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm font-bold" style={{ color: entry.color || 'var(--color-text-primary)' }}>
            {entry.name === 'total' || entry.name === 'valor' || entry.name === 'value'
              ? formatBRL(entry.value)
              : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function SalesIntelligenceDashboard() {
  const { filter } = useOutletContext<{ filter: BiPeriodFilter }>();

  const { data, isLoading } = useBiPeriodQuery(
    ['bi', 'sales-intelligence'],
    BIService.getSalesIntelligence,
    filter
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-secondary">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mr-3"></div>
        Carregando Inteligência de Vendas...
      </div>
    );
  }

  // Fallback Mocks baseados na imagem caso a API não retorne dados complexos
  const summary = data?.executive_summary || {
    faturamento: 240116.50, faturamento_anterior: 223838.93, crescimento_pct: 7.3,
    quantidade_pedidos: 337, quantidade_pedidos_anterior: 290, crescimento_pedidos_pct: 16.2,
    ticket_medio: 712.51, ticket_medio_anterior: 550.00, crescimento_ticket_pct: 29.5
  };

  // Mock: Trajetória da Receita
  const mockRevenueTrajectory = Array.from({ length: 30 }).map((_, i) => ({
    dia: `${i + 1} Ago`,
    valor: Math.random() * 15000 + 5000 + (i === 20 || i === 28 ? 20000 : 0) // Picos
  }));

  // Mock: Desempenho de Vendedores vs. Metas & Vendas por Vendedor
  const mockSellers = [
    { name: 'FABIOLA', value: 89600.75, metaPct: 98.6, metaStatus: 'A Bater', color: '#10B981' },
    { name: 'PAULA', value: 65200.32, metaPct: 100.0, metaStatus: 'Batida', color: '#3B82F6' },
    { name: 'ANA', value: 52314.50, metaPct: 33.8, metaStatus: 'A Bater', color: '#EF4444' },
    { name: 'MARCOS', value: 25078.43, metaPct: 34.9, metaStatus: 'A Bater', color: '#F59E0B' },
    { name: 'COLOGE', value: 3450.89, metaPct: 0.0, metaStatus: 'A Bater', color: '#8B5CF6' }
  ];

  // Mocks para Tabelas Duplas (Top Produtos, Top Marcas, Top Clientes)
  const mockTopProducts = [
    { rank: 1, name: 'COMP NAVAL 10MM X 3,50 M', current: 15106.10, prev: 14200.00, delta: 6.3 },
    { rank: 2, name: 'OLEO LUBRIF. AP 15W40 CI-4 / SL 20 LTS', current: 12500.00, prev: 10000.00, delta: 25.0 },
    { rank: 3, name: 'FILTRO DE AR JD 7500A', current: 9800.50, prev: 15000.00, delta: -34.6 },
    { rank: 4, name: 'CORREIA DENTADA MOTOR JD P 14', current: 8400.00, prev: 8000.00, delta: 5.0 },
    { rank: 5, name: 'BOMBA DAGUA 3P 220V', current: 7600.00, prev: 6000.00, delta: 26.6 },
    { rank: 6, name: 'ENGRENAGEM 12D S/CUBO', current: 6500.00, prev: 5000.00, delta: 30.0 },
    { rank: 7, name: 'BATERIA 150AH MOURA', current: 5400.00, prev: 6000.00, delta: -10.0 },
    { rank: 8, name: 'PNEU AGR. 12.4-24 TRACAO', current: 4800.00, prev: 4000.00, delta: 20.0 },
    { rank: 9, name: 'FAROL DE MILHA LED', current: 3500.00, prev: 3500.00, delta: 0.0 },
    { rank: 10, name: 'CABO DE AÇO 8MM', current: 2200.00, prev: 2500.00, delta: -12.0 },
  ];

  const mockTopBrands = [
    { rank: 1, name: 'TVH-TRACTOR IMP...', current: 125000.00, prev: 110000.00, delta: 13.6 },
    { rank: 2, name: 'JACTO MAQUINAS', current: 98000.00, prev: 120000.00, delta: -18.3 },
    { rank: 3, name: 'CAMBUCI METALURGICA', current: 85000.00, prev: 80000.00, delta: 6.2 },
    { rank: 4, name: 'DURAN LUBRIFICANTES', current: 65000.00, prev: 60000.00, delta: 8.3 },
    { rank: 5, name: 'CUNHA MAQUINAS', current: 55000.00, prev: 50000.00, delta: 10.0 },
  ];

  const mockTopClients = [
    { rank: 1, name: 'AO CONSUMIDOR', current: 45281.41, share: 18.8 },
    { rank: 2, name: 'AGROPECUARIA JD SA', current: 38500.00, share: 16.0 },
    { rank: 3, name: 'FAZENDA BOA VISTA', current: 32400.00, share: 13.4 },
    { rank: 4, name: 'TRANSPORTES DOURADOS', current: 28900.00, share: 12.0 },
    { rank: 5, name: 'USINA SÃO FERNANDO', current: 25600.00, share: 10.6 },
  ];

  // Helper colors for treemap/seller brands
  const brandColors = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* HEADER SECTION */}
      <div className="mb-2">
        <h2 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          Inteligência de Vendas
        </h2>
        <p className="text-sm text-text-secondary mt-1">Análise detalhada de vendas, ticket médio e performance</p>
      </div>

      {/* TOP KPIs - 3 BLOCKS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* FATURAMENTO */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-warning"></div>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-warning/10 text-warning rounded-lg">
              <DollarSign size={16} />
            </div>
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Faturamento Totais</span>
          </div>
          <div className="text-3xl font-extrabold text-text-primary pl-1 mb-1">
            {formatBRL(summary.faturamento)}
          </div>
          <ComparisonBadge pct={summary.crescimento_pct || 7.3} />
        </div>

        {/* VOLUME DE PEÇAS */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-success"></div>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-success/10 text-success rounded-lg">
              <Box size={16} />
            </div>
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Volume de Peças</span>
          </div>
          <div className="text-3xl font-extrabold text-text-primary pl-1 mb-1">
            {formatNum(summary.quantidade_pedidos || 337)}
          </div>
          <ComparisonBadge pct={summary.crescimento_pedidos_pct || 16.2} />
        </div>

        {/* TICKET MÉDIO */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-purple-500/10 text-purple-500 rounded-lg">
              <Target size={16} />
            </div>
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Ticket Médio</span>
          </div>
          <div className="text-3xl font-extrabold text-text-primary pl-1 mb-1">
            {formatBRL(summary.ticket_medio || 712.51)}
          </div>
          <ComparisonBadge pct={summary.crescimento_ticket_pct || 29.5} />
        </div>
      </div>

      {/* TRAJETÓRIA DA RECEITA */}
      <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp size={16} className="text-brand-500" />
          <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider">Trajetória da Receita</h3>
        </div>
        <p className="text-xs text-text-muted mb-6">Acompanhe a evolução diária da sua receita bruta e identifique tendências.</p>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mockRevenueTrajectory} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.3} />
              <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => formatBRLCompact(v)} tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="valor" stroke="#06B6D4" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#06B6D4', stroke: '#fff', strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* DESEMPENHO E VENDAS POR VENDEDOR */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* TABELA: DESEMPENHO */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <Trophy size={16} className="text-brand-500" />
            <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider">Desempenho de Vendedores vs. Metas</h3>
          </div>
          <p className="text-xs text-text-muted mb-4">Progresso de cada vendedor em relação à meta.</p>
          
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-divider text-xs text-text-muted">
                  <th className="pb-2 font-semibold">VENDEDOR</th>
                  <th className="pb-2 font-semibold text-right">VALOR DE VENDA</th>
                  <th className="pb-2 font-semibold text-center">% ATINGIMENTO (META)</th>
                  <th className="pb-2 font-semibold text-right">META</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider/50">
                {mockSellers.map((seller, i) => (
                  <tr key={i} className="hover:bg-bg-secondary transition-colors">
                    <td className="py-3 font-bold text-text-primary flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: seller.color }}></div>
                      {seller.name}
                    </td>
                    <td className="py-3 font-bold text-success text-right">{formatBRL(seller.value)}</td>
                    <td className="py-3 text-center">
                      <div className="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-bold" 
                           style={{ backgroundColor: `${seller.color}15`, color: seller.color }}>
                        {seller.metaPct.toFixed(1)}%
                      </div>
                    </td>
                    <td className="py-3 text-right">
                      <span className="text-[10px] uppercase font-bold text-text-muted">{seller.metaStatus}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* GRÁFICO: VENDAS POR VENDEDOR */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={16} className="text-brand-500" />
            <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider">Vendas por Vendedor</h3>
          </div>
          <p className="text-xs text-text-muted mb-6">Ranking de faturamento em formato visual.</p>
          
          <div className="flex-1 min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockSellers} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.3} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => formatBRLCompact(v)} tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={30}>
                  {mockSellers.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* TOP PRODUTOS (TABELA + GRÁFICO) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tabela */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <Box size={16} className="text-brand-500" />
            <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider">Top Produtos (Mês Atual vs Mês Anterior)</h3>
          </div>
          <p className="text-xs text-text-muted mb-4">Ranking de produtos com a maior variação e volume.</p>
          
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-divider text-[10px] text-text-muted uppercase font-bold tracking-wider">
                  <th className="pb-2 text-center w-8">#</th>
                  <th className="pb-2">Produto</th>
                  <th className="pb-2 text-right">Mês Atual</th>
                  <th className="pb-2 text-right">Mês Ant.</th>
                  <th className="pb-2 text-right">Delta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider/30 text-xs">
                {mockTopProducts.slice(0, 8).map((prod) => (
                  <tr key={prod.rank} className="hover:bg-bg-secondary transition-colors">
                    <td className="py-2 text-center text-text-muted">{prod.rank}</td>
                    <td className="py-2 font-semibold text-text-primary truncate max-w-[200px]" title={prod.name}>{prod.name}</td>
                    <td className="py-2 text-right font-mono font-bold text-text-primary">{formatBRL(prod.current)}</td>
                    <td className="py-2 text-right font-mono text-text-muted">{formatBRL(prod.prev)}</td>
                    <td className="py-2 text-right"><DeltaBadge pct={prod.delta} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Gráfico */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex flex-col">
          <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider mb-1">Top Produtos (Gráfico)</h3>
          <p className="text-xs text-text-muted mb-4">Visualização de faturamento de produtos.</p>
          
          <div className="flex-1 min-h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockTopProducts} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" opacity={0.3} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tickFormatter={(v) => String(v).length > 15 ? String(v).substring(0, 15) + '...' : v} tick={{ fontSize: 10, fill: 'var(--color-text-secondary)', fontWeight: 500 }} width={120} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-bg-tertiary)', opacity: 0.4 }} />
                <Bar dataKey="current" fill="#10B981" radius={[0, 4, 4, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* TOP MARCAS E TOP CLIENTES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* TOP MARCAS TABELA */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <Target size={16} className="text-brand-500" />
            <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider">Top Marcas</h3>
          </div>
          <p className="text-xs text-text-muted mb-4">Principais marcas em volume de faturamento.</p>
          
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-divider text-[10px] text-text-muted uppercase font-bold tracking-wider">
                  <th className="pb-2 text-center w-8">#</th>
                  <th className="pb-2">Marca</th>
                  <th className="pb-2 text-right">Faturamento</th>
                  <th className="pb-2 text-right">Delta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider/30 text-xs">
                {mockTopBrands.map((brand) => (
                  <tr key={brand.rank} className="hover:bg-bg-secondary transition-colors">
                    <td className="py-3 text-center text-text-muted">{brand.rank}</td>
                    <td className="py-3 font-semibold text-text-primary">{brand.name}</td>
                    <td className="py-3 text-right font-mono font-bold text-text-primary">{formatBRL(brand.current)}</td>
                    <td className="py-3 text-right"><DeltaBadge pct={brand.delta} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* TOP CLIENTES TABELA */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <Users size={16} className="text-brand-500" />
            <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider">Top Clientes</h3>
          </div>
          <p className="text-xs text-text-muted mb-4">Ranking dos maiores clientes do período.</p>
          
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-divider text-[10px] text-text-muted uppercase font-bold tracking-wider">
                  <th className="pb-2 text-center w-8">#</th>
                  <th className="pb-2">Cliente</th>
                  <th className="pb-2 text-right">Valor</th>
                  <th className="pb-2 text-right">% Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider/30 text-xs">
                {mockTopClients.map((client) => (
                  <tr key={client.rank} className="hover:bg-bg-secondary transition-colors">
                    <td className="py-3 text-center text-text-muted">{client.rank}</td>
                    <td className="py-3 font-semibold text-text-primary truncate max-w-[180px]">{client.name}</td>
                    <td className="py-3 text-right font-mono font-bold text-text-primary">{formatBRL(client.current)}</td>
                    <td className="py-3 text-right text-text-muted font-bold">{client.share}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* TOP 5 MARCAS POR VENDEDOR (Treemap/Flexbox Layout) */}
      <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5">
        <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider mb-1">Top 5 Marcas por Vendedor</h3>
        <p className="text-xs text-text-muted mb-6">Distribuição das marcas mais vendidas por cada consultor de vendas.</p>
        
        <div className="space-y-4">
          {mockSellers.map((seller, idx) => (
            <div key={idx} className="flex flex-col md:flex-row gap-4 p-4 border border-divider rounded-xl hover:bg-bg-secondary transition-colors">
              <div className="w-full md:w-48 flex flex-col justify-center">
                <span className="font-extrabold text-sm text-text-primary mb-1">{seller.name}</span>
                <span className="text-xl font-bold text-brand-500 font-mono">{formatBRL(seller.value)}</span>
                <span className="text-xs text-text-muted">Total Vendas</span>
              </div>
              <div className="flex-1 flex flex-wrap gap-2">
                {mockTopBrands.slice(0, 5).map((brand, bIdx) => {
                  // Simulate random share logic based on seller
                  const share = [45, 25, 15, 10, 5][bIdx];
                  const value = (seller.value * share) / 100;
                  return (
                    <div 
                      key={bIdx} 
                      className="p-3 rounded-lg border border-transparent shadow-sm flex flex-col justify-between"
                      style={{ 
                        flexGrow: share, 
                        flexBasis: `${Math.max(20, share)}%`,
                        backgroundColor: `${brandColors[bIdx]}15`,
                        borderColor: `${brandColors[bIdx]}30`
                      }}
                    >
                      <span className="text-[10px] font-bold text-text-secondary uppercase truncate" style={{ color: brandColors[bIdx] }}>{brand.name}</span>
                      <span className="text-sm font-extrabold text-text-primary">{formatBRL(value)}</span>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs font-bold text-text-muted">{share}%</span>
                        <span className="text-[10px] text-text-muted">Share</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
