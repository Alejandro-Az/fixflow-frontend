import React from 'react';
import { View, Text, Pressable } from '../../src/components/ui';
import { ChevronRight, Cpu, CircuitBoard, Database, Monitor, Zap, HardDrive, Fan, Box, ShieldQuestion } from 'lucide-react-native';

export type ComponentCategory = 'cpu' | 'motherboard' | 'ram' | 'gpu' | 'cooler' | 'psu' | 'storage' | 'case' | 'case_fans';

export interface CategoryRowProps {
  category: ComponentCategory;
  label: string;
  value?: string | null;
  onPress: () => void;
}

const CATEGORY_ICONS: Record<ComponentCategory, React.ElementType> = {
  cpu: Cpu,
  motherboard: CircuitBoard,
  ram: Database,
  gpu: Monitor,
  cooler: Fan,
  psu: Zap,
  storage: HardDrive,
  case: Box,
  case_fans: Fan,
};

export const CATEGORY_COLORS: Record<string, string> = {
  cpu: '#00f0ff',
  motherboard: '#39ff14',
  ram: '#ff00ff',
  gpu: '#ff073a',
  cooler: '#0055ff',
  psu: '#ff7300',
  storage: '#e8f48c',
  case: '#ffffff',
  case_fans: '#40e0d0',
};

export function CategoryRow({ category, label, value, onPress }: CategoryRowProps) {
  const Icon = CATEGORY_ICONS[category] || ShieldQuestion;
  const hasValue = !!value && value !== 'Sin registrar';
  
  // Is it a multi-module badge style? (If it contains 'módulo' or 'módulos')
  const safeValue = String(value || '');
  const isBadge = hasValue && safeValue.includes('módulo');

  return (
    <Pressable 
      onPress={onPress}
      className="flex-row items-center p-4 border-b border-border active:opacity-80 transition-opacity"
    >
      {/* Icon Area */}
      <View 
        className="w-10 h-10 items-center justify-center rounded-lg mr-4"
        style={{ 
          backgroundColor: '#141313', 
          borderColor: hasValue ? CATEGORY_COLORS[category] : '#444444', 
          borderWidth: 1 
        }}
      >
        <Icon size={20} color={hasValue ? CATEGORY_COLORS[category] : "#8b919a"} />
      </View>
      
      {/* Text Area */}
      <View className="flex-1 justify-center">
        <Text className="text-textMuted text-[12px] font-semibold mb-1 uppercase tracking-wider">
          {label}
        </Text>
        
        {isBadge ? (
          <View className="self-start px-2 py-0.5 rounded-md border" style={{ backgroundColor: '#141313', borderColor: CATEGORY_COLORS[category] }}>
            <Text className="text-[14px] font-medium" style={{ color: CATEGORY_COLORS[category] }}>{value}</Text>
          </View>
        ) : (
          <Text className={`text-[15px] ${hasValue ? 'text-text' : 'text-textMuted'}`}>
            {value || 'Sin registrar'}
          </Text>
        )}
      </View>
      
      {/* Action Area */}
      <ChevronRight size={20} color="#8b919a" />
    </Pressable>
  );
}
