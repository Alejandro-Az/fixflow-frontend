import { Platform, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import apiClient from '../api/client';

export const exportFile = async (endpoint: string): Promise<boolean> => {
    try {
        const response = await apiClient.get(endpoint);
        
        if (!response.data || !response.data.ok || !response.data.data) {
            throw new Error('Formato de respuesta inválido');
        }

        const exportData = response.data.data;
        const base64 = exportData.content_base64;
        const mimeType = exportData.mime_type;
        const fileName = exportData.file_name;

        if (!base64 || !fileName || !mimeType) {
            throw new Error('Faltan datos de exportación en la respuesta del servidor');
        }

        if (Platform.OS === 'web') {
            const dataUrl = `data:${mimeType};base64,${base64}`;
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            return true;
        } else {
            // Guardar en FileSystem
            const fileUri = `${FileSystem.documentDirectory}${fileName}`;
            await FileSystem.writeAsStringAsync(fileUri, base64, {
                encoding: FileSystem.EncodingType.Base64,
            });

            // Compartir el archivo
            const isAvailable = await Sharing.isAvailableAsync();
            if (isAvailable) {
                await Sharing.shareAsync(fileUri, {
                    mimeType,
                    dialogTitle: 'Exportar archivo',
                });
            } else {
                Alert.alert('Error', 'Compartir archivos no está disponible en este dispositivo.');
            }
            return true;
        }
    } catch (error: any) {
        if (error.response && error.response.status === 403) {
            const errCode = error.response.data?.error?.code;
            if (errCode === 'AUTH_FORBIDDEN') {
                if (Platform.OS === 'web') {
                    alert('Esta función es exclusiva para usuarios Pro. Actualiza tu plan para exportar archivos.');
                } else {
                    Alert.alert('Función Premium', 'Esta función es exclusiva para usuarios Pro. Actualiza tu plan para exportar archivos.');
                }
                return false;
            }
        }
        
        if (Platform.OS === 'web') {
            alert('Error al exportar: ' + (error.response?.data?.error?.message || error.message));
        } else {
            Alert.alert('Error al exportar', error.response?.data?.error?.message || 'Hubo un problema al generar el archivo.');
        }
        return false;
    }
};
