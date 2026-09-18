import { Module } from "@nestjs/common";
import { ConnectorCommandService } from "./connector-command.service.js";

@Module({
  providers: [ConnectorCommandService],
  exports: [ConnectorCommandService],
})
export class ConnectorCommandModule {}
