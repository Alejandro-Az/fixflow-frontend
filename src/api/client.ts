import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const API_PORT = 8000;
const API_PREFIX = '/api/v1';

function getBaseUrl(): string {
    if (Platform.OS === 'web') {
        return `http://localhost:${API_PORT}${API_PREFIX}`;
    }

    if (__DEV__) {
        const metroHost = Constants.expoConfig?.hostUri?.split(':').shift();
        if (metroHost && metroHost !== 'localhost') {
            return `http://${metroHost}:${API_PORT}${API_PREFIX}`;
        }
    }

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
