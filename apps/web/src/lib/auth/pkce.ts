const CODE_VERIFIER_LENGTH = 128;
const STATE_LENGTH = 32;
const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';

const byteToChar = (byte: number): string => CHARSET.charAt(byte % CHARSET.length);

const getCrypto = (): Crypto => {
  if (typeof window === 'undefined' || !window.crypto) {
    throw new Error('Crypto APIs are unavailable in this environment.');
  }
  return window.crypto;
};

export const generateCodeVerifier = (): string => {
  const crypto = getCrypto();
  const randomBytes = new Uint8Array(CODE_VERIFIER_LENGTH);
  crypto.getRandomValues(randomBytes);
  return Array.from(randomBytes, byteToChar).join('');
};

export const generateState = (): string => {
  const crypto = getCrypto();
  const randomBytes = new Uint8Array(STATE_LENGTH);
  crypto.getRandomValues(randomBytes);
  return Array.from(randomBytes, byteToChar).join('');
};

const base64UrlEncode = (arrayBuffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export const generateCodeChallenge = async (verifier: string): Promise<string> => {
  const crypto = getCrypto();
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(digest);
};
