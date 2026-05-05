import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    Modal,
    TouchableWithoutFeedback,
    Dimensions,
} from 'react-native';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, TextInput } from '../../src/components/ui';
import { CircleUser, Plus, ArrowRight, LogOut, User, X, Eye, Lock } from 'lucide-react-native';
import apiClient from '../../src/api/client';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useRouter, useFocusEffect } from 'expo-router';
import { HeaderProfileMenu } from '../../src/components/HeaderProfileMenu';

export default function DashboardScreen() {
    const router = useRouter();
    const { user, logout } = useAuthStore();
    const [workspaces, setWorkspaces] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);


    // Estado del modal de creación de workspace
    const [createVisible, setCreateVisible] = useState(false);
    const [wsName, setWsName] = useState('');
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState('');

    const fetchWorkspaces = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/workspaces');
            if (response.data.ok) {
                setWorkspaces(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching workspaces', error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchWorkspaces();
        }, [])
    );


    // Estado del modal de preview
    const [previewVisible, setPreviewVisible] = useState(false);
    const [previewWorkspace, setPreviewWorkspace] = useState<any>(null);
    const [previewDevices, setPreviewDevices] = useState<any[]>([]);
    const [previewLoading, setPreviewLoading] = useState(false);

    const handlePreview = async (ws: any) => {
        setPreviewWorkspace(ws);
        setPreviewVisible(true);
        setPreviewLoading(true);
        try {
            const response = await apiClient.get(`/workspaces/${ws.id}/devices`);
            if (response.data.ok) {
                setPreviewDevices(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching preview devices', error);
            setPreviewDevices([]);
        } finally {
            setPreviewLoading(false);
        }
    };

    const openCreateModal = () => {
        setWsName('');
        setCreateError('');
        setCreateVisible(true);
    };

    const handleCreateWorkspace = async () => {
        const name = wsName.trim();
        if (!name) {
            setCreateError('El nombre del workspace no puede estar vacío.');
            return;
        }
        setCreating(true);
        setCreateError('');
        try {
            const response = await apiClient.post('/workspaces', { name });
            if (response.data.ok) {
                setCreateVisible(false);
                setWsName('');
                // Recargar la lista
                await fetchWorkspaces();
            } else {
                setCreateError('No se pudo crear el workspace.');
            }
        } catch (error: any) {
            if (error.response) {
                const backendMsg = error.response.data?.error?.message;
                const errorCode = error.response.data?.error?.code;
                if (error.response.status === 403 || errorCode === 'PLAN_LIMIT_REACHED' || errorCode === 'AUTH_FORBIDDEN') {
                    setCreateError('Has alcanzado el límite de tu plan. Haz upgrade para crear más workspaces.');
                } else {
                    setCreateError(backendMsg || `Error del servidor (${error.response.status}).`);
                }
            } else {
                setCreateError('Sin conexión con el servidor.');
            }
        } finally {
            setCreating(false);
        }
    };

    const isFreePlan = user?.plan === 'free';
    const workspaceLimit = user?.plan === 'free' ? 1 : user?.plan === 'pro' ? 2 : user?.plan === 'premium' ? 3 : Infinity;
    const hasReachedLimit = workspaces.length >= workspaceLimit;

    return (
        <SafeAreaView className="flex-1 bg-background">
            <ScrollView contentContainerStyle={{ padding: 24, alignItems: 'center' }}>

                {/* Contenedor centrado con ancho máximo */}
                <View className="w-full max-w-3xl">

                    {/* Header Superior */}
                    <View className="flex-row justify-between items-center mb-8 mt-4">
                        <Text className="text-text font-bold text-2xl tracking-tight">FixFlow {user?.plan ? user.plan.charAt(0).toUpperCase() + user.plan.slice(1) : ''}</Text>
                        <HeaderProfileMenu />
                    </View>

                    {/* Título de Sección y Botón Agregar */}
                    <View className="flex-row justify-between items-center mb-6">
                        <Text className="text-text font-semibold text-xl tracking-tight">Mis workspaces {user?.plan !== 'enterprise' ? `(${workspaces.length}/${workspaceLimit})` : ''}</Text>
                        {!hasReachedLimit && (
                            <TouchableOpacity
                                onPress={openCreateModal}
                                className="bg-surface border border-border w-10 h-10 rounded-lg items-center justify-center active:opacity-80"
                            >
                                <Plus color="#e5e2e1" size={20} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Lista de Workspaces */}
                    {loading ? (
                        <ActivityIndicator color="#6699cc" className="mb-8" />
                    ) : (
                        <View className="flex-col gap-4 mb-8">
                            {workspaces.length === 0 ? (
                                <Text className="text-textMuted text-center py-8">No tienes workspaces aún.</Text>
                            ) : (
                                workspaces.map((ws: any, index: number) => {
                                    const isLocked = index >= workspaceLimit;
                                    return (
                                        <TouchableOpacity 
                                            key={ws.id || index} 
                                            className={`bg-surface border rounded-xl p-5 ${isLocked ? 'border-[#444444] opacity-70' : 'border-border active:opacity-80'}`}
                                            onPress={() => {
                                                if (isLocked) {
                                                    alert("Workspace bloqueado por límite de plan. Mejora tu suscripción para acceder.");
                                                    return;
                                                }
                                                router.push(`/workspace/${ws.id}?name=${encodeURIComponent(ws.name)}`)
                                            }}
                                            activeOpacity={isLocked ? 1 : 0.8}
                                        >
                                            <View className="flex-row justify-between items-start">
                                                <View>
                                                    <View className="flex-row items-center mb-1">
                                                        <Text className="text-text font-bold text-lg mr-2">{ws.name}</Text>
                                                        {isLocked && <Lock color="#ffb4ab" size={14} />}
                                                    </View>
                                                    <Text className="text-textMuted text-sm mb-4">
                                                        Creado el {ws.created_at ? new Date(ws.created_at).toLocaleDateString('es-ES') : 'recientemente'}
                                                    </Text>
                                                </View>
                                                <TouchableOpacity 
                                                    className={`p-2 rounded-lg border ${isLocked ? 'bg-[#2a2a2a] border-[#444444]' : 'bg-background border-border active:opacity-60'}`} 
                                                    onPress={() => {
                                                        if (isLocked) return;
                                                        handlePreview(ws);
                                                    }}
                                                    activeOpacity={isLocked ? 1 : 0.6}
                                                >
                                                    {isLocked ? <Lock color="#94918e" size={20} /> : <Eye color="#6699cc" size={20} />}
                                                </TouchableOpacity>
                                            </View>
                                            <View className="flex-row">
                                                <View className={`${isLocked ? 'bg-[#2a2a2a] border-[#444444]' : 'bg-[#1e3a5f] border-[#2a4d7a]'} rounded-full px-3 py-1`}>
                                                    <Text className={`${isLocked ? 'text-textMuted' : 'text-[#9acbff]'} text-xs font-medium`}>
                                                        {ws.devices_count !== undefined ? `${ws.devices_count} equipos` : 'Sin equipos'}
                                                    </Text>
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })
                            )}
                        </View>
                    )}

                    {/* Banner de límite de suscripción */}
                    {hasReachedLimit && (
                        <View className="border border-dashed border-border rounded-xl p-6 items-center justify-center bg-[#1c1b1b] mt-4">
                            <Text className="text-textMuted text-sm mb-2 text-center">
                                Has alcanzado el límite de workspaces de tu plan ({user?.plan === 'free' ? '1' : user?.plan === 'pro' ? '2' : '3'}).
                            </Text>
                            <TouchableOpacity onPress={() => router.push('/plans' as any)} className="flex-row items-center active:opacity-80">
                                <Text className="text-primary font-medium text-sm mr-1">
                                    {user?.plan === 'free' ? 'Mejorar a Pro' : user?.plan === 'pro' ? 'Mejorar a Premium' : 'Mejorar a Enterprise'}
                                </Text>
                                <ArrowRight color="#6699cc" size={16} />
                            </TouchableOpacity>
                        </View>
                    )}

                </View>{/* /max-w-3xl */}
            </ScrollView>

            {/* ─── Modal: Crear Workspace ─── */}
            <Modal visible={createVisible} transparent animationType="fade" onRequestClose={() => setCreateVisible(false)}>
                <TouchableWithoutFeedback onPress={() => setCreateVisible(false)}>
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
                        <TouchableWithoutFeedback onPress={() => {}}>
                            <View style={{
                                backgroundColor: '#2a2a2a',
                                borderRadius: 14,
                                borderWidth: 1,
                                borderColor: '#444444',
                                padding: 24,
                                width: '100%',
                                maxWidth: 440,
                            }}>
                                {/* Encabezado del modal */}
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                    <Text className="text-text font-bold text-lg">Nuevo workspace</Text>
                                    <TouchableOpacity onPress={() => setCreateVisible(false)} className="active:opacity-60">
                                        <X color="#94918e" size={20} />
                                    </TouchableOpacity>
                                </RNView>

                                {/* Campo de nombre */}
                                <Text className="text-textMuted text-sm mb-2">Nombre del workspace</Text>
                                <TextInput
                                    value={wsName}
                                    onChangeText={(t) => { setWsName(t); setCreateError(''); }}
                                    placeholder="Ej: Casa, Oficina, Cliente X..."
                                    placeholderTextColor="#94918e"
                                    autoFocus
                                    className="bg-[#141313] border border-[#444444] rounded-lg px-4 py-3 text-[#e5e2e1] text-[15px] mb-2"
                                />

                                {/* Error */}
                                {createError ? (
                                    <Text className="text-[#ffb4ab] text-sm mb-3">{createError}</Text>
                                ) : (
                                    <RNView style={{ height: 8 }} />
                                )}

                                {/* Botones */}
                                <RNView style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                                    <TouchableOpacity
                                        onPress={() => setCreateVisible(false)}
                                        className="flex-1 py-3 rounded-lg border border-border items-center active:opacity-70"
                                    >
                                        <Text className="text-textMuted font-medium">Cancelar</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={handleCreateWorkspace}
                                        disabled={creating}
                                        className={`flex-1 py-3 rounded-lg border border-primary items-center ${creating ? 'opacity-50' : 'active:opacity-80'}`}
                                    >
                                        {creating
                                            ? <ActivityIndicator color="#6699cc" />
                                            : <Text className="text-primary font-semibold">Crear</Text>
                                        }
                                    </TouchableOpacity>
                                </RNView>
                            </RNView>
                        </TouchableWithoutFeedback>
                    </RNView>
                </TouchableWithoutFeedback>
            </Modal>

            {/* ─── Modal: Preview de Equipos ─── */}
            <Modal visible={previewVisible} transparent animationType="slide" onRequestClose={() => setPreviewVisible(false)}>
                <TouchableWithoutFeedback onPress={() => setPreviewVisible(false)}>
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
                        <TouchableWithoutFeedback onPress={() => {}}>
                            <View style={{
                                backgroundColor: '#2a2a2a',
                                borderTopLeftRadius: 20,
                                borderTopRightRadius: 20,
                                borderWidth: 1,
                                borderColor: '#444444',
                                padding: 24,
                                maxHeight: '80%',
                            }}>
                                {/* Encabezado del modal */}
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                    <Text className="text-text font-bold text-lg">
                                        Equipos en {previewWorkspace?.name}
                                    </Text>
                                    <TouchableOpacity onPress={() => setPreviewVisible(false)} className="active:opacity-60">
                                        <X color="#94918e" size={20} />
                                    </TouchableOpacity>
                                </RNView>

                                {previewLoading ? (
                                    <ActivityIndicator color="#6699cc" className="my-8" />
                                ) : previewDevices.length === 0 ? (
                                    <Text className="text-textMuted text-center py-8">Este workspace no tiene equipos.</Text>
                                ) : (
                                    <ScrollView style={{ maxHeight: 400 }}>
                                        {previewDevices.map((device: any, index: number) => (
                                            <View key={device.id || index} className="bg-[#141313] border border-[#444444] rounded-xl p-4 mb-3 flex-row items-center justify-between">
                                                <View>
                                                    <Text className="text-text font-semibold text-[16px] mb-1">{device.name}</Text>
                                                    <Text className="text-textMuted text-xs">
                                                        Último mantenimiento: {device.last_maintenance_date ? new Date(device.last_maintenance_date).toLocaleDateString('es-ES') : 'Sin fecha'}
                                                    </Text>
                                                </View>
                                                <TouchableOpacity 
                                                    className="bg-primary px-4 py-2 rounded-lg active:opacity-80"
                                                    onPress={() => {
                                                        setPreviewVisible(false);
                                                        router.push(`/device/${device.id}?name=${encodeURIComponent(device.name)}` as any);
                                                    }}
                                                >
                                                    <Text className="text-[#141313] font-medium text-xs">Ver</Text>
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                    </ScrollView>
                                )}
                            </RNView>
                        </TouchableWithoutFeedback>
                    </RNView>
                </TouchableWithoutFeedback>
            </Modal>
        </SafeAreaView>
    );
}
