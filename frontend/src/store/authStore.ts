import { create } from 'zustand'
import api from '../services/api'

export interface User {
  id: number
  email: string
  nome: string
  role: string
}

interface AuthState {
  user: User | null
  token: string | null
  loading: boolean
  error: string | null
  login: (email: string) => Promise<boolean>
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
  login: async (email) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.post<{ token: string; user: User }>('/auth/login', { email })
      localStorage.setItem('coliseu_token', data.token)
      localStorage.setItem('coliseu_user', JSON.stringify(data.user))
      set({ user: data.user, token: data.token, loading: false })
      return true
    } catch (e: any) {
      const msg = e?.response?.data?.error || 'Erro ao fazer login'
      set({ error: msg, loading: false })
      return false
    }
  },
  logout: async () => {
    try {
      await api.post('/auth/logout')
    } catch { /* ignore */ }
    localStorage.removeItem('coliseu_token')
    localStorage.removeItem('coliseu_user')
    set({ user: null, token: null })
  },
}))
