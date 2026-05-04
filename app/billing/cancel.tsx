import React from 'react';
import { SafeAreaView, View, Text, TouchableOpacity } from '../../src/components/ui';
import { useRouter } from 'expo-router';
import { XCircle } from 'lucide-react-native';

export default function BillingCancelScreen() {
    const router = useRouter();

    return (
        <SafeAreaView className="flex-1 bg-background justify-center items-center px-6">
            <View className="w-full max-w-sm bg-surface border border-border rounded-2xl p-8 items-center">

                <View className="w-20 h-20 rounded-full bg-[#2d2d2d] items-center justify-center mb-6 border border-border">
                    <XCircle color="#94918e" size={44} />
                </View>

                <Text className="text-text font-bold text-[20px] text-center mb-2">
                    Pago cancelado
                </Text>

                <Text className="text-textMuted text-center text-[14px] mb-8">
                    No se realizó ningún cargo. Puedes volver a intentarlo cuando quieras.
                </Text>

                <TouchableOpacity
                    onPress={() => router.replace('/plans' as any)}
                    className="w-full py-4 rounded-xl items-center bg-primary mb-3"
                >
                    <Text className="font-bold text-[15px] text-[#141313]">Ver planes</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => router.replace('/')}
                    className="py-2"
                >
                    <Text className="text-textMuted text-[13px]">Volver al dashboard</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
