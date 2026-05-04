// Mock de expo-sharing para entorno de testing (Jest/Node)
export const isAvailableAsync = jest.fn(async () => true);
export const shareAsync = jest.fn(async () => {});
