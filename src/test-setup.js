import 'fake-indexeddb/auto';
import { webcrypto } from 'node:crypto';

// jsdom no trae crypto.subtle; Node sí.
Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
