import axios from 'axios';
import { storage } from './storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const API_PORT = 8000;
const API_PREFIX = '/api/v1';

/**
 * Resuelve la URL base del API según el entorno:
 *
 * - Web: siempre localhost (el navegador está en la misma máquina)
 * - Dev en dispositivo físico (Android/iOS): usa la misma IP del servidor
 *   de Metro Bundler, que corre en la misma PC que el backend.
 * - Android emulator: 10.0.2.2 (alias del host desde el emulador)
 * - iOS simulator: localhost
 */
function getBaseUrl(): string {
    if (Platform.OS === 'web') {
        return `http://localhost:${API_PORT}${API_PREFIX}`;
    }

    if (__DEV__) {
        // hostUri tiene el formato "192.168.x.x:8081" — tomamos solo la IP
        const metroHost = Constants.expoConfig?.hostUri?.split(':').shift();
        if (metroHost && metroHost !== 'localhost') {
            return `http://${metroHost}:${API_PORT}${API_PREFIX}`;
        }
    }

    // Fallback por plataforma
    if (Platform.OS === 'android') return `http://10.0.2.2:${API_PORT}${API_PREFIX}`;
    return `http://localhost:${API_PORT}${API_PREFIX}`;
}

const BASE_URL = getBaseUrl();

if (__DEV__) {
    console.log(`[API] Base URL → ${BASE_URL}`);
}

export const apiClient = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

// Interceptor: inyecta Bearer token en cada petición
apiClient.interceptors.request.use(async (config) => {
    try {
        const token = await storage.getItem('jwt_token');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        if (__DEV__) {
            console.log(`[API] ${config.method?.toUpperCase()} → ${config.baseURL}${config.url}`);
        }
    } catch (e) {}
    return config;
});

export default apiClient;
