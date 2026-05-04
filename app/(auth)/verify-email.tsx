import React, { useState } from 'react';
import { Platform } from 'react-native';
import { View, Text, TouchableOpacity, ActivityIndicator } from '../../src/components/ui';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CheckCircle2, XCircle, MailWarning } from 'lucide-react-native';
import apiClient from '../../src/api/client';
import { useAuthStore } from '../../src/store/useAuthStore';

export default function VerifyEmailScreen() {
    const { verified, reason } = useLocalSearchParams();
    const router = useRouter();
    const { user } = useAuthStore();
    
    const [loading, setLoading] = useState(false);
    const [resendMsg, setResendMsg] = useState('');
    const [resendError, setResendError] = useState('');

    const isVerified = verified === '1';

    const handleResend = async () => {
        setResendMsg('');
        setResendError('');
        setLoading(true);

        try {
            const response = await apiClient.post('/auth/email/verification-notification');
            if (response.data.ok || response.status === 200) {
                setResendMsg('Se ha enviado un nuevo enlace de verificación. Revisa tu correo.');
            } else {
                setResendError('Error al reenviar la verificación.');
            }
        } catch (error: any) {
            if (error.response?.status === 429) {
                setResendError('Demasiados intentos. Espera un momento antes de solicitar otro enlace.');
            } else {
                setResendError(error.response?.data?.error?.message || 'Error del servidor al reenviar el correo.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 bg-background justify-center items-center px-6">
            <View className="w-full max-w-sm bg-surface border border-border rounded-xl p-8 items-center">
                
                {isVerified ? (
                    <>
                        <CheckCircle2 color="#6699cc" size={56} className="mb-4" />
                        <Text className="text-text font-bold text-xl text-center mb-2">¡Correo verificado!</Text>
                        <Text className="text-textMuted text-center text-base mb-8">
                            Gracias por verificar tu dirección de correo. Tu cuenta ahora está completamente activa.
                        </Text>
                        <TouchableOpacity 
                            onPress={() => router.replace('/login')}
                            className="bg-primary py-4 px-6 rounded-lg w-full items-center active:opacity-80"
                        >
                            <Text className="text-[#141313] font-bold text-base">Continuar a FixFlow</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <>
                        {verified === '0' ? (
                            <XCircle color="#ff8a80" size={56} className="mb-4" />
                        ) : (
                            <MailWarning color="#fdb354" size={56} className="mb-4" />
                        )}
                        
                        <Text className="text-text font-bold text-xl text-center mb-2">
                            {verified === '0' ? 'Verificación fallida' : 'Revisa tu correo'}
                        </Text>
                        
                        <Text className="text-textMuted text-center text-base mb-6">
                            {verified === '0' 
                                ? (reason === 'invalid_signature' ? 'El enlace de verificación es inválido o ha expirado.' : 'No se pudo verificar el correo.')
                                : 'Te hemos enviado un correo con un enlace de verificación. Por favor, haz clic en él para activar tu cuenta.'
                            }
                        </Text>

                        {!!user && !isVerified && (
                            <View className="w-full mb-6">
                                {resendMsg ? (
                                    <Text className="text-[#6699cc] text-sm text-center mb-4">{resendMsg}</Text>
                                ) : resendError ? (
                                    <Text className="text-[#ffb4ab] text-sm text-center mb-4">{resendError}</Text>
                                ) : null}

                                <TouchableOpacity 
                                    onPress={handleResend}
                                    disabled={loading || !!resendMsg}
                                    className={`bg-surface border border-border py-4 px-6 rounded-lg w-full items-center ${(loading || !!resendMsg) ? 'opacity-50' : 'active:opacity-80'}`}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#e5e2e1" />
                                    ) : (
                                        <Text className="text-text font-medium text-base">Reenviar correo de verificación</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}

                        <TouchableOpacity 
                            onPress={() => router.replace('/login')}
                            className={`${!!user ? 'bg-transparent' : 'bg-primary'} py-4 px-6 rounded-lg w-full items-center active:opacity-80`}
                        >
                            <Text className={`${!!user ? 'text-primary' : 'text-[#141313]'} font-bold text-base`}>
                                Ir al inicio de sesión
                            </Text>
                        </TouchableOpacity>
                    </>
                )}

            </View>
        </View>
    );
}
