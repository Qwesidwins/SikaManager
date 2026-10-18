import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';

// Ensure crypto.subtle is available in test environment
if (typeof window !== 'undefined' && !window.crypto) {
  // @ts-expect-error fallback assignment
  window.crypto = {};
}
if (typeof window !== 'undefined' && window.crypto && !window.crypto.subtle) {
  const { webcrypto } = await import('node:crypto');
  // @ts-expect-error test shim
  window.crypto.subtle = webcrypto.subtle;
  // @ts-expect-error test shim
  window.crypto.getRandomValues = webcrypto.getRandomValues.bind(webcrypto);
}
