import React, { useState } from 'react';
import { Alert, Modal, TouchableWithoutFeedback, View as RNView, TextInput as RNTextInput } from 'react-native';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator } from '../../src/components/ui';
import { useRouter } from 'expo-router';
import { ArrowLeft, User, Mail, Lock, CreditCard, ChevronRight, Eye, EyeOff, X, Shield } from 'lucide-react-native';
import apiClient from '../../src/api/client';
import { useAuthStore } from '../../src/store/useAuthStore';
import { HeaderProfileMenu } from '../../src/components/HeaderProfileMenu';

const PLAN_COLORS: Record<string, string> = {
    free: '#94918e',
    pro: '#6699cc',
    premium: '#39ff14',
    enterprise: '#ff00ff',
};

const PLAN_LABELS: Record<string, string> = {
    free: 'Free',
    pro: 'Pro',
    premium: 'Premium',
    enterprise: 'Enterprise',
};

export default function ProfileScreen() {
    const router = useRouter();
    const { user, setAuth, token } = useAuthStore();
    const plan = user?.plan ?? 'free';
    const planColor = PLAN_COLORS[plan] ?? '#94918e';

    // --- Change Password Modal ---
    const [pwVisible, setPwVisible] = useState(false);
    const [currentPw, setCurrentPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [pwError, setPwError] = useState('');
    const [savingPw, setSavingPw] = useState(false);

    const validatePassword = (pw: string) => {
        if (pw.length < 12) return 'Mínimo 12 caracteres.';
        if (!/[A-Z]/.test(pw)) return 'Debe tener al menos una mayúscula.';
        if (!/[a-z]/.test(pw)) return 'Debe tener al menos una minúscula.';
        if (!/[0-9]/.test(pw)) return 'Debe tener al menos un número.';
        return null;
    };

    const handleChangePassword = async () => {
        setPwError('');
        if (!currentPw) { setPwError('Ingresa tu contraseña actual.'); return; }
        const validationError = validatePassword(newPw);
        if (validationError) { setPwError(validationError); return; }
        if (newPw !== confirmPw) { setPwError('Las contraseñas nuevas no coinciden.'); return; }

        setSavingPw(true);
        try {
            // PUT /auth/me: endpoint para cambiar contraseña con sesión activa (API_DOCS v0.2)
            const res = await apiClient.put(`/auth/me`, {
                current_password: currentPw,
                password: newPw,
                password_confirmation: confirmPw,
            });
            if (res.data.ok) {
                setPwVisible(false);
                setCurrentPw(''); setNewPw(''); setConfirmPw('');
                Alert.alert('Contraseña actualizada', 'Tu contraseña se ha cambiado correctamente.');
            }
        } catch (err: any) {
            const status = err.response?.status;
            const code = err.response?.data?.error?.code;
            if (status === 422) {
                // current_password incorrecta o falta password_confirmation
                const details = err.response?.data?.error?.details;
                const firstDetail = details ? Object.values(details)[0] as string[] : null;
                setPwError(firstDetail?.[0] ?? 'Verifica que tu contraseña actual sea correcta.');
            } else if (status === 401 || code === 'AUTH_UNAUTHENTICATED') {
                setPwError('Tu sesión ha expirado. Vuelve a iniciar sesión.');
            } else {
                setPwError(err.response?.data?.error?.message || 'No se pudo cambiar la contraseña.');
            }
        } finally {
            setSavingPw(false);
        }
    };

    const openChangePw = () => {
        setCurrentPw(''); setNewPw(''); setConfirmPw('');
        setPwError(''); setSavingPw(false);
        setShowCurrent(false); setShowNew(false); setShowConfirm(false);
        setPwVisible(true);
    };

    return (
        <SafeAreaView className="flex-1 bg-background">
            <View className="flex-1 w-full max-w-3xl mx-auto border-x border-border border-opacity-20 web:border-opacity-100">

                {/* Header */}
                <View className="flex-row items-center justify-between px-6 py-4 border-b border-border">
                    <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
                        <ArrowLeft color="#e5e2e1" size={24} />
                    </TouchableOpacity>
                    <Text className="text-text text-[18px] font-semibold flex-1 ml-2">Mi Perfil</Text>
                    <HeaderProfileMenu />
                </View>

                <ScrollView className="flex-1 px-6 pt-6" contentContainerStyle={{ paddingBottom: 40 }}>

                    {/* Avatar y nombre */}
                    <View className="items-center mb-8">
                        <View
                            className="w-20 h-20 rounded-full items-center justify-center mb-3 border-2"
                            style={{ backgroundColor: planColor + '18', borderColor: planColor + '50' }}
                        >
                            <Text className="font-bold text-[32px]" style={{ color: planColor }}>
                                {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                            </Text>
                        </View>
                        <Text className="text-text font-bold text-[20px]">{user?.name ?? 'Usuario'}</Text>
                        <View
                            className="mt-2 px-4 py-1 rounded-full border"
                            style={{ backgroundColor: planColor + '18', borderColor: planColor + '40' }}
                        >
                            <Text className="text-xs font-bold uppercase tracking-widest" style={{ color: planColor }}>
                                FixFlow {PLAN_LABELS[plan]}
                            </Text>
                        </View>
                    </View>

                    {/* Datos de la cuenta */}
                    <Text className="text-textMuted text-[11px] uppercase font-semibold tracking-widest mb-3">Información de la cuenta</Text>
                    <View className="bg-surface border border-border rounded-xl mb-6 overflow-hidden">

                        <View className="flex-row items-center px-5 py-4 border-b border-border">
                            <View className="w-8 h-8 rounded-lg bg-background items-center justify-center mr-3">
                                <User color="#94918e" size={16} />
                            </View>
                            <View className="flex-1">
                                <Text className="text-textMuted text-[11px] uppercase font-semibold tracking-wider mb-0.5">Nombre</Text>
                                <Text className="text-text text-[15px]">{user?.name ?? '—'}</Text>
                            </View>
                        </View>

                        <View className="flex-row items-center px-5 py-4 border-b border-border">
                            <View className="w-8 h-8 rounded-lg bg-background items-center justify-center mr-3">
                                <Mail color="#94918e" size={16} />
                            </View>
                            <View className="flex-1">
                                <Text className="text-textMuted text-[11px] uppercase font-semibold tracking-wider mb-0.5">Correo</Text>
                                <Text className="text-text text-[15px]">{user?.email ?? '—'}</Text>
                            </View>
                        </View>

                        <TouchableOpacity onPress={openChangePw} className="flex-row items-center px-5 py-4 active:opacity-80">
                            <View className="w-8 h-8 rounded-lg bg-background items-center justify-center mr-3">
                                <Lock color="#94918e" size={16} />
                            </View>
                            <View className="flex-1">
                                <Text className="text-textMuted text-[11px] uppercase font-semibold tracking-wider mb-0.5">Contraseña</Text>
                                <Text className="text-text text-[15px]">••••••••••••</Text>
                            </View>
                            <ChevronRight color="#94918e" size={18} />
                        </TouchableOpacity>
                    </View>

                    {/* Plan */}
                    <Text className="text-textMuted text-[11px] uppercase font-semibold tracking-widest mb-3">Suscripción</Text>
                    <View className="bg-surface border border-border rounded-xl mb-6 overflow-hidden">
                        <View className="flex-row items-center px-5 py-4 border-b border-border">
                            <View className="w-8 h-8 rounded-lg bg-background items-center justify-center mr-3">
                                <CreditCard color={planColor} size={16} />
                            </View>
                            <View className="flex-1">
                                <Text className="text-textMuted text-[11px] uppercase font-semibold tracking-wider mb-0.5">Plan actual</Text>
                                <Text className="font-bold text-[15px]" style={{ color: planColor }}>FixFlow {PLAN_LABELS[plan]}</Text>
                            </View>
                            <View className="px-3 py-1 rounded-full" style={{ backgroundColor: planColor + '20' }}>
                                <Text className="text-xs font-semibold uppercase tracking-wider" style={{ color: planColor }}>{PLAN_LABELS[plan]}</Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            onPress={() => router.push('/plans' as any)}
                            className="flex-row items-center px-5 py-4 active:opacity-80"
                        >
                            <View className="w-8 h-8 rounded-lg bg-background items-center justify-center mr-3">
                                <Shield color="#6699cc" size={16} />
                            </View>
                            <View className="flex-1">
                                <Text className="text-text text-[15px] font-medium">
                                    {plan === 'enterprise' ? 'Ver todos los planes' : 'Mejorar mi plan'}
                                </Text>
                                <Text className="text-textMuted text-[12px]">Ver opciones de suscripción</Text>
                            </View>
                            <ChevronRight color="#6699cc" size={18} />
                        </TouchableOpacity>
                    </View>

                </ScrollView>
            </View>

            {/* Modal: Cambiar contraseña */}
            <Modal visible={pwVisible} transparent animationType="fade" onRequestClose={() => setPwVisible(false)}>
                <TouchableWithoutFeedback onPress={() => setPwVisible(false)}>
                    <RNView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
                        <TouchableWithoutFeedback onPress={() => {}}>
                            <RNView style={{ backgroundColor: '#2a2a2a', borderRadius: 16, borderWidth: 1, borderColor: '#444444', padding: 24, width: '100%', maxWidth: 440 }}>

                                <RNView style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                    <Text className="text-text font-bold text-[18px]">Cambiar contraseña</Text>
                                    <TouchableOpacity onPress={() => setPwVisible(false)} className="active:opacity-60">
                                        <X color="#94918e" size={20} />
                                    </TouchableOpacity>
                                </RNView>

                                {/* Contraseña actual */}
                                <Text className="text-textMuted text-xs uppercase font-semibold tracking-wider mb-2">Contraseña actual</Text>
                                <RNView style={{ position: 'relative', marginBottom: 14 }}>
                                    <RNTextInput
                                        value={currentPw}
                                        onChangeText={(t) => { setCurrentPw(t); setPwError(''); }}
                                        secureTextEntry={!showCurrent}
                                        placeholder="Tu contraseña actual"
                                        placeholderTextColor="#94918e"
                                        style={{ backgroundColor: '#141313', borderWidth: 1, borderColor: '#444', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, color: '#e5e2e1', fontSize: 15, paddingRight: 44 }}
                                    />
                                    <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)} style={{ position: 'absolute', right: 12, top: 12 }}>
                                        {showCurrent ? <EyeOff color="#94918e" size={20} /> : <Eye color="#94918e" size={20} />}
                                    </TouchableOpacity>
                                </RNView>

                                {/* Nueva contraseña */}
                                <Text className="text-textMuted text-xs uppercase font-semibold tracking-wider mb-2">Nueva contraseña</Text>
                                <RNView style={{ position: 'relative', marginBottom: 14 }}>
                                    <RNTextInput
                                        value={newPw}
                                        onChangeText={(t) => { setNewPw(t); setPwError(''); }}
                                        secureTextEntry={!showNew}
                                        placeholder="Mín. 12 chars, mayúscula, número"
                                        placeholderTextColor="#94918e"
                                        style={{ backgroundColor: '#141313', borderWidth: 1, borderColor: '#444', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, color: '#e5e2e1', fontSize: 15, paddingRight: 44 }}
                                    />
                                    <TouchableOpacity onPress={() => setShowNew(!showNew)} style={{ position: 'absolute', right: 12, top: 12 }}>
                                        {showNew ? <EyeOff color="#94918e" size={20} /> : <Eye color="#94918e" size={20} />}
                                    </TouchableOpacity>
                                </RNView>

                                {/* Confirmar nueva */}
                                <Text className="text-textMuted text-xs uppercase font-semibold tracking-wider mb-2">Confirmar nueva contraseña</Text>
                                <RNView style={{ position: 'relative', marginBottom: 6 }}>
                                    <RNTextInput
                                        value={confirmPw}
                                        onChangeText={(t) => { setConfirmPw(t); setPwError(''); }}
                                        secureTextEntry={!showConfirm}
                                        placeholder="Repite la nueva contraseña"
                                        placeholderTextColor="#94918e"
                                        style={{ backgroundColor: '#141313', borderWidth: 1, borderColor: '#444', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, color: '#e5e2e1', fontSize: 15, paddingRight: 44 }}
                                    />
                                    <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={{ position: 'absolute', right: 12, top: 12 }}>
                                        {showConfirm ? <EyeOff color="#94918e" size={20} /> : <Eye color="#94918e" size={20} />}
                                    </TouchableOpacity>
                                </RNView>

                                {pwError ? (
                                    <Text className="text-[#ffb4ab] text-sm mb-3 mt-1">{pwError}</Text>
                                ) : (
                                    <RNView style={{ height: 12 }} />
                                )}

                                <RNView style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                                    <TouchableOpacity onPress={() => setPwVisible(false)} className="flex-1 py-3 rounded-xl border border-border items-center active:opacity-70">
                                        <Text className="text-textMuted font-medium">Cancelar</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={handleChangePassword}
                                        disabled={savingPw}
                                        className={`flex-1 py-3 rounded-xl border border-primary items-center ${savingPw ? 'opacity-50' : 'active:opacity-80'}`}
                                    >
                                        {savingPw ? <ActivityIndicator color="#6699cc" /> : <Text className="text-primary font-semibold">Guardar</Text>}
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
