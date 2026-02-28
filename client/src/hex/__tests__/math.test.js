import { describe, it, expect } from 'vitest';
import { isPointInHex, tokenBounds } from '../math.js';

describe('isPointInHex', () => {
  // Create a regular hex centered at (100, 100) with size 40, pointy-top
  function makeHex(cx, cy, size, orientation = 'pointy') {
    const vertices = [];
    const startAngle = orientation === 'pointy' ? Math.PI / 2 : 0;
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i + startAngle;
      vertices.push({
        x: cx + size * Math.cos(angle),
        y: cy + size * Math.sin(angle),
      });
    }
    return { id: '0-0', x: cx, y: cy, vertices };
  }

  it('returns true for the center of a hex', () => {
    const hex = makeHex(100, 100, 40);
    expect(isPointInHex(100, 100, hex)).toBe(true);
  });

  it('returns false for a point far outside', () => {
    const hex = makeHex(100, 100, 40);
    expect(isPointInHex(300, 300, hex)).toBe(false);
  });

  it('returns true for a point slightly inside', () => {
    const hex = makeHex(100, 100, 40);
    // 5px from center should definitely be inside
    expect(isPointInHex(105, 100, hex)).toBe(true);
  });

  it('returns false for a point just outside a vertex', () => {
    const hex = makeHex(100, 100, 40);
    // Top vertex of pointy hex is at (100, 140), testing above it
    expect(isPointInHex(100, 142, hex)).toBe(false);
  });

  it('works with flat-top orientation', () => {
    const hex = makeHex(200, 200, 50, 'flat');
    expect(isPointInHex(200, 200, hex)).toBe(true);
    expect(isPointInHex(500, 500, hex)).toBe(false);
  });
});

describe('tokenBounds', () => {
  it('computes bounds with explicit hex size', () => {
    const token = { x: 100, y: 200 };
    const bounds = tokenBounds(token, 40);

    expect(bounds.xMin).toBeCloseTo(84);  // 100 - 40*0.4
    expect(bounds.yMin).toBeCloseTo(184); // 200 - 40*0.4
    expect(bounds.xMax).toBeCloseTo(116); // 100 + 40*0.4
    expect(bounds.yMax).toBeCloseTo(216); // 200 + 40*0.4
  });

  it('centers bounds around token position', () => {
    const token = { x: 0, y: 0 };
    const bounds = tokenBounds(token, 100);

    expect(bounds.xMin).toBe(-40);
    expect(bounds.xMax).toBe(40);
    expect(bounds.yMin).toBe(-40);
    expect(bounds.yMax).toBe(40);
  });
});
