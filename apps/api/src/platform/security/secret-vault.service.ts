import { Injectable } from "@nestjs/common";
import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from "node:crypto";

export type EncryptedSecret = {
  ciphertext: string;
  fingerprint: string;
  keyVersion: string;
};

@Injectable()
export class SecretVaultService {
  private readonly algorithm = "aes-256-gcm";
  private readonly keyVersion = "v1";
  private readonly rootKey =
    process.env.SECRET_ENCRYPTION_KEY ?? "development-key-minimum-32-bytes!!";

  encrypt(plaintext: string): EncryptedSecret {
    const iv = randomBytes(12);
    const salt = randomBytes(16);
    const key = this.deriveKey(salt);
    const cipher = createCipheriv(this.algorithm, key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();

    return {
      ciphertext: Buffer.concat([salt, iv, tag, encrypted]).toString("base64"),
      fingerprint: createHash("sha256").update(plaintext).digest("hex").slice(0, 16),
      keyVersion: this.keyVersion,
    };
  }

  decrypt(encrypted: EncryptedSecret): string {
    const payload = Buffer.from(encrypted.ciphertext, "base64");
    const salt = payload.subarray(0, 16);
    const iv = payload.subarray(16, 28);
    const tag = payload.subarray(28, 44);
    const ciphertext = payload.subarray(44);
    const decipher = createDecipheriv(this.algorithm, this.deriveKey(salt), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  }

  readRedacted(encrypted: EncryptedSecret) {
    return {
      fingerprint: encrypted.fingerprint,
      keyVersion: encrypted.keyVersion,
      value: "[REDACTED]",
    };
  }

  private deriveKey(salt: Buffer): Buffer {
    return scryptSync(this.rootKey, salt, 32);
  }
}
