import { Module } from "@nestjs/common";
import { AgentAttachmentQuery } from "./agent-attachment.query.js";

@Module({
  providers: [AgentAttachmentQuery],
  exports: [AgentAttachmentQuery],
})
export class AgentAttachmentQueryModule {}
