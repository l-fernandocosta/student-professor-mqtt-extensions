import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;

  onModuleInit(): void {
    this.client = new Redis({
      host: process.env.REDIS_HOST ?? "redis",
      port: Number(process.env.REDIS_PORT ?? 6379),
      maxRetriesPerRequest: null
    });

    this.client.on("connect", () => this.logger.log("Redis connected"));
    this.client.on("error", (error) => this.logger.error(`Redis error: ${error.message}`));
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  }

  getClient(): Redis {
    if (!this.client) {
      throw new Error("Redis is not initialized");
    }
    return this.client;
  }
}
