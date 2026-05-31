import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, ShoppingCart, Wallet,
  Trophy, BarChart3, Users, X, LogOut, Shield, DollarSign,
  Truck, Settings
} from 'lucide-react'
import clsx from 'clsx'
import { useAuthStore } from '../../store/authStore'
import { Package, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

interface Props {
  open: boolean
  onClose: () => void
}

const MODULES = [
  { 
    to: '/', 
    label: 'Visão Estratégica', 
    icon: LayoutDashboard, 
    exact: true, 
    id: 'inicio',
    iconColor: 'text-teal-600 dark:text-teal-400',
    iconBg: 'bg-teal-50 dark:bg-teal-900/20'
  },
]

const BI_MODULES = [
  { 
    to: '/bi/vendedor', 
    label: 'Hub do Vendedor', 
    icon: Trophy, 
    id: 'bi_seller_hub',
    iconColor: 'text-teal-600 dark:text-teal-400',
    iconBg: 'bg-teal-50 dark:bg-teal-900/20'
  },
  { 
    to: '/bi', 
    label: 'Inteligência Comercial', 
    icon: BarChart3, 
    exact: true, 
    id: 'bi_sales',
    iconColor: 'text-teal-700 dark:text-teal-300',
    iconBg: 'bg-teal-50 dark:bg-teal-900/20'
  },
  { 
    to: '/bi/supplier', 
    label: 'Hub do Fornecedor', 
    icon: Truck, 
    id: 'bi_supplier',
    iconColor: 'text-slate-500 dark:text-slate-400',
    iconBg: 'bg-slate-50 dark:bg-slate-800/40'
  },
  { 
    to: '/bi/abc', 
    label: 'Gestão de Inventário', 
    icon: Package, 
    id: 'bi_abc',
    iconColor: 'text-slate-600 dark:text-slate-400',
    iconBg: 'bg-slate-50 dark:bg-slate-800/40'
  },
  { 
    to: '/bi/finance', 
    label: 'Financeiro', 
    icon: Wallet, 
    id: 'bi_finance',
    iconColor: 'text-teal-800 dark:text-teal-300',
    iconBg: 'bg-teal-50 dark:bg-teal-900/20'
  },
  { 
    to: '/bi/customer', 
    label: 'Radar 360', 
    icon: Users, 
    id: 'bi_customer',
    iconColor: 'text-slate-500 dark:text-slate-400',
    iconBg: 'bg-slate-50 dark:bg-slate-800/40'
  },
  { 
    to: '/bi/comparative', 
    label: 'Lucratividade', 
    icon: DollarSign, 
    id: 'bi_comparative',
    iconColor: 'text-slate-600 dark:text-slate-400',
    iconBg: 'bg-slate-50 dark:bg-slate-800/40'
  },
  { 
    to: '/bi/customer-analytics', 
    label: 'Análise de Clientes', 
    icon: Users, 
    id: 'bi_customer_analytics',
    iconColor: 'text-slate-500 dark:text-slate-400',
    iconBg: 'bg-slate-50 dark:bg-slate-800/40'
  },
]

const CONFIG_MODULES = [
  { 
    to: '/usuarios', 
    label: 'Usuários', 
    icon: Shield, 
    id: 'usuarios',
    iconColor: 'text-teal-600 dark:text-teal-400',
    iconBg: 'bg-teal-50 dark:bg-teal-900/20'
  },
  { 
    to: '/grupos', 
    label: 'Grupos de Acesso', 
    icon: Shield, 
    id: 'usuarios',
    iconColor: 'text-teal-700 dark:text-teal-300',
    iconBg: 'bg-teal-50 dark:bg-teal-900/20'
  }
]

export default function Sidebar({ open, onClose }: Props) {
  const user = useAuthStore((s) => s.user)
  const [configOpen, setConfigOpen] = useState(false)
  const [isCustomizing, setIsCustomizing] = useState(false)

  // Leitura do estado de visibilidade a partir do localStorage (por padrão, os 6 especificados vêm desativados)
  const [visibility, setVisibility] = useState<Record<string, boolean>>(() => {
    const key = `v4_menu_visibility_${user?.email || 'default'}`
    const stored = localStorage.getItem(key)
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch { /* ignore */ }
    }
    return {
      bi_seller_hub: true,
      bi_sales: true,
      bi_hub: true,
      bi_supplier: false,
      bi_abc: false,
      bi_finance: false,
      bi_customer: false,
      bi_comparative: false,
      bi_customer_analytics: false,
    }
  })

  const saveVisibility = (newVal: Record<string, boolean>) => {
    const key = `v4_menu_visibility_${user?.email || 'default'}`
    localStorage.setItem(key, JSON.stringify(newVal))
    setVisibility(newVal)
  }

  // Filtra as rotas se o usuário não for master e tiver permissions configurado
  const hasAccess = (moduleId: string) => {
    if (!user) return false
    if (user.role === 'master' || !user.permissions) return true
    return user.permissions.includes(moduleId)
  }

  const allowedModules = MODULES.filter((m) => hasAccess(m.id))
  // Filtra de acordo com as permissões E a visibilidade configurada
  const allowedBiModules = BI_MODULES.filter((m) => hasAccess(m.id) && visibility[m.id] !== false)
  const allowedConfigModules = CONFIG_MODULES.filter((m) => hasAccess(m.id))


  return (
    <>
      {/* Backdrop mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-30 lg:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={onClose}
        />
      )}
      <aside
        className={clsx(
          'fixed lg:sticky top-0 left-0 h-screen w-64 bg-bg-primary/95 backdrop-blur-xl border-r border-divider z-40',
          'transform transition-transform duration-200 ease-out lg:translate-x-0',
          'flex flex-col shadow-card lg:shadow-none',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        {/* Logo */}
        <div className="h-20 px-4 flex items-center justify-between border-b border-divider bg-transparent">
          <img
            src="/logo-coliseu.png" // We can use the same logo image
            alt="Siscom Vet"
            className="h-14 w-auto object-contain"
          />
          <button
            className="lg:hidden p-1.5 text-text-secondary hover:bg-bg-secondary rounded"
            onClick={onClose}
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 flex flex-col">
          <div>
            <div className="px-3 mb-2 text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Menu Principal
            </div>
            {allowedModules.map(({ to, label, icon: Icon, exact, iconColor, iconBg }) => (
              <NavLink
                key={to}
                to={to}
                end={exact}
                onClick={onClose}
                className={({ isActive }) =>
                  clsx(
                    'group flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 mb-1 border',
                    isActive
                      ? 'bg-white dark:bg-slate-800/60 text-text-primary shadow-sm border-slate-200/60 dark:border-slate-700/60 font-semibold'
                      : 'text-text-secondary hover:bg-bg-secondary/60 hover:text-text-primary border-transparent',
                  )
                }
              >
                <div className={clsx("p-1.5 rounded-lg flex-shrink-0 transition-colors", iconBg)}>
                  <Icon size={16} className={clsx("transition-transform duration-200 group-hover:scale-110", iconColor)} />
                </div>
                <span className="truncate">{label}</span>
              </NavLink>
            ))}
          </div>

          {allowedBiModules.length > 0 && (
            <div className="mt-6">
              <div className="px-3 mb-2 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Inteligência de Negócios
              </div>
              {allowedBiModules.map(({ to, label, icon: Icon, exact, iconColor, iconBg }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={exact}
                  onClick={onClose}
                  className={({ isActive }) =>
                    clsx(
                      'group flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 mb-1 border',
                      isActive
                        ? 'bg-bg-secondary text-text-primary shadow-sm border-border font-semibold'
                        : 'text-text-secondary hover:bg-bg-secondary/60 hover:text-text-primary border-transparent',
                    )
                  }
                >
                  <div className={clsx("p-1.5 rounded-lg flex-shrink-0 transition-colors", iconBg)}>
                    <Icon size={16} className={clsx("transition-transform duration-200 group-hover:scale-110", iconColor)} />
                  </div>
                  <span className="truncate">{label}</span>
                </NavLink>
              ))}
            </div>
          )}

          <div className="mt-auto pt-4 border-t border-divider">
            <button
              onClick={() => setConfigOpen(!configOpen)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:bg-bg-secondary hover:text-text-primary transition-colors mb-1 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Settings size={18} className="flex-shrink-0" />
                <span className="truncate">Configurações</span>
              </div>
              {configOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            
            {configOpen && (
              <div className="pl-4 mt-1 space-y-1 border-l-2 border-divider ml-3">
                {/* Botão de Personalização de Menus */}
                <button
                  onClick={() => {
                    onClose();
                    setIsCustomizing(true);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 border border-transparent text-text-secondary hover:bg-bg-secondary/60 hover:text-text-primary text-left cursor-pointer"
                >
                  <div className="p-1.5 rounded-lg flex-shrink-0 bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400">
                    <Settings size={14} className="transition-transform duration-200 hover:scale-110" />
                  </div>
                  <span className="truncate">Personalizar Menus</span>
                </button>

                {/* Submenus Originais se existirem */}
                {allowedConfigModules.map(({ to, label, icon: Icon, exact, iconColor, iconBg }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={exact}
                    onClick={onClose}
                    className={({ isActive }) =>
                      clsx(
                        'group flex items-center gap-3 px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 border',
                        isActive
                          ? 'bg-bg-secondary text-text-primary shadow-sm border-border font-semibold'
                          : 'text-text-secondary hover:bg-bg-secondary/60 hover:text-text-primary border-transparent',
                      )
                    }
                  >
                    <div className={clsx("p-1.5 rounded-lg flex-shrink-0 transition-colors", iconBg)}>
                      <Icon size={14} className={clsx("transition-transform duration-200 group-hover:scale-110", iconColor)} />
                    </div>
                    <span className="truncate">{label}</span>
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Footer com Sair */}
        <div className="px-4 py-3 border-t border-divider text-[11px] text-text-secondary flex items-center justify-between">
          <div>
            <div className="font-semibold text-text-primary">Siscom Vet Dash v4.0</div>
            <div>© 2026 Siscom Sistemas</div>
          </div>
          <button
            onClick={() => {
              useAuthStore.getState().logout()
              window.location.href = '/login'
            }}
            className="p-2 text-text-secondary hover:text-danger hover:bg-danger/10 rounded-lg transition-colors cursor-pointer"
            title="Sair do sistema"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Modal de Personalização dos Menus de BI */}
      {isCustomizing && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-primary border border-divider rounded-xl w-full max-w-md shadow-card-hover p-6 flex flex-col gap-4 text-left relative overflow-hidden">
            <div className="flex justify-between items-center border-b border-divider pb-3">
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Personalizar Menus (Vet)</h3>
              <button
                onClick={() => setIsCustomizing(false)}
                className="p-1 hover:bg-bg-secondary rounded text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              Marque os módulos de Inteligência de Negócios que deseja exibir na barra lateral de navegação:
            </p>
            <div className="space-y-2 my-2 max-h-[300px] overflow-y-auto pr-1">
              {BI_MODULES.map((m) => {
                const available = hasAccess(m.id)
                return (
                  <label
                    key={m.id}
                    className={clsx(
                      "flex items-start gap-3 p-2.5 rounded-lg border transition-all cursor-pointer select-none",
                      available
                        ? "border-divider hover:bg-bg-secondary/50 hover:border-brand-500/50"
                        : "opacity-40 cursor-not-allowed border-divider"
                    )}
                  >
                    <input
                      type="checkbox"
                      disabled={!available}
                      checked={!!visibility[m.id]}
                      onChange={(e) => {
                        if (!available) return
                        const next = { ...visibility, [m.id]: e.target.checked }
                        saveVisibility(next)
                      }}
                      className="mt-0.5 rounded border-border text-brand-500 focus:ring-brand-500 h-4 w-4 cursor-pointer"
                    />
                    <div>
                      <div className="text-xs font-semibold text-text-primary">{m.label}</div>
                      {!available && (
                        <div className="text-[10px] text-danger font-medium">Sem permissão de acesso</div>
                      )}
                    </div>
                  </label>
                )
              })}
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-divider">
              <button
                onClick={() => setIsCustomizing(false)}
                className="btn btn-primary text-xs py-1.5 px-4 h-9 cursor-pointer"
              >
                Salvar e Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
