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
    <header className="h-14 sm:h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-20 flex items-center px-3 sm:px-4 lg:px-6 transition-all duration-300">
      <button
        className="lg:hidden p-2 -ml-2 text-text-secondary hover:bg-bg-secondary rounded-lg active:bg-bg-tertiary"
        onClick={onMenuClick}
        aria-label="Abrir menu"
      >
        <Menu size={22} />
      </button>

      {/* Badge Circular Pastel + Título (Item 3 alinhado à nova Sidebar) */}
      <div className="flex items-center gap-2.5 ml-1 sm:ml-2 lg:ml-0 min-w-0 flex-shrink-0">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: `${activeRoute.color}14`,
            border: `1px solid ${activeRoute.color}33`,
          }}
        >
          <activeRoute.icon size={17} style={{ color: activeRoute.color }} strokeWidth={1.9} />
        </div>
        <h1 className="font-heading text-xs sm:text-sm md:text-base font-bold text-slate-900 dark:text-white uppercase tracking-wide truncate whitespace-nowrap">
          {activeRoute.label}
        </h1>
      </div>

      {/* Indicador discreto quando o parâmetro "Somente vendas com Nota Fiscal" estiver ativo */}
      {tenantParams?.somente_vendas_com_nf && (
        <button
          type="button"
          onClick={() => navigate('/bi/parametros')}
          className="hidden md:inline-flex items-center gap-1.5 ml-3 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/70 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors cursor-pointer flex-shrink-0"
          title="Parâmetro ativo: exibindo somente vendas com Nota Fiscal vinculada. Clique para configurar."
        >
          <FileCheck2 size={13} />
          <span>Somente c/ NF</span>
        </button>
      )}

      {/* Contêiner de Filtros Teleportados ao lado do título da tela */}
      <div id="page-filters-container" className="hidden lg:flex items-center gap-2 text-xs ml-4" />

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2.5">
        <div
          className="hidden lg:flex relative w-5 h-5 items-center justify-center rounded-full bg-slate-100/80 dark:bg-slate-800/80 cursor-help"
          title={agentStatus === 'ONLINE' ? 'Agente: Banco de Dados Conectado' : 'Agente: Falha na Conexão com o Banco'}
        >
          <span className={`absolute inline-flex h-2.5 w-2.5 rounded-full opacity-75 animate-ping ${agentStatus === 'ONLINE' ? 'bg-success' : 'bg-danger'}`} />
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${agentStatus === 'ONLINE' ? 'bg-success' : 'bg-danger'}`} />
        </div>

        <ThemeToggle />

        {empresaNome && (
          <div className="hidden xl:flex items-center px-2 border-r border-slate-200 dark:border-slate-700 mr-1 pr-3">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
              {empresaNome}
            </span>
          </div>
        )}

        <div className="flex flex-col items-end shrink-0">
          <BranchSelector />
          <span className="text-[7.5px] font-bold text-text-secondary/60 uppercase tracking-wider leading-none mt-0.5 mr-1">
            Sync: {lastSync ? formatDateTime(lastSync) : 'nunca'}
          </span>
        </div>

        {/* Usuário */}
        <div className="relative">
          <button
            className="flex items-center gap-2 px-1.5 py-1 sm:px-2 sm:py-1.5 hover:bg-bg-secondary rounded-lg active:bg-bg-tertiary cursor-pointer"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <div className="w-8 h-8 rounded-full bg-brand-50 dark:bg-slate-800 text-brand-600 dark:text-brand-400 flex items-center justify-center text-sm font-semibold">
              {user?.nome?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-sm font-medium leading-tight text-slate-800 dark:text-slate-100">{user?.nome}</div>
              <div className="text-[11px] text-text-secondary leading-tight capitalize">{user?.role}</div>
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
