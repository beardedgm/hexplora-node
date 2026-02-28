import { describe, it, expect } from 'vitest';
import { screenToWorld } from '../coordinates.js';

describe('screenToWorld', () => {
  it('converts screen to world coords at zoom 1 with no pan', () => {
    const result = screenToWorld(100, 200, 0, 0, 1);
    expect(result.x).toBe(100);
    expect(result.y).toBe(200);
  });

  it('accounts for pan offset', () => {
    const result = screenToWorld(150, 250, 50, 50, 1);
    expect(result.x).toBe(100);
    expect(result.y).toBe(200);
  });

  it('accounts for zoom level', () => {
    const result = screenToWorld(200, 400, 0, 0, 2);
    expect(result.x).toBe(100);
    expect(result.y).toBe(200);
  });

  it('handles combined pan and zoom', () => {
    // screen(300, 500), pan(100, 100), zoom(2)
    // world = (300 - 100) / 2 = 100, (500 - 100) / 2 = 200
    const result = screenToWorld(300, 500, 100, 100, 2);
    expect(result.x).toBe(100);
    expect(result.y).toBe(200);
  });

  it('handles fractional zoom', () => {
    const result = screenToWorld(50, 100, 0, 0, 0.5);
    expect(result.x).toBe(100);
    expect(result.y).toBe(200);
  });

  it('handles negative pan', () => {
    const result = screenToWorld(50, 150, -50, -50, 1);
    expect(result.x).toBe(100);
    expect(result.y).toBe(200);
  });
});
