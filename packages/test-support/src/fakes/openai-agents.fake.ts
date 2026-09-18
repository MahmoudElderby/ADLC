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

export interface OpenAIAgentsGateway {
  createAgent(input: CreateManagedAgentInput): Promise<ManagedAgent>;
  getAgent(agentId: string): Promise<ManagedAgent>;
}

export class FakeOpenAIAgentsGateway implements OpenAIAgentsGateway {
  readonly createdAgents: CreateManagedAgentInput[] = [];

  async createAgent(input: CreateManagedAgentInput): Promise<ManagedAgent> {
    this.createdAgents.push(input);
    return {
      id: `fake_agent_${this.createdAgents.length}`,
      name: input.name,
      model: input.model,
      createdAt: "2026-09-18T00:00:00.000Z",
      responseRedacted: {
        id: `fake_agent_${this.createdAgents.length}`,
        toolCount: input.tools.length,
      },
    };
  }

  async getAgent(agentId: string): Promise<ManagedAgent> {
    return {
      id: agentId,
      name: "Fake agent",
      model: "fake-model",
      createdAt: "2026-09-18T00:00:00.000Z",
      responseRedacted: { id: agentId },
    };
  }
}
