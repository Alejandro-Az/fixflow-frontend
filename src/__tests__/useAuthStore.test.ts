/**
 * Tests: useAuthStore (Zustand)
 *
 * Verifica el comportamiento del store de autenticación:
 * - setAuth: guarda token y usuario correctamente
 * - logout: limpia el estado y el storage
 * - refreshUser: actualiza el usuario con datos frescos del backend
 * - hydrate: rehidrata la sesión desde storage al arrancar la app
 * - hydrate: maneja token expirado (401) limpiando la sesión
 * - hydrate: maneja error de red usando datos en caché
 */

import { useAuthStore } from '../store/useAuthStore';
import apiClient, { setApiToken } from '../api/client';
import { storage } from '../api/storage';

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;
const mockedStorage = storage as jest.Mocked<typeof storage>;
const mockedSetApiToken = setApiToken as jest.MockedFunction<typeof setApiToken>;

// ─── Datos de prueba ───────────────────────────────────────────────────────

const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';

const mockFreeUser = {
    id: 'user-1',
    name: 'Test Free',
    email: 'free@fixflow.test',
    username: 'testfree',
    plan: 'free' as const,
};

const mockProUser = {
    ...mockFreeUser,
    id: 'user-2',
    email: 'pro@fixflow.test',
    plan: 'pro' as const,
};

const mockPremiumUser = {
    ...mockFreeUser,
    id: 'user-3',
    email: 'premium@fixflow.test',
    plan: 'premium' as const,
};

// ─── Setup ─────────────────────────────────────────────────────────────────

beforeEach(() => {
    jest.clearAllMocks();
    // Resetear el store antes de cada test
    useAuthStore.setState({ token: null, user: null, isHydrated: false });
});

// ─── Tests: setAuth ────────────────────────────────────────────────────────

describe('setAuth', () => {
    test('guarda el token y el usuario en el estado del store', async () => {
        await useAuthStore.getState().setAuth(mockToken, mockFreeUser);

        const { token, user } = useAuthStore.getState();
        expect(token).toBe(mockToken);
        expect(user).toEqual(mockFreeUser);
    });

    test('persiste el token en storage', async () => {
        await useAuthStore.getState().setAuth(mockToken, mockFreeUser);

        expect(mockedStorage.setItem).toHaveBeenCalledWith('jwt_token', mockToken);
    });

    test('persiste el usuario en storage como JSON', async () => {
        await useAuthStore.getState().setAuth(mockToken, mockFreeUser);

        expect(mockedStorage.setItem).toHaveBeenCalledWith(
            'user_data',
            JSON.stringify(mockFreeUser)
        );
    });

    test('configura el token en el cliente HTTP', async () => {
        await useAuthStore.getState().setAuth(mockToken, mockProUser);

        expect(mockedSetApiToken).toHaveBeenCalledWith(mockToken);
    });

    test('el plan del usuario se preserva correctamente (free)', async () => {
        await useAuthStore.getState().setAuth(mockToken, mockFreeUser);
        expect(useAuthStore.getState().user?.plan).toBe('free');
    });

    test('el plan del usuario se preserva correctamente (pro)', async () => {
        await useAuthStore.getState().setAuth(mockToken, mockProUser);
        expect(useAuthStore.getState().user?.plan).toBe('pro');
    });

    test('el plan del usuario se preserva correctamente (premium)', async () => {
        await useAuthStore.getState().setAuth(mockToken, mockPremiumUser);
        expect(useAuthStore.getState().user?.plan).toBe('premium');
    });
});

// ─── Tests: logout ────────────────────────────────────────────────────────

describe('logout', () => {
    beforeEach(async () => {
        // Iniciar con sesión activa
        useAuthStore.setState({ token: mockToken, user: mockFreeUser, isHydrated: true });
    });

    test('limpia token del store tras logout', async () => {
        mockedApiClient.post.mockResolvedValueOnce({ data: { ok: true } });

        await useAuthStore.getState().logout();

        expect(useAuthStore.getState().token).toBeNull();
    });

    test('limpia usuario del store tras logout', async () => {
        mockedApiClient.post.mockResolvedValueOnce({ data: { ok: true } });

        await useAuthStore.getState().logout();

        expect(useAuthStore.getState().user).toBeNull();
    });

    test('elimina jwt_token del storage', async () => {
        mockedApiClient.post.mockResolvedValueOnce({ data: { ok: true } });

        await useAuthStore.getState().logout();

        expect(mockedStorage.deleteItem).toHaveBeenCalledWith('jwt_token');
    });

    test('elimina user_data del storage', async () => {
        mockedApiClient.post.mockResolvedValueOnce({ data: { ok: true } });

        await useAuthStore.getState().logout();

        expect(mockedStorage.deleteItem).toHaveBeenCalledWith('user_data');
    });

    test('limpia el estado localmente aunque la llamada al backend falle', async () => {
        mockedApiClient.post.mockRejectedValueOnce(new Error('Network Error'));

        await useAuthStore.getState().logout();

        expect(useAuthStore.getState().token).toBeNull();
        expect(useAuthStore.getState().user).toBeNull();
    });

    test('invalida el token del cliente HTTP al hacer logout', async () => {
        mockedApiClient.post.mockResolvedValueOnce({ data: { ok: true } });

        await useAuthStore.getState().logout();

        expect(mockedSetApiToken).toHaveBeenCalledWith(null);
    });
});

// ─── Tests: refreshUser ───────────────────────────────────────────────────

describe('refreshUser', () => {
    beforeEach(() => {
        useAuthStore.setState({ token: mockToken, user: mockFreeUser, isHydrated: true });
    });

    test('actualiza el usuario en el store con los datos frescos del backend', async () => {
        const upgradedUser = { ...mockFreeUser, plan: 'pro' as const };
        mockedApiClient.get.mockResolvedValueOnce({
            data: { ok: true, data: upgradedUser },
        });

        await useAuthStore.getState().refreshUser();

        expect(useAuthStore.getState().user?.plan).toBe('pro');
    });

    test('persiste el usuario actualizado en storage', async () => {
        const upgradedUser = { ...mockFreeUser, plan: 'premium' as const };
        mockedApiClient.get.mockResolvedValueOnce({
            data: { ok: true, data: upgradedUser },
        });

        await useAuthStore.getState().refreshUser();

        expect(mockedStorage.setItem).toHaveBeenCalledWith(
            'user_data',
            JSON.stringify(upgradedUser)
        );
    });

    test('no modifica el store si el backend responde con ok: false', async () => {
        mockedApiClient.get.mockResolvedValueOnce({ data: { ok: false } });

        await useAuthStore.getState().refreshUser();

        expect(useAuthStore.getState().user?.plan).toBe('free');
    });

    test('no lanza excepción si el refresh falla por error de red', async () => {
        mockedApiClient.get.mockRejectedValueOnce(new Error('Network Error'));

        await expect(useAuthStore.getState().refreshUser()).resolves.not.toThrow();
    });

    test('mantiene el usuario anterior si el refresh falla', async () => {
        mockedApiClient.get.mockRejectedValueOnce(new Error('Network Error'));

        await useAuthStore.getState().refreshUser();

        expect(useAuthStore.getState().user).toEqual(mockFreeUser);
    });
});

// ─── Tests: hydrate ───────────────────────────────────────────────────────

describe('hydrate', () => {
    test('marca isHydrated: true aunque no haya token en storage', async () => {
        mockedStorage.getItem.mockResolvedValue(null);

        await useAuthStore.getState().hydrate();

        expect(useAuthStore.getState().isHydrated).toBe(true);
        expect(useAuthStore.getState().user).toBeNull();
    });

    test('rehidrata la sesión con datos frescos del backend si el token es válido', async () => {
        mockedStorage.getItem
            .mockResolvedValueOnce(mockToken)                        // jwt_token
            .mockResolvedValueOnce(JSON.stringify(mockFreeUser));    // user_data

        mockedApiClient.get.mockResolvedValueOnce({
            data: { ok: true, data: mockProUser }, // backend devuelve plan actualizado
        });

        await useAuthStore.getState().hydrate();

        expect(useAuthStore.getState().user?.plan).toBe('pro');
        expect(useAuthStore.getState().isHydrated).toBe(true);
    });

    test('limpia la sesión si el backend responde 401 (token expirado)', async () => {
        mockedStorage.getItem
            .mockResolvedValueOnce(mockToken)
            .mockResolvedValueOnce(JSON.stringify(mockFreeUser));

        mockedApiClient.get.mockRejectedValueOnce({
            response: { status: 401 },
        });

        await useAuthStore.getState().hydrate();

        expect(useAuthStore.getState().token).toBeNull();
        expect(useAuthStore.getState().user).toBeNull();
        expect(useAuthStore.getState().isHydrated).toBe(true);
    });

    test('limpia la sesión si el backend responde 403 (token revocado)', async () => {
        mockedStorage.getItem
            .mockResolvedValueOnce(mockToken)
            .mockResolvedValueOnce(JSON.stringify(mockFreeUser));

        mockedApiClient.get.mockRejectedValueOnce({
            response: { status: 403 },
        });

        await useAuthStore.getState().hydrate();

        expect(useAuthStore.getState().token).toBeNull();
        expect(useAuthStore.getState().user).toBeNull();
    });

    test('usa datos en caché si hay error de red (sin response)', async () => {
        mockedStorage.getItem
            .mockResolvedValueOnce(mockToken)
            .mockResolvedValueOnce(JSON.stringify(mockFreeUser));

        mockedApiClient.get.mockRejectedValueOnce(new Error('Network Error'));

        await useAuthStore.getState().hydrate();

        // Con error de red sin response, usa cache
        expect(useAuthStore.getState().user).toEqual(mockFreeUser);
        expect(useAuthStore.getState().isHydrated).toBe(true);
    });

    test('configura el token en el cliente HTTP durante hydrate exitoso', async () => {
        mockedStorage.getItem
            .mockResolvedValueOnce(mockToken)
            .mockResolvedValueOnce(JSON.stringify(mockFreeUser));

        mockedApiClient.get.mockResolvedValueOnce({
            data: { ok: true, data: mockFreeUser },
        });

        await useAuthStore.getState().hydrate();

        expect(mockedSetApiToken).toHaveBeenCalledWith(mockToken);
    });
});
