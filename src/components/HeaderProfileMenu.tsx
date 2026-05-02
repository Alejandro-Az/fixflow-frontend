import React, { useState, useRef } from 'react';
import { Modal, TouchableWithoutFeedback, View as RNView, Dimensions } from 'react-native';
import { View, Text, TouchableOpacity } from './ui';
import { CircleUser, LogOut, User } from 'lucide-react-native';
import { useAuthStore } from '../store/useAuthStore';

export function HeaderProfileMenu() {
    const { user, logout } = useAuthStore();
    const [menuVisible, setMenuVisible] = useState(false);
    const [menuPos, setMenuPos] = useState({ top: 64, right: 20 });
    const profileBtnRef = useRef<any>(null);

    const openMenu = () => {
        profileBtnRef.current?.measure(
            (_fx: number, _fy: number, w: number, h: number, px: number, py: number) => {
                const screenWidth = Dimensions.get('window').width;
                const rightOffset = screenWidth - px - w;
                setMenuPos({ top: py + h + 6, right: rightOffset });
                setMenuVisible(true);
            }
        );
    };

    const handleLogout = async () => {
        setMenuVisible(false);
        await logout();
    };

    const getAvatarColor = (name: string) => {
        const colors = ['#00f0ff', '#39ff14', '#ff00ff', '#ff073a', '#ff7300', '#e8f48c', '#0055ff', '#40e0d0'];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    const initial = (user?.name || user?.email || 'U').charAt(0).toUpperCase();
    const avatarColor = getAvatarColor(user?.name || user?.email || 'U');

    return (
        <>
            <TouchableOpacity ref={profileBtnRef} onPress={openMenu} className="active:opacity-60 p-2 -mr-2">
                <View className="w-8 h-8 rounded-full items-center justify-center border border-border" style={{ backgroundColor: avatarColor + '20' }}>
                    <Text className="font-bold text-[14px]" style={{ color: avatarColor }}>{initial}</Text>
                </View>
            </TouchableOpacity>

            <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
                <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
                    <RNView style={{ flex: 1 }}>
                        <RNView style={{
                            position: 'absolute',
                            top: menuPos.top,
                            right: menuPos.right,
                            backgroundColor: '#2a2a2a',
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: '#444444',
                            minWidth: 220,
                            shadowColor: '#000',
                            shadowOpacity: 0.4,
                            shadowRadius: 8,
                            elevation: 8,
                            overflow: 'hidden',
                        }}>
                            <RNView style={{ paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#444444' }}>
                                <RNView style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                    <User color="#94918e" size={16} />
                                    <RNView>
                                        <Text className="text-text font-semibold text-sm">{user?.name ?? 'Usuario'}</Text>
                                        <Text className="text-textMuted text-xs">{user?.email ?? ''}</Text>
                                    </RNView>
                                </RNView>
                                <RNView style={{ backgroundColor: '#1e3a5f', borderColor: '#2a4d7a', borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 2, alignSelf: 'flex-start' }}>
                                    <Text className="text-[#9acbff] text-xs font-medium capitalize">Plan {user?.plan ?? 'free'}</Text>
                                </RNView>
                            </RNView>

                            <TouchableOpacity onPress={handleLogout}>
                                <RNView style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14 }}>
                                    <LogOut color="#ff8a80" size={16} />
                                    <Text className="text-[#ff8a80] font-medium text-sm">Cerrar sesión</Text>
                                </RNView>
                            </TouchableOpacity>
                        </RNView>
                    </RNView>
                </TouchableWithoutFeedback>
            </Modal>
        </>
    );
}
