/**
 * Tests: Lógica de límites de plan (Plan Limits)
 *
 * Verifica que los límites de workspaces, equipos y componentes
 * se calculen correctamente según el plan activo del usuario.
 * Esta lógica está distribuida en index.tsx y workspace/[id].tsx.
 */

// ─── Helpers replicados de la UI ───────────────────────────────────────────

type Plan = 'free' | 'pro' | 'premium' | 'enterprise';

function getWorkspaceLimit(plan: Plan): number {
    if (plan === 'free') return 1;
    if (plan === 'pro') return 2;
    if (plan === 'premium') return 3;
    return Infinity;
}

function getDeviceLimit(plan: Plan): number {
    if (plan === 'free') return 2;
    if (plan === 'pro') return 8;
    if (plan === 'premium') return 10;
    return Infinity;
}

function isWorkspaceLocked(index: number, plan: Plan): boolean {
    return index >= getWorkspaceLimit(plan);
}

function isDeviceLocked(index: number, plan: Plan): boolean {
    return index >= getDeviceLimit(plan);
}

function canAddComponent(existingCountInCategory: number, plan: Plan): boolean {
    if (plan === 'free') return existingCountInCategory < 1;
    return true; // pro, premium, enterprise: ilimitados
}

function canExportInventory(plan: Plan): boolean {
    return plan !== 'free';
}

function canExportMaintenance(plan: Plan): boolean {
    return plan === 'premium' || plan === 'enterprise';
}

function canUseMaintenanceNotes(plan: Plan): boolean {
    return plan === 'premium' || plan === 'enterprise';
}

function canManagePhotos(plan: Plan): boolean {
    return plan !== 'free';
}

// ─── Tests: Workspace Limits ───────────────────────────────────────────────

describe('Límites de Workspaces por Plan', () => {
    test('free: límite de 1 workspace', () => {
        expect(getWorkspaceLimit('free')).toBe(1);
    });

    test('pro: límite de 2 workspaces', () => {
        expect(getWorkspaceLimit('pro')).toBe(2);
    });

    test('premium: límite de 3 workspaces', () => {
        expect(getWorkspaceLimit('premium')).toBe(3);
    });

    test('enterprise: sin límite (Infinity)', () => {
        expect(getWorkspaceLimit('enterprise')).toBe(Infinity);
    });

    test('free: el workspace en índice 0 NO está bloqueado', () => {
        expect(isWorkspaceLocked(0, 'free')).toBe(false);
    });

    test('free: el workspace en índice 1 SÍ está bloqueado (downgrade)', () => {
        expect(isWorkspaceLocked(1, 'free')).toBe(true);
    });

    test('pro: workspace en índice 1 NO está bloqueado', () => {
        expect(isWorkspaceLocked(1, 'pro')).toBe(false);
    });

    test('pro: workspace en índice 2 SÍ está bloqueado (downgrade)', () => {
        expect(isWorkspaceLocked(2, 'pro')).toBe(true);
    });

    test('premium: workspaces 0, 1, 2 accesibles; 3 bloqueado', () => {
        expect(isWorkspaceLocked(0, 'premium')).toBe(false);
        expect(isWorkspaceLocked(1, 'premium')).toBe(false);
        expect(isWorkspaceLocked(2, 'premium')).toBe(false);
        expect(isWorkspaceLocked(3, 'premium')).toBe(true);
    });

    test('enterprise: ningún workspace bloqueado (índice 99)', () => {
        expect(isWorkspaceLocked(99, 'enterprise')).toBe(false);
    });
});

// ─── Tests: Device (Equipo) Limits ────────────────────────────────────────

describe('Límites de Equipos por Plan', () => {
    test('free: límite de 2 equipos por workspace', () => {
        expect(getDeviceLimit('free')).toBe(2);
    });

    test('pro: límite de 8 equipos por workspace', () => {
        expect(getDeviceLimit('pro')).toBe(8);
    });

    test('premium: límite de 10 equipos por workspace', () => {
        expect(getDeviceLimit('premium')).toBe(10);
    });

    test('enterprise: sin límite (Infinity)', () => {
        expect(getDeviceLimit('enterprise')).toBe(Infinity);
    });

    test('free: equipos 0 y 1 accesibles; equipo 2 bloqueado', () => {
        expect(isDeviceLocked(0, 'free')).toBe(false);
        expect(isDeviceLocked(1, 'free')).toBe(false);
        expect(isDeviceLocked(2, 'free')).toBe(true);
    });

    test('pro: equipo 7 accesible; equipo 8 bloqueado', () => {
        expect(isDeviceLocked(7, 'pro')).toBe(false);
        expect(isDeviceLocked(8, 'pro')).toBe(true);
    });
});

// ─── Tests: Componentes por Categoría ─────────────────────────────────────

describe('Límites de Componentes por Categoría (Free: 1 por categoría)', () => {
    test('free con 0 componentes en la categoría: puede agregar', () => {
        expect(canAddComponent(0, 'free')).toBe(true);
    });

    test('free con 1 componente en la categoría: NO puede agregar', () => {
        expect(canAddComponent(1, 'free')).toBe(false);
    });

    test('pro con 10 componentes en la categoría: SÍ puede agregar', () => {
        expect(canAddComponent(10, 'pro')).toBe(true);
    });

    test('premium con 100 componentes: SÍ puede agregar', () => {
        expect(canAddComponent(100, 'premium')).toBe(true);
    });
});

// ─── Tests: Exportaciones ─────────────────────────────────────────────────

describe('Permisos de Exportación por Plan', () => {
    describe('Exportar Inventario (Excel)', () => {
        test('free: NO puede exportar inventario', () => {
            expect(canExportInventory('free')).toBe(false);
        });

        test('pro: SÍ puede exportar inventario', () => {
            expect(canExportInventory('pro')).toBe(true);
        });

        test('premium: SÍ puede exportar inventario', () => {
            expect(canExportInventory('premium')).toBe(true);
        });

        test('enterprise: SÍ puede exportar inventario', () => {
            expect(canExportInventory('enterprise')).toBe(true);
        });
    });

    describe('Exportar Mantenimiento (PDF/Excel)', () => {
        test('free: NO puede exportar mantenimiento', () => {
            expect(canExportMaintenance('free')).toBe(false);
        });

        test('pro: NO puede exportar mantenimiento', () => {
            expect(canExportMaintenance('pro')).toBe(false);
        });

        test('premium: SÍ puede exportar mantenimiento', () => {
            expect(canExportMaintenance('premium')).toBe(true);
        });

        test('enterprise: SÍ puede exportar mantenimiento', () => {
            expect(canExportMaintenance('enterprise')).toBe(true);
        });
    });
});

// ─── Tests: Wizard de Mantenimiento ───────────────────────────────────────

describe('Wizard de Mantenimiento - Notas y Observaciones', () => {
    test('free: NO puede usar notas en el wizard', () => {
        expect(canUseMaintenanceNotes('free')).toBe(false);
    });

    test('pro: NO puede usar notas en el wizard', () => {
        expect(canUseMaintenanceNotes('pro')).toBe(false);
    });

    test('premium: SÍ puede usar notas en el wizard', () => {
        expect(canUseMaintenanceNotes('premium')).toBe(true);
    });

    test('enterprise: SÍ puede usar notas en el wizard', () => {
        expect(canUseMaintenanceNotes('enterprise')).toBe(true);
    });
});

// ─── Tests: Fotos por Componente ──────────────────────────────────────────

describe('Gestión de Fotos por Plan', () => {
    test('free: NO puede subir/editar fotos (solo lectura)', () => {
        expect(canManagePhotos('free')).toBe(false);
    });

    test('pro: SÍ puede subir y editar fotos', () => {
        expect(canManagePhotos('pro')).toBe(true);
    });

    test('premium: SÍ puede subir y editar fotos', () => {
        expect(canManagePhotos('premium')).toBe(true);
    });

    test('enterprise: SÍ puede subir y editar fotos', () => {
        expect(canManagePhotos('enterprise')).toBe(true);
    });
});
