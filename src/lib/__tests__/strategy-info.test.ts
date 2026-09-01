import { describe, expect, it } from 'vitest';
import { STRATEGY_IDS } from '@/lib/engine';
import { POLICY_INFO, STRATEGY_INFO } from '../strategy-info';

describe('strategy-info (shared Phase 5 metadata)', () => {
  it('covers exactly the registered strategy ids', () => {
    expect(Object.keys(STRATEGY_INFO).sort()).toEqual([...STRATEGY_IDS].sort());
  });

  it('provides non-empty name, tag and description for every strategy', () => {
    for (const id of STRATEGY_IDS) {
      const info = STRATEGY_INFO[id];
      expect(info.name.trim().length).toBeGreaterThan(0);
      expect(info.tag.trim().length).toBeGreaterThan(0);
      expect(info.description.trim().length).toBeGreaterThan(0);
    }
  });

  it('describes the two orchestrator policies with full fields', () => {
    expect(POLICY_INFO).toHaveLength(2);
    for (const policy of POLICY_INFO) {
      expect(policy.name.trim().length).toBeGreaterThan(0);
      expect(policy.tag.trim().length).toBeGreaterThan(0);
      expect(policy.description.trim().length).toBeGreaterThan(0);
    }
  });
});
