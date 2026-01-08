import type { Operator } from '../models/AlertRule.js';

export const isThresholdBreached = (value: number, operator: Operator, threshold: number) => {
  switch (operator) {
    case '<':
      return value < threshold;
    case '<=':
      return value <= threshold;
    case '>':
      return value > threshold;
    case '>=':
      return value >= threshold;
    default:
      return false;
  }
};
