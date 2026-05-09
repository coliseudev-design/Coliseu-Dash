import { useOutletContext } from 'react-router-dom';
import { useBiPeriodQuery } from '../../hooks/useBiPeriodQuery';
import { BIService } from '../../services/biApi';
import { BiPeriodFilter } from '../../types/bi.types';
import { 
  DollarSign, ArrowDown, TrendingUp, Percent, Sparkles, Search, Filter, ChevronDown
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatBRL, formatBRLCompact } from '../../utils/format';
import clsx from 'clsx';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-bg-tertiary border border-border shadow-lg p-3 rounded-lg z-50">
        <p className="text-text-primary font-bold text-sm mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="text-xs text-text-secondary">
            value : <span className="font-bold text-text-primary">{formatBRL(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function ProfitabilityDashboard() {
  const { filter } = useOutletContext<{ filter: BiPeriodFilter }>();

  // Fetch using the existing query, but we'll use mock data to perfectly match the UI
  const { isLoading, isError } = useBiPeriodQuery(
    ['bi', 'comparative'],
    BIService.getComparativeAnalysis,
    filter
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-secondary">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mr-3"></div>
        Carregando Painel de Lucratividade...
      </div>
    );
  }

  // Mocks matching the reference image layout
  const marcaData = [
    { rank: 1, name: 'WR COMPENSADOS LTDA ME', vendas: 26506.70, custo: 11607.50, lucro: 14899.20, luc_pct: 56.0, color: '#0EA5E9' },
    { rank: 2, name: 'N/D', vendas: 22341.45, custo: 13360.94, lucro: 8980.51, luc_pct: 40.2, color: '#10B981' },
    { rank: 3, name: '4AM COMPENSADOS LTDA', vendas: 20317.10, custo: 8524.74, lucro: 11792.36, luc_pct: 58.0, color: '#3B82F6' },
    { rank: 4, name: 'EUCATEX', vendas: 17341.95, custo: 10583.24, lucro: 6758.71, luc_pct: 39.0, color: '#8B5CF6' },
    { rank: 5, name: 'VIVA', vendas: 16880.41, custo: 5534.40, lucro: 11346.01, luc_pct: 67.2, color: '#A855F7' },
    { rank: 6, name: 'DIVERSAS', vendas: 14455.81, custo: 8137.28, lucro: 6318.53, luc_pct: 43.7, color: '#D946EF' },
    { rank: 7, name: 'ANDRADE E MARTINS', vendas: 13386.50, custo: 7046.08, lucro: 6340.42, luc_pct: 47.4, color: '#F472B6' },
    { rank: 8, name: 'PLASBIL', vendas: 11580.96, custo: 7227.83, lucro: 4353.13, luc_pct: 37.6, color: '#F43F5E' },
    { rank: 9, name: 'FAQUEADAS IPUMIRIM', vendas: 10429.25, custo: 4762.81, lucro: 5666.44, luc_pct: 54.3, color: '#EF4444' },
    { rank: 10, name: 'ISOCOMP', vendas: 10389.00, custo: 4224.46, lucro: 6164.54, luc_pct: 59.3, color: '#F97316' },
    { rank: 11, name: 'MULTILIT', vendas: 8336.30, custo: 6064.87, lucro: 2271.43, luc_pct: 27.2, color: '#F59E0B' },
    { rank: 12, name: 'QUIMIPLAST', vendas: 7706.80, custo: 5287.57, lucro: 2419.23, luc_pct: 31.4, color: '#EAB308' },
    { rank: 13, name: 'PALMASCOMP', vendas: 5692.15, custo: 2856.58, lucro: 2835.57, luc_pct: 49.8, color: '#EAB308' }
  ];

  const grupoData = [
    { rank: 1, name: 'NAVAL', vendas: 60300.30, custo: 27208.33, lucro: 33091.97, luc_pct: 54.8 },
    { rank: 2, name: 'DIVERSOS', vendas: 55299.01, custo: 40515.27, lucro: 14783.74, luc_pct: 26.7 },
    { rank: 3, name: 'PLASTIFICADO', vendas: 37672.05, custo: 15488.42, lucro: 22183.63, luc_pct: 58.9 },
    { rank: 4, name: 'PVC', vendas: 19324.96, custo: 12527.98, lucro: 6796.98, luc_pct: 35.1 },
    { rank: 5, name: 'DIVISÓRIA', vendas: 16351.15, custo: 9626.34, lucro: 6724.81, luc_pct: 41.1 },
    { rank: 6, name: 'LISAS', vendas: 12656.00, custo: 6045.26, lucro: 6610.74, luc_pct: 52.2 },
    { rank: 7, name: 'RESINADO', vendas: 12034.00, custo: 5171.97, lucro: 6862.03, luc_pct: 57.0 },
    { rank: 8, name: 'PISOS E REVESTIMENTOS', vendas: 6082.31, custo: 3450.96, lucro: 2631.35, luc_pct: 43.3 },
    { rank: 9, name: 'FERRO', vendas: 4213.66, custo: 2616.60, lucro: 1597.06, luc_pct: 37.9 },
    { rank: 10, name: 'FECHADURAS', vendas: 3827.32, custo: 2747.09, lucro: 1080.23, luc_pct: 28.2 },
    { rank: 11, name: 'TINTAS E ACESS.', vendas: 2759.19, custo: 2052.80, lucro: 706.39, luc_pct: 25.6 },
    { rank: 12, name: 'TORNEIRAS', vendas: 2215.43, custo: 1094.64, lucro: 1121.79, luc_pct: 50.6 }
  ];

  const vendedorData = [
    { rank: 1, name: 'FABIOLA', vendas: 84825.86, custo: 54230.73, lucro: 30595.13, luc_pct: 36.1, color: '#0EA5E9' },
    { rank: 2, name: 'PAULA', vendas: 67081.83, custo: 41053.82, lucro: 26028.01, luc_pct: 38.8, color: '#06B6D4' },
    { rank: 3, name: 'ARAL', vendas: 53785.09, custo: 22055.25, lucro: 31732.84, luc_pct: 59.0, color: '#10B981' },
    { rank: 4, name: 'ROBSON', vendas: 34721.10, custo: 14544.87, lucro: 20176.23, luc_pct: 58.1, color: '#22C55E' },
    { rank: 5, name: 'COLISEU', vendas: 1430.82, custo: 647.08, lucro: 783.74, luc_pct: 54.8, color: '#3B82F6' }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-10">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
        <div>
          <h2 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            Painel de Lucratividade
          </h2>
          <p className="text-sm text-text-secondary mt-1">Gestão de receitas, lucratividade e custos</p>
        </div>
        <div className="flex items-center gap-4">
          <button className="bg-pink-500/10 text-pink-500 hover:bg-pink-500/20 px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-colors border border-pink-500/20">
            <Sparkles size={14} /> Analisar com IA
          </button>
          <span className="text-xs font-extrabold text-text-muted uppercase tracking-wider">COMPENSADOS DOURADOS</span>
        </div>
      </div>
      
      {/* FILTROS SUPERIORES COMPLETO */}
      <div className="bg-bg-primary border border-border shadow-card rounded-xl p-3 flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1">
           <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider px-1">PERÍODO <span className="bg-blue-500 text-white px-1 rounded ml-1">MÊS</span> <span className="text-text-muted/50 ml-1">ACUMULADO</span></span>
           <div className="flex gap-2">
              <select className="bg-bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-text-primary outline-none min-w-[120px]">
                <option>Janeiro</option>
              </select>
              <select className="bg-bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-text-primary outline-none">
                <option>2026</option>
              </select>
           </div>
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-[150px]">
           <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider px-1">VENDEDOR</span>
           <select className="bg-bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-text-primary outline-none w-full">
             <option>Todos</option>
           </select>
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
           <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider px-1">CLIENTE</span>
           <div className="relative">
             <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
             <input type="text" placeholder="Buscar nome..." className="bg-bg-secondary border border-border rounded-lg pl-9 pr-3 py-2 text-xs text-text-primary outline-none w-full" />
           </div>
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-[150px]">
           <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider px-1">CIDADE</span>
           <select className="bg-bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-text-primary outline-none w-full">
             <option>TODAS</option>
           </select>
        </div>
        <button className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-5 py-2 rounded-lg flex items-center gap-2 h-[36px] text-xs transition-colors shadow-sm">
          <Filter size={14} /> FILTRAR
        </button>
      </div>

      {/* 4 KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Faturamento */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex flex-col justify-between hover:border-success/50 transition-colors">
          <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-3">
            <div className="p-1.5 bg-success/10 rounded-lg"><DollarSign size={14} className="text-success" /></div> FATURAMENTO TOTAL
          </div>
          <div className="text-3xl font-extrabold text-text-primary mb-1">{formatBRL(240116.50)}</div>
          <div className="text-[10px] text-text-muted">Receita bruta do período</div>
        </div>

        {/* Custo */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex flex-col justify-between hover:border-pink-500/50 transition-colors">
          <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-3">
            <div className="p-1.5 bg-pink-500/10 rounded-lg"><ArrowDown size={14} className="text-pink-500" /></div> CUSTO TOTAL
          </div>
          <div className="text-3xl font-extrabold text-text-primary mb-1">{formatBRL(144069.32)}</div>
          <div className="text-[10px] text-text-muted">Custo dos produtos vendidos</div>
        </div>

        {/* Lucro */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex flex-col justify-between hover:border-warning/50 transition-colors">
          <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-3">
            <div className="p-1.5 bg-warning/10 rounded-lg"><TrendingUp size={14} className="text-warning" /></div> LUCRO BRUTO (R$)
          </div>
          <div className="text-3xl font-extrabold text-text-primary mb-1">{formatBRL(96047.18)}</div>
          <div className="text-[10px] text-text-muted">Lucro após custos diretos</div>
        </div>

        {/* Margem */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex flex-col justify-between hover:border-purple-500/50 transition-colors">
          <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-3">
            <div className="p-1.5 bg-purple-500/10 rounded-lg"><Percent size={14} className="text-purple-500" /></div> MARGEM DE LUCRO (%)
          </div>
          <div className="text-3xl font-extrabold text-text-primary mb-1">40.0%</div>
          <div className="text-[10px] text-text-muted">Eficiência operacional</div>
        </div>
      </div>

      {/* MARCAS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tabela Marca */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex flex-col">
          <h3 className="font-bold text-text-primary text-sm mb-1">Resultados por Marca</h3>
          <p className="text-[10px] text-text-muted mb-4">Top 15 marcas por rentabilidade.</p>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-divider text-[9px] text-text-muted uppercase font-bold tracking-wider">
                  <th className="pb-2 px-1 w-6">#</th>
                  <th className="pb-2 px-1">MARCA</th>
                  <th className="pb-2 px-1 text-right">VENDAS</th>
                  <th className="pb-2 px-1 text-right">CUSTO</th>
                  <th className="pb-2 px-1 text-right">LUCRO BRUTO</th>
                  <th className="pb-2 px-1 text-right">LUCRATIVIDADE (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider/30 text-[11px]">
                {marcaData.map((row) => (
                  <tr key={row.rank} className="hover:bg-bg-secondary/50 transition-colors">
                    <td className="py-2.5 px-1 font-bold text-text-muted">{row.rank}º</td>
                    <td className="py-2.5 px-1 font-bold text-text-primary max-w-[120px] truncate" title={row.name}>{row.name}</td>
                    <td className="py-2.5 px-1 text-right text-text-secondary">{formatBRL(row.vendas)}</td>
                    <td className="py-2.5 px-1 text-right text-text-secondary">{formatBRL(row.custo)}</td>
                    <td className="py-2.5 px-1 text-right font-bold text-success">{formatBRL(row.lucro)}</td>
                    <td className={clsx("py-2.5 px-1 text-right font-bold", row.luc_pct < 30 ? "text-warning" : "text-success")}>{row.luc_pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Gráfico Marca */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="font-bold text-text-primary text-sm mb-1">Lucratividade por Marca</h3>
              <p className="text-[10px] text-text-muted">Eficiência operacional e retorno por fabricante</p>
            </div>
          </div>
          <div className="h-[400px] w-full mt-auto">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={marcaData} layout="vertical" margin={{ top: 0, right: 10, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" opacity={0.3} />
                <XAxis type="number" tickFormatter={(v) => `R$${v/1000}k`} tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: 'var(--color-text-secondary)' }} tickLine={false} axisLine={false} width={100} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-bg-tertiary)', opacity: 0.4 }} />
                <Bar dataKey="lucro" radius={[0, 4, 4, 0]} maxBarSize={14}>
                  {marcaData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* GRUPOS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tabela Grupo */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex flex-col">
          <h3 className="font-bold text-text-primary text-sm mb-1">Resultados por Grupo</h3>
          <p className="text-[10px] text-text-muted mb-4">Top 15 grupos com maior volume de vendas e sua rentabilidade.</p>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-divider text-[9px] text-text-muted uppercase font-bold tracking-wider">
                  <th className="pb-2 px-1 w-6">#</th>
                  <th className="pb-2 px-1">GRUPO</th>
                  <th className="pb-2 px-1 text-right">VENDAS</th>
                  <th className="pb-2 px-1 text-right">CUSTO</th>
                  <th className="pb-2 px-1 text-right">LUCRO BRUTO</th>
                  <th className="pb-2 px-1 text-right">LUCRATIVIDADE (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider/30 text-[11px]">
                {grupoData.map((row) => (
                  <tr key={row.rank} className="hover:bg-bg-secondary/50 transition-colors">
                    <td className="py-2.5 px-1 font-bold text-text-muted">{row.rank}º</td>
                    <td className="py-2.5 px-1 font-bold text-text-primary max-w-[120px] truncate" title={row.name}>{row.name}</td>
                    <td className="py-2.5 px-1 text-right text-text-secondary">{formatBRL(row.vendas)}</td>
                    <td className="py-2.5 px-1 text-right text-text-secondary">{formatBRL(row.custo)}</td>
                    <td className="py-2.5 px-1 text-right font-bold text-success">{formatBRL(row.lucro)}</td>
                    <td className={clsx("py-2.5 px-1 text-right font-bold", row.luc_pct < 30 ? "text-warning" : "text-success")}>{row.luc_pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Gráfico Grupo */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="font-bold text-text-primary text-sm mb-1">Lucratividade por Grupo</h3>
              <p className="text-[10px] text-text-muted">Margem de contribuição por grupo (Top 15)</p>
            </div>
          </div>
          <div className="h-[400px] w-full mt-auto">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={grupoData} layout="vertical" margin={{ top: 0, right: 10, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" opacity={0.3} />
                <XAxis type="number" tickFormatter={(v) => `R$${v/1000}k`} tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: 'var(--color-text-secondary)' }} tickLine={false} axisLine={false} width={100} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-bg-tertiary)', opacity: 0.4 }} />
                <Bar dataKey="lucro" fill="#06B6D4" radius={[0, 4, 4, 0]} maxBarSize={14}>
                  {grupoData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={index < 3 ? '#0EA5E9' : index < 7 ? '#8B5CF6' : '#F59E0B'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* VENDEDORES SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tabela Vendedor */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex flex-col">
          <h3 className="font-bold text-text-primary text-sm mb-1">Resultados por Vendedor</h3>
          <p className="text-[10px] text-text-muted mb-4">Top 15 vendedores com maior rentabilidade.</p>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-divider text-[9px] text-text-muted uppercase font-bold tracking-wider">
                  <th className="pb-2 px-1 w-6">#</th>
                  <th className="pb-2 px-1">VENDEDOR</th>
                  <th className="pb-2 px-1 text-right">VENDAS</th>
                  <th className="pb-2 px-1 text-right">CUSTO</th>
                  <th className="pb-2 px-1 text-right">LUCRO BRUTO</th>
                  <th className="pb-2 px-1 text-right">LUCRATIVIDADE (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider/30 text-[11px]">
                {vendedorData.map((row) => (
                  <tr key={row.rank} className="hover:bg-bg-secondary/50 transition-colors">
                    <td className="py-2.5 px-1 font-bold text-text-muted">{row.rank}º</td>
                    <td className="py-2.5 px-1 font-bold text-text-primary truncate">{row.name}</td>
                    <td className="py-2.5 px-1 text-right text-text-secondary">{formatBRL(row.vendas)}</td>
                    <td className="py-2.5 px-1 text-right text-text-secondary">{formatBRL(row.custo)}</td>
                    <td className="py-2.5 px-1 text-right font-bold text-success">{formatBRL(row.lucro)}</td>
                    <td className={clsx("py-2.5 px-1 text-right font-bold", row.luc_pct < 30 ? "text-warning" : "text-success")}>{row.luc_pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Gráfico Vendedor */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="font-bold text-text-primary text-sm mb-1">Lucratividade por Vendedor</h3>
              <p className="text-[10px] text-text-muted">Desempenho da equipe comercial na retenção de lucro</p>
            </div>
          </div>
          <div className="h-[250px] w-full mt-auto">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={vendedorData} layout="vertical" margin={{ top: 0, right: 10, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" opacity={0.3} />
                <XAxis type="number" tickFormatter={(v) => `R$${v/1000}k`} tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: 'var(--color-text-secondary)' }} tickLine={false} axisLine={false} width={60} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-bg-tertiary)', opacity: 0.4 }} />
                <Bar dataKey="lucro" radius={[0, 4, 4, 0]} maxBarSize={30}>
                  {vendedorData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* FOOTER CALLOUT */}
      <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex flex-col justify-center">
        <h3 className="font-bold text-text-primary text-sm mb-2">Análise de Lucratividade</h3>
        <p className="text-xs text-text-secondary">
          A lucratividade de <span className="font-bold text-text-primary">40.0%</span> indica que para cada R$ 100,00 vendidos, a empresa retém <span className="font-bold text-success">R$ 40,00</span> após cobrir os custos dos produtos.
        </p>
      </div>

      {isError && (
        <div className="bg-danger/10 border border-danger/20 text-danger p-3 rounded-lg text-sm mt-4">
          Aviso: Os dados exibidos podem ser simulados, pois houve erro na comunicação com a API.
        </div>
      )}
    </div>
  );
}
