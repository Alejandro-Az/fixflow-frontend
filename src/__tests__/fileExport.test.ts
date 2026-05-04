/**
 * Tests: fileExport utility
 *
 * Verifica el comportamiento de la función exportFile:
 * - Descarga correctamente en web (usando data URL)
 * - Maneja respuestas inválidas del servidor
 * - Maneja errores 403 (plan insuficiente) sin lanzar excepciones
 * - Maneja errores de red genéricos
 */

import { exportFile } from '../utils/fileExport';
import apiClient from '../api/client';

// Mockear Platform para simular entorno web
jest.mock('react-native', () => ({
    Platform: { OS: 'web' },
    Alert: { alert: jest.fn() },
}));

// Silenciar el alert del navegador en tests
global.alert = jest.fn();

// Mock del DOM para simular la descarga web
const mockClick = jest.fn();
const mockAppend = jest.fn();
const mockRemove = jest.fn();
const mockAnchor = {
    href: '',
    download: '',
    click: mockClick,
};

Object.defineProperty(global, 'document', {
    value: {
        createElement: jest.fn(() => mockAnchor),
        body: {
            appendChild: mockAppend,
            removeChild: mockRemove,
        },
    },
    writable: true,
});

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

// ─── Helpers ──────────────────────────────────────────────────────────────

const mockSuccessResponse = (overrides = {}) => ({
    data: {
        ok: true,
        data: {
            content_base64: 'dGVzdA==', // "test" en base64
            mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            file_name: 'inventario.xlsx',
            ...overrides,
        },
    },
});

// ─── Tests ────────────────────────────────────────────────────────────────

describe('exportFile utility', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ── Caso exitoso ──

    test('web: descarga el archivo correctamente cuando el servidor responde OK', async () => {
        mockedApiClient.get.mockResolvedValueOnce(mockSuccessResponse());

        const result = await exportFile('/workspaces/1/export/inventory');

        expect(result).toBe(true);
        expect(mockedApiClient.get).toHaveBeenCalledWith('/workspaces/1/export/inventory');
        expect(mockClick).toHaveBeenCalledTimes(1);
        expect(mockAnchor.download).toBe('inventario.xlsx');
    });

    test('web: el href del anchor contiene el mimeType y base64 correctos', async () => {
        mockedApiClient.get.mockResolvedValueOnce(mockSuccessResponse());

        await exportFile('/workspaces/1/export/inventory');

        expect(mockAnchor.href).toContain('data:application/vnd.openxmlformats');
        expect(mockAnchor.href).toContain('dGVzdA==');
    });

    // ── Respuestas inválidas del servidor ──

    test('falla si el servidor responde con ok: false', async () => {
        mockedApiClient.get.mockResolvedValueOnce({ data: { ok: false } });

        const result = await exportFile('/workspaces/1/export/inventory');

        expect(result).toBe(false);
        expect(mockClick).not.toHaveBeenCalled();
    });

    test('falla si falta content_base64 en la respuesta', async () => {
        mockedApiClient.get.mockResolvedValueOnce(
            mockSuccessResponse({ content_base64: undefined })
        );

        const result = await exportFile('/workspaces/1/export/inventory');

        expect(result).toBe(false);
    });

    test('falla si falta file_name en la respuesta', async () => {
        mockedApiClient.get.mockResolvedValueOnce(
            mockSuccessResponse({ file_name: undefined })
        );

        const result = await exportFile('/workspaces/1/export/inventory');

        expect(result).toBe(false);
    });

    test('falla si falta mime_type en la respuesta', async () => {
        mockedApiClient.get.mockResolvedValueOnce(
            mockSuccessResponse({ mime_type: undefined })
        );

        const result = await exportFile('/workspaces/1/export/inventory');

        expect(result).toBe(false);
    });

    // ── Error 403 (plan insuficiente) ──

    test('retorna false y muestra alert si el backend responde 403 AUTH_FORBIDDEN', async () => {
        mockedApiClient.get.mockRejectedValueOnce({
            response: {
                status: 403,
                data: { error: { code: 'AUTH_FORBIDDEN', message: 'Plan insuficiente' } },
            },
        });

        const result = await exportFile('/workspaces/1/export/maintenance/pdf');

        expect(result).toBe(false);
        expect(global.alert).toHaveBeenCalledWith(
            expect.stringContaining('exclusiva para usuarios Pro')
        );
    });

    test('error 403 no lanza excepción (retorna false gracefulmente)', async () => {
        mockedApiClient.get.mockRejectedValueOnce({
            response: { status: 403, data: { error: { code: 'AUTH_FORBIDDEN' } } },
        });

        await expect(exportFile('/any/endpoint')).resolves.toBe(false);
    });

    // ── Errores de red ──

    test('retorna false si hay error de red (sin response)', async () => {
        mockedApiClient.get.mockRejectedValueOnce(new Error('Network Error'));

        const result = await exportFile('/workspaces/1/export/inventory');

        expect(result).toBe(false);
    });

    test('retorna false si el servidor responde con error 500', async () => {
        mockedApiClient.get.mockRejectedValueOnce({
            response: {
                status: 500,
                data: { error: { message: 'Internal Server Error' } },
            },
        });

        const result = await exportFile('/workspaces/1/export/inventory');

        expect(result).toBe(false);
    });
});
