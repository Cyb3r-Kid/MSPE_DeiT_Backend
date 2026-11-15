import * as SecureStore from 'expo-secure-store';

export interface StorageAdapter {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  deleteItem: (key: string) => Promise<void>;
}

export const getItem = async (key: string): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.error(`[Storage:native] Error getting key ${key}:`, error);
    return null;
  }
};

export const setItem = async (key: string, value: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    console.error(`[Storage:native] Error setting key ${key}:`, error);
  }
};

export const deleteItem = async (key: string): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.error(`[Storage:native] Error deleting key ${key}:`, error);
  }
};

const Storage: StorageAdapter = {
  getItem,
  setItem,
  deleteItem,
};

export default Storage;
