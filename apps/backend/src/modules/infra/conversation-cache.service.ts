import { Injectable } from "@nestjs/common";
import { RedisService } from "./redis.service";

type ChatCacheInput = {
  sessionId: string;
  eventId: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
};

type ScreenshotRequestInput = {
  teacherId: string;
  studentId: string;
  correlationId: string;
  requestedAt: string;
};

type ScreenshotResponseInput = {
  teacherId: string;
  studentId: string;
  correlationId: string;
  contentType: string;
  imageUrl?: string;
  capturedAt: string;
};

@Injectable()
export class ConversationCacheService {
  private readonly sessionTtlSeconds = 60 * 60 * 24; // 24h
  private readonly eventTtlSeconds = 60 * 60 * 24; // 24h
  private readonly maxEvents = 100;

  constructor(private readonly redisService: RedisService) {}

  async recordChatMessage(input: ChatCacheInput): Promise<void> {
    const redis = this.redisService.getClient();
    const pairKey = this.getPairKey(input.senderId, input.receiverId);
    const sessionKey = this.getSessionKey(input.sessionId);
    const eventsKey = this.getEventsKey(input.sessionId);

    const currentRaw = await redis.get(sessionKey);
    const current = currentRaw ? (JSON.parse(currentRaw) as Record<string, unknown>) : {};
    const currentCounters = (current.counters as Record<string, unknown> | undefined) ?? {};

    const next = {
      sessionId: input.sessionId,
      participants: {
        senderId: input.senderId,
        receiverId: input.receiverId
      },
      counters: {
        messageCount: Number(currentCounters.messageCount ?? 0) + 1
      },
      lastMessage: {
        eventId: input.eventId,
        senderId: input.senderId,
        receiverId: input.receiverId,
        content: input.content,
        createdAt: input.createdAt
      },
      lastScreenshot: (current.lastScreenshot as Record<string, unknown>) ?? null,
      createdAt: (current.createdAt as string) ?? input.createdAt,
      updatedAt: input.createdAt
    };

    const eventItem = JSON.stringify({
      type: "CHAT_MESSAGE",
      eventId: input.eventId,
      senderId: input.senderId,
      receiverId: input.receiverId,
      content: input.content,
      createdAt: input.createdAt
    });

    const pipeline = redis.multi();
    pipeline.set(sessionKey, JSON.stringify(next), "EX", this.sessionTtlSeconds);
    pipeline.set(pairKey, input.sessionId, "EX", this.sessionTtlSeconds);
    pipeline.lpush(eventsKey, eventItem);
    pipeline.ltrim(eventsKey, 0, this.maxEvents - 1);
    pipeline.expire(eventsKey, this.eventTtlSeconds);
    await pipeline.exec();
  }

  async recordScreenshotRequest(input: ScreenshotRequestInput): Promise<void> {
    const redis = this.redisService.getClient();
    const pairKey = this.getPairKey(input.teacherId, input.studentId);
    const sessionId = await redis.get(pairKey);
    if (!sessionId) return;

    const sessionKey = this.getSessionKey(sessionId);
    const eventsKey = this.getEventsKey(sessionId);
    const currentRaw = await redis.get(sessionKey);
    const current = currentRaw ? (JSON.parse(currentRaw) as Record<string, unknown>) : {};

    const next = {
      sessionId,
      participants:
        (current.participants as Record<string, unknown>) ?? {
          senderId: input.teacherId,
          receiverId: input.studentId
        },
      counters: (current.counters as Record<string, unknown>) ?? { messageCount: 0 },
      lastMessage: (current.lastMessage as Record<string, unknown>) ?? null,
      lastScreenshot: {
        status: "requested",
        correlationId: input.correlationId,
        requestedAt: input.requestedAt
      },
      createdAt: (current.createdAt as string) ?? input.requestedAt,
      updatedAt: input.requestedAt
    };

    const eventItem = JSON.stringify({
      type: "SCREENSHOT_REQUEST",
      correlationId: input.correlationId,
      teacherId: input.teacherId,
      studentId: input.studentId,
      requestedAt: input.requestedAt
    });

    const pipeline = redis.multi();
    pipeline.set(sessionKey, JSON.stringify(next), "EX", this.sessionTtlSeconds);
    pipeline.lpush(eventsKey, eventItem);
    pipeline.ltrim(eventsKey, 0, this.maxEvents - 1);
    pipeline.expire(eventsKey, this.eventTtlSeconds);
    await pipeline.exec();
  }

  async recordScreenshotResponse(input: ScreenshotResponseInput): Promise<void> {
    const redis = this.redisService.getClient();
    const pairKey = this.getPairKey(input.teacherId, input.studentId);
    const sessionId = await redis.get(pairKey);
    if (!sessionId) return;

    const sessionKey = this.getSessionKey(sessionId);
    const eventsKey = this.getEventsKey(sessionId);
    const currentRaw = await redis.get(sessionKey);
    const current = currentRaw ? (JSON.parse(currentRaw) as Record<string, unknown>) : {};

    const next = {
      sessionId,
      participants:
        (current.participants as Record<string, unknown>) ?? {
          senderId: input.teacherId,
          receiverId: input.studentId
        },
      counters: (current.counters as Record<string, unknown>) ?? { messageCount: 0 },
      lastMessage: (current.lastMessage as Record<string, unknown>) ?? null,
      lastScreenshot: {
        status: "completed",
        correlationId: input.correlationId,
        contentType: input.contentType,
        imageUrl: input.imageUrl ?? null,
        capturedAt: input.capturedAt
      },
      createdAt: (current.createdAt as string) ?? input.capturedAt,
      updatedAt: input.capturedAt
    };

    const eventItem = JSON.stringify({
      type: "SCREENSHOT_RESPONSE",
      correlationId: input.correlationId,
      teacherId: input.teacherId,
      studentId: input.studentId,
      contentType: input.contentType,
      imageUrl: input.imageUrl ?? null,
      capturedAt: input.capturedAt
    });

    const pipeline = redis.multi();
    pipeline.set(sessionKey, JSON.stringify(next), "EX", this.sessionTtlSeconds);
    pipeline.lpush(eventsKey, eventItem);
    pipeline.ltrim(eventsKey, 0, this.maxEvents - 1);
    pipeline.expire(eventsKey, this.eventTtlSeconds);
    await pipeline.exec();
  }

  async getSessionState(sessionId: string): Promise<Record<string, unknown> | null> {
    const value = await this.redisService.getClient().get(this.getSessionKey(sessionId));
    return value ? (JSON.parse(value) as Record<string, unknown>) : null;
  }

  async listSessionEvents(sessionId: string, limit = 50): Promise<Array<Record<string, unknown>>> {
    const safeLimit = Math.min(Math.max(limit, 1), this.maxEvents);
    const rows = await this.redisService.getClient().lrange(this.getEventsKey(sessionId), 0, safeLimit - 1);
    return rows.map((row) => JSON.parse(row) as Record<string, unknown>);
  }

  private getSessionKey(sessionId: string): string {
    return `conversation:session:${sessionId}`;
  }

  private getEventsKey(sessionId: string): string {
    return `conversation:session:${sessionId}:events`;
  }

  private getPairKey(userIdA: string, userIdB: string): string {
    const [first, second] = [userIdA, userIdB].sort();
    return `conversation:pair:${first}:${second}:session`;
  }
}
