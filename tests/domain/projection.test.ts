import { describe, it, expect } from 'vitest';
import { savingsProjection } from '@/domain/projection';

describe('Domain: Savings Projection', () => {
  it('computes compound interest with zero hidden assumptions', () => {
    // Principal: 1000.00 (100000 minor)
    // Monthly contribution: 100.00 (10000 minor)
    // Annual rate: 12% (1% per month)
    // Months: 3
    // Month 1: 1000 * 1.01 + 100 = 1010 + 100 = 1110
    // Month 2: 1110 * 1.01 + 100 = 1121.10 + 100 = 1221.10
    // Month 3: 1221.10 * 1.01 + 100 = 1233.311 + 100 = 1333.31 (133331 minor)
    const res = savingsProjection(100000, 10000, 12, 3);

    expect(res.totalContributionsMinor).toBe(130000); // 1000 + 3 * 100
    expect(res.finalBalanceMinor).toBe(133331);
    expect(res.totalInterestMinor).toBe(3331); // 133331 - 130000
    expect(res.schedule).toHaveLength(3);
    expect(res.schedule[0]?.month).toBe(1);
    expect(res.schedule[2]?.month).toBe(3);
  });

  it('handles 0% interest rate as a simple linear accumulator', () => {
    const res = savingsProjection(50000, 10000, 0, 6);
    // 500 + 6 * 100 = 1100.00 (110000 minor)
    expect(res.finalBalanceMinor).toBe(110000);
    expect(res.totalContributionsMinor).toBe(110000);
    expect(res.totalInterestMinor).toBe(0);
  });

  it('handles 0 months cleanly', () => {
    const res = savingsProjection(50000, 10000, 10, 0);
    expect(res.finalBalanceMinor).toBe(50000);
    expect(res.schedule).toHaveLength(0);
  });
});

