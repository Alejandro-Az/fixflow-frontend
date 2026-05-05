import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, ActivityIndicator } from '../../src/components/ui';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CheckCircle2 } from 'lucide-react-native';
import { useAuthStore } from '../../src/store/useAuthStore';

const PLAN_LABELS: Record<string, string> = {
    pro: 'Pro',
    premium: 'Premium',
    enterprise: 'Enterprise',
};

const PLAN_COLORS: Record<string, string> = {
    pro: '#6699cc',
    premium: '#39ff14',
    enterprise: '#ff00ff',
};

// Reintentos: cada 3s durante hasta 60s esperando el webhook de Stripe
const RETRY_INTERVAL_MS = 3000;
const MAX_RETRIES = 20; // 60 segundos máximo

export default function BillingSuccessScreen() {
    const router = useRouter();
    const { refreshUser, user } = useAuthStore();
    const [syncing, setSyncing] = useState(true);
    const [retryCount, setRetryCount] = useState(0);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // El plan viene como ?plan=pro desde la success_url que armamos nosotros.
    // Se muestra inmediatamente sin depender del webhook.
    const params = useLocalSearchParams<{ plan?: string }>();
    const planId = params.plan ?? 'pro';
    const planLabel = PLAN_LABELS[planId] ?? planId;
    const planColor = PLAN_COLORS[planId] ?? '#6699cc';

    useEffect(() => {
        let attempt = 0;

        const trySync = async () => {
            try {
                await refreshUser();
            } catch {
                // silencioso
            }

            attempt++;
            setRetryCount(attempt);

            // Leer el plan actual del store después del refresh
            const currentPlan = useAuthStore.getState().user?.plan;

            if (currentPlan === planId) {
                // ✅ El plan ya se actualizó — dejamos de reintentar
                setSyncing(false);
                return;
            }

            if (attempt >= MAX_RETRIES) {
                // Timeout — dejamos de reintentar pero no bloqueamos al usuario
                setSyncing(false);
                return;
            }

            // Seguir reintentando
            timerRef.current = setTimeout(trySync, RETRY_INTERVAL_MS);
        };

        trySync();

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [planId]);

    const secondsWaited = retryCount * (RETRY_INTERVAL_MS / 1000);

    return (
        <SafeAreaView className="flex-1 bg-background justify-center items-center px-6">
            <View className="w-full max-w-sm bg-surface border border-border rounded-2xl p-8 items-center">

                {/* Icono */}
                <View
                    style={{
                        width: 80,
                        height: 80,
                        borderRadius: 40,
                        backgroundColor: planColor + '18',
                        borderWidth: 2,
                        borderColor: planColor + '50',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 24,
                    }}
                >
                    <CheckCircle2 color={planColor} size={44} />
                </View>

                <Text className="text-text font-bold text-[22px] text-center mb-2">
                    ¡Bienvenido a FixFlow {planLabel}!
                </Text>

                <Text className="text-textMuted text-center text-[14px] mb-6">
                    Tu suscripción está activa. Ahora tienes acceso completo a todas las funciones del plan {planLabel}.
                </Text>

                {/* Estado de sincronización */}
                {syncing ? (
                    <View
                        style={{
                            backgroundColor: planColor + '12',
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: planColor + '30',
                            padding: 12,
                            width: '100%',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 10,
                            marginBottom: 20,
                        }}
                    >
                        <ActivityIndicator color={planColor} size="small" />
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: planColor, fontSize: 13, fontWeight: '600' }}>
                                Confirmando con Stripe…
                            </Text>
                            <Text className="text-textMuted text-[11px]">
                                Espera un momento mientras activamos tu plan.
                            </Text>
                        </View>
                    </View>
                ) : (
                    <View
                        style={{
                            backgroundColor: planColor + '12',
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: planColor + '30',
                            padding: 12,
                            width: '100%',
                            alignItems: 'center',
                            marginBottom: 20,
                        }}
                    >
                        <Text style={{ color: planColor, fontSize: 13, fontWeight: '600' }}>
                            ✓ Plan {planLabel} activado
                        </Text>
                    </View>
                )}

                <TouchableOpacity
                    onPress={() => {
                        // Cancelar reintentos pendientes antes de navegar
                        if (timerRef.current) clearTimeout(timerRef.current);
                        router.replace('/');
                    }}
                    className="w-full py-4 rounded-xl items-center mb-3"
                    style={{ backgroundColor: planColor }}
                >
                    <Text className="font-bold text-[15px] text-[#141313]">
                        {syncing ? 'Ir al dashboard (puede tardar un momento)' : 'Ir al dashboard'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => router.replace('/plans' as any)}
                    className="py-2"
                >
                    <Text className="text-textMuted text-[13px]">Ver mis planes</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
