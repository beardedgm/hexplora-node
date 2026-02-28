import { describe, it, expect } from 'vitest';
import { deserializeTokens } from '../serialization.js';

describe('deserializeTokens', () => {
  it('returns null for null input', () => {
    expect(deserializeTokens(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(deserializeTokens(undefined)).toBeNull();
  });

  it('deserializes a minimal token', () => {
    const input = [{ x: 10, y: 20 }];
    const result = deserializeTokens(input);

    expect(result).toHaveLength(1);
    expect(result[0].x).toBe(10);
    expect(result[0].y).toBe(20);
    expect(result[0].label).toBe('');
    expect(result[0].icon).toBe('');
    expect(result[0].notes).toBe('');
    expect(result[0].color).toBeUndefined(); // no default color provided
    expect(result[0].zIndex).toBe(1); // idx + 1 for first element
  });

  it('preserves existing fields', () => {
    const input = [{
      x: 100, y: 200, color: '#00FF00', label: 'Boss',
      icon: 'skull', notes: 'Big bad', zIndex: 5,
    }];
    const result = deserializeTokens(input);

    expect(result[0]).toEqual({
      x: 100, y: 200, color: '#00FF00', label: 'Boss',
      icon: 'skull', notes: 'Big bad', zIndex: 5,
    });
  });

  it('assigns sequential zIndex when missing', () => {
    const input = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 2 },
    ];
    const result = deserializeTokens(input);

    expect(result[0].zIndex).toBe(1);
    expect(result[1].zIndex).toBe(2);
    expect(result[2].zIndex).toBe(3);
  });

  it('handles empty array', () => {
    const result = deserializeTokens([]);
    expect(result).toEqual([]);
  });
});
