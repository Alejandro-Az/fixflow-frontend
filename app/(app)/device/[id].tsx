import React, { useState, useRef, useCallback } from 'react';
import { Alert, ActivityIndicator, Modal, TouchableWithoutFeedback, View as RNView, Dimensions, TextInput } from 'react-native';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView } from '../../../src/components/ui';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { ArrowLeft, Trash2, MoreVertical, Pencil, X, Lock } from 'lucide-react-native';
import apiClient from '../../../src/api/client';
import { useAuthStore } from '../../../src/store/useAuthStore';
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
    const { user } = useAuthStore();
    const isFreePlan = user?.plan === 'free';

    const [device, setDevice] = useState<any>(null);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [isBootstrapping, setIsBootstrapping] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [startingWizard, setStartingWizard] = useState(false);
    const [activeTab, setActiveTab] = useState<'components' | 'info'>('components');

    const [localDeviceName, setLocalDeviceName] = useState(deviceName as string);

    // Menu options
    const [optionsVisible, setOptionsVisible] = useState(false);
    const [menuPos, setMenuPos] = useState({ top: 64, right: 20 });
    const optionsBtnRef = useRef<any>(null);

    // Edit Device
    const [editVisible, setEditVisible] = useState(false);
    const [editName, setEditName] = useState(deviceName as string);
    const [editing, setEditing] = useState(false);
    const [editError, setEditError] = useState("");

    const openOptionsMenu = () => {
        optionsBtnRef.current?.measure(
            (_fx: number, _fy: number, w: number, h: number, px: number, py: number) => {
                const screenWidth = Dimensions.get("window").width;
                const rightOffset = screenWidth - px - w;
                setMenuPos({ top: py + h + 6, right: rightOffset });
                setOptionsVisible(true);
            }
        );
    };

    const handleEditDevice = async () => {
        const newName = editName.trim();
        if (!newName) {
            setEditError("El nombre no puede estar vacio.");
            return;
        }
        setEditing(true);
        setEditError("");
        try {
            const response = await apiClient.put(`/devices/${deviceId}`, { name: newName });
            if (response.data.ok) {
                setLocalDeviceName(newName);
                router.setParams({ name: newName });
                setEditVisible(false);
            } else {
                setEditError("No se pudo editar el equipo.");
            }
        } catch (error: any) {
            setEditError(error.response?.data?.error?.message || "Error al editar.");
        } finally {
            setEditing(false);
        }
    };

    // Delete Device state
    const [deleteVisible, setDeleteVisible] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState("");

    const handleDeleteDevice = async () => {
        setDeleting(true);
        setDeleteError("");
        try {
            const response = await apiClient.delete(`/devices/${deviceId}`);
            if (response.data.ok) {
                setDeleteVisible(false);
                router.replace('/');
            } else {
                setDeleteError("No se pudo eliminar el equipo.");
            }
        } catch (error: any) {
            console.error('Error deleting device', error);
            setDeleteError(error.response?.data?.error?.message || "Error al eliminar.");
        } finally {
            setDeleting(false);
        }
    };

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
                setLocalDeviceName(deviceRes.data.data.name);
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

    useFocusEffect(
        useCallback(() => {
            if (!device) setIsBootstrapping(true);
            fetchDeviceAndTimeline();
        }, [deviceId])
    );

    const confirmDelete = () => {
        setDeleteError("");
        setDeleteVisible(true);
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
            <Text className="text-text text-[15px] mb-4">
                {device?.created_at ? new Date(device?.created_at).toLocaleDateString() : '-'}
            </Text>

            <View className="mt-2 pt-4 border-t border-border">
                <View className="flex-row items-center mb-3">
                    <Text className="text-textMuted text-[12px] uppercase font-semibold">Exportar</Text>
                    {isFreePlan && <Lock color="#94918e" size={12} className="ml-2" />}
                </View>
                
                {isFreePlan ? (
                    <TouchableOpacity
                        onPress={() => Alert.alert('Premium', 'Actualiza a Pro para exportar las especificaciones técnicas completas.')}
                        className="bg-[#141313] border border-border rounded-lg py-3 px-4 items-center justify-center"
                    >
                        <Text className="text-[#94918e] font-medium">Solo disponible en plan Pro</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        onPress={async () => {
                            const { exportFile } = await import('../../../src/utils/fileExport');
                            await exportFile(`/devices/${deviceId}/exports/specs/excel`);
                        }}
                        className="bg-[#141313] border border-border rounded-lg py-3 px-4 flex-row items-center justify-center active:opacity-70"
                    >
                        <Text className="text-[#39ff14] font-medium">Descargar Especificaciones (CSV)</Text>
                    </TouchableOpacity>
                )}
            </View>
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
                        <Text className="text-text text-[20px] font-semibold flex-1 ml-2">{localDeviceName || 'Cargando...'}</Text>
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
                        <Text className="text-text text-[20px] font-semibold flex-1 ml-2">{localDeviceName || 'Equipo'}</Text>
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
                    <Text className="text-text text-[20px] font-semibold flex-1 ml-2" numberOfLines={1}>
                        {localDeviceName || 'Cargando...'}
                    </Text>

                    <View className="flex-row items-center gap-2">
                        <TouchableOpacity ref={optionsBtnRef} onPress={openOptionsMenu} className="p-2 active:opacity-60">
                            <MoreVertical color="#e5e2e1" size={20} />
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

            {/* Modal Opciones */}
            <Modal visible={optionsVisible} transparent animationType="fade" onRequestClose={() => setOptionsVisible(false)}>
                <TouchableWithoutFeedback onPress={() => setOptionsVisible(false)}>
                    <RNView style={{ flex: 1 }}>
                        <TouchableWithoutFeedback onPress={() => {}}>
                            <RNView style={{
                                position: 'absolute',
                                top: menuPos.top,
                                right: menuPos.right,
                                backgroundColor: '#2a2a2a',
                                borderRadius: 10,
                                borderWidth: 1,
                                borderColor: '#444444',
                                minWidth: 200,
                                shadowColor: '#000',
                                shadowOpacity: 0.4,
                                shadowRadius: 8,
                                elevation: 8,
                                overflow: 'hidden',
                            }}>
                                <TouchableOpacity onPress={() => { setOptionsVisible(false); setEditName(localDeviceName); setEditError(""); setEditVisible(true); }}>
                                    <RNView style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#444444' }}>
                                        <Pencil color="#e5e2e1" size={16} />
                                        <Text className="text-text font-medium text-sm">Editar nombre</Text>
                                    </RNView>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => { setOptionsVisible(false); confirmDelete(); }}>
                                    <RNView style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14 }}>
                                        <Trash2 color="#ff8a80" size={16} />
                                        <Text className="text-[#ff8a80] font-medium text-sm">Eliminar equipo</Text>
                                    </RNView>
                                </TouchableOpacity>
                            </RNView>
                        </TouchableWithoutFeedback>
                    </RNView>
                </TouchableWithoutFeedback>
            </Modal>

            {/* Modal Editar */}
            <Modal visible={editVisible} transparent animationType="fade" onRequestClose={() => setEditVisible(false)}>
                <TouchableWithoutFeedback onPress={() => setEditVisible(false)}>
                    <RNView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
                        <TouchableWithoutFeedback onPress={() => {}}>
                            <RNView style={{ backgroundColor: '#2a2a2a', borderRadius: 14, borderWidth: 1, borderColor: '#444444', padding: 24, width: '100%', maxWidth: 440 }}>
                                <RNView style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                    <Text className="text-text font-bold text-lg">Editar equipo</Text>
                                    <TouchableOpacity onPress={() => setEditVisible(false)} className="active:opacity-60">
                                        <X color="#94918e" size={20} />
                                    </TouchableOpacity>
                                </RNView>
                                <Text className="text-textMuted text-sm mb-2">Nombre del equipo</Text>
                                <TextInput
                                    value={editName}
                                    onChangeText={(t) => { setEditName(t); setEditError(''); }}
                                    placeholder="Ej: Computadora Principal..."
                                    placeholderTextColor="#94918e"
                                    autoFocus
                                    style={{ backgroundColor: '#141313', borderWidth: 1, borderColor: '#444444', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, color: '#e5e2e1', fontSize: 15, marginBottom: 8 }}
                                />
                                {editError ? <Text className="text-[#ffb4ab] text-sm mb-3">{editError}</Text> : <RNView style={{ height: 12 }} />}
                                <RNView style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                                    <TouchableOpacity onPress={() => setEditVisible(false)} className="flex-1 py-3 rounded-lg border border-border items-center active:opacity-70">
                                        <Text className="text-textMuted font-medium">Cancelar</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={handleEditDevice} disabled={editing} className={`flex-1 py-3 rounded-lg border border-primary items-center ${editing ? 'opacity-50' : 'active:opacity-80'}`}>
                                        {editing ? <ActivityIndicator color="#6699cc" /> : <Text className="text-primary font-semibold">Guardar</Text>}
                                    </TouchableOpacity>
                                </RNView>
                            </RNView>
                        </TouchableWithoutFeedback>
                    </RNView>
                </TouchableWithoutFeedback>
            </Modal>

            {/* Modal Eliminar */}
            <Modal visible={deleteVisible} transparent animationType="fade" onRequestClose={() => setDeleteVisible(false)}>
                <TouchableWithoutFeedback onPress={() => setDeleteVisible(false)}>
                    <RNView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
                        <TouchableWithoutFeedback onPress={() => {}}>
                            <RNView style={{ backgroundColor: '#2a2a2a', borderRadius: 14, borderWidth: 1, borderColor: '#444444', padding: 24, width: '100%', maxWidth: 440 }}>
                                <RNView style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                    <Text className="text-[#ffb4ab] font-bold text-lg">Eliminar equipo</Text>
                                    <TouchableOpacity onPress={() => setDeleteVisible(false)} className="active:opacity-60">
                                        <X color="#94918e" size={20} />
                                    </TouchableOpacity>
                                </RNView>
                                <Text className="text-text text-[15px] mb-4">
                                    ¿Estás seguro que deseas eliminar el equipo <Text className="font-bold">{localDeviceName}</Text>?
                                </Text>
                                <Text className="text-textMuted text-sm mb-4">Esta acción eliminará todos sus componentes y registros asociados. No se puede deshacer.</Text>
                                {deleteError ? <Text className="text-[#ffb4ab] text-sm mb-3">{deleteError}</Text> : null}
                                <RNView style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                                    <TouchableOpacity onPress={() => setDeleteVisible(false)} className="flex-1 py-3 rounded-lg border border-border items-center active:opacity-70">
                                        <Text className="text-textMuted font-medium">Cancelar</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={handleDeleteDevice} disabled={deleting} className={`flex-1 py-3 rounded-lg bg-[#cc3333] border border-[#cc3333] items-center ${deleting ? 'opacity-50' : 'active:opacity-80'}`}>
                                        {deleting ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-semibold">Eliminar</Text>}
                                    </TouchableOpacity>
                                </RNView>
                            </RNView>
                        </TouchableWithoutFeedback>
                    </RNView>
                </TouchableWithoutFeedback>
            </Modal>
        </SafeAreaView>
    );
}
