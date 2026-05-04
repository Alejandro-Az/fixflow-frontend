import React, { useState } from 'react';
import { Platform } from 'react-native';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, ActivityIndicator } from '../../src/components/ui';
import apiClient from '../../src/api/client';
import { useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle2 } from 'lucide-react-native';

export default function ForgotPasswordScreen() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [success, setSuccess] = useState(false);

    const router = useRouter();

    const handleForgot = async () => {
        setErrorMsg('');

        if (!email) {
            setErrorMsg('Por favor ingresa tu correo electrónico.');
            return;
        }

        setLoading(true);
        try {
            const response = await apiClient.post('/auth/forgot-password', {
                email
            });

            if (response.data.ok || response.status === 200) {
                // Siempre devuelve 200 OK
                setSuccess(true);
            } else {
                setErrorMsg('Respuesta inesperada del servidor.');
            }

        } catch (error: any) {
            if (error.response) {
                const status = error.response.status;
                const data = error.response.data;

                if (status === 422 && data.error?.details?.email) {
                    setErrorMsg(data.error.details.email[0]);
                } else if (status === 429) {
                    setErrorMsg('Demasiados intentos. Espera un momento.');
                } else {
                    setErrorMsg(data.error?.message || `Error del servidor (${status}).`);
                }
            } else {
                setErrorMsg('Sin conexión con el servidor.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-background justify-center items-center px-6"
        >
            <View className="w-full max-w-sm">
                <View className="flex-row items-center mb-8">
                    <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 mr-2">
                        <ArrowLeft color="#e5e2e1" size={24} />
                    </TouchableOpacity>
                    <Text className="text-text font-bold text-2xl tracking-tight">Recuperar contraseña</Text>
                </View>

                {success ? (
                    <View className="bg-surface border border-[#6699cc] rounded-xl p-6 items-center">
                        <CheckCircle2 color="#6699cc" size={48} className="mb-4" />
                        <Text className="text-text font-semibold text-lg text-center mb-2">Revisa tu correo</Text>
                        <Text className="text-textMuted text-center text-base mb-6">
                            Si el correo existe en nuestro sistema, se enviaron instrucciones para restablecer la contraseña.
                        </Text>
                        <TouchableOpacity 
                            onPress={() => router.replace('/login')}
                            className="bg-background border border-border py-3 px-6 rounded-lg w-full items-center"
                        >
                            <Text className="text-text font-medium">Volver a iniciar sesión</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        <Text className="text-textMuted text-base mb-6">
                            Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
                        </Text>

                        <View className="flex-col gap-4 mb-2">
                            <TextInput 
                                placeholder="correo@ejemplo.com"
                                placeholderTextColor="#94918e"
                                className="bg-surface border border-border rounded-lg py-4 px-4 text-text text-base"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={email}
                                onChangeText={(t) => { setEmail(t); setErrorMsg(''); }}
                            />
                        </View>

                        {errorMsg ? (
                            <Text className="text-[#ffb4ab] text-sm mt-2 mb-2">{errorMsg}</Text>
                        ) : null}

                        <TouchableOpacity 
                            onPress={handleForgot}
                            disabled={loading}
                            className={`bg-primary rounded-lg py-4 items-center mt-6 mb-8 ${loading ? 'opacity-50' : 'active:opacity-80'}`}
                        >
                            {loading ? (
                                <ActivityIndicator color="#141313" />
                            ) : (
                                <Text className="text-[#141313] font-bold text-base">Enviar enlace</Text>
                            )}
                        </TouchableOpacity>
                    </>
                )}
            </View>
        </KeyboardAvoidingView>
    );
}
