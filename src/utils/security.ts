import CryptoJS from 'crypto-js';

export function hashPassword(password: string): string {
  const salt = CryptoJS.lib.WordArray.random(16).toString();
  const hash = CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32,
    iterations: 10000,
    hasher: CryptoJS.algo.SHA256,
  }).toString();
  return `pbkdf2:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [, salt, hash] = stored.split(':');
    const candidate = CryptoJS.PBKDF2(password, salt, {
      keySize: 256 / 32,
      iterations: 10000,
      hasher: CryptoJS.algo.SHA256,
    }).toString();
    return candidate === hash;
  } catch {
    return false;
  }
}

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateTOTPSecret(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  let secret = '';
  for (let i = 0; i < bytes.length; i++) {
    secret += BASE32_CHARS[bytes[i] % 32];
  }
  return secret;
}

function base32Decode(encoded: string): Uint8Array {
  const upper = encoded.toUpperCase().replace(/=+$/, '');
  const bytes: number[] = [];
  let buffer = 0;
  let bitsLeft = 0;
  for (const char of upper) {
    const val = BASE32_CHARS.indexOf(char);
    if (val < 0) continue;
    buffer = (buffer << 5) | val;
    bitsLeft += 5;
    if (bitsLeft >= 8) {
      bytes.push((buffer >> (bitsLeft - 8)) & 0xff);
      bitsLeft -= 8;
    }
  }
  return new Uint8Array(bytes);
}

async function hmacSHA1(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const keyBuffer = key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength) as ArrayBuffer;
  const dataBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyBuffer, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataBuffer);
  return new Uint8Array(signature);
}

export async function generateTOTP(secret: string, window = 0): Promise<string> {
  const time = Math.floor(Date.now() / 1000 / 30) + window;
  const timeBuffer = new ArrayBuffer(8);
  const timeView = new DataView(timeBuffer);
  timeView.setUint32(4, time, false);
  const keyBytes = base32Decode(secret);
  const hmac = await hmacSHA1(keyBytes, new Uint8Array(timeBuffer));
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    (((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff)) %
    1000000;
  return code.toString().padStart(6, '0');
}

export async function verifyTOTP(secret: string, token: string): Promise<boolean> {
  for (const w of [-1, 0, 1]) {
    const expected = await generateTOTP(secret, w);
    if (expected === token.trim()) return true;
  }
  return false;
}

export function getTOTPAuthURL(secret: string, username: string, issuer = 'TableBite'): string {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(username)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

export function generateOrderId(): string {
  const array = new Uint8Array(12);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
    .slice(0, 20);
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function sanitizeInput(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

export function sanitizeText(input: string, maxLen = 500): string {
  return sanitizeInput(input.trim().slice(0, maxLen));
}

const RATE_LIMIT_KEY = 'tb_rate_limits';
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 30 * 60 * 1000;

interface RateEntry { attempts: number; firstAttempt: number; lockedUntil?: number }

function getRateLimits(): Record<string, RateEntry> {
  try {
    return JSON.parse(localStorage.getItem(RATE_LIMIT_KEY) || '{}');
  } catch { return {}; }
}

function saveRateLimits(data: Record<string, RateEntry>) {
  localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(data));
}

export function checkRateLimit(key: string): { allowed: boolean; remaining: number; lockedUntil?: number } {
  const limits = getRateLimits();
  const now = Date.now();
  const entry = limits[key];

  if (!entry) return { allowed: true, remaining: MAX_ATTEMPTS };

  if (entry.lockedUntil && now < entry.lockedUntil) {
    return { allowed: false, remaining: 0, lockedUntil: entry.lockedUntil };
  }

  if (now - entry.firstAttempt > WINDOW_MS) {
    delete limits[key];
    saveRateLimits(limits);
    return { allowed: true, remaining: MAX_ATTEMPTS };
  }

  if (entry.attempts >= MAX_ATTEMPTS) {
    limits[key] = { ...entry, lockedUntil: now + LOCK_MS };
    saveRateLimits(limits);
    return { allowed: false, remaining: 0, lockedUntil: now + LOCK_MS };
  }

  return { allowed: true, remaining: MAX_ATTEMPTS - entry.attempts };
}

export function recordFailedAttempt(key: string): void {
  const limits = getRateLimits();
  const now = Date.now();
  const entry = limits[key];
  if (!entry || now - entry.firstAttempt > WINDOW_MS) {
    limits[key] = { attempts: 1, firstAttempt: now };
  } else {
    limits[key] = { ...entry, attempts: entry.attempts + 1 };
  }
  saveRateLimits(limits);
}

export function clearRateLimit(key: string): void {
  const limits = getRateLimits();
  delete limits[key];
  saveRateLimits(limits);
}

export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

export function getOrCreateCSRFToken(): string {
  let token = sessionStorage.getItem('tb_csrf');
  if (!token) {
    token = generateCSRFToken();
    sessionStorage.setItem('tb_csrf', token);
  }
  return token;
}
