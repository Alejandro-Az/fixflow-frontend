import React, { useState, useEffect } from 'react';
import { Alert, ActivityIndicator } from 'react-native';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView } from '../../../src/components/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Trash2 } from 'lucide-react-native';
import apiClient from '../../../src/api/client';
import { HeaderProfileMenu } from '../../../src/components/HeaderProfileMenu';
import { CategoryRow, ComponentCategory } from '../../../components/ui/CategoryRow';

const CATEGORIES: { id: ComponentCategory; label: string }[] = [
    { id: 'cpu', label: 'Procesador' },
    { id: 'gpu', label: 'Tarjeta grafica' },
    { id: 'ram', label: 'Memoria RAM' },
    { id: 'motherboard', label: 'Placa madre' },
    { id: 'psu', label: 'Fuente de poder' },
    { id: 'storage', label: 'Almacenamiento' },
    { id: 'cooler', label: 'Enfriamiento' },
    { id: 'case', label: 'Gabinete' },
    { id: 'case_fans', label: 'Ventiladores' },
];

const REQUIRED_CATEGORIES = ['cpu', 'motherboard', 'ram', 'psu', 'storage', 'cooler', 'case'];

export default function DeviceDetailScreen() {
    const { id, name } = useLocalSearchParams();
    const deviceId = Array.isArray(id) ? id[0] : id;
    const deviceName = Array.isArray(name) ? name[0] : name;
    const router = useRouter();

    const [device, setDevice] = useState<any>(null);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [isBootstrapping, setIsBootstrapping] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [startingWizard, setStartingWizard] = useState(false);
    const [activeTab, setActiveTab] = useState<'components' | 'info'>('components');

    const presentCategories = device?.components?.map((component: any) => component.category) || [];
    const missingCategories = REQUIRED_CATEGORIES.filter((category) => !presentCategories.includes(category));
    const isReadyForMaintenance = missingCategories.length === 0;

    const fetchDeviceAndTimeline = async () => {
        if (!deviceId) {
            setFetchError('No se encontro el ID del equipo.');
            setIsBootstrapping(false);
            return;
        }

        setFetchError(null);

        try {
            const deviceRes = await apiClient.get(`/devices/${deviceId}`);

            if (deviceRes.data?.ok && deviceRes.data?.data) {
                setDevice(deviceRes.data.data);
                setIsBootstrapping(false);
            } else {
                setDevice(null);
                setFetchError('El API respondio sin datos del equipo.');
                return;
            }

            let timelineData: any = [];
            try {
                const timelineRes = await apiClient.get(`/devices/${deviceId}/maintenance-timeline`, { timeout: 2500 });
                timelineData = timelineRes.data?.data ?? [];
            } catch {
            }

            let activeSession = null;
            if (Array.isArray(timelineData)) {
                activeSession = timelineData.find(
                    (item: any) =>
                        item.type === 'wizard_session' &&
                        (item.status === 'in_progress' || item.status === 'paused')
                );
            } else if (timelineData?.events && Array.isArray(timelineData.events)) {
                activeSession = timelineData.events.find(
                    (item: any) =>
                        item.type === 'wizard_session' &&
                        (item.status === 'in_progress' || item.status === 'paused')
                );
            }

            setActiveSessionId(activeSession ? activeSession.id : null);
        } catch (error) {
            console.error('Error fetching device details', error);
            setFetchError('No se pudo cargar el equipo. Intenta nuevamente.');
        }
    };

    useEffect(() => {
        setIsBootstrapping(true);
        fetchDeviceAndTimeline();
    }, [deviceId]);

    const confirmDelete = () => {
        Alert.alert(
            'Eliminar equipo',
            'Estas seguro que quieres eliminar este equipo? Se borraran todos sus componentes. Esta accion no se puede deshacer.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Si, eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const response = await apiClient.delete(`/devices/${deviceId}`);
                            if (response.data.ok) {
                                router.back();
                            }
                        } catch (error) {
                            console.error('Error deleting device', error);
                            Alert.alert('Error', 'No se pudo eliminar el equipo.');
                        }
                    },
                },
            ]
        );
    };

    const handleStartMaintenance = async () => {
        if (activeSessionId) {
            router.push(`/wizard/${activeSessionId}` as any);
            return;
        }

        setStartingWizard(true);
        try {
            const res = await apiClient.post(`/devices/${deviceId}/maintenance-wizard/sessions/start`);
            if (res.data.ok) {
                const session = res.data.data.session;
                router.push(`/wizard/${session.id}` as any);
            }
        } catch (error) {
            console.error('Error starting wizard', error);
            Alert.alert('Error', 'No se pudo iniciar el asistente de mantenimiento.');
        } finally {
            setStartingWizard(false);
        }
    };

    const handleCategoryPress = (categoryId: ComponentCategory) => {
        const componentsOfCategory = device?.components?.filter((component: any) => component.category === categoryId) || [];

        if (['ram', 'storage', 'case_fans'].includes(categoryId) || componentsOfCategory.length > 1) {
            router.push(`/device/multi/${categoryId}?id=${deviceId}&deviceName=${encodeURIComponent(device?.name || deviceName as string)}` as any);
        } else {
            const compIdQuery = componentsOfCategory.length === 1 ? `&componentId=${componentsOfCategory[0].id}` : '';
            router.push(`/device/component/${categoryId}?id=${deviceId}&deviceName=${encodeURIComponent(device?.name || deviceName as string)}${compIdQuery}` as any);
        }
    };

    const renderComponentsTab = () => (
        <View
            className={`bg-surface rounded-xl overflow-hidden mb-6 border ${isReadyForMaintenance ? 'border-[#6699cc] shadow-md' : 'border-border'}`}
            style={isReadyForMaintenance ? { shadowColor: '#6699cc', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 10, elevation: 5 } : {}}
        >
            {CATEGORIES.map((category, index) => {
                const components = device?.components?.filter((component: any) => component.category === category.id) || [];

                let value = null;
                if (components.length > 1) {
                    value = `${components.length}x unidades`;
                    if (category.id === 'ram') value = `${components.length}x modulos`;
                } else if (components.length === 1) {
                    value = components[0].name;
                }

                return (
                    <View key={category.id} className={index !== CATEGORIES.length - 1 ? 'border-b border-border' : ''}>
                        <CategoryRow
                            category={category.id}
                            label={category.label}
                            value={value}
                            onPress={() => handleCategoryPress(category.id)}
                        />
                    </View>
                );
            })}
        </View>
    );

    const renderInfoTab = () => (
        <View className="bg-surface border border-border rounded-xl p-5 mb-6">
            <Text className="text-textMuted text-[12px] uppercase font-semibold mb-1">Ultimo mantenimiento</Text>
            <Text className="text-text text-[15px] mb-4">
                {device?.last_maintenance_date ? new Date(device?.last_maintenance_date).toLocaleDateString() : 'Sin registrar'}
            </Text>

            <Text className="text-textMuted text-[12px] uppercase font-semibold mb-1">Fecha de registro</Text>
            <Text className="text-text text-[15px]">
                {device?.created_at ? new Date(device?.created_at).toLocaleDateString() : '-'}
            </Text>
        </View>
    );

    const handleBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else if (device?.workspace_id) {
            router.replace(`/workspace/${device.workspace_id}` as any);
        } else {
            router.replace('/');
        }
    };

    if (isBootstrapping && !device) {
        return (
            <SafeAreaView className="flex-1 bg-background">
                <View className="flex-1 w-full max-w-3xl mx-auto border-x border-border border-opacity-20 web:border-opacity-100">
                    <View className="flex-row items-center justify-between px-6 py-4">
                        <TouchableOpacity onPress={handleBack} className="p-2 -ml-2">
                            <ArrowLeft color="#e5e2e1" size={24} />
                        </TouchableOpacity>
                        <Text className="text-text text-[20px] font-semibold flex-1 ml-2">{deviceName || 'Cargando...'}</Text>
                        <HeaderProfileMenu />
                    </View>

                    <View className="flex-1 items-center justify-center px-6">
                        <ActivityIndicator size="large" color="#6699cc" />
                        <Text className="text-textMuted text-[12px] mt-3">Cargando equipo...</Text>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    if (fetchError && !device) {
        return (
            <SafeAreaView className="flex-1 bg-background">
                <View className="flex-1 w-full max-w-3xl mx-auto border-x border-border border-opacity-20 web:border-opacity-100">
                    <View className="flex-row items-center justify-between px-6 py-4">
                        <TouchableOpacity onPress={handleBack} className="p-2 -ml-2">
                            <ArrowLeft color="#e5e2e1" size={24} />
                        </TouchableOpacity>
                        <Text className="text-text text-[20px] font-semibold flex-1 ml-2">{deviceName || 'Equipo'}</Text>
                        <HeaderProfileMenu />
                    </View>

                    <View className="flex-1 items-center justify-center px-6">
                        <View className="items-center py-12 px-6 border border-border rounded-xl bg-surface border-dashed">
                            <Text className="text-text text-[16px] font-medium mb-2 text-center">No se pudo cargar el equipo</Text>
                            <Text className="text-textMuted text-[14px] text-center mb-6">{fetchError}</Text>
                            <TouchableOpacity
                                onPress={() => {
                                    setIsBootstrapping(true);
                                    fetchDeviceAndTimeline();
                                }}
                                className="bg-background border border-border py-3 px-6 rounded-lg"
                            >
                                <Text className="text-text font-medium">Reintentar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-background">
            <View className="flex-1 w-full max-w-3xl mx-auto border-x border-border border-opacity-20 web:border-opacity-100">
                <View className="flex-row items-center justify-between px-6 py-4">
                    <TouchableOpacity onPress={handleBack} className="p-2 -ml-2">
                        <ArrowLeft color="#e5e2e1" size={24} />
                    </TouchableOpacity>
                    <Text className="text-text text-[20px] font-semibold flex-1 ml-2">{device?.name || deviceName || 'Cargando...'}</Text>

                    <View className="flex-row items-center">
                        <TouchableOpacity onPress={confirmDelete} className="p-2 mr-2">
                            <Trash2 color="#ffb4ab" size={20} />
                        </TouchableOpacity>
                        <HeaderProfileMenu />
                    </View>
                </View>

                <View className="flex-row px-6 border-b border-border mb-6">
                    <TouchableOpacity
                        onPress={() => setActiveTab('components')}
                        className={`mr-6 pb-3 border-b-2 ${activeTab === 'components' ? 'border-primary' : 'border-transparent'}`}
                    >
                        <Text className={`text-[15px] font-medium ${activeTab === 'components' ? 'text-text' : 'text-textMuted'}`}>
                            Componentes
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setActiveTab('info')}
                        className={`pb-3 border-b-2 ${activeTab === 'info' ? 'border-primary' : 'border-transparent'}`}
                    >
                        <Text className={`text-[15px] font-medium ${activeTab === 'info' ? 'text-text' : 'text-textMuted'}`}>
                            Info
                        </Text>
                    </TouchableOpacity>
                </View>

                <ScrollView className="flex-1 px-6">
                    {activeTab === 'components' ? renderComponentsTab() : renderInfoTab()}

                    {activeTab === 'components' && (
                        <View className="mt-2 mb-8">
                            <TouchableOpacity
                                onPress={() => router.push(`/device/summary?id=${deviceId}` as any)}
                                className="w-full py-4 rounded-xl items-center flex-row justify-center mb-4 bg-surface border border-[#6699cc]"
                            >
                                <Text className="text-[#6699cc] font-medium text-[15px]">
                                    Ver Resumen del Equipo
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                disabled={!isReadyForMaintenance || startingWizard}
                                onPress={handleStartMaintenance}
                                className={`w-full py-4 rounded-xl items-center flex-row justify-center ${isReadyForMaintenance ? 'bg-primary' : 'bg-[#1c1b1b] border border-border border-dashed opacity-70'}`}
                            >
                                {startingWizard ? (
                                    <ActivityIndicator size="small" color="#141313" />
                                ) : (
                                    <Text className={isReadyForMaintenance ? 'text-[#141313] font-bold text-[16px]' : 'text-textMuted font-medium text-[15px]'}>
                                        {isReadyForMaintenance ? (activeSessionId ? 'Retomar Mantenimiento' : 'Comenzar Mantenimiento') : 'Completar componentes'}
                                    </Text>
                                )}
                            </TouchableOpacity>
                            {!isReadyForMaintenance && (
                                <Text className="text-textMuted text-[12px] text-center mt-3 px-4">
                                    Para realizar un mantenimiento, debes registrar primero los componentes base (falta: {missingCategories.join(', ')}).
                                </Text>
                            )}
                        </View>
                    )}
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}
