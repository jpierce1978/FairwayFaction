import * as Crypto from 'expo-crypto';

/** Generate a new UUID (v4). Injected into services so tests can use deterministic ids. */
export type IdGenerator = () => string;

export const generateId: IdGenerator = () => Crypto.randomUUID();
