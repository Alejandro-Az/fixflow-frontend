/**
 * Store de autenticación con Zustand.
 *
 * Utiliza el adaptador `storage` para persistencia multiplataforma.
 * En web usa localStorage; en nativo usa expo-secure-store.
 *
 * Tipos de error manejados:
 * - STORAGE_ERROR: fallo al guardar/leer token
 * - HTTP error: el backend respondió con código de error
 * - Network error: sin respuesta del servidor
 */
import { create } from 'zustand';
import { storage } from '../api/storage';
import apiClient, { setApiToken } from '../api/client';

export interface User {
    id: string;
    name: string;
    email: string;
    username: string;
    plan: 'free' | 'pro' | 'premium' | 'enterprise';
}

interface AuthState {
    token: string | null;
    user: User | null;
    isHydrated: boolean;
    setAuth: (token: string, user: User) => Promise<void>;
    logout: () => Promise<void>;
    hydrate: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    token: null,
    user: null,
    isHydrated: false,

    /**
     * Guarda token y usuario en storage seguro y actualiza el estado global.
     * Lanza STORAGE_ERROR si el almacenamiento falla (no es error de red).
     */
    setAuth: async (token: string, user: User) => {
        await storage.setItem('jwt_token', token);
        await storage.setItem('user_data', JSON.stringify(user));
        setApiToken(token);
        set({ token, user });
    },

    /**
     * Cierra sesión: invalida el token en el backend y limpia el storage local.
     * Si el request de logout falla, se limpia localmente de todas formas.
     */
    logout: async () => {
        try {
            await apiClient.post('/auth/logout');
        } catch (e) {
            // Ignorar errores de red en logout — la sesión local se borra siempre
        }
        await storage.deleteItem('jwt_token');
        await storage.deleteItem('user_data');
        setApiToken(null);
        set({ token: null, user: null });
    },

    /**
     * Refresca los datos del usuario desde GET /auth/me.
     * Úsalo tras operaciones que cambian el plan (Stripe checkout).
     */
    refreshUser: async () => {
        try {
            const response = await apiClient.get('/auth/me');
            if (response.data.ok) {
                const freshUser: User = response.data.data;
                await storage.setItem('user_data', JSON.stringify(freshUser));
                set({ user: freshUser });
            }
        } catch {
            // Silencioso: si falla el refresh no cerramos sesión
        }
    },

    /**
     * Se ejecuta al arrancar la app. Rehidrata la sesión desde storage.
     * Valida el token contra GET /auth/me para asegurar que sigue vigente.
     * Si el token está revocado o expirado, limpia la sesión local.
     */
    hydrate: async () => {
        try {
            const token = await storage.getItem('jwt_token');
            const userData = await storage.getItem('user_data');

            if (!token || !userData) {
                setApiToken(null);
                set({ isHydrated: true });
                return;
            }

            setApiToken(token);

            // Validar token con el backend (refresca el plan y datos del usuario)
            try {
                const response = await apiClient.get('/auth/me', {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (response.data.ok) {
                    const freshUser: User = response.data.data;
                    await storage.setItem('user_data', JSON.stringify(freshUser));
                    set({ token, user: freshUser, isHydrated: true });
                    return;
                }
            } catch (e: any) {
                if (e.response && (e.response.status === 401 || e.response.status === 403)) {
                    // Token revocado o expirado — limpiar sesión local
                    await storage.deleteItem('jwt_token');
                    await storage.deleteItem('user_data');
                    setApiToken(null);
                    set({ token: null, user: null, isHydrated: true });
                    return;
                }
                // Si es error de red, usar los datos en cache sin validar
                const cachedUser: User = JSON.parse(userData);
                set({ token, user: cachedUser, isHydrated: true });
                return;
            }

            set({ isHydrated: true });
        } catch (e) {
            // Error de storage en hydrate — tratar como sesión inexistente
            set({ isHydrated: true });
        }
    }
}));
