import React, { useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { View, Text, ScrollView, SafeAreaView, TouchableOpacity, ActivityIndicator } from '../../../src/components/ui';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { ArrowLeft, Lock, FileSpreadsheet, FileText, Download } from 'lucide-react-native';
import apiClient from '../../../src/api/client';
import { useAuthStore } from '../../../src/store/useAuthStore';
import * as ScreenCapture from 'expo-screen-capture';
import { exportFile } from '../../../src/utils/fileExport';

export default function DeviceSummaryScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { user } = useAuthStore();
    const [device, setDevice] = useState<any>(null);
    const [timeline, setTimeline] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [exportingSpecs, setExportingSpecs] = useState(false);
    const [exportingHistExcel, setExportingHistExcel] = useState(false);
    const [exportingHistPdf, setExportingHistPdf] = useState(false);

    const isFreePlan = user?.plan === 'free';

    useEffect(() => {
        if (isFreePlan && Platform.OS !== 'web') {
            ScreenCapture.preventScreenCaptureAsync().catch(console.error);
            return () => {
                ScreenCapture.allowScreenCaptureAsync().catch(console.error);
            };
        }
    }, [isFreePlan]);

    useFocusEffect(
        useCallback(() => {
            const fetchData = async () => {
                try {
                    const resDevice = await apiClient.get(`/devices/${id}`);
                    if (resDevice.data.ok) {
                        setDevice(resDevice.data.data);
                    }
                    
                    try {
                        const resTimeline = await apiClient.get(`/devices/${id}/maintenance-timeline`);
                        if (resTimeline.data.ok) {
                            setTimeline(resTimeline.data.data?.events || resTimeline.data.data || []);
                        }
                    } catch (e) {
                        // Ignorar si no hay línea de tiempo
                    }
                } catch (err) {
                    console.error(err);
                } finally {
                    setLoading(false);
                }
            };
            fetchData();
        }, [id])
    );

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

    const handleExport = async (type: 'specs_excel' | 'hist_excel' | 'hist_pdf') => {
        if (type === 'specs_excel') {
            setExportingSpecs(true);
            await exportFile(`/devices/${id}/exports/specs/excel`);
            setExportingSpecs(false);
        } else if (type === 'hist_excel') {
            setExportingHistExcel(true);
            await exportFile(`/devices/${id}/exports/maintenance/excel`);
            setExportingHistExcel(false);
        } else if (type === 'hist_pdf') {
            setExportingHistPdf(true);
            await exportFile(`/devices/${id}/exports/maintenance/pdf`);
            setExportingHistPdf(false);
        }
    };

    const completedSessions = timeline.filter(t => t.type === 'wizard_session' && t.status === 'completed');

    return (
        <SafeAreaView className="flex-1 bg-background">
            <View className="flex-1 w-full max-w-3xl mx-auto border-x border-border border-opacity-20 web:border-opacity-100">
                {/* Header */}
                <View className="flex-row items-center px-6 py-4 border-b border-border">
                    <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
                        <ArrowLeft color="#e5e2e1" size={24} />
                    </TouchableOpacity>
                    <Text className="text-text text-[18px] font-semibold ml-2 flex-1">
                        Resumen del Equipo
                    </Text>
                </View>

                {isFreePlan && (
                    <View className="bg-[#1c1b1b] px-6 py-3 border-b border-border flex-row items-center">
                        <Lock color="#6699cc" size={16} className="mr-2" />
                        <Text className="text-textMuted text-[13px] flex-1">
                            Las capturas están deshabilitadas. Actualiza a Pro para exportar resúmenes y ver observaciones detalladas.
                        </Text>
                    </View>
                )}

                <ScrollView className="flex-1 p-6">
                    {loading ? (
                        <ActivityIndicator size="large" color="#6699cc" className="mt-10" />
                    ) : (
                        <>
                            <Text className="text-text font-bold text-[22px] mb-2">{device?.name}</Text>
                            <Text className="text-textMuted text-[14px] mb-6">
                                Registrado el {device?.created_at ? new Date(device?.created_at).toLocaleDateString() : '-'}
                            </Text>

                            {/* Panel de Exportación Pro */}
                            <View className="bg-surface border border-border rounded-xl p-4 mb-8">
                                <Text className="text-text font-bold text-[16px] mb-3">Exportar Datos</Text>
                                <View className="flex-row flex-wrap gap-3">
                                    <TouchableOpacity 
                                        onPress={() => handleExport('specs_excel')}
                                        disabled={exportingSpecs}
                                        className="bg-[#141313] border border-border rounded-lg py-3 px-4 flex-row items-center flex-1 min-w-[140px] justify-center"
                                    >
                                        {exportingSpecs ? <ActivityIndicator size="small" color="#94918e" /> : (
                                            <>
                                                {isFreePlan ? <Lock color="#94918e" size={16} className="mr-2" /> : <FileSpreadsheet color="#6699cc" size={16} className="mr-2" />}
                                                <Text className="text-textMuted font-medium text-[13px]">Specs (Excel)</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                    
                                    <TouchableOpacity 
                                        onPress={() => handleExport('hist_excel')}
                                        disabled={exportingHistExcel}
                                        className="bg-[#141313] border border-border rounded-lg py-3 px-4 flex-row items-center flex-1 min-w-[140px] justify-center"
                                    >
                                        {exportingHistExcel ? <ActivityIndicator size="small" color="#94918e" /> : (
                                            <>
                                                {isFreePlan ? <Lock color="#94918e" size={16} className="mr-2" /> : <FileSpreadsheet color="#39ff14" size={16} className="mr-2" />}
                                                <Text className="text-textMuted font-medium text-[13px]">Historial (Excel)</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>

                                    <TouchableOpacity 
                                        onPress={() => handleExport('hist_pdf')}
                                        disabled={exportingHistPdf}
                                        className="bg-[#141313] border border-border rounded-lg py-3 px-4 flex-row items-center flex-1 min-w-[140px] justify-center"
                                    >
                                        {exportingHistPdf ? <ActivityIndicator size="small" color="#94918e" /> : (
                                            <>
                                                {isFreePlan ? <Lock color="#94918e" size={16} className="mr-2" /> : <FileText color="#ff8a80" size={16} className="mr-2" />}
                                                <Text className="text-textMuted font-medium text-[13px]">Historial (PDF)</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Especificaciones */}
                            <Text className="text-text font-bold text-[18px] mb-3">Especificaciones</Text>
                            <View className="bg-surface rounded-xl border border-border p-4 mb-8">
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

                            {/* Historial y Notas (Pro) */}
                            <Text className="text-text font-bold text-[18px] mb-3">Historial de Mantenimiento</Text>
                            {completedSessions.length > 0 ? (
                                completedSessions.map((session: any, index: number) => (
                                    <View key={session.id} className="bg-surface rounded-xl border border-border p-4 mb-4">
                                        <View className="flex-row justify-between items-center mb-3">
                                            <Text className="text-text font-semibold">Mantenimiento Completado</Text>
                                            <Text className="text-textMuted text-[12px]">{new Date(session.updated_at).toLocaleDateString()}</Text>
                                        </View>
                                        
                                        {session.payload?.summary ? (
                                            <Text className="text-textMuted text-[14px] mb-4 italic">"{session.payload.summary}"</Text>
                                        ) : null}

                                        <Text className="text-textMuted text-[12px] uppercase font-bold mb-2">Observaciones por Componente</Text>
                                        
                                        {isFreePlan ? (
                                            <View className="bg-[#141313] p-4 rounded-lg flex-row items-center border border-border border-dashed">
                                                <Lock color="#94918e" size={16} className="mr-3" />
                                                <Text className="text-textMuted text-[13px] flex-1">
                                                    Las notas técnicas detalladas son exclusivas del plan Pro.
                                                </Text>
                                            </View>
                                        ) : (
                                            <View className="bg-[#141313] p-3 rounded-lg border border-border">
                                                {session.payload?.component_steps?.map((compStep: any, idx: number) => {
                                                    if (!compStep.observation) return null;
                                                    return (
                                                        <View key={idx} className={`py-2 ${idx !== 0 ? 'border-t border-border' : ''}`}>
                                                            <Text className="text-text font-medium text-[13px] mb-1">{compStep.component_name}</Text>
                                                            <Text className="text-textMuted text-[13px]">{compStep.observation}</Text>
                                                        </View>
                                                    );
                                                })}
                                                {(!session.payload?.component_steps || !session.payload.component_steps.some((c:any) => c.observation)) && (
                                                    <Text className="text-textMuted text-[13px] italic py-2">No se registraron observaciones técnicas en esta sesión.</Text>
                                                )}
                                            </View>
                                        )}
                                    </View>
                                ))
                            ) : (
                                <View className="bg-surface rounded-xl border border-border p-6 items-center">
                                    <Text className="text-textMuted text-center">Aún no hay mantenimientos completados para este equipo.</Text>
                                </View>
                            )}

                            <View className="h-10" />
                        </>
                    )}
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}
