import React, { useEffect, useState, useRef } from 'react';
import {
    Modal,
    TouchableWithoutFeedback,
    View as RNView,
    Dimensions,
    TextInput as RNTextInput,
} from 'react-native';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator } from '../../src/components/ui';
import { CircleUser, Plus, ArrowRight, LogOut, User, X } from 'lucide-react-native';
import apiClient from '../../src/api/client';
import { useAuthStore } from '../../src/store/useAuthStore';

export default function DashboardScreen() {
    const { user, logout } = useAuthStore();
    const [workspaces, setWorkspaces] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Estado del menú de perfil
    const [menuVisible, setMenuVisible] = useState(false);
    const [menuPos, setMenuPos] = useState({ top: 64, right: 20 });
    const profileBtnRef = useRef<any>(null);

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

    useEffect(() => {
        fetchWorkspaces();
    }, []);

    const openMenu = () => {
        profileBtnRef.current?.measure(
            (_fx: number, _fy: number, w: number, h: number, px: number, py: number) => {
                const screenWidth = Dimensions.get('window').width;
                // Alinear el borde derecho del menú con el borde derecho del botón
                const rightOffset = screenWidth - px - w;
                setMenuPos({ top: py + h + 6, right: rightOffset });
                setMenuVisible(true);
            }
        );
    };

    const handleLogout = async () => {
        setMenuVisible(false);
        await logout();
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
                if (error.response.status === 403) {
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
    const hasReachedLimit = isFreePlan && workspaces.length >= 1;

    return (
        <SafeAreaView className="flex-1 bg-background">
            <ScrollView contentContainerStyle={{ padding: 24, alignItems: 'center' }}>

                {/* Contenedor centrado con ancho máximo */}
                <View className="w-full max-w-3xl">

                    {/* Header Superior */}
                    <View className="flex-row justify-between items-center mb-8 mt-4">
                        <Text className="text-text font-bold text-2xl tracking-tight">FixFlow</Text>
                        <TouchableOpacity ref={profileBtnRef} onPress={openMenu} className="active:opacity-60">
                            <CircleUser color="#e5e2e1" size={28} />
                        </TouchableOpacity>
                    </View>

                    {/* Título de Sección y Botón Agregar */}
                    <View className="flex-row justify-between items-center mb-6">
                        <Text className="text-text font-semibold text-xl tracking-tight">Mis workspaces</Text>
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
                                workspaces.map((ws: any, index: number) => (
                                    <TouchableOpacity key={ws.id || index} className="bg-surface border border-border rounded-xl p-5 active:opacity-80">
                                        <Text className="text-text font-bold text-lg mb-1">{ws.name}</Text>
                                        <Text className="text-textMuted text-sm mb-4">
                                            Creado el {ws.created_at ? new Date(ws.created_at).toLocaleDateString('es-ES') : 'recientemente'}
                                        </Text>
                                        <View className="flex-row">
                                            <View className="bg-[#1e3a5f] border border-[#2a4d7a] rounded-full px-3 py-1">
                                                <Text className="text-[#9acbff] text-xs font-medium">
                                                    {ws.devices_count !== undefined ? `${ws.devices_count} equipos` : 'Sin equipos'}
                                                </Text>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                ))
                            )}
                        </View>
                    )}

                    {/* Banner de límite de suscripción */}
                    {isFreePlan && (
                        <View className="border border-dashed border-border rounded-xl p-6 items-center justify-center bg-[#1c1b1b]">
                            <Text className="text-textMuted text-sm mb-2 text-center">Límite del plan Free: 1 workspace</Text>
                            <TouchableOpacity className="flex-row items-center active:opacity-80">
                                <Text className="text-primary font-medium text-sm mr-1">Upgrade a Pro</Text>
                                <ArrowRight color="#6699cc" size={16} />
                            </TouchableOpacity>
                        </View>
                    )}

                </View>{/* /max-w-3xl */}
            </ScrollView>

            {/* ─── Menú desplegable de perfil ─── */}
            <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
                <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
                    <RNView style={{ flex: 1 }}>
                        <RNView style={{
                            position: 'absolute',
                            top: menuPos.top,
                            right: menuPos.right,
                            backgroundColor: '#2a2a2a',
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: '#444444',
                            minWidth: 220,
                            shadowColor: '#000',
                            shadowOpacity: 0.4,
                            shadowRadius: 8,
                            elevation: 8,
                            overflow: 'hidden',
                        }}>
                            {/* Info del usuario */}
                            <RNView style={{ paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#444444' }}>
                                <RNView style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                    <User color="#94918e" size={16} />
                                    <RNView>
                                        <Text className="text-text font-semibold text-sm">{user?.name ?? 'Usuario'}</Text>
                                        <Text className="text-textMuted text-xs">{user?.email ?? ''}</Text>
                                    </RNView>
                                </RNView>
                                <RNView style={{ backgroundColor: '#1e3a5f', borderColor: '#2a4d7a', borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 2, alignSelf: 'flex-start' }}>
                                    <Text className="text-[#9acbff] text-xs font-medium capitalize">Plan {user?.plan ?? 'free'}</Text>
                                </RNView>
                            </RNView>

                            {/* Cerrar sesión */}
                            <TouchableOpacity onPress={handleLogout}>
                                <RNView style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14 }}>
                                    <LogOut color="#ff8a80" size={16} />
                                    <Text className="text-[#ff8a80] font-medium text-sm">Cerrar sesión</Text>
                                </RNView>
                            </TouchableOpacity>
                        </RNView>
                    </RNView>
                </TouchableWithoutFeedback>
            </Modal>

            {/* ─── Modal: Crear Workspace ─── */}
            <Modal visible={createVisible} transparent animationType="fade" onRequestClose={() => setCreateVisible(false)}>
                <TouchableWithoutFeedback onPress={() => setCreateVisible(false)}>
                    <RNView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
                        <TouchableWithoutFeedback onPress={() => {}}>
                            <RNView style={{
                                backgroundColor: '#2a2a2a',
                                borderRadius: 14,
                                borderWidth: 1,
                                borderColor: '#444444',
                                padding: 24,
                                width: '100%',
                                maxWidth: 440,
                            }}>
                                {/* Encabezado del modal */}
                                <RNView style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                    <Text className="text-text font-bold text-lg">Nuevo workspace</Text>
                                    <TouchableOpacity onPress={() => setCreateVisible(false)} className="active:opacity-60">
                                        <X color="#94918e" size={20} />
                                    </TouchableOpacity>
                                </RNView>

                                {/* Campo de nombre */}
                                <Text className="text-textMuted text-sm mb-2">Nombre del workspace</Text>
                                <RNTextInput
                                    value={wsName}
                                    onChangeText={(t) => { setWsName(t); setCreateError(''); }}
                                    placeholder="Ej: Casa, Oficina, Cliente X..."
                                    placeholderTextColor="#94918e"
                                    autoFocus
                                    style={{
                                        backgroundColor: '#141313',
                                        borderWidth: 1,
                                        borderColor: '#444444',
                                        borderRadius: 8,
                                        paddingHorizontal: 14,
                                        paddingVertical: 12,
                                        color: '#e5e2e1',
                                        fontSize: 15,
                                        marginBottom: 8,
                                    }}
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
        </SafeAreaView>
    );
}
