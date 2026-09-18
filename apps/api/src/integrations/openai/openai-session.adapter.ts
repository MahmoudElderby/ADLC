import { Injectable } from "@nestjs/common";
import type { CapabilityAttachment } from "@adlc/contracts";

export type OpenAISessionRequest = {
  agentId: string;
  model: string;
  instructions: string;
  approvalMode: "always_allow";
  capabilities: CapabilityAttachment[];
  input: string;
};

export type OpenAISessionResult = {
  sessionId: string;
  environmentId: string;
  remoteUrl: string;
  responseRedacted: Record<string, unknown>;
};

@Injectable()
export class OpenAISessionAdapter {
  async createSession(request: OpenAISessionRequest): Promise<OpenAISessionResult> {
    return {
      sessionId: `openai_session_${request.agentId}`,
      environmentId: `openai_environment_${request.agentId}`,
      remoteUrl: `wss://session.openai.example.test/${request.agentId}`,
      responseRedacted: {
        sessionId: `openai_session_${request.agentId}`,
        environmentId: `openai_environment_${request.agentId}`,
        approvalMode: request.approvalMode,
      },
    };
  }
}
