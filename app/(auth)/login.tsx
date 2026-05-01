import React, { useState } from 'react';
import { Platform } from 'react-native';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, ActivityIndicator } from '../../src/components/ui';
import { Mail } from 'lucide-react-native';
import { GoogleIcon } from '../../src/components/GoogleIcon';
import apiClient from '../../src/api/client';
import { useAuthStore } from '../../src/store/useAuthStore';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const setAuth = useAuthStore((state) => state.setAuth);

    const handleLogin = async () => {
        setErrorMsg('');
        if (!email || !password) {
            setErrorMsg('Por favor llena todos los campos.');
            return;
        }

        setLoading(true);
        try {
            const response = await apiClient.post('/auth/login', {
                login: email,   // Campo "login", no "email" — contrato del backend
                password: password
            });

            if (response.data.ok) {
                const { access_token, user } = response.data.data;
                // setAuth puede lanzar STORAGE_ERROR si localStorage/SecureStore falla
                await setAuth(access_token, user);
                // El Route Guard de _layout.tsx redirige automáticamente al dashboard
            } else {
                setErrorMsg('Respuesta inesperada del servidor.');
            }

        } catch (error: any) {
            const msg: string = error?.message ?? '';

            if (msg.startsWith('STORAGE_ERROR')) {
                // Error al guardar el token — NO confundir con error de red
                setErrorMsg('Error al guardar la sesión. Verifica permisos del navegador.');
                if (__DEV__) console.warn('[Login] STORAGE_ERROR:', msg);

            } else if (error.response) {
                // El backend respondió con un error HTTP
                const status: number = error.response.status;
                const backendCode: string = error.response.data?.error?.code ?? '';
                const backendMsg: string = error.response.data?.error?.message ?? '';

                if (__DEV__) {
                    console.warn(`[Login] HTTP ${status} | code: ${backendCode}`, error.response.data);
                }

                if (status === 401) {
                    setErrorMsg(backendCode ? `${backendCode}: Credenciales incorrectas.` : 'Correo o contraseña incorrectos.');
                } else if (status === 403) {
                    setErrorMsg(backendCode || 'Tu cuenta está inactiva o sin verificar.');
                } else if (status === 429) {
                    setErrorMsg('Demasiados intentos. Espera un momento.');
                } else if (status === 422) {
                    setErrorMsg('Datos inválidos. Revisa correo y contraseña.');
                } else {
                    setErrorMsg(backendMsg || `Error del servidor (${status}).`);
                }

            } else {
                // Sin respuesta: error de red real (timeout, DNS, CORS, backend caído)
                setErrorMsg('Sin conexión con el servidor. ¿Está corriendo el backend?');
                if (__DEV__) console.warn('[Login] Error de red:', error.message);
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
            {/* Contenedor centrado con ancho máximo para web */}
            <View className="w-full max-w-sm">

            <View className="items-center mb-12">
                <Text className="text-text font-bold text-4xl mb-2 tracking-tight">FixFlow</Text>
                <Text className="text-textMuted text-base">Gestión de equipos informáticos</Text>
            </View>

            <View className="flex-col gap-4 mb-6">
                <TouchableOpacity className="flex-row items-center justify-center bg-surface border border-border rounded-lg py-4 px-4 active:opacity-80">
                    <GoogleIcon size={20} />
                    <Text className="text-text font-medium text-base ml-3">Continuar con Google</Text>
                </TouchableOpacity>

                <TouchableOpacity className="flex-row items-center justify-center bg-surface border border-border rounded-lg py-4 px-4 active:opacity-80">
                    <Mail color="#e5e2e1" size={20} />
                    <Text className="text-text font-medium text-base ml-2">Continuar con correo</Text>
                </TouchableOpacity>
            </View>

            <View className="flex-row items-center mb-6">
                <View className="flex-1 h-[1px] bg-border" />
                <Text className="text-textMuted mx-4">o</Text>
                <View className="flex-1 h-[1px] bg-border" />
            </View>

            <View className="flex-col gap-4 mb-2">
                <TextInput 
                    placeholder="correo@ejemplo.com"
                    placeholderTextColor="#94918e"
                    className="bg-surface border border-border rounded-lg py-4 px-4 text-text text-base"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                />
                <TextInput 
                    placeholder="••••••••"
                    placeholderTextColor="#94918e"
                    secureTextEntry
                    className="bg-surface border border-border rounded-lg py-4 px-4 text-text text-base"
                    value={password}
                    onChangeText={setPassword}
                />
            </View>

            {errorMsg ? (
                <Text className="text-[#ffb4ab] text-sm text-center mt-2">{errorMsg}</Text>
            ) : null}

            <View className="items-end mb-8 mt-2">
                <TouchableOpacity>
                    <Text className="text-primary text-sm font-medium">¿Olvidaste tu contraseña?</Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity 
                onPress={handleLogin}
                disabled={loading}
                className={`bg-surface border border-border rounded-lg py-4 items-center mb-8 ${loading ? 'opacity-50' : 'active:opacity-80'}`}
            >
                {loading ? (
                    <ActivityIndicator color="#e5e2e1" />
                ) : (
                    <Text className="text-text font-semibold text-base">Iniciar sesión</Text>
                )}
            </TouchableOpacity>

            <View className="items-center">
                <TouchableOpacity>
                    <Text className="text-primary text-sm font-medium">¿No tienes cuenta? Regístrate</Text>
                </TouchableOpacity>
            </View>

            </View>{/* /max-w-sm */}
        </KeyboardAvoidingView>
    );
}
