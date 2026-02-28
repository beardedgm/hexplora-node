import { describe, it, expect, beforeEach } from 'vitest';
import { SpatialHashGrid } from '../spatialIndex.js';

describe('SpatialHashGrid', () => {
  let grid;

  beforeEach(() => {
    grid = new SpatialHashGrid(100);
  });

  it('inserts and queries an object at its point', () => {
    const obj = { id: 1 };
    grid.insert(obj, { xMin: 50, yMin: 50, xMax: 150, yMax: 150 });

    const results = grid.queryPoint(100, 100);
    expect(results).toContain(obj);
  });

  it('returns empty array for empty region', () => {
    const results = grid.queryPoint(500, 500);
    expect(results).toEqual([]);
  });

  it('removes an object', () => {
    const obj = { id: 1 };
    const bounds = { xMin: 0, yMin: 0, xMax: 50, yMax: 50 };
    grid.insert(obj, bounds);
    grid.remove(obj, bounds);

    const results = grid.queryPoint(25, 25);
    expect(results).not.toContain(obj);
  });

  it('updates an object position', () => {
    const obj = { id: 1 };
    const oldBounds = { xMin: 0, yMin: 0, xMax: 50, yMax: 50 };
    const newBounds = { xMin: 200, yMin: 200, xMax: 250, yMax: 250 };

    grid.insert(obj, oldBounds);
    grid.update(obj, oldBounds, newBounds);

    expect(grid.queryPoint(25, 25)).not.toContain(obj);
    expect(grid.queryPoint(225, 225)).toContain(obj);
  });

  it('handles multiple objects in same cell', () => {
    const obj1 = { id: 1 };
    const obj2 = { id: 2 };
    grid.insert(obj1, { xMin: 10, yMin: 10, xMax: 20, yMax: 20 });
    grid.insert(obj2, { xMin: 15, yMin: 15, xMax: 25, yMax: 25 });

    const results = grid.queryPoint(15, 15);
    expect(results).toContain(obj1);
    expect(results).toContain(obj2);
  });

  it('clears all entries', () => {
    grid.insert({ id: 1 }, { xMin: 0, yMin: 0, xMax: 50, yMax: 50 });
    grid.insert({ id: 2 }, { xMin: 100, yMin: 100, xMax: 150, yMax: 150 });
    grid.clear();

    expect(grid.queryPoint(25, 25)).toEqual([]);
    expect(grid.queryPoint(125, 125)).toEqual([]);
  });

  it('handles negative coordinates', () => {
    const obj = { id: 1 };
    grid.insert(obj, { xMin: -150, yMin: -150, xMax: -50, yMax: -50 });

    const results = grid.queryPoint(-100, -100);
    expect(results).toContain(obj);
  });

  it('handles objects spanning multiple cells', () => {
    const obj = { id: 1 };
    // Large bounds spanning several cells
    grid.insert(obj, { xMin: 0, yMin: 0, xMax: 350, yMax: 350 });

    expect(grid.queryPoint(50, 50)).toContain(obj);
    expect(grid.queryPoint(150, 150)).toContain(obj);
    expect(grid.queryPoint(250, 250)).toContain(obj);
  });
});
