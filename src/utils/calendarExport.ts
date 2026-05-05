import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import apiClient from '../api/client';
import { Platform, Alert } from 'react-native';

/**
 * Exporta el calendario de mantenimiento de un equipo.
 * @param deviceId ID del equipo
 * @param deviceName Nombre del equipo (para el nombre del archivo)
 * @param startDate Fecha de inicio en formato YYYY-MM-DD
 */
export const exportCalendar = async (deviceId: string, deviceName: string, startDate: string) => {
    try {
        const response = await apiClient.post(`/devices/${deviceId}/exports/maintenance/calendar`, {
            start_date: startDate
        });

        if (response.data.ok) {
            const { content_base64, filename } = response.data.data;
            
            // Nombre de archivo sanitizado
            const safeName = filename || `mantenimiento_${deviceName.replace(/\s+/g, '_').toLowerCase()}.ics`;
            const fileUri = `${FileSystem.cacheDirectory}${safeName}`;

            // Escribir el archivo base64 a disco
            await FileSystem.writeAsStringAsync(fileUri, content_base64, {
                encoding: FileSystem.EncodingType.Base64,
            });

            // Compartir el archivo
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri, {
                    mimeType: 'text/calendar',
                    dialogTitle: 'Exportar Recordatorio de Mantenimiento',
                    UTI: 'public.calendar-event',
                });
            } else {
                Alert.alert('Error', 'La función de compartir no está disponible en este dispositivo.');
            }
        } else {
            throw new Error('Error en la respuesta del servidor');
        }
    } catch (error: any) {
        console.error('Error exporting calendar', error);
        const errorMsg = error.response?.data?.error?.message || 'No se pudo generar el archivo de calendario.';
        Alert.alert('Error', errorMsg);
    }
};
