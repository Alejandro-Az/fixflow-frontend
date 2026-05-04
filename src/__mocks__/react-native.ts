// Mock mínimo de react-native para tests unitarios (sin entorno nativo)
export const Platform = {
    OS: 'web' as 'web' | 'ios' | 'android',
    select: jest.fn((obj: any) => obj.web ?? obj.default),
};

export const Alert = {
    alert: jest.fn(),
};
