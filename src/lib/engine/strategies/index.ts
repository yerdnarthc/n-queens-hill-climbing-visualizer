/**
 * Strategy registry — canonical id → implementation.
 */
import type { Strategy, StrategyId } from '../types';
import { firstChoiceStrategy } from './first-choice';
import { minConflictsStrategy } from './min-conflicts';
import { simulatedAnnealingStrategy } from './simulated-annealing';
import { steepestAscentStrategy } from './steepest-ascent';
import { stochasticStrategy } from './stochastic';

export { firstChoiceStrategy } from './first-choice';
export { minConflictsStrategy } from './min-conflicts';
export { simulatedAnnealingStrategy } from './simulated-annealing';
export { steepestAscentStrategy } from './steepest-ascent';
export { stochasticStrategy } from './stochastic';

export const STRATEGIES: Readonly<Record<StrategyId, Strategy>> = {
  'steepest-ascent': steepestAscentStrategy,
  'first-choice': firstChoiceStrategy,
  stochastic: stochasticStrategy,
  'min-conflicts': minConflictsStrategy,
  'simulated-annealing': simulatedAnnealingStrategy,
};

export function getStrategy(id: StrategyId): Strategy {
  return STRATEGIES[id];
}
