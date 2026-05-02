import React, { useState, useEffect } from 'react';
import { Platform, Alert, Modal } from 'react-native';
import { View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, KeyboardAvoidingView } from '../../../../src/components/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Calendar, Link as LinkIcon, ArrowRight, ChevronDown, ChevronRight } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { PhotoUploader } from '../../../../components/ui/PhotoUploader';
import apiClient from '../../../../src/api/client';
import { HeaderProfileMenu } from '../../../../src/components/HeaderProfileMenu';
import { useAuthStore } from '../../../../src/store/useAuthStore';
import { CATEGORY_COLORS } from '../../../../components/ui/CategoryRow';

const CATEGORY_LABELS: Record<string, string> = {
    cpu: 'Procesador',
    gpu: 'Tarjeta gráfica',
    ram: 'Memoria RAM',
    motherboard: 'Placa madre',
    psu: 'Fuente de poder',
    storage: 'Almacenamiento',
    cooler: 'Enfriamiento',
    case: 'Gabinete',
    case_fans: 'Ventiladores',
    other: 'Otro'
};

const CATEGORY_NAME_PLACEHOLDERS: Record<string, string> = {
    cpu: 'Ryzen 7 5800X3D, Intel Core i9-13900K...',
    gpu: 'RTX 4090, RX 7900 XTX...',
    ram: 'Corsair Vengeance LPX 32GB, Kingston FURY...',
    motherboard: 'ASUS ROG Strix B550-F, MSI MAG Z790...',
    psu: 'Corsair RM850x, EVGA SuperNOVA 750...',
    storage: 'Samsung 980 PRO 1TB, Crucial MX500...',
    cooler: 'Noctua NH-D15, NZXT Kraken X63...',
    case: 'NZXT H510, Corsair 4000D Airflow...',
    case_fans: 'Noctua NF-A12x25, Corsair LL120...',
};

const CATEGORY_SPECS_CONFIG: Record<string, { name: string; label: string; placeholder: string }[]> = {
    cpu: [
        { name: 'cores', label: 'Núcleos', placeholder: 'Ej. 8' },
        { name: 'threads', label: 'Hilos', placeholder: 'Ej. 16' },
        { name: 'base_clock', label: 'Reloj base', placeholder: 'Ej. 3.4 GHz' },
        { name: 'boost_clock', label: 'Reloj boost', placeholder: 'Ej. 4.5 GHz' },
        { name: 'socket', label: 'Socket', placeholder: 'Ej. AM4' },
        { name: 'tdp', label: 'TDP', placeholder: 'Ej. 105W' },
    ],
    motherboard: [
        { name: 'socket', label: 'Socket', placeholder: 'Ej. AM4' },
        { name: 'chipset', label: 'Chipset', placeholder: 'Ej. X570' },
        { name: 'form_factor', label: 'Factor de forma', placeholder: 'Ej. ATX' },
        { name: 'ram_slots', label: 'Ranuras RAM', placeholder: 'Ej. 4' },
        { name: 'pcie_slots', label: 'Ranuras PCIe', placeholder: 'Ej. 3' },
    ],
    ram: [
        { name: 'capacity', label: 'Capacidad', placeholder: 'Ej. 16GB' },
        { name: 'speed', label: 'Velocidad', placeholder: 'Ej. 3200MHz' },
        { name: 'ram_type', label: 'Tipo', placeholder: 'Ej. DDR4' },
        { name: 'modules', label: 'Módulos', placeholder: 'Ej. 2' },
        { name: 'latency', label: 'Latencia', placeholder: 'Ej. CL16' },
    ],
    gpu: [
        { name: 'vram', label: 'VRAM', placeholder: 'Ej. 8GB' },
        { name: 'base_clock', label: 'Reloj base', placeholder: 'Ej. 1440 MHz' },
        { name: 'boost_clock', label: 'Reloj boost', placeholder: 'Ej. 1710 MHz' },
        { name: 'tdp', label: 'TDP', placeholder: 'Ej. 250W' },
        { name: 'length_mm', label: 'Largo (mm)', placeholder: 'Ej. 280' },
        { name: 'speed', label: 'Velocidad', placeholder: 'Ej. 14Gbps' }
    ],
    cooler: [
        { name: 'cooler_type', label: 'Tipo', placeholder: 'Ej. Líquido, Aire' },
        { name: 'radiator_size', label: 'Tamaño radiador', placeholder: 'Ej. 240mm' },
        { name: 'fan_size', label: 'Tamaño ventilador', placeholder: 'Ej. 120mm' },
        { name: 'socket_support', label: 'Sockets', placeholder: 'Ej. AM4, LGA1700' }
    ],
    psu: [
        { name: 'wattage', label: 'Potencia', placeholder: 'Ej. 750W' },
        { name: 'certification', label: 'Certificación', placeholder: 'Ej. 80+ Gold' },
        { name: 'modular', label: 'Modular', placeholder: 'Ej. Full, Semi, No' }
    ],
    storage: [
        { name: 'capacity', label: 'Capacidad', placeholder: 'Ej. 1TB' },
        { name: 'storage_type', label: 'Tipo', placeholder: 'Ej. NVMe, SATA' },
        { name: 'interface', label: 'Interfaz', placeholder: 'Ej. PCIe 4.0' },
        { name: 'read_speed', label: 'Velocidad lectura', placeholder: 'Ej. 7000 MB/s' },
        { name: 'write_speed', label: 'Velocidad escritura', placeholder: 'Ej. 5000 MB/s' }
    ],
    case: [
        { name: 'form_factor', label: 'Factor de forma', placeholder: 'Ej. Mid Tower' },
        { name: 'max_gpu_length', label: 'Max GPU Largo', placeholder: 'Ej. 360mm' },
        { name: 'max_cooler_height', label: 'Max Cooler Alto', placeholder: 'Ej. 160mm' },
        { name: 'preinstalled_fans', label: 'Ventiladores inc.', placeholder: 'Ej. 3' }
    ],
    case_fans: [
        { name: 'fan_size', label: 'Tamaño', placeholder: 'Ej. 120mm' },
        { name: 'rpm', label: 'RPM', placeholder: 'Ej. 1500' },
        { name: 'airflow', label: 'Flujo de aire', placeholder: 'Ej. 50 CFM' },
        { name: 'connector', label: 'Conector', placeholder: 'Ej. 4-pin PWM' }
    ]
};

export default function ComponentFormScreen() {
    const { id, category, deviceName, componentId } = useLocalSearchParams();
    const router = useRouter();
    const { user } = useAuthStore();
    const isFreePlan = user?.plan === 'free';

    const [saving, setSaving] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [isSpecsOpen, setIsSpecsOpen] = useState(true);
    const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);
    const [name, setName] = useState('');
    const [specs, setSpecs] = useState<Record<string, string>>({});
    const [purchaseDate, setPurchaseDate] = useState('');
    const [purchaseStatus, setPurchaseStatus] = useState('');
    const [storeUrl, setStoreUrl] = useState('');
    const [imageUri, setImageUri] = useState<string | null>(null);

    useEffect(() => {
        const fetchComponent = async () => {
            if (!componentId) return;

            try {
                const res = await apiClient.get(`/devices/${id}`);
                if (res.data.ok) {
                    const comp = res.data.data.components?.find((c: any) => String(c.id) === String(componentId));
                    if (comp) {
                        setName(comp.name || '');
                        setPurchaseDate(comp.purchase_date || '');
                        setPurchaseStatus(comp.purchase_condition || '');
                        setStoreUrl(comp.store_url || '');
                        if (comp.specs) setSpecs(comp.specs);
                        if (comp.photos && comp.photos.length > 0) {
                            setImageUri(comp.photos[0].url);
                        }
                    }
                }
            } catch (err) {
                console.error('Error preloading component data', err);
            }
        };

        fetchComponent();
    }, [componentId, id]);

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'El nombre o modelo es obligatorio.');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                category,
                name,
                purchase_date: purchaseDate || undefined,
                purchase_condition: purchaseStatus || undefined,
                store_url: storeUrl,
                specs: Object.keys(specs).length > 0 ? specs : undefined
            };

            let savedComponentId = componentId as string;

            if (componentId) {
                const res = await apiClient.put(`/devices/${id}/components/${componentId}`, payload);
                if (!res.data.ok) throw res;
            } else {
                const res = await apiClient.post(`/devices/${id}/components`, payload);
                if (!res.data.ok) throw res;
                savedComponentId = res.data.data.id;
            }

            if (imageUri && !imageUri.startsWith('http') && !isFreePlan) {
                const formData = new FormData();
                const filename = imageUri.split('/').pop() || 'photo.jpg';
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `image/${match[1]}` : `image`;

                formData.append('photo', {
                    uri: Platform.OS === 'ios' ? imageUri.replace('file://', '') : imageUri,
                    name: filename,
                    type,
                } as any);

                try {
                    await apiClient.post(`/components/${savedComponentId}/photos`, formData, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                    });
                } catch (photoErr: any) {
                    console.log('Error subiendo foto', photoErr);
                }
            }

            setShowSuccessModal(true);
        } catch (err: any) {
            console.error(err);
            let errorMsg = 'Ocurrió un error inesperado al guardar el componente.';

            if (err.response?.data?.error) {
                errorMsg = err.response.data.error.message;

                if (err.response.data.error.details) {
                    const details = err.response.data.error.details;
                    const detailsStr = Object.keys(details)
                        .map(key => `- ${details[key].join(', ')}`)
                        .join('\n');
                    errorMsg += `\n\n${detailsStr}`;
                }
            } else if (err.data?.error) {
                errorMsg = err.data.error.message;
            }

            Alert.alert('No se pudo guardar', errorMsg);
        } finally {
            setSaving(false);
        }
    };

    const handleBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace(`/device/${id}` as any);
        }
    };

    const title = CATEGORY_LABELS[category as string] || 'Componente';
    const configFields = category && typeof category === 'string' ? CATEGORY_SPECS_CONFIG[category] || [] : [];

    return (
        <SafeAreaView className="flex-1 bg-background">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1 w-full max-w-3xl mx-auto border-x border-border border-opacity-20 web:border-opacity-100"
            >
                <View className="flex-row items-center justify-between px-6 py-4 border-b border-border bg-background z-10">
                    <TouchableOpacity onPress={handleBack} className="p-2 -ml-2">
                        <ArrowLeft color="#e5e2e1" size={24} />
                    </TouchableOpacity>
                    <Text className="text-text text-[20px] font-semibold flex-1 ml-2">{title}</Text>
                    <HeaderProfileMenu />
                </View>

                <ScrollView className="flex-1 px-6 pt-6" contentContainerStyle={{ paddingBottom: 40 }}>
                    {isFreePlan ? (
                        <View className="bg-surface border border-dashed border-border rounded-xl p-5 mb-6 items-center">
                            <Text className="text-textMuted text-sm mb-2 text-center">Sube fotos de tus componentes con el Plan Pro</Text>
                            <TouchableOpacity className="flex-row items-center active:opacity-80">
                                <Text className="text-primary font-medium text-sm mr-1">Upgrade a Pro</Text>
                                <ArrowRight color="#6699cc" size={16} />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <PhotoUploader
                            imageUri={imageUri}
                            onImageSelect={setImageUri}
                            onImageRemove={() => setImageUri(null)}
                        />
                    )}

                    <View className="bg-surface border border-border rounded-xl p-5 mb-6">
                        <Text className="text-textMuted text-[11px] uppercase font-semibold mb-2 tracking-wider">
                            Nombre / modelo *
                        </Text>
                        <TextInput
                            value={name}
                            onChangeText={setName}
                            placeholder={`Ej. ${CATEGORY_NAME_PLACEHOLDERS[category as string] || 'Modelo XYZ'}`}
                            placeholderTextColor="#94918e"
                            className="bg-background border border-border rounded-lg text-text px-4 py-3 text-[15px]"
                        />
                    </View>

                    <View className="bg-surface border border-border rounded-xl mb-6 overflow-hidden">
                        <TouchableOpacity
                            onPress={() => setIsSpecsOpen(!isSpecsOpen)}
                            className="p-5 flex-row items-center justify-between active:opacity-80"
                        >
                            <Text className="text-textMuted text-[12px] uppercase font-semibold tracking-wider">
                                Especificaciones Técnicas
                            </Text>
                            {isSpecsOpen ? <ChevronDown color="#8b919a" size={18} /> : <ChevronRight color="#8b919a" size={18} />}
                        </TouchableOpacity>

                        {isSpecsOpen && (
                            <View className="px-5 pb-5 pt-1">
                                {configFields.length > 0 ? (
                                    configFields.map((field) => (
                                        <View key={field.name} className="mb-4">
                                            <Text className="text-text text-[14px] font-medium mb-1">{field.label}</Text>
                                            <TextInput
                                                value={specs[field.name] || ''}
                                                onChangeText={(val) => setSpecs(prev => ({ ...prev, [field.name]: val }))}
                                                placeholder={field.placeholder}
                                                placeholderTextColor="#94918e"
                                                className="bg-background border border-border rounded-lg text-text px-4 py-3 text-[15px]"
                                            />
                                        </View>
                                    ))
                                ) : (
                                    <Text className="text-textMuted text-sm">Esta categoría no tiene campos técnicos predefinidos.</Text>
                                )}
                            </View>
                        )}
                    </View>

                    <View className="bg-surface border border-border rounded-xl mb-6 overflow-hidden">
                        <TouchableOpacity
                            onPress={() => setIsPurchaseOpen(!isPurchaseOpen)}
                            className="p-5 flex-row items-center justify-between active:opacity-80"
                        >
                            <Text className="text-textMuted text-[12px] uppercase font-semibold tracking-wider">
                                Datos de Compra (Opcional)
                            </Text>
                            {isPurchaseOpen ? <ChevronDown color="#8b919a" size={18} /> : <ChevronRight color="#8b919a" size={18} />}
                        </TouchableOpacity>

                        {isPurchaseOpen && (
                            <View className="px-5 pb-5 pt-1">
                                <Text className="text-textMuted text-[11px] uppercase font-semibold mb-2 tracking-wider">
                                    Fecha de compra
                                </Text>
                                <View className="relative justify-center mb-4">
                                    {Platform.OS === 'web' ? (
                                        React.createElement('input', {
                                            type: 'date',
                                            value: purchaseDate,
                                            onChange: (e: any) => setPurchaseDate(e.target.value),
                                            style: {
                                                backgroundColor: '#141313',
                                                color: '#e5e7eb',
                                                borderColor: '#2d2d2d',
                                                borderWidth: 1,
                                                borderRadius: 8,
                                                padding: 12,
                                                outline: 'none',
                                                width: '100%',
                                                colorScheme: 'dark',
                                                fontFamily: 'inherit',
                                                fontSize: '15px'
                                            }
                                        })
                                    ) : (
                                        <>
                                            <TouchableOpacity onPress={() => setShowDatePicker(true)} activeOpacity={0.8}>
                                                <View pointerEvents="none">
                                                    <TextInput
                                                        value={purchaseDate}
                                                        placeholder="Ej. 2023-03-15"
                                                        placeholderTextColor="#94918e"
                                                        editable={false}
                                                        className="bg-background border border-border rounded-lg text-text px-4 py-3 pr-12 text-[15px]"
                                                    />
                                                </View>
                                                <View className="absolute right-4 top-3" pointerEvents="none">
                                                    <Calendar color="#8b919a" size={20} />
                                                </View>
                                            </TouchableOpacity>
                                            {showDatePicker && (
                                                <DateTimePicker
                                                    value={purchaseDate ? new Date(purchaseDate + 'T12:00:00Z') : new Date()}
                                                    mode="date"
                                                    display="default"
                                                    onChange={(event, selectedDate) => {
                                                        setShowDatePicker(false);
                                                        if (selectedDate && event.type !== 'dismissed') {
                                                            const formatted = selectedDate.toISOString().split('T')[0];
                                                            setPurchaseDate(formatted);
                                                        }
                                                    }}
                                                />
                                            )}
                                        </>
                                    )}
                                </View>

                                <Text className="text-textMuted text-[11px] uppercase font-semibold mb-2 tracking-wider mt-2">
                                    Estado de compra
                                </Text>
                                <View className="flex-row gap-2 mb-4">
                                    {[
                                        { id: 'new', label: 'Nuevo' },
                                        { id: 'used', label: 'Usado' },
                                        { id: 'refurbished', label: 'Reacondicionado' }
                                    ].map((status) => {
                                        const isSelected = purchaseStatus === status.id;
                                        return (
                                            <TouchableOpacity
                                                key={status.id}
                                                onPress={() => setPurchaseStatus(status.id)}
                                                className={`px-4 py-2 rounded-full border ${isSelected ? 'bg-[#2a2a2a]' : 'bg-transparent'} active:opacity-80`}
                                                style={{ borderColor: isSelected ? CATEGORY_COLORS[category as string] || '#6699cc' : '#444444' }}
                                            >
                                                <Text className="text-[13px] font-medium" style={{ color: isSelected ? CATEGORY_COLORS[category as string] || '#6699cc' : '#94918e' }}>
                                                    {status.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>

                                <Text className="text-textMuted text-[11px] uppercase font-semibold mb-2 tracking-wider">
                                    Enlace de compra (opcional)
                                </Text>
                                <View className="relative justify-center mb-6">
                                    <TextInput
                                        value={storeUrl}
                                        onChangeText={setStoreUrl}
                                        placeholder="https://..."
                                        placeholderTextColor="#94918e"
                                        autoCapitalize="none"
                                        keyboardType="url"
                                        className="bg-background border border-border rounded-lg text-text px-4 py-3 pr-12 text-[15px]"
                                    />
                                    <View className="absolute right-4 top-3" pointerEvents="none">
                                        <LinkIcon color="#8b919a" size={20} />
                                    </View>
                                </View>
                            </View>
                        )}
                    </View>

                    <View className="mb-8">
                        <TouchableOpacity
                            onPress={handleSave}
                            disabled={saving}
                            className={`w-full py-4 rounded-lg border items-center flex-row justify-center ${saving ? 'opacity-50' : 'active:opacity-80'}`}
                            style={{ borderColor: CATEGORY_COLORS[category as string] || '#6699cc' }}
                        >
                            {saving ? (
                                <ActivityIndicator color={CATEGORY_COLORS[category as string] || '#6699cc'} size="small" />
                            ) : (
                                <Text className="font-semibold text-[16px]" style={{ color: CATEGORY_COLORS[category as string] || '#6699cc' }}>Guardar componente</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            <Modal visible={showSuccessModal} transparent={true} animationType="fade">
                <View className="flex-1 justify-center items-center bg-black/60 px-4">
                    <View className="bg-background border border-border w-full max-w-sm rounded-2xl p-6 items-center">
                        <View
                            className="w-16 h-16 rounded-full items-center justify-center mb-4"
                            style={{ backgroundColor: `${CATEGORY_COLORS[category as string] || '#6699cc'}20` }}
                        >
                            <ArrowRight color={CATEGORY_COLORS[category as string] || '#6699cc'} size={32} />
                        </View>
                        <Text className="text-text font-bold text-xl mb-2 text-center">¡Guardado con éxito!</Text>
                        <Text className="text-textMuted text-center mb-6">Los datos de tu componente se han actualizado correctamente.</Text>

                        <TouchableOpacity
                            onPress={() => {
                                setShowSuccessModal(false);
                                handleBack();
                            }}
                            className="w-full py-3 rounded-xl items-center justify-center"
                            style={{ backgroundColor: CATEGORY_COLORS[category as string] || '#6699cc' }}
                        >
                            <Text className="text-[#141313] font-bold text-[16px]">Entendido</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
