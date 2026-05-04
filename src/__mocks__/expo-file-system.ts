// Mock de expo-file-system para entorno de testing (Jest/Node)
export const documentDirectory = '/mock-fs/';
export const EncodingType = { Base64: 'base64', UTF8: 'utf8' };
export const writeAsStringAsync = jest.fn(async () => {});
export const readAsStringAsync = jest.fn(async () => '');
export const deleteAsync = jest.fn(async () => {});
