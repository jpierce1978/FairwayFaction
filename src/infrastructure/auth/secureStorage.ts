import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/** Storage contract Supabase's auth client expects. */
export interface AsyncKeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

// SecureStore warns above ~2KB per value and Supabase sessions exceed that, so values are chunked.
const CHUNK_SIZE = 1800;
const countKey = (key: string) => `${key}.chunks`;
const chunkKey = (key: string, i: number) => `${key}.${i}`;

export function createChunkedStorage(
  backend: Pick<AsyncKeyValueStorage, 'getItem' | 'setItem' | 'removeItem'>,
): AsyncKeyValueStorage {
  const removeItem = async (key: string) => {
    const count = Number((await backend.getItem(countKey(key))) ?? 0);
    for (let i = 0; i < count; i++) await backend.removeItem(chunkKey(key, i));
    await backend.removeItem(countKey(key));
  };
  return {
    async getItem(key) {
      const count = Number((await backend.getItem(countKey(key))) ?? 0);
      if (!count) return null;
      const parts: string[] = [];
      for (let i = 0; i < count; i++) {
        const part = await backend.getItem(chunkKey(key, i));
        if (part === null) return null; // torn write: treat as signed out rather than corrupt JSON
        parts.push(part);
      }
      return parts.join('');
    },
    async setItem(key, value) {
      await removeItem(key);
      const chunks = value.match(new RegExp(`.{1,${CHUNK_SIZE}}`, 'gs')) ?? [];
      for (let i = 0; i < chunks.length; i++) await backend.setItem(chunkKey(key, i), chunks[i]!);
      await backend.setItem(countKey(key), String(chunks.length));
    },
    removeItem,
  };
}

const secureStoreBackend: AsyncKeyValueStorage = {
  getItem: (k) => SecureStore.getItemAsync(k),
  setItem: (k, v) => SecureStore.setItemAsync(k, v),
  removeItem: (k) => SecureStore.deleteItemAsync(k),
};

/** Session storage: Keychain/Keystore on devices; localStorage on web (dev only). */
export function createSessionStorage(): AsyncKeyValueStorage {
  if (Platform.OS === 'web') {
    const ls = typeof localStorage === 'undefined' ? null : localStorage;
    return {
      getItem: async (k) => ls?.getItem(k) ?? null,
      setItem: async (k, v) => ls?.setItem(k, v),
      removeItem: async (k) => ls?.removeItem(k),
    };
  }
  return createChunkedStorage(secureStoreBackend);
}
