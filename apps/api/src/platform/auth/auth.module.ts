import { Module } from "@nestjs/common";
import { ObservabilityGovernanceModule } from "../../modules/observability-governance/observability-governance.module.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";

@Module({
  imports: [ObservabilityGovernanceModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
