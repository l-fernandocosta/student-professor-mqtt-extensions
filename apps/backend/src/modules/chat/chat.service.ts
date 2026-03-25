import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { ChatMessageAggregate } from "../../domain/chat-message.aggregate";
import { ConversationCacheService } from "../infra/conversation-cache.service";
import { DatabaseService } from "../infra/database.service";
import { SendMessageDto } from "./dto/send-message.dto";

@Injectable()
export class ChatService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly conversationCacheService: ConversationCacheService
  ) {}

  async sendMessage(input: SendMessageDto): Promise<{ accepted: boolean; eventId: string }> {
    const eventId = input.eventId ?? randomUUID();

    new ChatMessageAggregate(
      eventId,
      input.sessionId,
      input.senderId,
      input.receiverId,
      input.content
    );

    const alreadyProcessed = await this.databaseService.query(
      `SELECT event_id FROM idempotency_events WHERE event_id = $1 LIMIT 1`,
      [eventId]
    );
    if (alreadyProcessed.rowCount && alreadyProcessed.rowCount > 0) {
      return { accepted: true, eventId };
    }

    await this.databaseService.query(
      `
        INSERT INTO idempotency_events (event_id, event_type)
        VALUES ($1, $2)
      `,
      [eventId, "CHAT_MESSAGE"]
    );

    await this.databaseService.query(
      `
        INSERT INTO messages (id, event_id, session_id, sender_id, receiver_id, content)
        VALUES ($1, $2, $3::uuid, $4::uuid, $5::uuid, $6)
      `,
      [randomUUID(), eventId, input.sessionId, input.senderId, input.receiverId, input.content]
    );

    await this.conversationCacheService.recordChatMessage({
      sessionId: input.sessionId,
      eventId,
      senderId: input.senderId,
      receiverId: input.receiverId,
      content: input.content,
      createdAt: new Date().toISOString()
    });

    return { accepted: true, eventId };
  }

  async listMessages(
    sessionId: string,
    limit = 50
  ): Promise<
    Array<{
      eventId: string;
      sessionId: string;
      senderId: string;
      receiverId: string;
      content: string;
      createdAt: string;
    }>
  > {
    const safeLimit = Math.min(Math.max(limit, 1), 200);
    const result = await this.databaseService.query<{
      event_id: string;
      session_id: string;
      sender_id: string;
      receiver_id: string;
      content: string;
      created_at: string;
    }>(
      `
        SELECT event_id, session_id, sender_id, receiver_id, content, created_at
        FROM messages
        WHERE session_id = $1::uuid
        ORDER BY created_at DESC
        LIMIT $2
      `,
      [sessionId, safeLimit]
    );

    return result.rows.map((row) => ({
      eventId: row.event_id,
      sessionId: row.session_id,
      senderId: row.sender_id,
      receiverId: row.receiver_id,
      content: row.content,
      createdAt: row.created_at
    }));
  }

  async getSessionState(sessionId: string): Promise<Record<string, unknown> | null> {
    return this.conversationCacheService.getSessionState(sessionId);
  }

  async listSessionEvents(sessionId: string, limit = 50): Promise<Array<Record<string, unknown>>> {
    return this.conversationCacheService.listSessionEvents(sessionId, limit);
  }
}
