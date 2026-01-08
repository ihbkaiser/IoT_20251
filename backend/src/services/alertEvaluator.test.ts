import { isThresholdBreached } from './alertEvaluator.js';

describe('isThresholdBreached', () => {
  it('handles greater-than comparisons', () => {
    expect(isThresholdBreached(80, '>', 70)).toBe(true);
    expect(isThresholdBreached(60, '>', 70)).toBe(false);
  });

  it('handles less-than comparisons', () => {
    expect(isThresholdBreached(85, '<', 90)).toBe(true);
    expect(isThresholdBreached(95, '<', 90)).toBe(false);
  });
});
