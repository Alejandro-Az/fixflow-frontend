import React, { useEffect, useState } from 'react';
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

export default function BillingSuccessScreen() {
    const router = useRouter();
    const { refreshUser, user } = useAuthStore();
    const [syncing, setSyncing] = useState(true);

    useEffect(() => {
        // Refrescamos el plan desde el backend. Stripe puede tardar unos segundos en
        // procesar el webhook; hacemos 3 intentos con 2s de pausa entre cada uno.
        let attempts = 0;
        const sync = async () => {
            try {
                await refreshUser();
            } catch {
                // silencioso
            } finally {
                attempts++;
                if (attempts < 3) {
                    setTimeout(sync, 2000);
                } else {
                    setSyncing(false);
                }
            }
        };
        sync();
    }, []);

    const plan = user?.plan ?? 'pro';
    const planLabel = PLAN_LABELS[plan] ?? plan;
    const planColor = PLAN_COLORS[plan] ?? '#6699cc';

    return (
        <SafeAreaView className="flex-1 bg-background justify-center items-center px-6">
            <View className="w-full max-w-sm bg-surface border border-border rounded-2xl p-8 items-center">

                {/* Icono */}
                <View
                    className="w-20 h-20 rounded-full items-center justify-center mb-6"
                    style={{ backgroundColor: planColor + '18', borderWidth: 2, borderColor: planColor + '50' }}
                >
                    <CheckCircle2 color={planColor} size={44} />
                </View>

                <Text className="text-text font-bold text-[22px] text-center mb-2">
                    ¡Bienvenido a FixFlow {planLabel}!
                </Text>

                <Text className="text-textMuted text-center text-[14px] mb-6">
                    Tu suscripción está activa. Ahora tienes acceso completo a todas las funciones del plan {planLabel}.
                </Text>

                {syncing && (
                    <View className="flex-row items-center gap-2 mb-4">
                        <ActivityIndicator color={planColor} size="small" />
                        <Text className="text-textMuted text-[13px]">Sincronizando tu plan…</Text>
                    </View>
                )}

                <TouchableOpacity
                    onPress={() => router.replace('/')}
                    disabled={syncing}
                    className="w-full py-4 rounded-xl items-center"
                    style={{ backgroundColor: planColor, opacity: syncing ? 0.7 : 1 }}
                >
                    <Text className="font-bold text-[15px] text-[#141313]">
                        Ir al dashboard
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => router.replace('/plans' as any)}
                    className="mt-3 py-2"
                >
                    <Text className="text-textMuted text-[13px]">Ver mis planes</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
