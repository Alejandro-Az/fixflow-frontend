/**
 * Adaptador de almacenamiento seguro multiplataforma.
 *
 * - Nativo (iOS/Android): usa expo-secure-store (keychain/keystore cifrado)
 * - Web: usa localStorage como fallback (no cifrado, pero funcional para dev)
 *
 * Nunca lanzar errores de red desde aquí. Los errores de almacenamiento
 * deben propagarse con el prefijo 'STORAGE_ERROR' para identificarlos
 * correctamente en el catch del login.
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export const storage = {
    setItem: async (key: string, value: string): Promise<void> => {
        if (Platform.OS === 'web') {
            try {
                localStorage.setItem(key, value);
            } catch (e) {
                throw new Error(`STORAGE_ERROR: No se pudo guardar "${key}" en localStorage.`);
            }
        } else {
            try {
                await SecureStore.setItemAsync(key, value);
            } catch (e) {
                throw new Error(`STORAGE_ERROR: No se pudo guardar "${key}" en SecureStore.`);
            }
        }
    },

    getItem: async (key: string): Promise<string | null> => {
        if (Platform.OS === 'web') {
            try {
                return localStorage.getItem(key);
            } catch (e) {
                return null;
            }
        } else {
            try {
                return await SecureStore.getItemAsync(key);
            } catch (e) {
                return null;
            }
        }
    },

    deleteItem: async (key: string): Promise<void> => {
        if (Platform.OS === 'web') {
            try {
                localStorage.removeItem(key);
            } catch (e) {}
        } else {
            try {
                await SecureStore.deleteItemAsync(key);
            } catch (e) {}
        }
    }
};
