import { describe, it, expect } from 'vitest';
import { lineSegmentsIntersect } from '@/lib/cutting-math';

describe('lineSegmentsIntersect', () => {
  it('should detect intersecting perpendicular segments', () => {
    // (0, 1) -> (2, 1) crosses (1, 0) -> (1, 2) at (1, 1)
    const result = lineSegmentsIntersect(0, 1, 2, 1, 1, 0, 1, 2);
    expect(result).toBe(true);
  });

  it('should detect intersecting diagonal segments (X-cross)', () => {
    // (0, 0) -> (100, 100) crosses (0, 100) -> (100, 0)
    const result = lineSegmentsIntersect(0, 0, 100, 100, 0, 100, 100, 0);
    expect(result).toBe(true);
  });

  it('should return false for non-intersecting parallel segments', () => {
    // (0, 0) -> (10, 0) and (0, 5) -> (10, 5)
    const result = lineSegmentsIntersect(0, 0, 10, 0, 0, 5, 10, 5);
    expect(result).toBe(false);
  });

  it('should return false for separated segments', () => {
    // (0, 0) -> (5, 5) and (10, 10) -> (15, 15)
    const result = lineSegmentsIntersect(0, 0, 5, 5, 10, 10, 15, 15);
    expect(result).toBe(false);
  });

  it('should detect when cut line passes through an edge curve approximation', () => {
    // Edge curve segment: (200, 300) -> (250, 310)
    // Slicing drag: (220, 280) -> (225, 350)
    const result = lineSegmentsIntersect(220, 280, 225, 350, 200, 300, 250, 310);
    expect(result).toBe(true);
  });
});
