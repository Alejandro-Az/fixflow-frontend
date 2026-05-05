import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import apiClient from '../../src/api/client';
import { GoogleIcon } from '../../src/components/GoogleIcon';
import { ActivityIndicator, KeyboardAvoidingView, Text, TextInput, TouchableOpacity, View } from '../../src/components/ui';
import { GoogleAuthError, useGoogleAuth } from '../../src/hooks/useGoogleAuth';
import { useAuthStore } from '../../src/store/useAuthStore';
import { Square, CheckSquare, ExternalLink } from 'lucide-react-native';
import { Linking } from 'react-native';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [termsAccepted, setTermsAccepted] = useState(false);

    const setAuth = useAuthStore((state) => state.setAuth);
    const router = useRouter();
    const { signIn: googleSignIn, pendingIdToken, clearPendingToken } = useGoogleAuth();

    useEffect(() => {
        if (!pendingIdToken) return;
        clearPendingToken();
        setGoogleLoading(true);
        apiClient.post('/auth/google/exchange', { id_token: pendingIdToken })
            .then(res => {
                if (res.data.ok) {
                    const { access_token, user } = res.data.data;
                    return setAuth(access_token, user);
                }
                setErrorMsg('Respuesta inesperada del servidor.');
            })
            .catch((error: any) => {
                if (error.response?.status === 403) setErrorMsg('Login deshabilitado o correo no verificado.');
                else if (error.response?.status === 401) setErrorMsg('El token de Google es inválido.');
                else setErrorMsg('Error del servidor al conectar con Google.');
            })
            .finally(() => setGoogleLoading(false));
    }, [pendingIdToken]);

    const handleLogin = async () => {
        setErrorMsg('');
        if (!termsAccepted) {
            setErrorMsg('Debes aceptar los términos y condiciones.');
            return;
        }

        if (!email || !password) {
            setErrorMsg('Por favor llena todos los campos.');
            return;
        }

        setLoading(true);
        try {
            const response = await apiClient.post('/auth/login', {
                login: email,
                password,
            });

            if (response.data.ok) {
                const { access_token, user } = response.data.data;
                await setAuth(access_token, user);
            } else {
                setErrorMsg('Respuesta inesperada del servidor.');
            }

        } catch (error: any) {
            const msg: string = error?.message ?? '';

            if (msg.startsWith('STORAGE_ERROR')) {
                setErrorMsg('Error al guardar la sesión. Verifica permisos del navegador.');
            } else if (error.response) {
                const status: number = error.response.status;
                const backendCode: string = error.response.data?.error?.code ?? '';
                const backendMsg: string = error.response.data?.error?.message ?? '';

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
                setErrorMsg('Sin conexión con el servidor. ¿Está corriendo el backend?');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setErrorMsg('');
        if (!termsAccepted) {
            setErrorMsg('Debes aceptar los términos y condiciones para continuar.');
            return;
        }
        setGoogleLoading(true);
        try {
            const id_token = await googleSignIn();

            const backendResponse = await apiClient.post('/auth/google/exchange', { id_token });

            if (backendResponse.data.ok) {
                const { access_token, user } = backendResponse.data.data;
                await setAuth(access_token, user);
            } else {
                setErrorMsg('Respuesta inesperada del servidor.');
            }

        } catch (error: any) {
            if (error instanceof GoogleAuthError) {
                switch (error.code) {
                    case 'CANCELLED':
                        break;
                    case 'IN_PROGRESS':
                        break;
                    case 'NO_PLAY_SERVICES':
                        setErrorMsg('Google Play Services no disponible.');
                        break;
                    case 'GIS_NOT_LOADED':
                        setErrorMsg('Google no disponible. Recarga la página.');
                        break;
                    default:
                        setErrorMsg(__DEV__ ? `Google error: ${error.message}` : 'Error al iniciar sesión con Google.');
                }
            } else {
                const msg = error?.message ?? '';
                if (msg.startsWith('STORAGE_ERROR')) {
                    setErrorMsg('Error al guardar la sesión.');
                } else if (error.response) {
                    const status = error.response.status;
                    if (status === 403) {
                        setErrorMsg('Login deshabilitado o correo no verificado.');
                    } else if (status === 401) {
                        setErrorMsg('El token de Google es inválido.');
                    } else {
                        setErrorMsg('Error del servidor al conectar con Google.');
                    }
                } else {
                    setErrorMsg('Error de red.');
                }
            }
        } finally {
            setGoogleLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-background justify-center items-center px-6"
        >
            <View className="w-full max-w-sm">

                <View className="items-center mb-12">
                    <Text className="text-text font-bold text-4xl mb-2 tracking-tight">FixFlow</Text>
                    <Text className="text-textMuted text-base">Gestión de equipos informáticos</Text>
                </View>

                <View className="flex-col gap-4 mb-6">
                    <TouchableOpacity
                        onPress={handleGoogleLogin}
                        disabled={googleLoading || loading}
                        className={`flex-row items-center justify-center bg-surface border border-border rounded-lg py-4 px-4 ${(googleLoading || loading) ? 'opacity-50' : 'active:opacity-80'}`}
                    >
                        {googleLoading ? (
                            <ActivityIndicator color="#e5e2e1" />
                        ) : (
                            <>
                                <GoogleIcon size={20} />
                                <Text className="text-text font-medium text-base ml-3">Continuar con Google</Text>
                            </>
                        )}
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
                    <TouchableOpacity onPress={() => router.push('/forgot-password')}>
                        <Text className="text-primary text-sm font-medium">¿Olvidaste tu contraseña?</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    onPress={handleLogin}
                    disabled={loading || googleLoading}
                    className={`bg-surface border border-border rounded-lg py-4 items-center mb-8 ${(loading || googleLoading) ? 'opacity-50' : 'active:opacity-80'}`}
                >
                    {loading ? (
                        <ActivityIndicator color="#e5e2e1" />
                    ) : (
                        <Text className="text-text font-semibold text-base">Iniciar sesión</Text>
                    )}
                </TouchableOpacity>

                <View className="mb-8 gap-4">
                    <TouchableOpacity 
                        className="flex-row items-center"
                        onPress={() => setTermsAccepted(!termsAccepted)}
                    >
                        {termsAccepted ? <CheckSquare color="#6699cc" size={20} /> : <Square color="#8b919a" size={20} />}
                        <Text className="text-textMuted ml-3 text-xs flex-1">
                            Acepto los <Text className="text-primary font-medium" onPress={() => Linking.openURL('https://kaanforge.com/legal/terminos')}>Términos y condiciones</Text> y he leído el <Text className="text-primary font-medium" onPress={() => Linking.openURL('https://kaanforge.com/legal/privacidad')}>Aviso de Privacidad</Text>.
                        </Text>
                    </TouchableOpacity>
                </View>

                <View className="items-center">
                    <TouchableOpacity onPress={() => router.push('/register')}>
                        <Text className="text-primary text-sm font-medium">¿No tienes cuenta? Regístrate</Text>
                    </TouchableOpacity>
                </View>

            </View>
        </KeyboardAvoidingView>
    );
}
