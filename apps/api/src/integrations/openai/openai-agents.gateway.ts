export type CreateManagedAgentInput = {
  name: string;
  instructions: string;
  model: string;
  tools: ReadonlyArray<Record<string, unknown>>;
  metadata?: Record<string, string>;
};

export type ManagedAgent = {
  id: string;
  name: string;
  model: string;
  createdAt: string;
  responseRedacted: Record<string, unknown>;
};

export const OPENAI_AGENTS_GATEWAY = Symbol("OpenAIAgentsGateway");

export interface OpenAIAgentsGateway {
  createAgent(input: CreateManagedAgentInput): Promise<ManagedAgent>;
  getAgent(agentId: string): Promise<ManagedAgent>;
}
