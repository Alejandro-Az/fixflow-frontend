import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { View, Text, ScrollView, SafeAreaView, TouchableOpacity, ActivityIndicator } from '../../../src/components/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Lock } from 'lucide-react-native';
import apiClient from '../../../src/api/client';
import { useAuthStore } from '../../../src/store/useAuthStore';
import * as ScreenCapture from 'expo-screen-capture';

export default function DeviceSummaryScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { user } = useAuthStore();
    const [device, setDevice] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const isFreePlan = user?.plan === 'free';

    useEffect(() => {
        if (isFreePlan && Platform.OS !== 'web') {
            ScreenCapture.preventScreenCaptureAsync().catch(console.error);
            return () => {
                ScreenCapture.allowScreenCaptureAsync().catch(console.error);
            };
        }
    }, [isFreePlan]);

    useEffect(() => {
        const fetchDevice = async () => {
            try {
                const res = await apiClient.get(`/devices/${id}`);
                if (res.data.ok) {
                    setDevice(res.data.data);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchDevice();
    }, [id]);

    const formatCategory = (cat: string) => {
        const labels: Record<string, string> = {
            cpu: 'Procesador',
            gpu: 'Gráfica',
            ram: 'RAM',
            motherboard: 'Placa Madre',
            psu: 'Fuente',
            storage: 'Almacenamiento',
            cooler: 'Enfriamiento',
            case: 'Gabinete',
            case_fans: 'Ventiladores'
        };
        return labels[cat] || cat;
    };

    return (
        <SafeAreaView className="flex-1 bg-background">
            <View className="flex-1 w-full max-w-3xl mx-auto border-x border-border border-opacity-20 web:border-opacity-100">
                {/* Header */}
                <View className="flex-row items-center px-6 py-4 border-b border-border">
                    <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
                        <ArrowLeft color="#e5e2e1" size={24} />
                    </TouchableOpacity>
                    <Text className="text-text text-[18px] font-semibold ml-2">
                        Resumen del Equipo
                    </Text>
                </View>

                {isFreePlan && (
                    <View className="bg-[#1c1b1b] px-6 py-3 border-b border-border flex-row items-center">
                        <Lock color="#6699cc" size={16} className="mr-2" />
                        <Text className="text-textMuted text-[13px] flex-1">
                            Las capturas de pantalla están deshabilitadas. Actualiza a Pro para exportar o compartir este resumen.
                        </Text>
                    </View>
                )}

                <ScrollView className="flex-1 p-6">
                    {loading ? (
                        <ActivityIndicator size="large" color="#6699cc" className="mt-10" />
                    ) : (
                        <>
                            <Text className="text-text font-bold text-[22px] mb-2">{device?.name}</Text>
                            <Text className="text-textMuted text-[14px] mb-8">
                                Registrado el {device?.created_at ? new Date(device?.created_at).toLocaleDateString() : '-'}
                            </Text>

                            <View className="bg-surface rounded-xl border border-border p-4">
                                {device?.components && device.components.length > 0 ? (
                                    device.components.map((comp: any, index: number) => (
                                        <View 
                                            key={comp.id} 
                                            className={`py-4 ${index !== device.components.length - 1 ? 'border-b border-border' : ''}`}
                                        >
                                            <Text className="text-textMuted text-[12px] uppercase font-bold mb-1">
                                                {formatCategory(comp.category)}
                                            </Text>
                                            <Text className="text-text text-[16px] font-medium mb-2">
                                                {comp.name}
                                            </Text>
                                            {comp.specs && Object.keys(comp.specs).length > 0 && (
                                                <View className="bg-background rounded-lg p-3">
                                                    {Object.entries(comp.specs).map(([key, val]) => (
                                                        <View key={key} className="flex-row justify-between py-1">
                                                            <Text className="text-textMuted text-[13px] capitalize">{key.replace('_', ' ')}</Text>
                                                            <Text className="text-text text-[13px] font-medium">{String(val)}</Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            )}
                                        </View>
                                    ))
                                ) : (
                                    <Text className="text-textMuted py-4">No hay componentes registrados.</Text>
                                )}
                            </View>
                            <View className="h-10" />
                        </>
                    )}
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}
