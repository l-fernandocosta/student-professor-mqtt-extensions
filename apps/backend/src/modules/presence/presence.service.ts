import { Injectable } from "@nestjs/common";
import { RedisService } from "../infra/redis.service";

@Injectable()
export class PresenceService {
  private readonly ttlSeconds = 30;
  constructor(private readonly redisService: RedisService) {}

  async heartbeat(studentId: string): Promise<{ online: boolean; expiresInSeconds: number }> {
    const key = this.getPresenceKey(studentId);
    await this.redisService.getClient().set(key, "1", "EX", this.ttlSeconds);
    return { online: true, expiresInSeconds: this.ttlSeconds };
  }

  async isOnline(studentId: string): Promise<{ online: boolean }> {
    const key = this.getPresenceKey(studentId);
    const exists = await this.redisService.getClient().exists(key);
    return { online: exists === 1 };
  }

  async listOnlineStudents(): Promise<{ studentIds: string[] }> {
    const keys = await this.redisService.getClient().keys("presence:student:*");
    const studentIds = keys.map((key) => key.replace("presence:student:", ""));
    return { studentIds };
  }

  private getPresenceKey(studentId: string): string {
    return `presence:student:${studentId}`;
  }
}
