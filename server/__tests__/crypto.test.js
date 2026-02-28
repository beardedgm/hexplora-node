import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { encrypt, decrypt } from '../util/crypto.js';

describe('encrypt / decrypt', () => {
  const originalKey = process.env.ENCRYPTION_KEY;

  beforeEach(() => {
    // 64 hex chars = 32 bytes
    process.env.ENCRYPTION_KEY = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2';
  });

  afterEach(() => {
    if (originalKey !== undefined) {
      process.env.ENCRYPTION_KEY = originalKey;
    } else {
      delete process.env.ENCRYPTION_KEY;
    }
  });

  it('encrypts and decrypts a string round-trip', () => {
    const original = 'my-secret-patreon-token-12345';
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);

    expect(decrypted).toBe(original);
  });

  it('returns null for null input', () => {
    expect(encrypt(null)).toBeNull();
    expect(decrypt(null)).toBeNull();
  });

  it('returns null for empty string on encrypt', () => {
    expect(encrypt('')).toBeNull();
  });

  it('produces different ciphertext for same plaintext (random IV)', () => {
    const text = 'same-text';
    const a = encrypt(text);
    const b = encrypt(text);
    expect(a).not.toBe(b);
  });

  it('encrypted string contains three colon-separated parts', () => {
    const encrypted = encrypt('test');
    const parts = encrypted.split(':');
    expect(parts).toHaveLength(3);
    // IV (32 hex chars), auth tag (32 hex chars), ciphertext
    expect(parts[0]).toHaveLength(32);
    expect(parts[1]).toHaveLength(32);
    expect(parts[2].length).toBeGreaterThan(0);
  });

  it('passes through unencrypted strings in decrypt (backward compat)', () => {
    // Old plaintext tokens without colons should be returned as-is
    const plaintext = 'old_plaintext_token_no_colons';
    expect(decrypt(plaintext)).toBe(plaintext);
  });

  it('throws on tampered ciphertext', () => {
    const encrypted = encrypt('secret');
    const parts = encrypted.split(':');
    // Corrupt the ciphertext
    parts[2] = 'ff' + parts[2].slice(2);
    const tampered = parts.join(':');

    expect(() => decrypt(tampered)).toThrow();
  });
});

describe('encrypt / decrypt key validation', () => {
  const originalKey = process.env.ENCRYPTION_KEY;

  afterEach(() => {
    if (originalKey !== undefined) {
      process.env.ENCRYPTION_KEY = originalKey;
    } else {
      delete process.env.ENCRYPTION_KEY;
    }
  });

  it('throws if ENCRYPTION_KEY is missing', () => {
    delete process.env.ENCRYPTION_KEY;
    expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY');
  });

  it('throws if ENCRYPTION_KEY is wrong length', () => {
    process.env.ENCRYPTION_KEY = 'too-short';
    expect(() => encrypt('test')).toThrow();
  });

  it('accepts 32-char ASCII key', () => {
    process.env.ENCRYPTION_KEY = 'abcdefghijklmnopqrstuvwxyz012345';
    const encrypted = encrypt('test');
    expect(decrypt(encrypted)).toBe('test');
  });
});
