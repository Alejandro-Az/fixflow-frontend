import React, { useState } from 'react';
import { Platform } from 'react-native';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, ActivityIndicator, SafeAreaView, ScrollView } from '../../src/components/ui';
import { GoogleIcon } from '../../src/components/GoogleIcon';
import apiClient from '../../src/api/client';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useGoogleAuth, GoogleAuthError } from '../../src/hooks/useGoogleAuth';
import { useRouter } from 'expo-router';
import { ArrowLeft, Square, CheckSquare } from 'lucide-react-native';
import { Linking } from 'react-native';

export default function RegisterScreen() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    
    const [errorMsg, setErrorMsg] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [termsAccepted, setTermsAccepted] = useState(false);

    const setAuth = useAuthStore((state) => state.setAuth);
    const router = useRouter();
    const { signIn: googleSignIn } = useGoogleAuth();

    const handleRegister = async () => {
        if (!termsAccepted) {
            setErrorMsg('Debes aceptar los términos y condiciones.');
            return;
        }

        if (!name || !email || !password || !passwordConfirmation) {
            setErrorMsg('Por favor llena todos los campos.');
            return;
        }

        if (password !== passwordConfirmation) {
            setFieldErrors({ password_confirmation: 'Las contraseñas no coinciden.' });
            return;
        }

        // Basic frontend policy check to avoid unnecessary backend calls if we already know it fails
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
            const response = await apiClient.post('/auth/register', {
                name,
                email,
                password,
                password_confirmation: passwordConfirmation
            });

            if (response.data.ok) {
                const { access_token, user } = response.data.data;
                if (access_token && user) {
                    if (!user.plan) user.plan = 'free';
                    await setAuth(access_token, user);
                    // layout will redirect to dashboard
                } else {
                    // Si el backend no devuelve token (ej. requiere verificación de email)
                    router.push('/verify-email');
                }
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
                } else if (status === 403) {
                    setErrorMsg(data.error?.message || 'Registro deshabilitado o no permitido.');
                } else if (status === 429) {
                    setErrorMsg('Demasiados intentos. Espera un momento.');
                } else {
                    setErrorMsg(data.error?.message || `Error del servidor (${status}).`);
                }
            } else {
                setErrorMsg('Sin conexión con el servidor.');
                if (__DEV__) console.warn('[Register] Error:', error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setErrorMsg('');
        setFieldErrors({});
        
        if (!termsAccepted) {
            setErrorMsg('Debes aceptar los términos y condiciones para continuar.');
            return;
        }

        setGoogleLoading(true);
        try {
            const id_token = await googleSignIn();

            const backendResponse = await apiClient.post('/auth/google/exchange', {
                id_token
            });

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
                    default:
                        setErrorMsg('Error al registrarse con Google.');
                }
            } else {
                const msg = error?.message ?? '';
                if (msg.startsWith('STORAGE_ERROR')) {
                    setErrorMsg('Error al guardar la sesión.');
                } else if (error.response) {
                    const status = error.response.status;
                    if (status === 403) {
                        setErrorMsg('Registro deshabilitado o correo no verificado.');
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
            className="flex-1 bg-background"
        >
            <SafeAreaView className="flex-1">
                <View className="flex-row items-center justify-between px-6 py-4">
                    <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
                        <ArrowLeft color="#e5e2e1" size={24} />
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={{ alignItems: 'center', paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
                    <View style={{ width: '100%', maxWidth: 480, paddingHorizontal: 24 }}>
                    <View className="items-center mb-8">
                        <Text className="text-text font-bold text-3xl mb-2 tracking-tight">Crea tu cuenta</Text>
                        <Text className="text-textMuted text-base text-center">Únete a FixFlow para gestionar tus equipos</Text>
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
                                    <Text className="text-text font-medium text-base ml-3">Registrarse con Google</Text>
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
                        <View>
                            <TextInput 
                                placeholder="Nombre completo"
                                placeholderTextColor="#94918e"
                                className={`bg-surface border ${fieldErrors.name ? 'border-[#ffb4ab]' : 'border-border'} rounded-lg py-4 px-4 text-text text-base`}
                                value={name}
                                onChangeText={(t) => { setName(t); setFieldErrors(prev => ({...prev, name: ''})); }}
                            />
                            {fieldErrors.name && <Text className="text-[#ffb4ab] text-xs mt-1 ml-1">{fieldErrors.name}</Text>}
                        </View>

                        <View>
                            <TextInput 
                                placeholder="correo@ejemplo.com"
                                placeholderTextColor="#94918e"
                                className={`bg-surface border ${fieldErrors.email ? 'border-[#ffb4ab]' : 'border-border'} rounded-lg py-4 px-4 text-text text-base`}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={email}
                                onChangeText={(t) => { setEmail(t); setFieldErrors(prev => ({...prev, email: ''})); }}
                            />
                            {fieldErrors.email && <Text className="text-[#ffb4ab] text-xs mt-1 ml-1">{fieldErrors.email}</Text>}
                        </View>

                        <View>
                            <TextInput 
                                placeholder="Contraseña (mínimo 12 caracteres)"
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
                                placeholder="Confirmar contraseña"
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
                        <Text className="text-[#ffb4ab] text-sm text-center mt-2 mb-2">{errorMsg}</Text>
                    ) : null}

                    <TouchableOpacity 
                        onPress={handleRegister}
                        disabled={loading || googleLoading}
                        className={`bg-primary rounded-lg py-4 items-center mt-6 mb-4 ${loading || googleLoading ? 'opacity-50' : 'active:opacity-80'}`}
                    >
                        {loading ? (
                            <ActivityIndicator color="#141313" />
                        ) : (
                            <Text className="text-[#141313] font-bold text-base">Crear cuenta</Text>
                        )}
                    </TouchableOpacity>

                    <View className="mb-8 gap-4 px-2">
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
                        <TouchableOpacity onPress={() => router.push('/login')}>
                            <Text className="text-textMuted text-sm">
                                ¿Ya tienes cuenta? <Text className="text-primary font-medium">Inicia sesión</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>

                    </View>{/* /maxWidth */}
                </ScrollView>
            </SafeAreaView>
        </KeyboardAvoidingView>
    );
}
