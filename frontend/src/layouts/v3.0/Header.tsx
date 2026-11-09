import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Menu, LogOut, FileCheck2 } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useSyncStatus } from '../../hooks/useSync'
import { formatDateTime } from '../../utils/format'
import ThemeToggle from '../../components/ThemeToggle'
import BranchSelector from '../../components/BranchSelector'
import api from '../../services/api'

interface Props {
  onMenuClick: () => void
  activeRoute: { label: string; icon: React.ElementType; color: string }
}

export default function Header({ onMenuClick, activeRoute }: Props) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { lastSync, agentStatus } = useSyncStatus()
  const [menuOpen, setMenuOpen] = useState(false)
  const [empresaNome, setEmpresaNome] = useState<string>('')
  const navigate = useNavigate()

  const { data: tenantParams } = useQuery<{ somente_vendas_com_nf: boolean }>({
    queryKey: ['tenant-parametros'],
    queryFn: async () => {
      const { data } = await api.get('/configuracoes/parametros')
      return data
    },
    staleTime: 60_000,
  })

  useEffect(() => {
    const fetchEmpresa = async () => {
      try {
        const { data } = await api.get('/configuracoes/empresa')
        if (data && data.name) {
          setEmpresaNome(data.name)
        }
      } catch (err) {
        console.error('Erro ao buscar nome da empresa', err)
      }
    }
    fetchEmpresa()
  }, [])

  return (
    <header className="h-12 sm:h-[52px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-20 flex items-center justify-between gap-2 px-3 sm:px-4 lg:px-5 transition-all duration-200">
      <div className="flex items-center gap-2 min-w-0">
        <button
          className="lg:hidden p-1.5 -ml-1.5 text-text-secondary hover:bg-bg-secondary rounded-lg active:bg-bg-tertiary shrink-0"
          onClick={onMenuClick}
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>

        {/* Título sutil da tela ativa (único no topo para otimizar espaço vertical) */}
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{
              backgroundColor: `${activeRoute.color}14`,
              border: `1px solid ${activeRoute.color}30`,
            }}
          >
            <activeRoute.icon size={15} style={{ color: activeRoute.color }} strokeWidth={2} />
          </div>
          <h1 className="font-heading text-[11px] sm:text-xs md:text-[13px] font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider truncate">
            {activeRoute.label}
          </h1>
        </div>

        {/* Indicador discreto quando o parâmetro "Somente vendas com Nota Fiscal" estiver ativo */}
        {tenantParams?.somente_vendas_com_nf && (
          <button
            type="button"
            onClick={() => navigate('/bi/parametros')}
            className="hidden sm:inline-flex items-center gap-1 ml-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/70 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors cursor-pointer shrink-0"
            title="Parâmetro ativo: exibindo somente vendas com Nota Fiscal vinculada. Clique para configurar."
          >
            <FileCheck2 size={12} />
            <span>Somente c/ NF</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <div
          className="hidden lg:flex relative w-4 h-4 items-center justify-center rounded-full bg-slate-100/80 dark:bg-slate-800/80 cursor-help shrink-0"
          title={agentStatus === 'ONLINE' ? 'Agente: Banco de Dados Conectado' : 'Agente: Falha na Conexão com o Banco'}
        >
          <span className={`absolute inline-flex h-2 w-2 rounded-full opacity-75 animate-ping ${agentStatus === 'ONLINE' ? 'bg-success' : 'bg-danger'}`} />
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${agentStatus === 'ONLINE' ? 'bg-success' : 'bg-danger'}`} />
        </div>

        <ThemeToggle />

        {empresaNome && (
          <div className="hidden 2xl:flex items-center px-2 border-r border-slate-200 dark:border-slate-700 mr-0.5 pr-2.5 max-w-[200px]">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide truncate">
              {empresaNome}
            </span>
          </div>
        )}

        <div className="flex flex-col items-end shrink-0">
          <BranchSelector />
          <span className="hidden sm:block text-[7.5px] font-bold text-text-secondary/60 uppercase tracking-wider leading-none mt-0.5 mr-1">
            Sync: {lastSync ? formatDateTime(lastSync) : 'nunca'}
          </span>
        </div>

        {/* Usuário */}
        <div className="relative shrink-0">
          <button
            className="flex items-center gap-1.5 px-1.5 py-1 hover:bg-bg-secondary rounded-lg active:bg-bg-tertiary cursor-pointer"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <div className="w-7 h-7 rounded-full bg-brand-50 dark:bg-slate-800 text-brand-600 dark:text-brand-400 flex items-center justify-center text-xs font-bold">
              {user?.nome?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="text-left hidden xl:block max-w-[130px]">
              <div className="text-xs font-semibold leading-tight text-slate-800 dark:text-slate-100 truncate">{user?.nome}</div>
              <div className="text-[10px] text-text-secondary leading-tight capitalize truncate">{user?.role}</div>
            </div>
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 mt-1 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-card-hover z-40 py-1">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="text-sm font-medium truncate text-slate-900 dark:text-white">{user?.nome}</div>
                  <div className="text-xs text-text-secondary truncate">{user?.email}</div>
                </div>
                <button
                  onClick={logout}
                  className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-bg-secondary flex items-center gap-2 cursor-pointer"
                >
                  <LogOut size={14} />
                  Sair
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
