import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const API_PORT = 8000;
const API_PREFIX = '/api/v1';

/**
 * Determina la base URL de la API.
 *
 * Orden de prioridad:
 * 1. EXPO_PUBLIC_API_URL en .env (recomendado para producción y staging)
 * 2. Detección automática del host de Metro para desarrollo nativo
 * 3. Fallback por plataforma (Android emulator / iOS simulator / web)
 */
function getBaseUrl(): string {
    // 1. Variable de entorno explícita (se lee en build time por Expo)
    const envUrl = process.env.EXPO_PUBLIC_API_URL;
    if (envUrl) {
        return envUrl;
    }

    // 2. En web siempre localhost (misma máquina)
    if (Platform.OS === 'web') {
        return `http://localhost:${API_PORT}${API_PREFIX}`;
    }

    // 3. En desarrollo nativo: usar el host donde corre Metro
    if (__DEV__) {
        const metroHost = Constants.expoConfig?.hostUri?.split(':').shift();
        if (metroHost && metroHost !== 'localhost') {
            return `http://${metroHost}:${API_PORT}${API_PREFIX}`;
        }
    }

    // 4. Fallback por plataforma
    if (Platform.OS === 'android') return `http://10.0.2.2:${API_PORT}${API_PREFIX}`;
    return `http://localhost:${API_PORT}${API_PREFIX}`;
}

const BASE_URL = getBaseUrl();

const apiClient = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
    },
});

let currentToken: string | null = null;

export const setApiToken = (token: string | null) => {
    currentToken = token;
};

apiClient.interceptors.request.use((config) => {
    try {
        if (currentToken && config.headers) {
            config.headers.Authorization = `Bearer ${currentToken}`;
        }
    } catch {
    }

    return config;
});

apiClient.interceptors.response.use(
    (response) => response,
    (error) => Promise.reject(error)
);

export default apiClient;
