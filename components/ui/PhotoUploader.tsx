import React from 'react';
import { Platform } from 'react-native';
import { View, Text, Pressable, Image } from '../../src/components/ui';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Trash2 } from 'lucide-react-native';

interface PhotoUploaderProps {
  imageUri?: string | null;
  onImageSelect: (uri: string) => void;
  onImageRemove: () => void;
  label?: string;
}

export function PhotoUploader({ imageUri, onImageSelect, onImageRemove, label = '+ Agregar foto (opcional)' }: PhotoUploaderProps) {
  
  const handlePress = async () => {
    // Request permission if needed (especially on mobile)
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Se necesitan permisos para acceder a la galería.');
        return;
      }
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      onImageSelect(result.assets[0].uri);
    }
  };

  if (imageUri) {
    return (
      <View className="w-full relative mb-6">
        <Image 
          source={{ uri: imageUri }} 
          className="w-full h-48 rounded-xl border border-border" 
          resizeMode="cover" 
        />
        <Pressable 
          onPress={onImageRemove}
          className="absolute top-2 right-2 w-10 h-10 bg-background/80 rounded-full items-center justify-center border border-border"
        >
          <Trash2 size={20} color="#ffb4ab" />
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable 
      onPress={handlePress}
      className="w-full h-[100px] bg-background border border-border border-dashed rounded-xl items-center justify-center mb-6 active:opacity-80 transition-opacity"
    >
      <Camera size={24} color="#94918e" className="mb-2" />
      <Text className="text-textMuted text-[14px] font-medium">{label}</Text>
    </Pressable>
  );
}
