import React, { useState, useEffect } from 'react';
import { Modal, Linking, Platform } from 'react-native';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator } from './ui';
import { useAuthStore } from '../store/useAuthStore';
import apiClient from '../api/client';
import { CheckSquare, Square, ExternalLink, ShieldCheck } from 'lucide-react-native';

export const LegalConsentGuard = ({ children }: { children: React.ReactNode }) => {
    const { token, user, logout } = useAuthStore();
    const [checking, setChecking] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [legalData, setLegalData] = useState<any>(null);

    const [termsAccepted, setTermsAccepted] = useState(false);
    const [privacyAccepted, setPrivacyAccepted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (token && user) {
            checkConsents();
        } else {
            setChecking(false);
            setShowModal(false);
        }
    }, [token, user]);

    const checkConsents = async () => {
        setChecking(true);
        try {
            const res = await apiClient.get('/auth/legal-consents/latest');
            if (res.data.ok) {
                const { required, accepted } = res.data.data;

                const needsAcceptance =
                    !accepted ||
                    accepted.terms_version !== required.terms_version ||
                    accepted.privacy_version !== required.privacy_version;

                if (needsAcceptance) {
                    setLegalData(required);
                    setShowModal(true);
                } else {
                    setShowModal(false);
                }
            }
        } catch (err: any) {
            console.error('Error checking legal consents', err);
            if (err.response?.status === 401) {
                logout();
            }
            // Si hay error de red, dejamos pasar sin bloquear
        } finally {
            setChecking(false);
        }
    };

    const handleAccept = async () => {
        if (!termsAccepted || !privacyAccepted) return;

        setSubmitting(true);
        setError('');
        try {
            const source =
                Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';

            await apiClient.post('/auth/legal-consents/accept', {
                terms_accepted: true,
                privacy_accepted: true,
                terms_version: legalData.terms_version,
                privacy_version: legalData.privacy_version,
                source,
            });

            setShowModal(false);
        } catch (err: any) {
            console.error('Error accepting legal consents', err);
            if (err.response?.status === 422) {
                setError('Hubo un problema de versiones. Por favor intenta de nuevo.');
                checkConsents();
            } else {
                setError('No se pudo registrar la aceptación. Intenta de nuevo.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (checking && token) {
        return (
            <View style={{ flex: 1, backgroundColor: '#141313', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#6699cc" />
            </View>
        );
    }

    return (
        <>
            {children}

            <Modal visible={showModal} transparent={false} animationType="slide">
                <SafeAreaView className="flex-1 bg-background">
                    <ScrollView className="flex-1 px-6 pt-10">
                        {/* Header */}
                        <View className="items-center mb-8">
                            <ShieldCheck color="#6699cc" size={60} />
                            <Text className="text-text font-bold text-2xl mt-4 text-center">
                                Actualización Legal
                            </Text>
                            <Text className="text-textMuted text-center mt-2">
                                Para continuar usando FixFlow, necesitamos que revises y aceptes
                                nuestros términos y políticas actualizados.
                            </Text>
                        </View>

                        {/* Document links */}
                        <View className="bg-surface border border-border rounded-xl p-5 mb-8">
                            <Text className="text-text font-bold text-lg mb-4">Documentos Legales</Text>

                            <TouchableOpacity
                                className="flex-row items-center justify-between py-3 border-b border-border"
                                onPress={() => Linking.openURL('https://kaanforge.com/legal/terminos')}
                            >
                                <Text className="text-text font-medium">Términos y Condiciones</Text>
                                <ExternalLink color="#6699cc" size={18} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                className="flex-row items-center justify-between py-3"
                                onPress={() => Linking.openURL('https://kaanforge.com/legal/privacidad')}
                            >
                                <Text className="text-text font-medium">Aviso de Privacidad</Text>
                                <ExternalLink color="#6699cc" size={18} />
                            </TouchableOpacity>
                        </View>

                        {/* Checkboxes */}
                        <View className="mb-10" style={{ gap: 24 }}>
                            <TouchableOpacity
                                className="flex-row items-start"
                                onPress={() => setTermsAccepted(!termsAccepted)}
                            >
                                {termsAccepted ? (
                                    <CheckSquare color="#6699cc" size={24} />
                                ) : (
                                    <Square color="#8b919a" size={24} />
                                )}
                                <Text className="text-text ml-3 flex-1">
                                    He leído y acepto los{' '}
                                    <Text className="text-primary font-bold">
                                        Términos y Condiciones de Uso
                                    </Text>
                                    .
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                className="flex-row items-start"
                                onPress={() => setPrivacyAccepted(!privacyAccepted)}
                            >
                                {privacyAccepted ? (
                                    <CheckSquare color="#6699cc" size={24} />
                                ) : (
                                    <Square color="#8b919a" size={24} />
                                )}
                                <Text className="text-text ml-3 flex-1">
                                    He leído y acepto el{' '}
                                    <Text className="text-primary font-bold">Aviso de Privacidad</Text>
                                    .
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Error */}
                        {!!error && (
                            <Text className="text-[#ffb4ab] text-center mb-6">{error}</Text>
                        )}

                        {/* CTA */}
                        <TouchableOpacity
                            onPress={handleAccept}
                            disabled={submitting || !termsAccepted || !privacyAccepted}
                            className="bg-primary rounded-xl py-4 items-center mb-6"
                            style={{ opacity: !termsAccepted || !privacyAccepted || submitting ? 0.5 : 1 }}
                        >
                            {submitting ? (
                                <ActivityIndicator color="#141313" />
                            ) : (
                                <Text className="text-[#141313] font-bold text-lg">
                                    Confirmar y Continuar
                                </Text>
                            )}
                        </TouchableOpacity>

                        {/* Logout */}
                        <TouchableOpacity onPress={logout} className="items-center mb-10">
                            <Text className="text-textMuted">Cerrar sesión</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </SafeAreaView>
            </Modal>
        </>
    );
};
