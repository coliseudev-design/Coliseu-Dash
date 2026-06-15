import { create } from 'zustand'
import axios from 'axios'
import api from '../services/api'

export interface User {
  id?: number
  email: string
  nome: string
  role?: string
  permissions?: string[] | null
  versao?: string
  layout_version?: string
  available_versions?: string[]
}

interface AuthState {
  user: User | null
  token: string | null
  loading: boolean
  error: string | null
  login: (email: string, senha?: string) => Promise<boolean>
  register: (nome: string, email: string, senha: string, companyKey: string) => Promise<boolean>
  logout: () => Promise<void>
  init: () => void
  updateUserVersion: (versao: string) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  loading: false,
  error: null,
  init: () => {
    const token = localStorage.getItem('coliseu_token')
    const userStr = localStorage.getItem('coliseu_user')
    if (token && userStr) {
      try {
        set({ token, user: JSON.parse(userStr) })
      } catch { /* ignore */ }
    }
  },
  login: async (email, senha) => {
    set({ loading: true, error: null })
    try {
      // Login via Backend Interno do Dashboard
      const { data } = await api.post('/auth/login', { 
          email, 
          password: senha
      })
      
      // O Identity devolve pelo menos o token
      const token = data.token
      // Se não devolver user object, criamos um mock pra manter a UI feliz. Normalmente devolve user ou profile.
      const user = data.user || data.profile || { email, nome: data.companyName || email }
      user.versao = data.user?.versao || data.profile?.versao || data.user?.layout_version || data.profile?.layout_version || 'Dash 1.0';
      user.layout_version = user.versao;
      user.available_versions = data.user?.available_versions || data.profile?.available_versions || [user.versao];

      localStorage.setItem('coliseu_token', token)
      localStorage.setItem('coliseu_user', JSON.stringify(user))
      
      // Propaga o token para o syncWorker (se ativo)
      const w = (window as any).__syncWorker
      if (w) w.postMessage({ type: 'SET_TOKEN', token })
      
      set({ user, token, loading: false })
      return true
    } catch (e: unknown) {
      let msg = 'Email ou senha incorretos, ou módulo não contratado'
      if (axios.isAxiosError(e) && e.response?.data) {
        msg = e.response.data.error || e.response.data.message || msg
      }
      set({ error: msg, loading: false })
      return false
    }
  },
  register: async (nome, email, senha, companyKey) => {
    set({ loading: true, error: null })
    try {
      await api.post('/auth/register', { nome, email, password: senha, companyKey })
      // Se sucesso no cadastro, faz o login logo em seguida
      return await useAuthStore.getState().login(email, senha)
    } catch (e: unknown) {
      let msg = 'Erro ao cadastrar'
      if (axios.isAxiosError(e) && e.response?.data) {
        msg = e.response.data.error || e.response.data.message || msg
      }
      set({ error: msg, loading: false })
      return false
    }
  },
  logout: async () => {
    try {
      // Rotas internas que precisem de limpeza (se houver)
      await api.post('/auth/logout').catch(() => {})
    } catch { /* ignore */ }
    localStorage.removeItem('coliseu_token')
    localStorage.removeItem('coliseu_user')
    // Para o worker e limpa o token
    const w = (window as any).__syncWorker
    if (w) {
      w.postMessage({ type: 'STOP' })
      ;(window as any).__syncWorker = null
    }
    set({ user: null, token: null })
  },
  updateUserVersion: (versao) => {
    set((state) => {
      if (state.user) {
        const updatedUser = { 
          ...state.user, 
          versao, 
          layout_version: versao 
        }
        localStorage.setItem('coliseu_user', JSON.stringify(updatedUser))
        return { user: updatedUser }
      }
      return {}
    })
  }
}))
