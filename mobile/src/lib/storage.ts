export interface StorageAdapter {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  deleteItem: (key: string) => Promise<void>;
}

export const getItem = async (key: string): Promise<string | null> => {
  return null;
};

export const setItem = async (key: string, value: string): Promise<void> => {};

export const deleteItem = async (key: string): Promise<void> => {};

const Storage: StorageAdapter = {
  getItem,
  setItem,
  deleteItem,
};

export default Storage;
