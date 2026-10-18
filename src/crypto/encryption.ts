import type { BackupPayload } from '@/domain/validation';

export interface EncryptedBackupEnvelope {
  format: 'sikamanger-backup';
  version: 1;
  kdf: {
    algorithm: 'PBKDF2';
    hash: 'SHA-256';
    iterations: number;
    salt: string; // base64
  };
  cipher: {
    algorithm: 'AES-GCM';
    iv: string; // base64
    data: string; // base64
  };
  exportedAt: string;
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

export function base64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

const DEFAULT_ITERATIONS = 600_000;

/**
 * Encrypts a full SikaManger backup payload using Web Crypto PBKDF2 (SHA-256, 600,000 iterations)
 * and AES-GCM (256-bit).
 */
export async function encryptBackup(
  payload: BackupPayload,
  passphrase: string
): Promise<string> {
  if (!passphrase || passphrase.trim().length === 0) {
    throw new Error('Passphrase is required for encryption');
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encoder = new TextEncoder();
  const passphraseBytes = encoder.encode(passphrase);

  const baseKey = await crypto.subtle.importKey(
    'raw',
    passphraseBytes,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: DEFAULT_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const plaintext = encoder.encode(JSON.stringify(payload));
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    derivedKey,
    plaintext
  );

  const envelope: EncryptedBackupEnvelope = {
    format: 'sikamanger-backup',
    version: 1,
    kdf: {
      algorithm: 'PBKDF2',
      hash: 'SHA-256',
      iterations: DEFAULT_ITERATIONS,
      salt: uint8ArrayToBase64(salt),
    },
    cipher: {
      algorithm: 'AES-GCM',
      iv: uint8ArrayToBase64(iv),
      data: uint8ArrayToBase64(new Uint8Array(ciphertextBuffer)),
    },
    exportedAt: new Date().toISOString(),
  };

  return JSON.stringify(envelope, null, 2);
}

/**
 * Decrypts a SikaManger backup file string with the given passphrase.
 * Throws a descriptive error if the passphrase is incorrect or format is invalid.
 */
export async function decryptBackup(
  encryptedJsonString: string,
  passphrase: string
): Promise<unknown> {
  if (!passphrase || passphrase.trim().length === 0) {
    throw new Error('Passphrase is required to restore backup');
  }

  let envelope: EncryptedBackupEnvelope;
  try {
    envelope = JSON.parse(encryptedJsonString);
  } catch {
    throw new Error('Invalid backup file format: not valid JSON');
  }

  if (envelope.format !== 'sikamanger-backup') {
    throw new Error('Unsupported file: missing sikamanger-backup signature');
  }

  if (envelope.version !== 1) {
    throw new Error(`Unsupported backup version: ${envelope.version}`);
  }

  const salt = base64ToUint8Array(envelope.kdf.salt);
  const iv = base64ToUint8Array(envelope.cipher.iv);
  const ciphertext = base64ToUint8Array(envelope.cipher.data);
  const iterations = envelope.kdf.iterations || DEFAULT_ITERATIONS;

  const encoder = new TextEncoder();
  const passphraseBytes = encoder.encode(passphrase);

  const baseKey = await crypto.subtle.importKey(
    'raw',
    passphraseBytes,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  try {
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      derivedKey,
      ciphertext
    );

    const decoder = new TextDecoder();
    const jsonStr = decoder.decode(decryptedBuffer);
    return JSON.parse(jsonStr);
  } catch {
    throw new Error('Decryption failed. Please check your passphrase.');
  }
}
