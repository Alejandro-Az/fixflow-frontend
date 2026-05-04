import { useLocalSearchParams, useRouter } from "expo-router";
import {
    ArrowLeft,
    ArrowRight,
    MonitorSmartphone,
    Plus,
    MoreVertical,
    Pencil,
    Trash2,
    X,
    Lock,
} from "lucide-react-native";
import React, { useEffect, useState, useRef } from "react";
import { Modal, TouchableWithoutFeedback, View as RNView, Dimensions } from "react-native";
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

  const [localWorkspaceName, setLocalWorkspaceName] = useState(workspaceName as string);

  // Options Menu state
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 64, right: 20 });
  const optionsBtnRef = useRef<any>(null);

  // Edit Workspace state
  const [editVisible, setEditVisible] = useState(false);
  const [editName, setEditName] = useState(workspaceName as string);
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState("");

  // Delete Workspace state
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const openOptionsMenu = () => {
    optionsBtnRef.current?.measure(
      (_fx: number, _fy: number, w: number, h: number, px: number, py: number) => {
        const screenWidth = Dimensions.get("window").width;
        const rightOffset = screenWidth - px - w;
        setMenuPos({ top: py + h + 6, right: rightOffset });
        setOptionsVisible(true);
      }
    );
  };

  const handleEditWorkspace = async () => {
    const newName = editName.trim();
    if (!newName) {
      setEditError("El nombre no puede estar vacío.");
      return;
    }
    setEditing(true);
    setEditError("");
    try {
      const response = await apiClient.put(`/workspaces/${workspaceId}`, { name: newName });
      if (response.data.ok) {
        setLocalWorkspaceName(newName);
        router.setParams({ name: newName });
        setEditVisible(false);
      } else {
        setEditError("No se pudo editar el workspace.");
      }
    } catch (error: any) {
      setEditError(error.response?.data?.error?.message || "Error al editar.");
    } finally {
      setEditing(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    setDeleting(true);
    setDeleteError("");
    try {
      const response = await apiClient.delete(`/workspaces/${workspaceId}`);
      if (response.data.ok) {
        setDeleteVisible(false);
        router.replace("/");
      } else {
        setDeleteError("No se pudo eliminar el workspace.");
      }
    } catch (error: any) {
      setDeleteError(error.response?.data?.error?.message || "Error al eliminar.");
    } finally {
      setDeleting(false);
    }
  };

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
      if (error.response) {
          const backendMsg = error.response.data?.error?.message;
          const errorCode = error.response.data?.error?.code;
          if (error.response.status === 403 || errorCode === 'PLAN_LIMIT_REACHED' || errorCode === 'AUTH_FORBIDDEN') {
              setCreateError('Has alcanzado el límite de tu plan. Haz upgrade para añadir más equipos.');
          } else {
              setCreateError(backendMsg || "Error de red o servidor.");
          }
      } else {
          setCreateError("Sin conexión con el servidor.");
      }
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
  const deviceLimit = user?.plan === "free" ? 2 : user?.plan === "pro" ? 8 : user?.plan === "premium" ? 10 : Infinity;
  const limitReached = devices.length >= deviceLimit;

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Centered layout for Web */}
      <View className="flex-1 w-full max-w-3xl mx-auto border-x border-border border-opacity-20 web:border-opacity-100">
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 py-4 border-b border-border">
          <TouchableOpacity onPress={handleBack} className="p-2 -ml-2">
            <ArrowLeft color="#e5e2e1" size={24} />
          </TouchableOpacity>
          <Text className="text-text text-[20px] font-semibold flex-1 ml-4" numberOfLines={1}>
            {localWorkspaceName || "Equipos"}
          </Text>
          <View className="flex-row items-center gap-2">
            <TouchableOpacity ref={optionsBtnRef} onPress={openOptionsMenu} className="p-2 active:opacity-60">
              <MoreVertical color="#e5e2e1" size={20} />
            </TouchableOpacity>
            <HeaderProfileMenu />
          </View>
        </View>

        {/* Content */}
        <ScrollView className="flex-1 px-6 pt-6">
          {/* Banner de límite de suscripción */}
          {limitReached && (
            <View className="border border-dashed border-border rounded-xl p-4 mb-6 items-center justify-center bg-[#1c1b1b]">
              <Text className="text-textMuted text-sm mb-2 text-center">
                Has alcanzado el límite de equipos de tu plan ({user?.plan === 'free' ? '2' : user?.plan === 'pro' ? '8' : '10'}).
              </Text>
              <TouchableOpacity onPress={() => router.push('/plans' as any)} className="flex-row items-center active:opacity-80">
                <Text className="text-primary font-medium text-sm mr-1">
                  {user?.plan === 'free' ? 'Mejorar a Pro' : user?.plan === 'pro' ? 'Mejorar a Premium' : 'Mejorar a Enterprise'}
                </Text>
                <ArrowRight color="#6699cc" size={16} />
              </TouchableOpacity>
            </View>
          )}

          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-textMuted text-[16px] font-medium">
              Mis equipos {user?.plan !== 'enterprise' ? `(${devices.length}/${deviceLimit})` : ''}
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
            devices.map((device, index) => {
              const isLocked = index >= deviceLimit;
              return (
                <TouchableOpacity
                  key={device.id}
                  onPress={() => {
                    if (isLocked) {
                      alert("Equipo bloqueado por límite de plan. Mejora tu suscripción para acceder.");
                      return;
                    }
                    router.push(
                      `/device/${device.id}?name=${encodeURIComponent(device.name)}` as any,
                    )
                  }}
                  className={`bg-surface border rounded-xl p-5 mb-4 ${isLocked ? 'border-[#444444] opacity-70' : 'border-border active:opacity-80 transition-opacity'}`}
                  activeOpacity={isLocked ? 1 : 0.8}
                >
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-text text-[18px] font-semibold">
                      {device.name}
                    </Text>
                    {isLocked && <Lock color="#ffb4ab" size={16} />}
                  </View>
                  <Text className="text-textMuted text-[12px]">
                    Último mantenimiento:{" "}
                    {device.last_maintenance_date
                      ? new Date(
                          device.last_maintenance_date,
                        ).toLocaleDateString()
                      : "Sin fecha"}
                  </Text>
                </TouchableOpacity>
              );
            })
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

      {/* Modal Opciones */}
      <Modal visible={optionsVisible} transparent animationType="fade" onRequestClose={() => setOptionsVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setOptionsVisible(false)}>
          <RNView style={{ flex: 1 }}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <RNView style={{
                position: 'absolute',
                top: menuPos.top,
                right: menuPos.right,
                backgroundColor: '#2a2a2a',
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#444444',
                minWidth: 200,
                shadowColor: '#000',
                shadowOpacity: 0.4,
                shadowRadius: 8,
                elevation: 8,
                overflow: 'hidden',
              }}>
                <TouchableOpacity onPress={() => { setOptionsVisible(false); setEditName(localWorkspaceName); setEditError(""); setEditVisible(true); }}>
                  <RNView style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#444444' }}>
                    <Pencil color="#e5e2e1" size={16} />
                    <Text className="text-text font-medium text-sm">Editar nombre</Text>
                  </RNView>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setOptionsVisible(false); setDeleteError(""); setDeleteVisible(true); }}>
                  <RNView style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14 }}>
                    <Trash2 color="#ff8a80" size={16} />
                    <Text className="text-[#ff8a80] font-medium text-sm">Eliminar workspace</Text>
                  </RNView>
                </TouchableOpacity>
              </RNView>
            </TouchableWithoutFeedback>
          </RNView>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal Editar */}
      <Modal visible={editVisible} transparent animationType="fade" onRequestClose={() => setEditVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setEditVisible(false)}>
          <RNView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <RNView style={{ backgroundColor: '#2a2a2a', borderRadius: 14, borderWidth: 1, borderColor: '#444444', padding: 24, width: '100%', maxWidth: 440 }}>
                <RNView style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <Text className="text-text font-bold text-lg">Editar workspace</Text>
                  <TouchableOpacity onPress={() => setEditVisible(false)} className="active:opacity-60">
                    <X color="#94918e" size={20} />
                  </TouchableOpacity>
                </RNView>
                <Text className="text-textMuted text-sm mb-2">Nombre del workspace</Text>
                <TextInput
                  value={editName}
                  onChangeText={(t) => { setEditName(t); setEditError(''); }}
                  placeholder="Ej: Casa, Oficina..."
                  placeholderTextColor="#94918e"
                  autoFocus
                  className="bg-[#141313] border border-[#444444] rounded-lg text-text px-4 py-3 mb-2 text-[15px]"
                />
                {editError ? <Text className="text-[#ffb4ab] text-sm mb-3">{editError}</Text> : <RNView style={{ height: 12 }} />}
                <RNView style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                  <TouchableOpacity onPress={() => setEditVisible(false)} className="flex-1 py-3 rounded-lg border border-border items-center active:opacity-70">
                    <Text className="text-textMuted font-medium">Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleEditWorkspace} disabled={editing} className={`flex-1 py-3 rounded-lg border border-primary items-center ${editing ? 'opacity-50' : 'active:opacity-80'}`}>
                    {editing ? <ActivityIndicator color="#6699cc" /> : <Text className="text-primary font-semibold">Guardar</Text>}
                  </TouchableOpacity>
                </RNView>
              </RNView>
            </TouchableWithoutFeedback>
          </RNView>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal Eliminar */}
      <Modal visible={deleteVisible} transparent animationType="fade" onRequestClose={() => setDeleteVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setDeleteVisible(false)}>
          <RNView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <RNView style={{ backgroundColor: '#2a2a2a', borderRadius: 14, borderWidth: 1, borderColor: '#444444', padding: 24, width: '100%', maxWidth: 440 }}>
                <RNView style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <Text className="text-[#ffb4ab] font-bold text-lg">Eliminar workspace</Text>
                  <TouchableOpacity onPress={() => setDeleteVisible(false)} className="active:opacity-60">
                    <X color="#94918e" size={20} />
                  </TouchableOpacity>
                </RNView>
                <Text className="text-text text-[15px] mb-4">
                  ¿Estás seguro que deseas eliminar el workspace <Text className="font-bold">{localWorkspaceName}</Text>?
                </Text>
                <Text className="text-textMuted text-sm mb-4">Esta acción eliminará todos los equipos y registros asociados y no se puede deshacer.</Text>
                {deleteError ? <Text className="text-[#ffb4ab] text-sm mb-3">{deleteError}</Text> : null}
                <RNView style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                  <TouchableOpacity onPress={() => setDeleteVisible(false)} className="flex-1 py-3 rounded-lg border border-border items-center active:opacity-70">
                    <Text className="text-textMuted font-medium">Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleDeleteWorkspace} disabled={deleting} className={`flex-1 py-3 rounded-lg bg-[#cc3333] border border-[#cc3333] items-center ${deleting ? 'opacity-50' : 'active:opacity-80'}`}>
                    {deleting ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-semibold">Eliminar</Text>}
                  </TouchableOpacity>
                </RNView>
              </RNView>
            </TouchableWithoutFeedback>
          </RNView>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}
