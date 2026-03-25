import { Injectable } from "@nestjs/common";
import { createHash } from "crypto";
import { RedisService } from "../infra/redis.service";

type CachedSession = {
  userId: string;
  role: "teacher" | "student";
};

@Injectable()
export class SessionCacheService {
  private readonly prefix = "session:token:";
  private readonly ttlSeconds = 60 * 60; // 1h (matches JWT exp)

  constructor(private readonly redisService: RedisService) {}

  async storeToken(accessToken: string, session: CachedSession): Promise<void> {
    const key = this.getTokenKey(accessToken);
    await this.redisService
      .getClient()
      .set(key, JSON.stringify(session), "EX", this.ttlSeconds);
  }

  async getSession(accessToken: string): Promise<CachedSession | null> {
    const key = this.getTokenKey(accessToken);
    const raw = await this.redisService.getClient().get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as CachedSession;
    } catch {
      return null;
    }
  }

  private getTokenKey(accessToken: string): string {
    const digest = createHash("sha256").update(accessToken).digest("hex");
    return `${this.prefix}${digest}`;
  }
}

