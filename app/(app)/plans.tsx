import { useRouter } from 'expo-router';
import { ArrowLeft, Check, X as XIcon, Zap } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, Platform } from 'react-native';
import { HeaderProfileMenu } from '../../src/components/HeaderProfileMenu';
import { ActivityIndicator, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from '../../src/components/ui';
import apiClient from '../../src/api/client';
import { useAuthStore } from '../../src/store/useAuthStore';

// Hook nativo de Stripe — solo se carga en plataformas nativas.
function useNativeStripe(): { initPaymentSheet: any; presentPaymentSheet: any } | null {
    if (Platform.OS === 'web') return null;
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const stripe = require('@stripe/stripe-react-native');
        // eslint-disable-next-line react-hooks/rules-of-hooks
        return stripe.useStripe();
    } catch {
        return null;
    }
}

const getWebReturnUrl = (path: string) =>
    typeof window !== 'undefined'
        ? `${window.location.origin}${path}`
        : `http://localhost:8081${path}`;

const PLANS = [
    {
        id: 'free',
        name: 'Free',
        price: '$0',
        period: 'siempre',
        description: 'Para explorar la plataforma.',
        color: '#94918e',
        highlight: false,
        purchasable: false,
        features: [
            { label: 'Workspaces (espacios)', value: '1' },
            { label: 'Equipos por workspace', value: '2' },
            { label: 'Fotos adjuntas en los componentes', available: false },
            { label: 'Notas técnicas en el asistente de mantenimiento', available: false },
            { label: 'Exportar inventario de componentes (Excel)', available: false },
            { label: 'Exportar reportes de mantenimiento (PDF/Excel)', available: false },
        ],
    },
    {
        id: 'pro',
        name: 'Pro',
        price: '$13',
        period: 'mes',
        description: 'Para uso personal serio.',
        color: '#6699cc',
        highlight: false,
        purchasable: true,
        features: [
            { label: 'Workspaces (espacios)', value: '2' },
            { label: 'Equipos por workspace', value: '8' },
            { label: 'Fotos adjuntas en los componentes', available: true },
            { label: 'Notas técnicas en el asistente de mantenimiento', available: true },
            { label: 'Exportar inventario de componentes (Excel)', available: true },
            { label: 'Exportar reportes de mantenimiento (PDF/Excel)', available: false },
        ],
    },
    {
        id: 'premium',
        name: 'Premium',
        price: '$19.99',
        period: 'mes',
        description: 'Para el técnico independiente.',
        color: '#39ff14',
        highlight: true,
        purchasable: true,
        features: [
            { label: 'Workspaces (espacios)', value: 'Ilimitados' },
            { label: 'Equipos por workspace', value: 'Ilimitados' },
            { label: 'Fotos adjuntas en los componentes', available: true },
            { label: 'Notas técnicas en el asistente de mantenimiento', available: true },
            { label: 'Exportar inventario de componentes (Excel)', available: true },
            { label: 'Exportar reportes de mantenimiento (PDF/Excel)', available: true },
            { label: 'Soporte técnico', value: 'Prioritario' },
        ],
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        price: '$49.99',
        period: 'mes',
        description: 'Para organizaciones estructuradas.',
        color: '#ffc107',
        highlight: false,
        purchasable: true,
        features: [
            { label: 'Workspaces (espacios)', value: 'Ilimitados' },
            { label: 'Equipos por workspace', value: 'Ilimitados' },
            { label: 'Fotos adjuntas en los componentes', value: 'Máx 1' },
            { label: 'Notas técnicas en el asistente de mantenimiento', available: true },
            { label: 'Exportar inventario de componentes (Excel)', available: true },
            { label: 'Exportar reportes de mantenimiento (PDF/Excel)', available: true },
            { label: 'Soporte técnico', value: 'Dedicado' },
        ],
    },
];

export default function PlansScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const currentPlan = user?.plan ?? 'free';
    const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
    const stripe = useNativeStripe();

    const pollForPlanChange = async (): Promise<boolean> => {
        const { refreshUser } = useAuthStore.getState();
        for (let i = 0; i < 5; i++) {
            await new Promise(r => setTimeout(r, 2000));
            await refreshUser();
            const updatedPlan = useAuthStore.getState().user?.plan;
            if (updatedPlan && updatedPlan !== currentPlan) return true;
        }
        return false;
    };

    const handleSubscribeWeb = async (planId: string) => {
        const res = await apiClient.post('/billing/checkout-session', {
            plan: planId,
            success_url: getWebReturnUrl(`/billing/success?plan=${planId}`),
            cancel_url: getWebReturnUrl('/billing/cancel'),
        });
        window.location.href = res.data.data.checkout_url;
    };

    const handleSubscribeNative = async (planId: string) => {
        if (!stripe) {
            Alert.alert('Error', 'Stripe no está inicializado. Verifica EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY.');
            return;
        }

        const res = await apiClient.post('/billing/mobile/subscription-intent', { plan: planId });
        const { customer_id, ephemeral_key, payment_intent_client_secret } = res.data.data;

        const initRes = await stripe.initPaymentSheet({
            customerId: customer_id,
            customerEphemeralKeySecret: ephemeral_key,
            paymentIntentClientSecret: payment_intent_client_secret,
            merchantDisplayName: 'FixFlow',
            returnURL: 'fixflow://billing',
            allowsDelayedPaymentMethods: false,
        });
        if (initRes?.error) throw new Error(initRes.error.message);

        const presentRes = await stripe.presentPaymentSheet();
        if (presentRes?.error) {
            if (presentRes.error.code === 'Canceled') {
                router.replace('/billing-cancel' as any);
                return;
            }
            throw new Error(presentRes.error.message);
        }

        const upgraded = await pollForPlanChange();
        router.replace((upgraded ? '/billing-success' : '/billing-cancel') as any);
    };

    const handleSubscribe = async (planId: string) => {
        if (loadingPlan) return;
        setLoadingPlan(planId);
        try {
            if (Platform.OS === 'web') {
                await handleSubscribeWeb(planId);
            } else {
                await handleSubscribeNative(planId);
            }
        } catch (err: any) {
            const status = err.response?.status;
            if (status === 422) {
                Alert.alert('Error', 'Plan no válido. Intenta de nuevo.');
            } else if (status === 401) {
                Alert.alert('Sesión expirada', 'Vuelve a iniciar sesión.');
            } else {
                Alert.alert(
                    'Error',
                    err.response?.data?.error?.message || err.message || 'No se pudo iniciar el proceso de pago. Intenta más tarde.'
                );
            }
        } finally {
            setLoadingPlan(null);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-background">
            <View className="flex-1 w-full max-w-3xl mx-auto border-x border-border border-opacity-20 web:border-opacity-100">

                {/* Header */}
                <View className="flex-row items-center justify-between px-6 py-4 border-b border-border">
                    <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} className="p-2 -ml-2">
                        <ArrowLeft color="#e5e2e1" size={24} />
                    </TouchableOpacity>
                    <Text className="text-text text-[18px] font-semibold flex-1 ml-2">Planes</Text>
                    <HeaderProfileMenu />
                </View>

                <ScrollView className="flex-1 px-6 pt-6" contentContainerStyle={{ paddingBottom: 40 }}>

                    {/* Encabezado */}
                    <View className="items-center mb-8">
                        <View className="w-12 h-12 rounded-2xl bg-surface border border-border items-center justify-center mb-3">
                            <Zap color="#6699cc" size={24} />
                        </View>
                        <Text className="text-text font-bold text-[22px] text-center mb-1">Elige tu plan</Text>
                        <Text className="text-textMuted text-[14px] text-center">
                            Free es para probar. Pro para uso serio. Premium para el técnico independiente.
                        </Text>
                    </View>

                    {/* Tarjetas */}
                    {PLANS.map((plan) => {
                        const isCurrent = plan.id === currentPlan;
                        const isHighlight = plan.highlight;
                        const isLoading = loadingPlan === plan.id;

                        return (
                            <View
                                key={plan.id}
                                className="rounded-2xl mb-5 overflow-hidden"
                                style={{
                                    borderWidth: isCurrent ? 2 : 1,
                                    borderColor: isCurrent ? plan.color : (isHighlight ? plan.color + '60' : '#2d2d2d'),
                                    backgroundColor: isHighlight ? plan.color + '08' : '#1c1b1b',
                                }}
                            >
                                {/* Badge "Recomendado" */}
                                {isHighlight && (
                                    <View
                                        className="px-4 py-1 items-center"
                                        style={{ backgroundColor: plan.color + '20' }}
                                    >
                                        <Text className="text-xs font-bold uppercase tracking-widest" style={{ color: plan.color }}>
                                            ⭐ Más popular
                                        </Text>
                                    </View>
                                )}

                                <View className="p-5">
                                    {/* Nombre y precio */}
                                    <View className="flex-row justify-between items-start mb-1">
                                        <View>
                                            <Text className="font-bold text-[20px]" style={{ color: plan.color }}>
                                                FixFlow {plan.name}
                                            </Text>
                                            <Text className="text-textMuted text-[13px] mt-0.5">{plan.description}</Text>
                                        </View>
                                        <View className="items-end">
                                            <Text className="text-text font-bold text-[22px]">{plan.price}</Text>
                                            {plan.period ? (
                                                <Text className="text-textMuted text-[12px]">/{plan.period}</Text>
                                            ) : null}
                                        </View>
                                    </View>

                                    {/* Divider */}
                                    <View className="border-t border-border my-4" />

                                    {/* Features */}
                                    <View className="gap-3">
                                        {plan.features.map((feat, idx) => (
                                            <View key={idx} className="flex-row items-center justify-between">
                                                <Text className="text-textMuted text-[14px] flex-1">{feat.label}</Text>
                                                {'available' in feat ? (
                                                    feat.available ? (
                                                        <View className="w-6 h-6 rounded-full items-center justify-center" style={{ backgroundColor: plan.color + '20' }}>
                                                            <Check color={plan.color} size={14} />
                                                        </View>
                                                    ) : (
                                                        <View className="w-6 h-6 rounded-full bg-[#2d2d2d] items-center justify-center">
                                                            <XIcon color="#555" size={14} />
                                                        </View>
                                                    )
                                                ) : (
                                                    <Text
                                                        className="font-semibold text-[14px]"
                                                        style={{ color: (feat as any).value === '—' ? '#555' : plan.color }}
                                                    >
                                                        {(feat as any).value}
                                                    </Text>
                                                )}
                                            </View>
                                        ))}
                                    </View>

                                    {/* CTA */}
                                    <View className="mt-5">
                                        {isCurrent ? (
                                            <View
                                                className="w-full py-3 rounded-xl items-center border"
                                                style={{ borderColor: plan.color + '50', backgroundColor: plan.color + '10' }}
                                            >
                                                <Text className="font-semibold text-[15px]" style={{ color: plan.color }}>
                                                    Plan actual ✓
                                                </Text>
                                            </View>
                                        ) : plan.id === 'free' ? (
                                            // Free no tiene botón de compra (es downgrade, no implementado)
                                            null
                                        ) : (
                                            <TouchableOpacity
                                                className="w-full py-3 rounded-xl items-center"
                                                style={{
                                                    backgroundColor: isLoading ? plan.color + '80' : plan.color,
                                                    opacity: loadingPlan && !isLoading ? 0.5 : 1,
                                                }}
                                                onPress={() => handleSubscribe(plan.id)}
                                                disabled={!!loadingPlan}
                                            >
                                                {isLoading ? (
                                                    <ActivityIndicator color="#141313" size="small" />
                                                ) : (
                                                    <Text className="font-bold text-[15px] text-[#141313]">
                                                        Cambiar a {plan.name} — {plan.price}/{plan.period}
                                                    </Text>
                                                )}
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            </View>
                        );
                    })}

                    {/* Nota */}
                    <Text className="text-textMuted text-[12px] text-center mt-2 px-4">
                        Pago seguro procesado por Stripe. Cancela cuando quieras.
                    </Text>
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}
