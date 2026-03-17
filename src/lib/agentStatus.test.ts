import { describe, expect, it } from 'vitest';
import { ACTIVE_AGENT_STATUS, isActiveAgentStatus } from '@/lib/agentStatus';

describe('isActiveAgentStatus', () => {
  it('returns true only for active status', () => {
    expect(isActiveAgentStatus(ACTIVE_AGENT_STATUS)).toBe(true);
    expect(isActiveAgentStatus('pending_claim')).toBe(false);
    expect(isActiveAgentStatus('suspended')).toBe(false);
    expect(isActiveAgentStatus(undefined)).toBe(false);
  });
});
