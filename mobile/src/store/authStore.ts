import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import api from '../services/api';

export interface Company {
  id: string;
  name: string;
}

export interface User {
  id?: number;
  email: string;
  nome: string;
  role?: string;
  tenant_id?: string;
  company_name?: string;
  permissions?: string[] | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  requiresSelection: boolean;
  companies: Company[];
  cachedEmail: string | null;
  isBiometricAvailable: boolean;

  checkAuth: () => Promise<void>;
  login: (email: string, password?: string, tenantId?: string) => Promise<{ success: boolean; requiresSelection?: boolean }>;
  loginWithBiometrics: () => Promise<boolean>;
  selectCompany: (company: Company) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  requiresSelection: false,
  companies: [],
  cachedEmail: null,
  isBiometricAvailable: false,

  clearError: () => set({ error: null }),

  checkAuth: async () => {
    try {
      set({ isLoading: true });

      // Verificar suporte a biometria
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const isBiometricAvailable = hasHardware && isEnrolled;

      const token = await SecureStore.getItemAsync('coliseu_token');
      const userStr = await SecureStore.getItemAsync('coliseu_user');
      const cachedEmail = await SecureStore.getItemAsync('coliseu_cached_email');

      if (token && userStr) {
        try {
          const user = JSON.parse(userStr);
          set({
            token,
            user,
            isAuthenticated: true,
            cachedEmail,
            isBiometricAvailable,
            isLoading: false,
          });
          return;
        } catch {
          // JSON inválido, prosseguir deslogado
        }
      }

      set({
        token: null,
        user: null,
        isAuthenticated: false,
        cachedEmail,
        isBiometricAvailable,
        isLoading: false,
      });
    } catch (e: any) {
      set({ isLoading: false, error: e.message || 'Erro ao inicializar' });
    }
  },

  login: async (email: string, password?: string, tenantId?: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/login', {
        email: email.trim(),
        password,
        selectedTenantId: tenantId,
        versao: 'Dash 1.0',
      });

      const data = response.data;

      // Caso o usuário precise selecionar uma empresa entre várias
      if (data.requiresSelection) {
        set({
          isLoading: false,
          requiresSelection: true,
          companies: data.companies || [],
        });
        return { success: true, requiresSelection: true };
      }

      const token = data.token;
      const user: User = data.user || {
        email,
        nome: data.nome || email.split('@')[0],
        tenant_id: tenantId || data.tenant_id,
        company_name: data.company_name || data.empresa,
      };

      // Armazenar credenciais de forma segura no SecureStore (Keychain / Keystore)
      await SecureStore.setItemAsync('coliseu_token', token);
      await SecureStore.setItemAsync('coliseu_user', JSON.stringify(user));
      await SecureStore.setItemAsync('coliseu_cached_email', email.trim());
      if (password) {
        await SecureStore.setItemAsync('coliseu_cached_pwd', password);
      }

      set({
        token,
        user,
        isAuthenticated: true,
        isLoading: false,
        requiresSelection: false,
        cachedEmail: email.trim(),
      });

      return { success: true, requiresSelection: false };
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'E-mail ou senha inválidos';
      set({ isLoading: false, error: msg });
      return { success: false };
    }
  },

  loginWithBiometrics: async () => {
    try {
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) return false;

      const authResult = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Entrar no ColiseuDash',
        fallbackLabel: 'Usar Senha',
        cancelLabel: 'Cancelar',
        disableDeviceFallback: false,
      });

      if (!authResult.success) return false;

      const cachedEmail = await SecureStore.getItemAsync('coliseu_cached_email');
      const cachedPwd = await SecureStore.getItemAsync('coliseu_cached_pwd');
      const cachedTenant = await SecureStore.getItemAsync('coliseu_cached_tenant');

      if (cachedEmail && cachedPwd) {
        const res = await get().login(cachedEmail, cachedPwd, cachedTenant || undefined);
        return res.success;
      }

      return false;
    } catch {
      return false;
    }
  },

  selectCompany: async (company: Company) => {
    const cachedEmail = get().cachedEmail || (await SecureStore.getItemAsync('coliseu_cached_email'));
    const cachedPwd = await SecureStore.getItemAsync('coliseu_cached_pwd');

    if (!cachedEmail || !cachedPwd) {
      set({ error: 'Sessão expirada. Digite suas credenciais novamente.' });
      return false;
    }

    await SecureStore.setItemAsync('coliseu_cached_tenant', company.id);
    const res = await get().login(cachedEmail, cachedPwd, company.id);
    return res.success;
  },

  logout: async () => {
    try {
      await SecureStore.deleteItemAsync('coliseu_token');
      await SecureStore.deleteItemAsync('coliseu_user');
      await SecureStore.deleteItemAsync('coliseu_cached_pwd');
      await SecureStore.deleteItemAsync('coliseu_cached_tenant');
    } catch {
      // Ignorar
    }
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      requiresSelection: false,
      companies: [],
    });
  },
}));
