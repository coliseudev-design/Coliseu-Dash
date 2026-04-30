import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import DataTable from '../components/DataTable'
import { Shield, UserPlus, CheckCircle, XCircle, Lock } from 'lucide-react'

interface UserRow {
  id: number
  email: string
  nome: string
  role: string
  ativo: boolean
  created_at: string
  permissions: string[] | null
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
  const [modalOpen, setModalOpen] = useState(false)
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null)
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  
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

  const updatePermissions = useMutation({
    mutationFn: async ({ id, permissions }: { id: number, permissions: string[] | null }) => {
      const res = await api.put(`/usuarios/${id}/permissions`, { permissions })
      return res.data
    },
    onSuccess: () => {
      setPermissionsModalOpen(false)
      setSelectedUser(null)
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || 'Erro ao alterar permissões')
    }
  })

  const openPermissionsModal = (user: UserRow) => {
    setSelectedUser(user)
    setSelectedPermissions(user.permissions || AVAILABLE_MODULES.map(m => m.id))
    setPermissionsModalOpen(true)
  }

  const handleSavePermissions = () => {
    if (!selectedUser) return
    updatePermissions.mutate({ id: selectedUser.id, permissions: selectedPermissions })
  }

  const togglePermission = (id: string) => {
    setSelectedPermissions(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault()
    if (adminPassInput === '13894645.') {
      setIsUnlocked(true)
      setAdminPassError('')
    } else {
      setAdminPassError('Senha de administrador incorreta')
    }
  }

  if (!isUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
        <div className="bg-bg-primary rounded-2xl shadow-sm border border-border p-8 w-full max-w-md flex flex-col items-center">
          <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mb-6">
            <Lock className="w-8 h-8 text-brand-500" />
          </div>
          <h2 className="text-xl font-semibold text-text-primary mb-2 text-center">Área Restrita</h2>
          <p className="text-sm text-text-secondary mb-6 text-center">
            Digite a senha master do sistema para acessar as configurações e gestão de usuários.
          </p>

          <form onSubmit={handleUnlock} className="w-full space-y-4">
            {adminPassError && (
              <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm font-medium border border-red-100 text-center">
                {adminPassError}
              </div>
            )}
            <div>
              <input
                type="password"
                placeholder="Senha Master"
                required
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-shadow outline-none bg-bg-primary text-text-primary text-center tracking-widest"
                value={adminPassInput}
                onChange={(e) => setAdminPassInput(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold transition-colors flex items-center justify-center gap-2"
            >
              Desbloquear
            </button>
          </form>
        </div>
      </div>
    )
  }

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
                <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 w-fit">
                  <Shield size={14} />
                  <span>{r.role === 'viewer' ? 'Visualizador' : r.role}</span>
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
              render: (r: UserRow) => (
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => openPermissionsModal(r)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-brand-600 hover:bg-brand-50 transition-colors"
                  >
                    <Shield size={16} />
                    <span>Acessos</span>
                  </button>
                  <button
                    onClick={() => toggleStatus.mutate({ id: r.id, ativo: !r.ativo })}
                    disabled={toggleStatus.isPending}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      r.ativo 
                        ? 'text-red-600 hover:bg-red-50' 
                        : 'text-green-600 hover:bg-green-50'
                    }`}
                    title={r.ativo ? "Inativar Usuário" : "Ativar Usuário"}
                  >
                    {r.ativo ? <XCircle size={16} /> : <CheckCircle size={16} />}
                    <span>{r.ativo ? 'Inativar' : 'Ativar'}</span>
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

      {/* Modal de Permissões */}
      {permissionsModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-primary rounded-2xl shadow-xl border border-border w-full max-w-md overflow-hidden animate-fade-in">
            <div className="p-5 border-b border-border flex justify-between items-center bg-bg-secondary/50">
              <h3 className="font-semibold text-lg text-text-primary">
                Acessos: <span className="font-bold text-brand-500">{selectedUser.nome}</span>
              </h3>
              <button onClick={() => setPermissionsModalOpen(false)} className="text-text-secondary hover:text-text-primary">
                <XCircle size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-sm text-text-secondary mb-4">
                Selecione quais abas do sistema este usuário poderá visualizar e interagir.
              </p>

              <div className="space-y-3 max-h-60 overflow-y-auto">
                {AVAILABLE_MODULES.map(mod => (
                  <label key={mod.id} className="flex items-center gap-3 p-3 rounded-xl border border-border cursor-pointer hover:bg-bg-secondary transition-colors">
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
                  {updatePermissions.isPending ? 'Salvando...' : 'Salvar Acessos'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
