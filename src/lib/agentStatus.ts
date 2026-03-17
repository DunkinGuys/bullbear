export const ACTIVE_AGENT_STATUS = 'active';

export type AgentStatus = 'pending_claim' | typeof ACTIVE_AGENT_STATUS | 'suspended';

export function isActiveAgentStatus(
  status: string | null | undefined,
): status is typeof ACTIVE_AGENT_STATUS {
  return status === ACTIVE_AGENT_STATUS;
}
