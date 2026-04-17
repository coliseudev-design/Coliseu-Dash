import { useState } from 'react'
import { useApiQuery, usePeriodQuery } from '../hooks/useApi'
import KPICard from '../components/KPICard'
import DataTable from '../components/DataTable'
import ChartCard from '../components/ChartCard'
import PeriodFilter from '../components/PeriodFilter'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { formatNum, formatDateTime } from '../utils/format'
import { FileClock, Users, Hash, Filter } from 'lucide-react'
import { CHART_PALETTE } from '../utils/chartColors'

const OPERACOES = ['', 'INSERT', 'UPDATE', 'DELETE', 'SELECT', 'LOGIN', 'LOGOUT']

const OP_COLORS: Record<string, string> = {
  INSERT: 'success',
  UPDATE: 'info',
  DELETE: 'danger',
  SELECT: 'neutral',
  LOGIN: 'info',
  LOGOUT: 'neutral',
}

export default function LogPage() {
  const [user, setUser] = useState('')
  const [operation, setOperation] = useState('')

  const kpis = usePeriodQuery<any>('/log/kpis')
  const usuariosAtivos = usePeriodQuery<any>('/log/usuarios-ativos')
  const operFreq = usePeriodQuery<any>('/log/operacoes-frequentes')
  const atividades = useApiQuery<any>('/log/atividades', {
    user: user || undefined,
    operation: operation || undefined,
    limit: 300,
  })

  const k = kpis.data?.kpis

  return (
    <div className="space-y-6">
      <PeriodFilter />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          label="Total Operações"
          value={formatNum(k?.total_operacoes)}
          icon={FileClock}
          iconColor="text-brand-500"
          loading={kpis.isLoading}
        />
        <KPICard
          label="Usuários Ativos"
          value={formatNum(k?.usuarios_ativos)}
          icon={Users}
          iconColor="text-success"
          loading={kpis.isLoading}
        />
        <KPICard
          label="Operação + Frequente"
          value={k?.operacao_mais_frequente || '—'}
          icon={Hash}
          loading={kpis.isLoading}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard
          title="Usuários Mais Ativos"
          loading={usuariosAtivos.isLoading}
          empty={!usuariosAtivos.data?.data?.length}
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={usuariosAtivos.data?.data || []} layout="vertical" margin={{ left: 90 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#6B7280' }} />
                <YAxis type="category" dataKey="usuario" tick={{ fontSize: 11, fill: '#374151' }} width={140} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="operacoes" radius={[0, 6, 6, 0]}>
                  {(usuariosAtivos.data?.data || []).map((_: any, i: number) => (
                    <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Operações Mais Frequentes"
          loading={operFreq.isLoading}
          empty={!operFreq.data?.data?.length}
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={operFreq.data?.data || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="operacao" tick={{ fontSize: 11, fill: '#374151' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                  {(operFreq.data?.data || []).map((_: any, i: number) => (
                    <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="card !p-3 flex items-center gap-3 flex-wrap">
        <Filter size={16} className="text-text-secondary ml-1" />
        <input
          className="input !w-auto"
          placeholder="Filtrar por usuário..."
          value={user}
          onChange={(e) => setUser(e.target.value)}
        />
        <select className="input !w-auto" value={operation} onChange={(e) => setOperation(e.target.value)}>
          {OPERACOES.map((o) => (
            <option key={o} value={o}>
              {o || 'Todas operações'}
            </option>
          ))}
        </select>
        <span className="text-xs text-text-secondary">
          {atividades.data?.total || 0} registros
        </span>
      </div>

      <DataTable
        loading={atividades.isLoading}
        data={atividades.data?.data || []}
        empty="Sem atividades no filtro"
        columns={[
          { key: 'data_operacao', label: 'Data/Hora', render: (r: any) => <span className="mono text-xs">{formatDateTime(r.data_operacao)}</span> },
          { key: 'usuario', label: 'Usuário', render: (r: any) => <span className="font-medium">{r.usuario}</span> },
          { key: 'operacao', label: 'Operação', align: 'center',
            render: (r: any) => <span className={`badge-${OP_COLORS[r.operacao] || 'neutral'}`}>{r.operacao}</span> },
          { key: 'tabela', label: 'Tabela' },
          { key: 'descricao', label: 'Descrição' },
        ]}
      />
    </div>
  )
}
