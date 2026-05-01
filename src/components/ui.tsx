/**
 * Archivo de componentes base estilizados con NativeWind.
 * En NativeWind v4, los componentes de React Native necesitan cssInterop
 * para que className funcione correctamente en Web.
 * 
 * Importar de aquí en lugar de 'react-native' en toda la app.
 */
import { cssInterop } from 'nativewind';
import {
    View as RNView,
    Text as RNText,
    TouchableOpacity as RNTouchableOpacity,
    TextInput as RNTextInput,
    ScrollView as RNScrollView,
    KeyboardAvoidingView as RNKeyboardAvoidingView,
    SafeAreaView as RNSafeAreaView,
    ActivityIndicator as RNActivityIndicator,
} from 'react-native';

export const View = cssInterop(RNView, { className: 'style' });
export const Text = cssInterop(RNText, { className: 'style' });
export const TouchableOpacity = cssInterop(RNTouchableOpacity, { className: 'style' });
export const TextInput = cssInterop(RNTextInput, { className: 'style' });
export const ScrollView = cssInterop(RNScrollView, { className: 'style' });
export const KeyboardAvoidingView = cssInterop(RNKeyboardAvoidingView, { className: 'style' });
export const SafeAreaView = cssInterop(RNSafeAreaView, { className: 'style' });
export const ActivityIndicator = cssInterop(RNActivityIndicator, { className: 'style' });
