import { Global, Module } from "@nestjs/common";
import { RedactionService } from "./redaction.service.js";
import { SecretVaultService } from "./secret-vault.service.js";

@Global()
@Module({
  providers: [RedactionService, SecretVaultService],
  exports: [RedactionService, SecretVaultService],
})
export class PlatformSecurityModule {}
