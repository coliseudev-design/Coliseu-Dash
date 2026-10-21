import axios, { AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';

export const API_BASE_URL = 'https://dashboard.coliseusistemas.com.br/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 25000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

let onUnauthorizedCallback: (() => void) | null = null;

export function setUnauthorizedCallback(callback: () => void) {
  onUnauthorizedCallback = callback;
}

api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('coliseu_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // Falha silenciosa de leitura de chave segura
  }

  // Fuso horário do dispositivo para sincronização perfeita de datas no Postgres
  const offsetMinutes = -new Date().getTimezoneOffset();
  config.headers['X-Timezone-Offset'] = offsetMinutes.toString();

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) {
      config.headers['X-User-Timezone'] = tz;
    }
  } catch {
    // Ignorar fallback
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      try {
        await SecureStore.deleteItemAsync('coliseu_token');
        await SecureStore.deleteItemAsync('coliseu_user');
      } catch {
        // Ignorar
      }
      if (onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }
    }
    return Promise.reject(error);
  }
);

export default api;
