import { uint8ArrayToBase64, base64ToUint8Array } from './encryption';

const PASSCODE_ITERATIONS = 100_000;

/**
 * Hashes a numeric or alphanumeric passcode using PBKDF2 (SHA-256, 100,000 iterations, 16-byte salt).
 * Returns a serialized string format: `pbkdf2:sha256:100000:<saltBase64>:<hashBase64>`.
 */
export async function hashPasscode(passcode: string): Promise<string> {
  if (!passcode || passcode.length === 0) {
    throw new Error('Passcode cannot be empty');
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const encoder = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passcode),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const hashBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PASSCODE_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    256 // 32 bytes
  );

  const saltB64 = uint8ArrayToBase64(salt);
  const hashB64 = uint8ArrayToBase64(new Uint8Array(hashBits));

  return `pbkdf2:sha256:${PASSCODE_ITERATIONS}:${saltB64}:${hashB64}`;
}

/**
 * Verifies a candidate passcode against a stored PBKDF2 hash string.
 */
export async function verifyPasscode(
  candidatePasscode: string,
  storedHash: string
): Promise<boolean> {
  if (!candidatePasscode || !storedHash) {
    return false;
  }

  const parts = storedHash.split(':');
  if (parts.length !== 5) {
    return false;
  }

  const [prefix, algo, iterStr, saltB64, expectedHashB64] = parts;
  if (prefix !== 'pbkdf2' || algo !== 'sha256' || !saltB64 || !expectedHashB64) {
    return false;
  }

  const iterations = parseInt(iterStr ?? '100000', 10);
  if (isNaN(iterations) || iterations <= 0) {
    return false;
  }

  try {
    const salt = base64ToUint8Array(saltB64);
    const encoder = new TextEncoder();
    const baseKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(candidatePasscode),
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations,
        hash: 'SHA-256',
      },
      baseKey,
      256
    );

    const candidateHashB64 = uint8ArrayToBase64(new Uint8Array(derivedBits));

    // Constant time comparison
    if (candidateHashB64.length !== expectedHashB64.length) {
      return false;
    }

    let diff = 0;
    for (let i = 0; i < candidateHashB64.length; i++) {
      diff |= candidateHashB64.charCodeAt(i) ^ expectedHashB64.charCodeAt(i);
    }

    return diff === 0;
  } catch {
    return false;
  }
}
