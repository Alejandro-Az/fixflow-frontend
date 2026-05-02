import { useLocalSearchParams, useRouter } from "expo-router";
import {
    ArrowLeft,
    ArrowRight,
    MonitorSmartphone,
    Plus,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { Modal } from "react-native";
import apiClient from "../../../src/api/client";
import { HeaderProfileMenu } from "../../../src/components/HeaderProfileMenu";
import {
    ActivityIndicator,
    SafeAreaView,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "../../../src/components/ui";
import { useAuthStore } from "../../../src/store/useAuthStore";

export default function WorkspaceDetailScreen() {
  const { id, name } = useLocalSearchParams();
  const workspaceId = Array.isArray(id) ? id[0] : id;
  const workspaceName = Array.isArray(name) ? name[0] : name;
  const router = useRouter();
  const { user } = useAuthStore();

  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [createVisible, setCreateVisible] = useState(false);
  const [deviceName, setDeviceName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const fetchDevices = async () => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.get(
        `/workspaces/${workspaceId}/devices`,
      );
      if (response.data.ok) {
        setDevices(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching devices", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [workspaceId]);

  const handleCreateDevice = async () => {
    const dName = deviceName.trim();
    if (!dName) {
      setCreateError("El nombre del equipo no puede estar vacío.");
      return;
    }
    setCreating(true);
    setCreateError("");
    try {
      const response = await apiClient.post(
        `/workspaces/${workspaceId}/devices`,
        { name: dName },
      );
      if (response.data.ok) {
        setCreateVisible(false);
        setDeviceName("");
        await fetchDevices();
      } else {
        setCreateError("No se pudo crear el equipo.");
      }
    } catch (error: any) {
      setCreateError(
        error.response?.data?.error?.message || "Error de red o servidor.",
      );
    } finally {
      setCreating(false);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  const isFreePlan = user?.plan === "free";
  const limitReached = isFreePlan && devices.length >= 2; // Límite de 2 equipos por workspace en Plan Free

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Centered layout for Web */}
      <View className="flex-1 w-full max-w-3xl mx-auto border-x border-border border-opacity-20 web:border-opacity-100">
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 py-4 border-b border-border">
          <TouchableOpacity onPress={handleBack} className="p-2 -ml-2">
            <ArrowLeft color="#e5e2e1" size={24} />
          </TouchableOpacity>
          <Text className="text-text text-[20px] font-semibold">
            {workspaceName || "Equipos"}
          </Text>
          <HeaderProfileMenu />
        </View>

        {/* Content */}
        <ScrollView className="flex-1 px-6 pt-6">
          {/* Banner de límite de suscripción */}
          {isFreePlan && (
            <View className="border border-dashed border-border rounded-xl p-4 mb-6 items-center justify-center bg-[#1c1b1b]">
              <Text className="text-textMuted text-sm mb-2 text-center">
                Plan Free: Registra hasta 2 equipos.
              </Text>
              <TouchableOpacity className="flex-row items-center active:opacity-80">
                <Text className="text-primary font-medium text-sm mr-1">
                  Upgrade a Pro
                </Text>
                <ArrowRight color="#6699cc" size={16} />
              </TouchableOpacity>
            </View>
          )}

          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-textMuted text-[16px] font-medium">
              Mis equipos
            </Text>
            {!limitReached && (
              <TouchableOpacity
                onPress={() => setCreateVisible(true)}
                className="p-2"
              >
                <Plus color="#8b919a" size={20} />
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <View className="py-10 items-center">
              <ActivityIndicator size="large" color="#6699cc" />
            </View>
          ) : devices.length === 0 ? (
            <View className="items-center py-12 px-6 border border-border rounded-xl bg-surface border-dashed">
              <MonitorSmartphone color="#94918e" size={32} className="mb-4" />
              <Text className="text-text text-[16px] font-medium mb-2 text-center">
                Aún no hay equipos
              </Text>
              <Text className="text-textMuted text-[14px] text-center mb-6">
                Agrega computadoras, servidores o dispositivos a este workspace
                para rastrear sus componentes.
              </Text>
              <TouchableOpacity
                onPress={() => setCreateVisible(true)}
                className="bg-background border border-border py-3 px-6 rounded-lg"
              >
                <Text className="text-text font-medium">
                  Agregar primer equipo
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            devices.map((device) => (
              <TouchableOpacity
                key={device.id}
                onPress={() =>
                  router.push(
                    `/device/${device.id}?name=${encodeURIComponent(device.name)}` as any,
                  )
                }
                className="bg-surface border border-border rounded-xl p-5 mb-4 active:opacity-80 transition-opacity"
              >
                <Text className="text-text text-[18px] font-semibold mb-1">
                  {device.name}
                </Text>
                <Text className="text-textMuted text-[12px]">
                  Último mantenimiento:{" "}
                  {device.last_maintenance_date
                    ? new Date(
                        device.last_maintenance_date,
                      ).toLocaleDateString()
                    : "Sin fecha"}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>

      {/* Modal para Crear Equipo */}
      <Modal
        visible={createVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCreateVisible(false)}
      >
        <View className="flex-1 justify-center px-4 bg-background/90">
          <View className="w-full max-w-md mx-auto bg-surface border border-border rounded-xl overflow-hidden shadow-lg">
            <View className="p-6">
              <Text className="text-text text-[20px] font-semibold mb-6">
                Nuevo equipo
              </Text>

              <Text className="text-textMuted text-[12px] uppercase font-semibold mb-2 tracking-wider">
                Nombre del equipo
              </Text>
              <TextInput
                value={deviceName}
                onChangeText={setDeviceName}
                placeholder="Ej. Computadora Principal, Servidor Alpha..."
                placeholderTextColor="#94918e"
                className="bg-background border border-border rounded-lg text-text px-4 py-3 mb-4 text-[15px]"
                autoFocus
              />

              <Text className="text-textMuted text-[12px] uppercase font-semibold mb-2 tracking-wider">
                Fecha de registro
              </Text>
              <View className="bg-background border border-border rounded-lg px-4 py-3 mb-2 opacity-70">
                <Text className="text-text">
                  {new Date().toLocaleDateString("es-ES")}
                </Text>
              </View>

              {createError ? (
                <Text className="text-[#ffb4ab] text-[12px] mb-4">
                  {createError}
                </Text>
              ) : (
                <View className="h-4" />
              )}

              <View className="flex-row items-center mt-4">
                <TouchableOpacity
                  onPress={() => setCreateVisible(false)}
                  className="flex-1 py-3 border border-border rounded-lg items-center mr-3"
                  disabled={creating}
                >
                  <Text className="text-textMuted font-medium">Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleCreateDevice}
                  className="flex-1 py-3 bg-primary rounded-lg items-center"
                  disabled={creating}
                >
                  {creating ? (
                    <ActivityIndicator color="#141313" size="small" />
                  ) : (
                    <Text className="text-[#141313] font-semibold">
                      Crear equipo
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
