import { Injectable } from "@nestjs/common";
import type {
  CreateManagedAgentInput,
  ManagedAgent,
  OpenAIAgentsGateway,
} from "./openai-agents.gateway.js";

@Injectable()
export class OpenAIAgentsAdapter implements OpenAIAgentsGateway {
  async createAgent(input: CreateManagedAgentInput): Promise<ManagedAgent> {
    return {
      id: `openai_agent_${crypto.randomUUID()}`,
      name: input.name,
      model: input.model,
      createdAt: new Date().toISOString(),
      responseRedacted: {
        id: "managed-by-openai",
        model: input.model,
        toolCount: input.tools.length,
      },
    };
  }

  async getAgent(agentId: string): Promise<ManagedAgent> {
    return {
      id: agentId,
      name: "OpenAI managed agent",
      model: "unknown",
      createdAt: new Date().toISOString(),
      responseRedacted: { id: agentId },
    };
  }
}
