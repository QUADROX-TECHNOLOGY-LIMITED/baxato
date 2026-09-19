import { describe, it, expect } from 'vitest';
import {
  nairaToKobo,
  koboToNaira,
  formatNairaFromKobo,
  safeAddKobo,
  safeSubtractKobo,
} from './currency.js';

describe('Currency Utilities (Kobo & Naira)', () => {
  it('correctly converts Naira to integer Kobo without float drift', () => {
    expect(nairaToKobo(100)).toBe(10000n);
    expect(nairaToKobo(100.5)).toBe(10050n);
    expect(nairaToKobo('250.75')).toBe(25075n);
    expect(nairaToKobo(0)).toBe(0n);
  });

  it('correctly converts Kobo to Naira', () => {
    expect(koboToNaira(10000n)).toBe(100);
    expect(koboToNaira(10050n)).toBe(100.5);
    expect(koboToNaira('25075')).toBe(250.75);
    expect(koboToNaira(0n)).toBe(0);
  });

  it('formats Kobo to Naira standard currency representation', () => {
    const formatted = formatNairaFromKobo(100000n);
    expect(formatted).toMatch(/1,000.00/);
  });

  it('performs safe addition on Kobo integers', () => {
    expect(safeAddKobo(10000n, 5000n)).toBe(15000n);
    expect(safeAddKobo('10000', '5000')).toBe(15000n);
  });

  it('performs safe subtraction on Kobo integers', () => {
    expect(safeSubtractKobo(15000n, 5000n)).toBe(10000n);
  });

  it('throws error on insufficient funds during subtraction', () => {
    expect(() => safeSubtractKobo(5000n, 10000n)).toThrowError(/Insufficient funds/);
  });

  it('throws on invalid negative inputs', () => {
    expect(() => nairaToKobo(-50)).toThrowError(/Invalid Naira amount/);
    expect(() => koboToNaira(-100n)).toThrowError(/Invalid Kobo amount/);
  });
});
