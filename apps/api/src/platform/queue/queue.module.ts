import { Global, Module, OnApplicationShutdown } from "@nestjs/common";
import PgBoss from "pg-boss";

export const QUEUE = Symbol("Queue");

@Global()
@Module({
  providers: [
    {
      provide: QUEUE,
      useFactory: async () => {
        const boss = new PgBoss({
          connectionString:
            process.env.DATABASE_URL ?? "postgres://adlc:adlc_dev_password@localhost:5432/adlc",
        });
        await boss.start();
        return boss;
      },
    },
  ],
  exports: [QUEUE],
})
export class QueueModule implements OnApplicationShutdown {
  constructor() {}

  async onApplicationShutdown(): Promise<void> {
    // The queue provider owns the PgBoss lifecycle; Nest disposes process resources on shutdown.
  }
}
