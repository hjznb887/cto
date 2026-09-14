import { describe, it, expect } from 'vitest';
import { hashString, seededUnit, seededRange, seededInt, seededSigned, todayKey, seededBasePrice } from './random';

describe('hashString', () => {
  it('is stable for the same input', () => {
    expect(hashString('AAPL')).toBe(hashString('AAPL'));
  });

  it('differs for different inputs', () => {
    expect(hashString('AAPL')).not.toBe(hashString('MSFT'));
  });

  it('returns an unsigned 32-bit integer', () => {
    const h = hashString('some longer string with symbols !@#$');
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
  });

  it('handles the empty string', () => {
    expect(() => hashString('')).not.toThrow();
  });
});

describe('seededUnit', () => {
  it('is deterministic', () => {
    expect(seededUnit('seed-a')).toBe(seededUnit('seed-a'));
  });

  it('stays within [0, 1)', () => {
    for (let i = 0; i < 200; i++) {
      const v = seededUnit(`seed-${i}`);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('spreads values instead of collapsing to one bucket', () => {
    const values = Array.from({ length: 200 }, (_, i) => seededUnit(`s${i}`));
    const unique = new Set(values);
    // A poor mixer would repeat heavily; require real spread.
    expect(unique.size).toBeGreaterThan(180);
  });

  it('produces different values for near-identical seeds', () => {
    // Guards against a mixer where 'a1' and 'a2' land on adjacent outputs.
    expect(seededUnit('sym:1')).not.toBe(seededUnit('sym:2'));
  });
});

describe('seededRange and friends', () => {
  it('respects the requested bounds', () => {
    for (let i = 0; i < 100; i++) {
      const v = seededRange(`r${i}`, 10, 20);
      expect(v).toBeGreaterThanOrEqual(10);
      expect(v).toBeLessThan(20);
    }
  });

  it('seededInt returns inclusive integers', () => {
    for (let i = 0; i < 100; i++) {
      const v = seededInt(`i${i}`, 1, 5);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(5);
    }
  });

  it('seededSigned stays within [-1, 1)', () => {
    for (let i = 0; i < 100; i++) {
      const v = seededSigned(`n${i}`);
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThan(1);
    }
  });

  it('is deterministic across all helpers', () => {
    expect(seededRange('k', 0, 100)).toBe(seededRange('k', 0, 100));
    expect(seededInt('k', 0, 100)).toBe(seededInt('k', 0, 100));
    expect(seededSigned('k')).toBe(seededSigned('k'));
  });
});

describe('todayKey', () => {
  it('formats as YYYY-MM-DD', () => {
    expect(todayKey(new Date('2026-09-14T15:30:00Z'))).toBe('2026-09-14');
  });

  it('is stable within the same day', () => {
    const a = todayKey(new Date('2026-09-14T00:00:01Z'));
    const b = todayKey(new Date('2026-09-14T23:59:59Z'));
    expect(a).toBe(b);
  });
});

describe('seededBasePrice', () => {
  it('differs between days but is stable within a day', () => {
    const d1 = seededBasePrice('AAPL', 100, '2026-09-14');
    const d1again = seededBasePrice('AAPL', 100, '2026-09-14');
    const d2 = seededBasePrice('AAPL', 100, '2026-09-15');
    expect(d1).toBe(d1again);
    expect(d1).not.toBe(d2);
  });

  it('keeps day-to-day drift small', () => {
    const v = seededBasePrice('AAPL', 100, '2026-09-14');
    expect(Math.abs(v - 100) / 100).toBeLessThan(0.015);
  });
});
