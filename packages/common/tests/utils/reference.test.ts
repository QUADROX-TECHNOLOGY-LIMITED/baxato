import { describe, it, expect } from 'vitest';
import {
  generateNumericReference,
  generateTransactionReference,
  generateEntityId,
} from '../../src/utils/reference.js';

describe('Reference Generation Utilities', () => {
  it('generates a 20-digit numeric reference starting with prefix 2411', () => {
    const ref = generateNumericReference('2411');
    expect(ref).toHaveLength(20);
    expect(ref.startsWith('2411')).toBe(true);
    expect(/^\d{20}$/.test(ref)).toBe(true);
  });

  it('allows custom reference length (e.g. 12 digits)', () => {
    const ref12 = generateNumericReference('2411', 12);
    expect(ref12).toHaveLength(12);
    expect(ref12.startsWith('2411')).toBe(true);
  });

  it('throws error if reference prefix is not 4 digits', () => {
    expect(() => generateNumericReference('12')).toThrow();
    expect(() => generateNumericReference('12345')).toThrow();
  });

  it('generates unique transaction references with BAX prefix', () => {
    const ref1 = generateTransactionReference('AIR');
    const ref2 = generateTransactionReference('AIR');
    expect(ref1.startsWith('BAX_AIR_')).toBe(true);
    expect(ref1).not.toBe(ref2);
  });

  it('generates unique entity IDs with custom prefix', () => {
    const id1 = generateEntityId('usr');
    const id2 = generateEntityId('usr');
    expect(id1.startsWith('usr_')).toBe(true);
    expect(id1).not.toBe(id2);
  });
});
