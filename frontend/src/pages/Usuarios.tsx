import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import DataTable from '../components/DataTable'
import { Shield, UserPlus, CheckCircle, XCircle, Lock, Building2, KeyRound, ChevronDown } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useBranch } from '../contexts/BranchContext'

interface UserRow {
  id: number
  email: string
  nome: string
  role: string
  ativo: boolean
  created_at: string
  permissions: string[] | null
  tenant_id: string
  versao?: string
  layout_version?: string
  filial_acesso?: string
  grupo_id?: number | null
  grupos?: { id: number, nome: string, versao: string }[]
}

const AVAILABLE_MODULES = [
  { id: 'inicio', label: 'Início' },
  { id: 'vendedores', label: 'Vendedores' },
  { id: 'fluxo_caixa', label: 'Fluxo de Caixa' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'estoque', label: 'Estoque' },
  { id: 'ranking', label: 'Ranking' },
  { id: 'estatisticas', label: 'Estatísticas' },
  { id: 'usuarios', label: 'Usuários (Configurações)' }
]

export default function Usuarios() {
  const queryClient = useQueryClient()
  const { filiais } = useBranch()
  const activeUser = useAuthStore((s) => s.user)
  const userRoleLower = (activeUser?.role || '').toLowerCase()
  const canResetPassword = userRoleLower === 'master' || userRoleLower === 'admin' || (activeUser?.permissions || []).includes('reset_senha')

  const [modalOpen, setModalOpen] = useState(false)
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false)
  const [filialModalOpen, setFilialModalOpen] = useState(false)
  const [resetModalUser, setResetModalUser] = useState<UserRow | null>(null)
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null)
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null)
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([])
  const [selectedFilialAcesso, setSelectedFilialAcesso] = useState<string>('todas')

  const resetPasswordMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.post(`/usuarios/${id}/reset-password`)
      return res.data
    },
    onSuccess: (data) => {
      alert(data.message || 'Senha resetada para "123456" com sucesso!')
      setResetModalUser(null)
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || 'Erro ao resetar senha')
    }
  })

  const { data: allGroups } = useQuery<any[]>({
    queryKey: ['grupos', 'all'],
    queryFn: async () => {
      const res = await api.get('/grupos?versao=all')
      return res.data
    }
  })
  
  // Admin lock
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [adminPassInput, setAdminPassInput] = useState('')
  const [adminPassError, setAdminPassError] = useState('')

  // Form states
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [companyKey, setCompanyKey] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const { data: users, isLoading } = useQuery<UserRow[]>({
    queryKey: ['usuarios'],
    queryFn: async () => {
      const res = await api.get('/usuarios')
      return res.data
    }
  })

  const toggleStatus = useMutation({
    mutationFn: async ({ id, ativo }: { id: number, ativo: boolean }) => {
      const res = await api.put(`/usuarios/${id}/status`, { ativo })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || 'Erro ao alterar status')
    }
  })

  const createUser = useMutation({
    mutationFn: async () => {
      const res = await api.post('/usuarios', { nome, email, password, companyKey })
      return res.data
    },
    onSuccess: () => {
      setModalOpen(false)
      setNome('')
      setEmail('')
      setPassword('')
      setCompanyKey('')
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || 'Erro ao criar usuário')
    }
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    createUser.mutate()
  }

  const updateGroupAssignments = useMutation({
    mutationFn: async ({ id, grupo_ids }: { id: number, grupo_ids: number[] }) => {
      const res = await api.put(`/usuarios/${id}/grupos`, { grupo_ids })
      return res.data
    },
    onSuccess: () => {
      setPermissionsModalOpen(false)
      setSelectedUser(null)
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || 'Erro ao alterar grupos de acesso')
    }
  })

  const openPermissionsModal = (user: UserRow) => {
    setSelectedUser(user)
    setSelectedGroupIds((user.grupos || []).map(g => g.id))
    setPermissionsModalOpen(true)
  }

  const handleSavePermissions = () => {
    if (!selectedUser) return
    updateGroupAssignments.mutate({ id: selectedUser.id, grupo_ids: selectedGroupIds })
  }

  const updateLayout = useMutation({
    mutationFn: async ({ id, versao }: { id: number, versao: string }) => {
      const res = await api.put(`/usuarios/${id}/layout`, { versao })
      return res.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      const currentUser = useAuthStore.getState().user;
      if (currentUser && data.user && data.user.id === currentUser.id) {
         const user = { 
            ...currentUser, 
            versao: data.user.versao,
            layout_version: data.user.versao 
         };
         useAuthStore.setState({ user });
         localStorage.setItem('coliseu_user', JSON.stringify(user));
      }
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || 'Erro ao alterar versão')
    }
  })

  const updateFilialAcesso = useMutation({
    mutationFn: async ({ id, filial_acesso }: { id: number, filial_acesso: string }) => {
      const res = await api.put(`/usuarios/${id}/filial-acesso`, { filial_acesso })
      return res.data
    },
    onSuccess: () => {
      setFilialModalOpen(false)
      setSelectedUser(null)
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || 'Erro ao alterar acesso de filial')
    }
  })

  const openFilialModal = (user: UserRow) => {
    setSelectedUser(user)
    setSelectedFilialAcesso(user.filial_acesso || 'todas')
    setFilialModalOpen(true)
  }

  // Removeram a tela de senha a pedido do usuário

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl font-semibold text-text-primary">Gestão de Usuários</h2>
          <p className="text-text-secondary text-sm">Controle de acessos e permissões do sistema.</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="btn-primary flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl shadow-sm hover:shadow-md transition-all font-semibold"
        >
          <UserPlus size={18} />
          <span>Novo Usuário</span>
        </button>
      </div>

      <div className="bg-bg-primary rounded-2xl shadow-sm border border-border overflow-hidden">
        <DataTable
          loading={isLoading}
          data={users || []}
          empty="Nenhum usuário cadastrado."
          columns={[
            {
              key: 'nome',
              label: 'NOME',
              render: (r: UserRow) => (
                <div>
                  <div className="font-medium text-text-primary capitalize">{r.nome}</div>
                  <div className="text-xs text-text-secondary">{r.email}</div>
                </div>
              )
            },
            {
              key: 'role',
              label: 'PERFIL',
              render: (r: UserRow) => (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 w-fit">
                    <Shield size={14} />
                    <span>{r.role === 'viewer' ? 'Visualizador' : r.role}</span>
                  </div>
                </div>
              )
            },
            {
              key: 'tenant',
              label: 'EMPRESA / CHAVE',
              render: (r: UserRow) => {
                const isMaster = r.tenant_id === '00000000-0000-0000-0000-000000000000'
                return (
                  <div>
                    <div className="font-medium text-text-primary text-sm">
                      {isMaster ? 'Coliseu Sistemas (Master)' : 'Empresa Cliente'}
                    </div>
                    <div className="text-xs text-text-secondary font-mono mt-0.5">
                      {isMaster ? 'Master Key' : r.tenant_id}
                    </div>
                  </div>
                )
              }
            },
            {
              key: 'versao',
              label: 'VERSÃO ATIVA',
              render: (r: UserRow) => (
                <div className="flex items-center">
                  <select
                    className="bg-bg-secondary text-text-primary border border-border rounded-lg px-2 py-1 text-sm outline-none focus:border-brand-500 transition-colors"
                    value={r.versao || r.layout_version || 'Dash 1.0'}
                    onChange={(e) => updateLayout.mutate({ id: r.id, versao: e.target.value })}
                    disabled={updateLayout.isPending}
                  >
                    <option value="Dash 1.0">Dash 1.0</option>
                    <option value="B.I IA.">B.I IA.</option>
                  </select>
                </div>
              )
            },
            {
              key: 'grupos_acesso',
              label: 'GRUPOS DE ACESSO',
              render: (r: UserRow) => (
                <div className="flex flex-col gap-1 text-xs">
                  {(r.grupos || []).map((g: any) => (
                    <span key={g.id} className="text-text-secondary">
                      <strong className="text-text-primary">{g.versao}:</strong> {g.nome}
                    </span>
                  ))}
                  {(r.grupos || []).length === 0 && (
                    <span className="text-text-muted italic">Sem grupo associado</span>
                  )}
                </div>
              )
            },
            {
              key: 'ativo',
              label: 'STATUS',
              render: (r: UserRow) => (
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${r.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {r.ativo ? 'Ativo' : 'Inativo'}
                </span>
              )
            },
            {
              key: 'actions',
              label: 'AÇÕES',
              align: 'right',
              render: (r: UserRow) => {
                const isOpen = openDropdownId === r.id
                return (
                  <div className="relative inline-block text-left">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setOpenDropdownId(isOpen ? null : r.id)
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        isOpen
                          ? 'bg-brand-50 text-brand-700 border-brand-300 dark:bg-brand-500/20 dark:text-brand-300 dark:border-brand-500/40 shadow-sm'
                          : 'bg-bg-secondary hover:bg-bg-tertiary text-text-primary border-border hover:border-border/80'
                      }`}
                      title="Opções de Ação"
                    >
                      <span>Ações</span>
                      <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isOpen && (
                      <>
                        {/* Overlay invisível para fechar o menu ao clicar fora */}
                        <div
                          className="fixed inset-0 z-20"
                          onClick={(e) => {
                            e.stopPropagation()
                            setOpenDropdownId(null)
                          }}
                        />

                        {/* Menu Dropdown Suspenso para Baixo */}
                        <div className="absolute right-0 top-full mt-1.5 w-48 bg-bg-primary rounded-2xl shadow-xl border border-border z-30 py-1.5 overflow-hidden animate-fade-in text-left">
                          <div className="px-3.5 py-1.5 text-[10px] font-bold text-text-muted uppercase tracking-wider border-b border-border/50 mb-1">
                            Ações para {r.nome.split(' ')[0]}
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setOpenDropdownId(null)
                              openPermissionsModal(r)
                            }}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-text-primary hover:bg-bg-secondary transition-colors cursor-pointer"
                          >
                            <Shield size={15} className="text-brand-500 flex-shrink-0" />
                            <span>Grupos de Acesso</span>
                          </button>

                          {filiais.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setOpenDropdownId(null)
                                openFilialModal(r)
                              }}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-text-primary hover:bg-bg-secondary transition-colors cursor-pointer"
                            >
                              <Building2 size={15} className="text-indigo-500 flex-shrink-0" />
                              <span>Filiais de Acesso</span>
                            </button>
                          )}

                          {canResetPassword && (
                            <button
                              type="button"
                              onClick={() => {
                                setOpenDropdownId(null)
                                setResetModalUser(r)
                              }}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors cursor-pointer"
                            >
                              <KeyRound size={15} className="text-amber-500 flex-shrink-0" />
                              <span>Resetar Senha</span>
                            </button>
                          )}

                          <div className="my-1 border-t border-border/50" />

                          <button
                            type="button"
                            onClick={() => {
                              setOpenDropdownId(null)
                              toggleStatus.mutate({ id: r.id, ativo: !r.ativo })
                            }}
                            disabled={toggleStatus.isPending}
                            className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                              r.ativo
                                ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10'
                                : 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-500/10'
                            }`}
                          >
                            {r.ativo ? <XCircle size={15} className="text-red-500 flex-shrink-0" /> : <CheckCircle size={15} className="text-green-500 flex-shrink-0" />}
                            <span>{r.ativo ? 'Inativar Usuário' : 'Ativar Usuário'}</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )
              }
            }
          ]}
        />
      </div>

      {/* Modal de Criação */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-primary rounded-2xl shadow-xl border border-border w-full max-w-md overflow-hidden animate-fade-in">
            <div className="p-5 border-b border-border flex justify-between items-center bg-bg-secondary/50">
              <h3 className="font-semibold text-lg text-text-primary">Novo Acesso</h3>
              <button onClick={() => setModalOpen(false)} className="text-text-secondary hover:text-text-primary">
                <XCircle size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm font-medium border border-red-100">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-border rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-shadow outline-none bg-bg-primary text-text-primary"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">E-mail</label>
                <input
                  type="email"
                  required
                  className="w-full px-4 py-2 border border-border rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-shadow outline-none bg-bg-primary text-text-primary"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">CompanyKey (Identity Vault Hash)</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 123e4567-e89b-12d3-a456-426614174000"
                  className="w-full px-4 py-2 border border-border rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-shadow outline-none font-mono text-sm bg-bg-primary text-text-primary"
                  value={companyKey}
                  onChange={(e) => setCompanyKey(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Senha Inicial</label>
                <input
                  type="password"
                  required
                  className="w-full px-4 py-2 border border-border rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-shadow outline-none bg-bg-primary text-text-primary"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
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
                  disabled={createUser.isPending}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {createUser.isPending ? 'Salvando...' : 'Cadastrar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal de Permissões / Grupo */}
      {permissionsModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-primary rounded-2xl shadow-xl border border-border w-full max-w-md overflow-hidden animate-fade-in">
            <div className="p-5 border-b border-border flex justify-between items-center bg-bg-secondary/50">
              <h3 className="font-semibold text-lg text-text-primary">
                Grupos de Acesso: <span className="font-bold text-brand-500">{selectedUser.nome}</span>
              </h3>
              <button onClick={() => setPermissionsModalOpen(false)} className="text-text-secondary hover:text-text-primary">
                <XCircle size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <p className="text-sm text-text-secondary">
                Associe o usuário a um grupo de acesso em cada uma das versões disponíveis.
              </p>

              {['Dash 1.0', 'B.I IA.'].map((version) => {
                const versionGroups = (allGroups || []).filter((g: any) => g.versao === version);
                const currentGroup = (allGroups || []).find(
                  (g: any) => g.versao === version && selectedGroupIds.includes(g.id)
                );
                
                return (
                  <div key={version} className="p-4 rounded-xl border border-border bg-bg-secondary/20 space-y-2">
                    <h4 className="font-semibold text-sm text-text-primary flex items-center justify-between">
                      <span>{version}</span>
                      {currentGroup && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-100">
                          Ativo: {currentGroup.nome}
                        </span>
                      )}
                    </h4>
                    <select
                      className="w-full px-3 py-2.5 rounded-xl border border-border outline-none bg-bg-primary text-text-primary focus:border-brand-500 transition-colors text-sm"
                      value={currentGroup?.id || ''}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : null;
                        // Remove previously selected group for this version
                        const filtered = selectedGroupIds.filter(id => {
                          const g = (allGroups || []).find((group: any) => group.id === id);
                          return g ? g.versao !== version : false;
                        });
                        if (val) {
                          setSelectedGroupIds([...filtered, val]);
                        } else {
                          setSelectedGroupIds(filtered);
                        }
                      }}
                    >
                      <option value="">Sem grupo (Sem acesso a esta versão)</option>
                      {versionGroups.map((g: any) => (
                        <option key={g.id} value={g.id}>
                          {g.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setPermissionsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border text-text-secondary font-medium hover:bg-bg-secondary transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSavePermissions}
                  disabled={updateGroupAssignments.isPending}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center text-sm"
                >
                  {updateGroupAssignments.isPending ? 'Salvando...' : 'Salvar Grupos'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Acesso por Filial */}
      {filialModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-primary rounded-2xl shadow-xl border border-border w-full max-w-md overflow-hidden animate-fade-in">
            <div className="p-5 border-b border-border flex justify-between items-center bg-bg-secondary/50">
              <div>
                <h3 className="font-semibold text-lg text-text-primary flex items-center gap-2">
                  <Building2 size={18} className="text-indigo-500" />
                  Acesso de Filiais
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">{selectedUser.nome}</p>
              </div>
              <button onClick={() => setFilialModalOpen(false)} className="text-text-secondary hover:text-text-primary">
                <XCircle size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-text-secondary">
                Defina quais filiais este usuário pode visualizar no dashboard.
              </p>

              <div className="space-y-2">
                {/* Opção: Todas */}
                <label className="flex items-center gap-3 p-3 rounded-xl border border-border cursor-pointer hover:bg-bg-secondary transition-colors">
                  <input
                    type="radio"
                    name="filial_acesso"
                    value="todas"
                    checked={selectedFilialAcesso === 'todas'}
                    onChange={() => setSelectedFilialAcesso('todas')}
                    className="w-4 h-4 text-brand-500"
                  />
                  <span className="text-sm font-medium text-text-primary">Todas as Filiais</span>
                </label>

                {/* Filiais individuais */}
                {filiais.map((f) => (
                  <label key={f.depto_id} className="flex items-center gap-3 p-3 rounded-xl border border-border cursor-pointer hover:bg-bg-secondary transition-colors">
                    <input
                      type="radio"
                      name="filial_acesso"
                      value={String(f.depto_id)}
                      checked={selectedFilialAcesso === String(f.depto_id)}
                      onChange={() => setSelectedFilialAcesso(String(f.depto_id))}
                      className="w-4 h-4 text-indigo-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-text-primary block">{f.nome}</span>
                      {f.documento && <span className="text-xs text-text-muted font-mono">{f.documento}</span>}
                    </div>
                  </label>
                ))}
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setFilialModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border text-text-secondary font-medium hover:bg-bg-secondary transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => selectedUser && updateFilialAcesso.mutate({ id: selectedUser.id, filial_acesso: selectedFilialAcesso })}
                  disabled={updateFilialAcesso.isPending}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {updateFilialAcesso.isPending ? 'Salvando...' : 'Salvar Acesso'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Reset de Senha */}
      {resetModalUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-primary rounded-2xl shadow-xl border border-border w-full max-w-md p-6 animate-fade-in space-y-4">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <div className="p-3 bg-amber-50 dark:bg-amber-500/10 rounded-xl">
                <KeyRound size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-text-primary">Resetar Senha</h3>
                <p className="text-xs text-text-secondary">Confirmar redefinição de acesso</p>
              </div>
            </div>

            <p className="text-sm text-text-secondary leading-relaxed">
              Tem certeza que deseja resetar a senha de <strong className="text-text-primary">{resetModalUser.nome}</strong> ({resetModalUser.email})?
              <br /><br />
              A senha será alterada para a senha padrão <code className="bg-bg-secondary border border-border px-2 py-0.5 rounded font-mono text-amber-600 font-bold">123456</code>. No próximo login, o usuário será obrigado a cadastrar uma nova senha.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setResetModalUser(null)}
                className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                disabled={resetPasswordMutation.isPending}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => resetPasswordMutation.mutate(resetModalUser.id)}
                disabled={resetPasswordMutation.isPending}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-medium text-sm rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                {resetPasswordMutation.isPending ? 'Resetando...' : 'Confirmar Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
