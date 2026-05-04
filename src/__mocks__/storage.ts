// Mock del storage multiplataforma (localStorage/expo-secure-store)
// para entorno de testing (Jest/Node)
const memoryStore: Record<string, string> = {};

export const storage = {
    getItem: jest.fn(async (key: string) => memoryStore[key] ?? null),
    setItem: jest.fn(async (key: string, value: string) => { memoryStore[key] = value; }),
    deleteItem: jest.fn(async (key: string) => { delete memoryStore[key]; }),
    clear: () => { Object.keys(memoryStore).forEach(k => delete memoryStore[k]); },
};
