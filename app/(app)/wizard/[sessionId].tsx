import React, { useState, useEffect, useCallback } from 'react';
import { KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { View, Text, ScrollView, SafeAreaView, TouchableOpacity, ActivityIndicator, TextInput } from '../../../src/components/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle, Circle, Save, LogOut, Lock, ChevronDown, ChevronUp } from 'lucide-react-native';
import apiClient from '../../../src/api/client';
import { useAuthStore } from '../../../src/store/useAuthStore';
import { CATEGORY_COLORS } from '../../../components/ui/CategoryRow';

export default function WizardScreen() {
    const { sessionId } = useLocalSearchParams();
    const router = useRouter();
    const { user } = useAuthStore();
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [session, setSession] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'global'|'components'|'summary'>('global');
    const [summaryText, setSummaryText] = useState('');
    const [expandedComponents, setExpandedComponents] = useState<Record<number, boolean>>({});

    const isFreePlan = user?.plan === 'free';

    useEffect(() => {
        if (sessionId) {
            fetchSession();
        }
    }, [sessionId]);

    const fetchSession = async () => {
        try {
            const res = await apiClient.get(`/maintenance-wizard/sessions/${sessionId}`);
            if (res.data.ok) {
                setSession(res.data.data);
                if (res.data.data.payload?.summary) {
                    setSummaryText(res.data.data.payload.summary);
                }
            }
        } catch (error) {
            console.error('Error fetching session', error);
            Alert.alert('Error', 'No se pudo cargar la sesión.');
        } finally {
            setLoading(false);
        }
    };

    const handleAutoSave = async (updatedPayload: any) => {
        try {
            await apiClient.patch(`/maintenance-wizard/sessions/${sessionId}/progress`, updatedPayload);
        } catch (error) {
            console.error('Error autosaving progress', error);
        }
    };

    const toggleGlobalStep = (index: number) => {
        const newGlobalSteps = [...session.payload.global_steps];
        newGlobalSteps[index].checked = !newGlobalSteps[index].checked;
        
        const newPayload = { ...session.payload, global_steps: newGlobalSteps };
        setSession({ ...session, payload: newPayload });
        handleAutoSave(newPayload);
    };

    const updateGlobalNote = (index: number, text: string) => {
        const newGlobalSteps = [...session.payload.global_steps];
        newGlobalSteps[index].notes = text;
        const newPayload = { ...session.payload, global_steps: newGlobalSteps };
        setSession({ ...session, payload: newPayload });
    };

    const toggleComponentStep = (compIndex: number, stepIndex: number) => {
        const newComponentSteps = [...session.payload.component_steps];
        newComponentSteps[compIndex].steps[stepIndex].checked = !newComponentSteps[compIndex].steps[stepIndex].checked;
        
        const newPayload = { ...session.payload, component_steps: newComponentSteps };
        setSession({ ...session, payload: newPayload });
        handleAutoSave(newPayload);
    };

    const updateComponentObservation = (compIndex: number, text: string) => {
        const newComponentSteps = [...session.payload.component_steps];
        newComponentSteps[compIndex].observation = text;
        const newPayload = { ...session.payload, component_steps: newComponentSteps };
        setSession({ ...session, payload: newPayload });
    };

    const handleSaveAndExit = async () => {
        setSaving(true);
        try {
            const payload = { ...session.payload, summary: summaryText };
            await apiClient.post(`/maintenance-wizard/sessions/${sessionId}/save-and-exit`, payload);
            router.replace(`/device/${session.device_id}`);
        } catch (error) {
            console.error('Error saving session', error);
            Alert.alert('Error', 'No se pudo guardar la sesión.');
        } finally {
            setSaving(false);
        }
    };

    const handleComplete = async () => {
        setSaving(true);
        try {
            const payload = { ...session.payload, summary: summaryText };
            const res = await apiClient.post(`/maintenance-wizard/sessions/${sessionId}/complete`, payload);
            if (res.data.ok) {
                if (Platform.OS === 'web') {
                    alert('Mantenimiento completado con éxito.');
                } else {
                    Alert.alert('Éxito', 'Mantenimiento completado con éxito.', [
                        { text: 'Entendido', onPress: () => router.replace(`/device/${session.device_id}`) }
                    ]);
                }
                if (Platform.OS === 'web') {
                    router.replace(`/device/${session.device_id}`);
                }
            }
        } catch (error) {
            console.error('Error completing wizard', error);
            Alert.alert('Error', 'Hubo un problema al finalizar el mantenimiento.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-background justify-center items-center">
                <ActivityIndicator size="large" color="#6699cc" />
            </SafeAreaView>
        );
    }

    if (!session) return null;

    return (
        <SafeAreaView className="flex-1 bg-background">
            <View className="w-full max-w-3xl mx-auto border-x border-border border-opacity-20 web:border-opacity-100" style={{ flex: 1, height: '100%' }}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, flexDirection: 'column' }}>
                    {/* Header */}
                    <View className="px-6 pt-6 pb-4 border-b border-border flex-row items-center justify-between">
                        <TouchableOpacity onPress={handleSaveAndExit} disabled={saving} className="p-2 -ml-2">
                            <ArrowLeft color="#e5e2e1" size={24} />
                        </TouchableOpacity>
                        <Text className="text-text font-bold text-[18px]">Asistente de Mantenimiento</Text>
                        <TouchableOpacity onPress={handleSaveAndExit} disabled={saving} className="p-2 -mr-2">
                            <LogOut color="#6699cc" size={24} />
                        </TouchableOpacity>
                    </View>

                {/* Tabs */}
                <View className="flex-row border-b border-border">
                    <TouchableOpacity 
                        className={`flex-1 py-4 items-center border-b-2 ${activeTab === 'global' ? 'border-primary' : 'border-transparent'}`}
                        onPress={() => setActiveTab('global')}
                    >
                        <Text className={`font-medium ${activeTab === 'global' ? 'text-primary' : 'text-textMuted'}`}>General</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        className={`flex-1 py-4 items-center border-b-2 ${activeTab === 'components' ? 'border-primary' : 'border-transparent'}`}
                        onPress={() => setActiveTab('components')}
                    >
                        <Text className={`font-medium ${activeTab === 'components' ? 'text-primary' : 'text-textMuted'}`}>Componentes</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        className={`flex-1 py-4 items-center border-b-2 ${activeTab === 'summary' ? 'border-primary' : 'border-transparent'}`}
                        onPress={() => setActiveTab('summary')}
                    >
                        <Text className={`font-medium ${activeTab === 'summary' ? 'text-primary' : 'text-textMuted'}`}>Finalizar</Text>
                    </TouchableOpacity>
                </View>

                {/* Content */}
                <View style={{ flex: 1, overflow: 'hidden' }}>
                    <ScrollView 
                        style={{ flex: 1 }}
                        className="px-6 pt-6"
                        contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        {activeTab === 'global' && (
                        <View className="pb-10">
                            <Text className="text-text font-bold text-[20px] mb-4">Tareas Generales</Text>
                            {session.payload.global_steps?.map((step: any, index: number) => (
                                <View key={step.key} className="bg-surface rounded-xl p-4 mb-4 border border-border">
                                    <TouchableOpacity 
                                        className="flex-row items-center"
                                        onPress={() => toggleGlobalStep(index)}
                                    >
                                        {step.checked ? (
                                            <CheckCircle color="#39ff14" size={24} />
                                        ) : (
                                            <Circle color="#8b919a" size={24} />
                                        )}
                                        <Text className={`ml-3 text-[16px] font-medium ${step.checked ? 'text-textMuted line-through' : 'text-text'}`}>
                                            {step.title}
                                        </Text>
                                    </TouchableOpacity>
                                    {step.checked && (
                                        <TextInput
                                            className="mt-4 bg-[#141313] border border-border rounded-lg px-4 py-3 text-text"
                                            placeholder="Añadir notas (opcional)..."
                                            placeholderTextColor="#94918e"
                                            value={step.notes || ''}
                                            onChangeText={(t) => updateGlobalNote(index, t)}
                                            onBlur={() => handleAutoSave({ ...session.payload, global_steps: session.payload.global_steps })}
                                        />
                                    )}
                                </View>
                            ))}
                            <TouchableOpacity 
                                onPress={() => setActiveTab('components')}
                                className="w-full py-4 rounded-xl items-center bg-surface border border-primary mt-4"
                            >
                                <Text className="text-primary font-bold text-[16px]">Continuar a Componentes</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {activeTab === 'components' && (
                        <View className="pb-10">
                            <Text className="text-text font-bold text-[20px] mb-4">Revisión por Componentes</Text>
                            {session.payload.component_steps?.map((compStep: any, compIndex: number) => {
                                const color = CATEGORY_COLORS[compStep.category] || '#6699cc';
                                const isExpanded = expandedComponents[compIndex] || false;
                                
                                const isComponentComplete = () => {
                                    if (!compStep.steps || compStep.steps.length === 0) return true;
                                    return compStep.steps.every((step: any) => {
                                        if (step.title.toLowerCase().includes('opcional')) return true;
                                        if (compStep.category === 'gpu' && (step.key === 'gpu-paste' || step.title.toLowerCase().includes('pasta'))) return true;
                                        return step.checked;
                                    });
                                };
                                const completed = isComponentComplete();

                                return (
                                    <View key={compIndex} className="bg-surface rounded-xl p-4 mb-6 border" style={{ borderColor: '#444444' }}>
                                        <TouchableOpacity 
                                            className="flex-row items-center justify-between"
                                            onPress={() => setExpandedComponents(prev => ({...prev, [compIndex]: !prev[compIndex]}))}
                                        >
                                            <View className="flex-row items-center flex-1 pr-4">
                                                <View className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: color }} />
                                                <Text className="text-text font-bold text-[16px] uppercase" numberOfLines={1}>{compStep.component_name} ({compStep.category})</Text>
                                                {completed && <CheckCircle color="#39ff14" size={18} className="ml-2" />}
                                            </View>
                                            {isExpanded ? <ChevronUp color="#e5e2e1" size={20} /> : <ChevronDown color="#e5e2e1" size={20} />}
                                        </TouchableOpacity>

                                        {isExpanded && (
                                            <View className="mt-4 border-t border-border pt-2">
                                                {compStep.steps?.map((step: any, stepIndex: number) => (
                                                    <TouchableOpacity 
                                                        key={step.key}
                                                        className="flex-row items-center py-3 border-b border-border"
                                                        onPress={() => toggleComponentStep(compIndex, stepIndex)}
                                                    >
                                                        {step.checked ? (
                                                            <CheckCircle color={color} size={22} />
                                                        ) : (
                                                            <Circle color="#8b919a" size={22} />
                                                        )}
                                                        <Text className={`ml-3 text-[15px] font-medium flex-1 ${step.checked ? 'text-textMuted' : 'text-text'}`}>
                                                            {step.title}
                                                        </Text>
                                                    </TouchableOpacity>
                                                ))}

                                                <View className="mt-4 pt-4">
                                                    <View className="flex-row items-center mb-2">
                                                        <Text className="text-textMuted text-[13px] font-medium uppercase tracking-wider">
                                                            Observación Técnica
                                                        </Text>
                                                        {isFreePlan && <Lock color="#94918e" size={14} className="ml-2" />}
                                                    </View>
                                                    
                                                    {isFreePlan ? (
                                                        <TouchableOpacity 
                                                            className="bg-[#141313] border border-border rounded-lg px-4 py-4 items-center"
                                                            onPress={() => Alert.alert('Premium', 'Actualiza a Pro para guardar observaciones técnicas detalladas de cada componente.')}
                                                        >
                                                            <Text className="text-[#94918e] font-medium">Solo disponible en plan Pro</Text>
                                                        </TouchableOpacity>
                                                    ) : (
                                                        <TextInput
                                                            className="bg-[#141313] border border-border rounded-lg px-4 py-3 text-text h-20"
                                                            placeholder="Escribe el estado físico, temperaturas..."
                                                            placeholderTextColor="#94918e"
                                                            multiline
                                                            value={compStep.observation || ''}
                                                            onChangeText={(t) => updateComponentObservation(compIndex, t)}
                                                            onBlur={() => handleAutoSave({ ...session.payload, component_steps: session.payload.component_steps })}
                                                        />
                                                    )}
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                );
                            })}
                            <TouchableOpacity 
                                onPress={() => setActiveTab('summary')}
                                className="w-full py-4 rounded-xl items-center bg-surface border border-primary mt-4"
                            >
                                <Text className="text-primary font-bold text-[16px]">Ir al Resumen Final</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {activeTab === 'summary' && (
                        <View className="pb-10">
                            <Text className="text-text font-bold text-[20px] mb-4">Resumen del Mantenimiento</Text>
                            <Text className="text-textMuted text-[14px] mb-6">
                                Estás a punto de finalizar. Agrega un comentario general sobre este mantenimiento (opcional) que quedará guardado en el historial del equipo.
                            </Text>

                            <TextInput
                                className="bg-surface border border-border rounded-xl px-4 py-4 text-text h-32 mb-8 text-[15px]"
                                placeholder="Ej: Se realizó cambio de pasta y limpieza general. Todo operando estable."
                                placeholderTextColor="#94918e"
                                multiline
                                textAlignVertical="top"
                                value={summaryText}
                                onChangeText={setSummaryText}
                                onBlur={() => handleAutoSave({ ...session.payload, summary: summaryText })}
                            />

                            <TouchableOpacity 
                                onPress={handleComplete}
                                disabled={saving}
                                className="w-full py-4 rounded-xl items-center bg-primary flex-row justify-center mb-4"
                            >
                                {saving ? <ActivityIndicator size="small" color="#141313" /> : (
                                    <>
                                        <Save color="#141313" size={20} className="mr-2" />
                                        <Text className="text-[#141313] font-bold text-[16px]">Finalizar Mantenimiento</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Universal Save & Exit Button present on all tabs */}
                    <View className="mt-8 mb-4 border-t border-border pt-6">
                        <TouchableOpacity 
                            onPress={handleSaveAndExit}
                            disabled={saving}
                            className="w-full py-4 rounded-xl items-center bg-transparent border border-border flex-row justify-center"
                        >
                            <LogOut color="#94918e" size={20} className="mr-2" />
                            <Text className="text-textMuted font-bold text-[16px]">Pausar y Salir</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
                </View>
                </KeyboardAvoidingView>
            </View>
        </SafeAreaView>
    );
}
