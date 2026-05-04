import React, { useState } from 'react';
import { Platform } from 'react-native';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, ActivityIndicator } from '../../src/components/ui';
import apiClient from '../../src/api/client';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CheckCircle2 } from 'lucide-react-native';

export default function ResetPasswordScreen() {
    const { email, token } = useLocalSearchParams();
    
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [success, setSuccess] = useState(false);

    const router = useRouter();

    const handleReset = async () => {
        setErrorMsg('');
        setFieldErrors({});

        if (!password || !passwordConfirmation) {
            setErrorMsg('Por favor llena todos los campos.');
            return;
        }

        if (password !== passwordConfirmation) {
            setFieldErrors({ password_confirmation: 'Las contraseñas no coinciden.' });
            return;
        }

        // Basic frontend policy check
        if (password.length < 12) {
            setFieldErrors({ password: 'La contraseña debe tener al menos 12 caracteres.' });
            return;
        }
        if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
            setFieldErrors({ password: 'Debe contener al menos una mayúscula, una minúscula y un número.' });
            return;
        }

        setLoading(true);
        try {
            const response = await apiClient.post('/auth/reset-password', {
                email,
                token,
                password,
                password_confirmation: passwordConfirmation
            });

            if (response.data.ok) {
                setSuccess(true);
            } else {
                setErrorMsg('Respuesta inesperada del servidor.');
            }

        } catch (error: any) {
            if (error.response) {
                const status = error.response.status;
                const data = error.response.data;

                if (status === 422 && data.error?.details) {
                    const details = data.error.details;
                    const newFieldErrors: Record<string, string> = {};
                    Object.entries(details).forEach(([field, messages]: [string, any]) => {
                        newFieldErrors[field] = messages[0];
                    });
                    setFieldErrors(newFieldErrors);
                    if (newFieldErrors.email || newFieldErrors.token) {
                        setErrorMsg('El enlace de restablecimiento es inválido o ha expirado.');
                    }
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
                    <Text className="text-text font-bold text-2xl tracking-tight">Restablecer contraseña</Text>
                </View>

                {success ? (
                    <View className="bg-surface border border-[#6699cc] rounded-xl p-6 items-center">
                        <CheckCircle2 color="#6699cc" size={48} className="mb-4" />
                        <Text className="text-text font-semibold text-lg text-center mb-2">¡Contraseña actualizada!</Text>
                        <Text className="text-textMuted text-center text-base mb-6">
                            Tu contraseña se ha restablecido correctamente. Todas tus sesiones anteriores han sido cerradas por seguridad.
                        </Text>
                        <TouchableOpacity 
                            onPress={() => router.replace('/login')}
                            className="bg-primary py-3 px-6 rounded-lg w-full items-center"
                        >
                            <Text className="text-[#141313] font-bold">Iniciar sesión ahora</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        <Text className="text-textMuted text-base mb-6">
                            Ingresa tu nueva contraseña para la cuenta <Text className="font-semibold text-text">{email}</Text>.
                        </Text>

                        <View className="flex-col gap-4 mb-2">
                            <View>
                                <TextInput 
                                    placeholder="Nueva contraseña (mínimo 12 caracteres)"
                                    placeholderTextColor="#94918e"
                                    secureTextEntry
                                    className={`bg-surface border ${fieldErrors.password ? 'border-[#ffb4ab]' : 'border-border'} rounded-lg py-4 px-4 text-text text-base`}
                                    value={password}
                                    onChangeText={(t) => { setPassword(t); setFieldErrors(prev => ({...prev, password: ''})); }}
                                />
                                {fieldErrors.password && <Text className="text-[#ffb4ab] text-xs mt-1 ml-1">{fieldErrors.password}</Text>}
                            </View>

                            <View>
                                <TextInput 
                                    placeholder="Confirmar nueva contraseña"
                                    placeholderTextColor="#94918e"
                                    secureTextEntry
                                    className={`bg-surface border ${fieldErrors.password_confirmation ? 'border-[#ffb4ab]' : 'border-border'} rounded-lg py-4 px-4 text-text text-base`}
                                    value={passwordConfirmation}
                                    onChangeText={(t) => { setPasswordConfirmation(t); setFieldErrors(prev => ({...prev, password_confirmation: ''})); }}
                                />
                                {fieldErrors.password_confirmation && <Text className="text-[#ffb4ab] text-xs mt-1 ml-1">{fieldErrors.password_confirmation}</Text>}
                            </View>
                        </View>

                        {errorMsg ? (
                            <Text className="text-[#ffb4ab] text-sm mt-2 mb-2">{errorMsg}</Text>
                        ) : null}

                        <TouchableOpacity 
                            onPress={handleReset}
                            disabled={loading || !email || !token}
                            className={`bg-primary rounded-lg py-4 items-center mt-6 mb-8 ${loading || !email || !token ? 'opacity-50' : 'active:opacity-80'}`}
                        >
                            {loading ? (
                                <ActivityIndicator color="#141313" />
                            ) : (
                                <Text className="text-[#141313] font-bold text-base">Restablecer contraseña</Text>
                            )}
                        </TouchableOpacity>
                        
                        {(!email || !token) && (
                            <Text className="text-[#ffb4ab] text-sm text-center">
                                Enlace inválido o incompleto. Asegúrate de abrir el enlace completo de tu correo.
                            </Text>
                        )}
                    </>
                )}
            </View>
        </KeyboardAvoidingView>
    );
}
