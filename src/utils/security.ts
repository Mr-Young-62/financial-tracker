import { Capacitor } from '@capacitor/core';
import {
  BiometricAuthError,
  BiometryType,
  NativeBiometric,
} from '@capgo/capacitor-native-biometric';

export const PIN_LENGTH = 6;
const SECURITY_STORAGE_KEY = 'financial-tracker:security:v1';

export interface SecurityConfig {
  pinHash: string;
  pinSalt: string;
  biometricEnabled: boolean;
  updatedAt: string;
}

export interface BiometricSupportInfo {
  isAvailable: boolean;
  isNative: boolean;
  label: string;
}

export interface BiometricAuthResult {
  success: boolean;
  cancelled?: boolean;
  error?: string;
}

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(value: number, bits: number): number {
  return (value >>> bits) | (value << (32 - bits));
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function sha256Fallback(bytes: Uint8Array): string {
  const bitLen = bytes.length * 8;
  const paddedLen = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(bytes);
  padded[bytes.length] = 0x80;

  const view = new DataView(padded.buffer);
  const highBits = Math.floor(bitLen / 0x100000000);
  const lowBits = bitLen >>> 0;
  view.setUint32(paddedLen - 8, highBits, false);
  view.setUint32(paddedLen - 4, lowBits, false);

  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const w = new Uint32Array(64);

  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i += 1) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i += 1) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i += 1) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (hh + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      hh = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h[0] = (h[0] + a) >>> 0;
    h[1] = (h[1] + b) >>> 0;
    h[2] = (h[2] + c) >>> 0;
    h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0;
    h[5] = (h[5] + f) >>> 0;
    h[6] = (h[6] + g) >>> 0;
    h[7] = (h[7] + hh) >>> 0;
  }

  return Array.from(h, (word) => word.toString(16).padStart(8, '0')).join('');
}

function generateSalt(): string {
  const bytes = new Uint8Array(16);
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return bytesToHex(bytes);
}

/** Computes a salted SHA-256 hex digest for a PIN using Web Crypto API (with pure-JS fallback in non-secure contexts). */
export async function hashPin(pin: string, salt: string): Promise<string> {
  const encoded = new TextEncoder().encode(`${salt}:${pin}`);
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', encoded);
    return bytesToHex(new Uint8Array(digest));
  }
  return sha256Fallback(encoded);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function isValidSecurityConfig(value: unknown): value is SecurityConfig {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<SecurityConfig>;
  return (
    typeof candidate.pinHash === 'string' &&
    candidate.pinHash.length === 64 &&
    typeof candidate.pinSalt === 'string' &&
    candidate.pinSalt.length > 0 &&
    typeof candidate.biometricEnabled === 'boolean' &&
    typeof candidate.updatedAt === 'string'
  );
}

function persistSecurityConfig(config: SecurityConfig): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SECURITY_STORAGE_KEY, JSON.stringify(config));
}

/** Reads the locally stored security configuration (PIN hash, salt, biometric flag). */
export function loadSecurityConfig(): SecurityConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SECURITY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isValidSecurityConfig(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Returns true if a local 6-digit PIN has already been configured. */
export function hasPinConfigured(): boolean {
  return loadSecurityConfig() !== null;
}

/** Returns true if biometric unlock is currently enabled by the user. */
export function isBiometricEnabled(): boolean {
  return loadSecurityConfig()?.biometricEnabled ?? false;
}

/** Hashes a new 6-digit PIN with a fresh random salt and saves the security configuration locally. */
export async function savePinConfig(
  pin: string,
  biometricEnabled: boolean
): Promise<SecurityConfig> {
  if (!/^\d{6}$/.test(pin)) {
    throw new Error('PIN harus terdiri dari 6 digit angka.');
  }

  const pinSalt = generateSalt();
  const pinHash = await hashPin(pin, pinSalt);
  const config: SecurityConfig = {
    pinHash,
    pinSalt,
    biometricEnabled,
    updatedAt: new Date().toISOString(),
  };

  persistSecurityConfig(config);
  return config;
}

/** Verifies a 6-digit PIN attempt against the locally stored SHA-256 hash. */
export async function verifyPin(pin: string): Promise<boolean> {
  if (!/^\d{6}$/.test(pin)) return false;
  const config = loadSecurityConfig();
  if (!config) return false;

  const candidateHash = await hashPin(pin, config.pinSalt);
  return timingSafeEqual(candidateHash, config.pinHash);
}

/** Enables or disables biometric unlock without altering the stored PIN hash. */
export function setBiometricEnabled(enabled: boolean): SecurityConfig | null {
  const existing = loadSecurityConfig();
  if (!existing) return null;

  const updated: SecurityConfig = {
    ...existing,
    biometricEnabled: enabled,
    updatedAt: new Date().toISOString(),
  };

  persistSecurityConfig(updated);
  return updated;
}

function getBiometryLabel(biometryType: BiometryType): string {
  switch (biometryType) {
    case BiometryType.FINGERPRINT:
    case BiometryType.TOUCH_ID:
      return 'Sidik Jari';
    case BiometryType.FACE_AUTHENTICATION:
    case BiometryType.FACE_ID:
      return 'Wajah';
    default:
      return 'Biometrik';
  }
}

/** Checks whether native biometric authentication is available on the current device. */
export async function checkBiometricSupport(): Promise<BiometricSupportInfo> {
  const isNative = Capacitor.isNativePlatform();
  if (!isNative) {
    return {
      isAvailable: false,
      isNative: false,
      label: 'Biometrik',
    };
  }

  try {
    const result = await NativeBiometric.isAvailable({ useFallback: false });
    return {
      isAvailable: Boolean(result.isAvailable),
      isNative: true,
      label: getBiometryLabel(result.biometryType),
    };
  } catch {
    return {
      isAvailable: false,
      isNative: true,
      label: 'Biometrik',
    };
  }
}

function isCancelledBiometricError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as { code?: number | string; message?: string };
  const numericCode = typeof err.code === 'string' ? Number(err.code) : err.code;

  if (
    numericCode === BiometricAuthError.USER_CANCEL ||
    numericCode === BiometricAuthError.USER_FALLBACK ||
    numericCode === BiometricAuthError.SYSTEM_CANCEL ||
    numericCode === BiometricAuthError.APP_CANCEL
  ) {
    return true;
  }

  const message = (err.message ?? '').toLowerCase();
  return (
    message.includes('cancel') ||
    message.includes('negative') ||
    message.includes('fallback')
  );
}

/** Triggers the native biometric prompt on Android/iOS, returning a safe fallback result on web. */
export async function authenticateWithBiometric(
  reason?: string
): Promise<BiometricAuthResult> {
  if (!Capacitor.isNativePlatform()) {
    return {
      success: false,
      error: 'Autentikasi biometrik hanya tersedia di perangkat Android.',
    };
  }

  try {
    await NativeBiometric.verifyIdentity({
      reason: reason ?? 'Buka kunci Financial Tracker',
      title: 'Buka Kunci Aplikasi',
      subtitle: 'Gunakan sidik jari untuk melanjutkan',
      negativeButtonText: 'Gunakan PIN',
      maxAttempts: 5,
    });
    return { success: true };
  } catch (error) {
    if (isCancelledBiometricError(error)) {
      return { success: false, cancelled: true };
    }
    return {
      success: false,
      error: 'Verifikasi biometrik gagal. Silakan gunakan PIN 6 digit.',
    };
  }
}
