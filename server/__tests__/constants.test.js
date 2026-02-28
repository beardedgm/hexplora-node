import { describe, it, expect } from 'vitest';
import {
  JWT_EXPIRY,
  PASSWORD_MIN_LENGTH,
  FREE_MAP_LIMIT,
  PATRON_MAP_LIMIT,
  MAX_TOKENS_PER_MAP,
  MAX_REVEALED_HEXES,
  BODY_SIZE_LIMIT,
} from '../config/constants.js';

describe('server constants', () => {
  it('JWT_EXPIRY is a non-empty string', () => {
    expect(typeof JWT_EXPIRY).toBe('string');
    expect(JWT_EXPIRY.length).toBeGreaterThan(0);
  });

  it('PASSWORD_MIN_LENGTH is at least 8', () => {
    expect(PASSWORD_MIN_LENGTH).toBeGreaterThanOrEqual(8);
  });

  it('PATRON_MAP_LIMIT exceeds FREE_MAP_LIMIT', () => {
    expect(PATRON_MAP_LIMIT).toBeGreaterThan(FREE_MAP_LIMIT);
  });

  it('MAX_TOKENS_PER_MAP is a reasonable positive number', () => {
    expect(MAX_TOKENS_PER_MAP).toBeGreaterThan(0);
    expect(MAX_TOKENS_PER_MAP).toBeLessThanOrEqual(10000);
  });

  it('MAX_REVEALED_HEXES is a reasonable positive number', () => {
    expect(MAX_REVEALED_HEXES).toBeGreaterThan(0);
  });

  it('BODY_SIZE_LIMIT is a string ending in mb', () => {
    expect(BODY_SIZE_LIMIT).toMatch(/\d+mb$/);
  });
});
