import { create } from 'zustand'
import axios from 'axios'
import api from '../services/api'

export interface User {
  id?: number
  email: string
  nome: string
  role?: string
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

      localStorage.setItem('coliseu_token', token)
      localStorage.setItem('coliseu_user', JSON.stringify(user))
      
      set({ user, token, loading: false })
      return true
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.response?.data?.message || 'Email ou senha incorretos, ou módulo não contratado'
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
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.response?.data?.message || 'Erro ao cadastrar'
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
    set({ user: null, token: null })
  },
}))
