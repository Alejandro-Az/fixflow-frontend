import React, { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator } from '../../../../src/components/ui';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { ArrowLeft, Plus, X as XIcon } from 'lucide-react-native';
import apiClient from '../../../../src/api/client';
import { HeaderProfileMenu } from '../../../../src/components/HeaderProfileMenu';
import { CATEGORY_COLORS } from '../../../../components/ui/CategoryRow';
import { useAuthStore } from '../../../../src/store/useAuthStore';

const CATEGORY_LABELS: Record<string, string> = {
    cpu: 'Procesador',
    gpu: 'Tarjeta gráfica',
    ram: 'Memoria RAM',
    motherboard: 'Placa madre',
    psu: 'Fuente de poder',
    storage: 'Almacenamiento',
    cooling: 'Enfriamiento',
    case: 'Gabinete',
    case_fans: 'Ventiladores',
};

export default function MultiComponentScreen() {
    const { id, category, deviceName } = useLocalSearchParams();
    const deviceId = Array.isArray(id) ? id[0] : id;
    const categoryId = Array.isArray(category) ? category[0] : category;
    const resolvedDeviceName = Array.isArray(deviceName) ? deviceName[0] : deviceName;
    const router = useRouter();
    const { user } = useAuthStore();
    const isFreePlan = user?.plan === 'free';
    
    const [components, setComponents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const title = CATEGORY_LABELS[categoryId as string] || 'Componentes';

    const fetchComponents = async () => {
        if (!deviceId || !categoryId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            // Option 1: fetch device and filter.
            // Option 2: fetch components endpoint with query if backend supports it.
            // Using Option 1 since we know it works from DeviceDetailScreen
            const response = await apiClient.get(`/devices/${deviceId}`);
            if (response.data.ok) {
                const allComponents = response.data.data.components || [];
                const filtered = allComponents.filter((c: any) => c.category === categoryId);
                setComponents(filtered);
            }
        } catch (error) {
            console.error('Error fetching components', error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchComponents();
        }, [deviceId, categoryId])
    );

    const handleDelete = (componentId: string, name: string) => {
        Alert.alert(
            'Eliminar componente',
            `¿Estás seguro de eliminar "${name}"?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                { 
                    text: 'Eliminar', 
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const res = await apiClient.delete(`/components/${componentId}`);
                            if (res.data.ok) {
                                await fetchComponents();
                            }
                        } catch (err) {
                            Alert.alert('Error', 'No se pudo eliminar.');
                        }
                    }
                }
            ]
        );
    };

    // Calculate total if applicable (RAM, Storage often have capacities like "16GB", "1TB")
    // Simple naive parser to extract numbers and sum them
    const calculateTotal = () => {
        let total = 0;
        let unit = '';
        
        for (const c of components) {
            if (c.capacity) {
                const match = c.capacity.match(/(\d+)\s*([a-zA-Z]+)/);
                if (match) {
                    total += parseInt(match[1], 10);
                    if (!unit) unit = match[2].toUpperCase();
                }
            }
        }
        
        return total > 0 ? `${total}${unit}` : null;
    };

    const totalCapacity = calculateTotal();

    const handleBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/');
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-background">
            <View className="flex-1 w-full max-w-3xl mx-auto border-x border-border border-opacity-20 web:border-opacity-100 flex-col">
                
                {/* Header */}
                <View className="flex-row items-center justify-between px-6 py-4 border-b border-border">
                    <TouchableOpacity onPress={handleBack} className="p-2 -ml-2">
                        <ArrowLeft color="#e5e2e1" size={24} />
                    </TouchableOpacity>
                    <Text className="text-text text-[20px] font-semibold flex-1 ml-2">{title}</Text>
                    <HeaderProfileMenu />
                </View>

                {/* Content */}
                <ScrollView className="flex-1 px-6 pt-6">
                    <Text className="text-textMuted text-[14px] mb-4">
                        {components.length} {components.length === 1 ? 'unidad registrada' : 'unidades registradas'}
                    </Text>

                    {loading ? (
                        <ActivityIndicator size="large" color="#6699cc" className="py-10" />
                    ) : (
                        <View className="mb-6">
                            {components.map((comp) => (
                                <TouchableOpacity 
                                    key={comp.id}
                                    onPress={() => router.push(`/device/component/${categoryId}?id=${deviceId}&componentId=${comp.id}&deviceName=${encodeURIComponent(resolvedDeviceName as string)}` as any)}
                                    className="bg-surface border border-border rounded-xl p-4 mb-4 flex-row justify-between items-start active:opacity-80 transition-opacity"
                                >
                                    <View className="flex-1 mr-4">
                                        <Text className="text-text text-[16px] font-semibold mb-1">{comp.name}</Text>
                                        <Text className="text-textMuted text-[12px]">
                                            {[comp.capacity, comp.speed].filter(Boolean).join(' · ')}
                                            {comp.purchase_date && ` · Comprado ${new Date(comp.purchase_date).toLocaleDateString()}`}
                                        </Text>
                                    </View>
                                    <TouchableOpacity 
                                        onPress={() => handleDelete(comp.id, comp.name)}
                                        className="p-2 -mr-2 -mt-2"
                                    >
                                        <XIcon color="#8b919a" size={20} />
                                    </TouchableOpacity>
                                </TouchableOpacity>
                            ))}

                            {isFreePlan && components.length >= 1 ? (
                                <View className="w-full py-4 rounded-xl border border-dashed items-center flex-col justify-center mt-2 border-border bg-[#1c1b1b]">
                                    <Text className="text-textMuted text-[13px] text-center mb-2 px-4">
                                        Has alcanzado el límite de 1 componente por categoría en el plan Free.
                                    </Text>
                                    <TouchableOpacity onPress={() => router.push('/plans' as any)} className="flex-row items-center active:opacity-80">
                                        <Text className="text-primary font-medium text-[13px] mr-1">Mejorar a Pro</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    onPress={() => router.push(`/device/component/${categoryId}?id=${deviceId}&deviceName=${encodeURIComponent(resolvedDeviceName as string)}` as any)}
                                    className="w-full py-4 rounded-xl border border-dashed items-center flex-row justify-center mt-2 active:opacity-80 transition-opacity"
                                    style={{ borderColor: CATEGORY_COLORS[categoryId as string] || '#444444' }}
                                >
                                    <Plus color={CATEGORY_COLORS[categoryId as string] || "#6699cc"} size={16} className="mr-2" />
                                    <Text className="font-medium text-[15px]" style={{ color: CATEGORY_COLORS[categoryId as string] || "#6699cc" }}>
                                        {components.length === 0 ? "Agregar unidad" : "Agregar otra unidad"}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </ScrollView>

                {/* Footer */}
                {components.length > 0 && (
                    <View className="bg-surface border-t border-border px-6 py-4 flex-row justify-between items-center">
                        <Text className="text-textMuted text-[14px]">
                            {totalCapacity 
                                ? `Total: ${totalCapacity} en ${components.length} unidades`
                                : `Total: ${components.length} unidades`
                            }
                        </Text>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}
