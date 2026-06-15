import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import DataTable from '../components/DataTable'
import { Shield, Plus, Check, X, ShieldAlert, Edit } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

interface GroupRow {
  id: number
  nome: string
  versao: string
  layout_version?: string
}

interface PermissionRow {
  recurso: string
  pode_acessar: boolean
}

const DASH_1_0_MODULES = [
  { id: 'inicio', label: 'Visão Geral (Início)' },
  { id: 'bi_sales', label: 'Comercial' },
  { id: 'bi_finance', label: 'Financeiro' },
  { id: 'usuarios', label: 'Usuários & Configurações' }
]

const BI_1_0_MODULES = [
  { id: 'inicio', label: 'Visão Estratégica' },
  { id: 'bi_seller_hub', label: 'Hub do Vendedor' },
  { id: 'bi_sales', label: 'Hub de Vendas' },
  { id: 'bi_supplier', label: 'Hub do Fornecedor' },
  { id: 'bi_abc', label: 'Gestão de Inventário' },
  { id: 'bi_finance', label: 'Financeiro' },
  { id: 'bi_customer', label: 'Radar 360' },
  { id: 'bi_comparative', label: 'Lucratividade' },
  { id: 'bi_customer_analytics', label: 'Análise de Clientes' },
  { id: 'usuarios', label: 'Usuários & Configurações' }
]

const BI_IA_MODULES = [
  { id: 'inicio', label: 'Visão Estratégica' },
  { id: 'bi_sales', label: 'Inteligência de Vendas' },
  { id: 'bi_hub', label: 'Hub de Vendas' },
  { id: 'bi_supplier', label: 'Hub do Fornecedor' },
  { id: 'bi_abc', label: 'Gestão de Inventário' },
  { id: 'bi_finance', label: 'Financeiro' },
  { id: 'bi_customer', label: 'Radar 360' },
  { id: 'bi_comparative', label: 'Lucratividade' },
  { id: 'bi_customer_analytics', label: 'Análise de Clientes' },
  { id: 'bi_goals', label: 'Análise de Metas' },
  { id: 'bi_heatmap', label: 'Mapa de Calor' },
  { id: 'bi_ai_insights', label: 'Coliseu AI' },
  { id: 'usuarios', label: 'Usuários & Configurações' }
]

function getAvailableModules(version: string) {
  if (version === 'Dash 1.0') return DASH_1_0_MODULES
  if (version === 'B.I 1.0') return BI_1_0_MODULES
  return BI_IA_MODULES
}

export default function Grupos() {
  const queryClient = useQueryClient()
  const activeUser = useAuthStore((s) => s.user)

  const ALL_VERSIONS = ['Dash 1.0', 'B.I 1.0', 'B.I IA.']
  const availableVersions = ALL_VERSIONS.filter(v => activeUser?.available_versions?.includes(v))
  const displayVersions = availableVersions.length > 0 ? availableVersions : ['Dash 1.0']

  const [activeTab, setActiveTab] = useState(() => {
    const currentLayout = activeUser?.versao || activeUser?.layout_version || 'Dash 1.0'
    return displayVersions.includes(currentLayout) ? currentLayout : displayVersions[0]
  })

  const [modalOpen, setModalOpen] = useState(false)
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<GroupRow | null>(null)
  
  const [nome, setNome] = useState('')
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const [errorMsg, setErrorMsg] = useState('')

  const availableModules = getAvailableModules(activeTab)

  const { data: groups, isLoading } = useQuery<GroupRow[]>({
    queryKey: ['grupos', activeTab],
    queryFn: async () => {
      const res = await api.get(`/grupos?versao=${activeTab}`)
      return res.data
    }
  })

  const createGroup = useMutation({
    mutationFn: async () => {
      const layoutPerm = activeTab === 'Dash 1.0' ? 'layout_1' : (activeTab === 'B.I 1.0' ? 'layout_2' : 'layout_3')
      const perms = [...selectedPermissions]
      if (!perms.includes(layoutPerm)) {
        perms.push(layoutPerm)
      }
      const res = await api.post('/grupos', {
        nome,
        versao: activeTab,
        permissions: perms
      })
      return res.data
    },
    onSuccess: () => {
      setModalOpen(false)
      setNome('')
      setSelectedPermissions([])
      queryClient.invalidateQueries({ queryKey: ['grupos', activeTab] })
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || 'Erro ao criar grupo')
    }
  })

  const deleteGroup = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.delete(`/grupos/${id}`)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grupos', activeTab] })
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || 'Erro ao remover grupo')
    }
  })

  const updatePermissions = useMutation({
    mutationFn: async ({ id, permissions }: { id: number, permissions: string[] }) => {
      const layoutPerm = selectedGroup?.versao === 'Dash 1.0' ? 'layout_1' : (selectedGroup?.versao === 'B.I 1.0' ? 'layout_2' : 'layout_3')
      const perms = [...permissions]
      if (!perms.includes(layoutPerm)) {
        perms.push(layoutPerm)
      }
      const res = await api.put(`/grupos/${id}/permissions`, { permissions: perms })
      return res.data
    },
    onSuccess: () => {
      setPermissionsModalOpen(false)
      setSelectedGroup(null)
      queryClient.invalidateQueries({ queryKey: ['grupos', activeTab] })
      // Se for o grupo do próprio usuário logado, sugerimos recarregar para atualizar a UI
      alert('Permissões do grupo atualizadas com sucesso!')
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || 'Erro ao salvar permissões')
    }
  })

  const openPermissionsModal = async (group: GroupRow) => {
    setSelectedGroup(group)
    try {
      const res = await api.get(`/grupos/${group.id}/permissions`)
      const perms: PermissionRow[] = res.data
      setSelectedPermissions(
        perms
          .filter(p => p.pode_acessar && !['layout_1', 'layout_2', 'layout_3'].includes(p.recurso))
          .map(p => p.recurso)
      )
      setPermissionsModalOpen(true)
    } catch {
      alert('Erro ao carregar permissões do grupo.')
    }
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    createGroup.mutate()
  }

  const handleSavePermissions = () => {
    if (!selectedGroup) return
    updatePermissions.mutate({ id: selectedGroup.id, permissions: selectedPermissions })
  }

  const togglePermission = (id: string) => {
    setSelectedPermissions(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl font-semibold text-text-primary">Gestão de Grupos de Acesso</h2>
          <p className="text-text-secondary text-sm">Configure perfis de acesso e permissões para a versão {activeTab}.</p>
        </div>
        <button
          onClick={() => {
            setSelectedPermissions(availableModules.map(m => m.id))
            setModalOpen(true)
          }}
          className="btn-primary flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl shadow-sm hover:shadow-md transition-all font-semibold"
        >
          <Plus size={18} />
          <span>Novo Grupo</span>
        </button>
      </div>

      {/* Abas de Versão */}
      {displayVersions.length > 1 && (
        <div className="flex border-b border-border gap-2">
          {displayVersions.map((version) => {
            const isActive = activeTab === version;
            return (
              <button
                key={version}
                onClick={() => setActiveTab(version)}
                className={`py-3 px-6 font-semibold text-sm transition-all border-b-2 -mb-[2px] ${
                  isActive
                    ? 'border-brand-500 text-brand-600'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                {version}
              </button>
            );
          })}
        </div>
      )}

      <div className="bg-bg-primary rounded-2xl shadow-sm border border-border overflow-hidden">
        <DataTable
          loading={isLoading}
          data={groups || []}
          empty="Nenhum grupo cadastrado para esta versão."
          columns={[
            {
              key: 'nome',
              label: 'NOME DO GRUPO',
              render: (r: GroupRow) => (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-50 text-brand-500 rounded-xl">
                    <Shield size={20} />
                  </div>
                  <span className="font-semibold text-text-primary text-base">{r.nome}</span>
                </div>
              )
            },
            {
              key: 'versao',
              label: 'VERSÃO',
              render: (r: GroupRow) => (
                <span className="text-xs font-bold font-mono bg-bg-secondary text-text-secondary px-2.5 py-1 rounded-md border border-divider">
                  {r.versao || r.layout_version}
                </span>
              )
            },
            {
              key: 'actions',
              label: 'AÇÕES',
              align: 'right',
              render: (r: GroupRow) => (
                <div className="flex items-end justify-end gap-2">
                  <button
                    onClick={() => openPermissionsModal(r)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-brand-600 hover:bg-brand-50 transition-colors"
                  >
                    <Edit size={16} />
                    <span>Permissões</span>
                  </button>
                  <button
                    onClick={() => {
                      if (r.nome === 'Administrador') {
                        alert('O grupo Administrador padrão não pode ser removido.')
                        return
                      }
                      if (confirm('Tem certeza que deseja remover este grupo?')) {
                        deleteGroup.mutate(r.id)
                      }
                    }}
                    disabled={deleteGroup.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-danger hover:bg-danger/10 transition-colors"
                  >
                    <X size={16} />
                    <span>Excluir</span>
                  </button>
                </div>
              )
            }
          ]}
        />
      </div>

      {/* Modal de Criação */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-primary rounded-2xl shadow-xl border border-border w-full max-w-md overflow-hidden animate-fade-in">
            <div className="p-5 border-b border-border flex justify-between items-center bg-bg-secondary/50">
              <h3 className="font-semibold text-lg text-text-primary">Novo Grupo de Acesso</h3>
              <button onClick={() => setModalOpen(false)} className="text-text-secondary hover:text-text-primary">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-danger/10 text-danger text-sm font-medium border border-danger/25">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Nome do Grupo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Vendedores, Consultores..."
                  className="w-full px-4 py-2 border border-border rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-shadow outline-none bg-bg-primary text-text-primary"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </div>

              <div className="pt-2">
                <label className="block text-sm font-medium text-text-primary mb-2">Permissões Iniciais</label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-divider rounded-xl p-3">
                  {availableModules.map(mod => (
                    <label key={mod.id} className="flex items-center gap-2 cursor-pointer py-1.5">
                      <input
                        type="checkbox"
                        checked={selectedPermissions.includes(mod.id)}
                        onChange={() => togglePermission(mod.id)}
                        className="rounded border-gray-300 text-brand-500 focus:ring-brand-500 w-4.5 h-4.5"
                      />
                      <span className="text-sm text-text-secondary">{mod.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border text-text-secondary font-medium hover:bg-bg-secondary transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createGroup.isPending}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {createGroup.isPending ? 'Salvando...' : 'Criar Grupo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Permissões */}
      {permissionsModalOpen && selectedGroup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-primary rounded-2xl shadow-xl border border-border w-full max-w-md overflow-hidden animate-fade-in">
            <div className="p-5 border-b border-border flex justify-between items-center bg-bg-secondary/50">
              <h3 className="font-semibold text-lg text-text-primary flex items-center gap-2">
                <Shield className="text-brand-500" />
                Permissões: <span className="font-bold text-text-primary">{selectedGroup.nome}</span>
              </h3>
              <button onClick={() => setPermissionsModalOpen(false)} className="text-text-secondary hover:text-text-primary">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-sm text-text-secondary">
                Configure os recursos e páginas que os membros deste grupo têm acesso.
              </p>

              <div className="space-y-2.5 max-h-80 overflow-y-auto border border-divider rounded-xl p-3">
                {availableModules.map(mod => (
                  <label key={mod.id} className="flex items-center gap-3 p-2 hover:bg-bg-secondary rounded-lg cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedPermissions.includes(mod.id)}
                      onChange={() => togglePermission(mod.id)}
                      className="w-5 h-5 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                    />
                    <span className="text-sm font-medium text-text-primary">{mod.label}</span>
                  </label>
                ))}
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setPermissionsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border text-text-secondary font-medium hover:bg-bg-secondary transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSavePermissions}
                  disabled={updatePermissions.isPending}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {updatePermissions.isPending ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
