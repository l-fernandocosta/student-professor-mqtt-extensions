import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { ConversationCacheService } from "../infra/conversation-cache.service";
import { DatabaseService } from "../infra/database.service";
import { RedisService } from "../infra/redis.service";
import { S3StorageService } from "../infra/s3-storage.service";

@Injectable()
export class ScreenshotService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly redisService: RedisService,
    private readonly s3StorageService: S3StorageService,
    private readonly conversationCacheService: ConversationCacheService
  ) {}

  requestScreenshot(
    teacherId: string,
    studentId: string
  ): Promise<{ accepted: boolean; correlationId: string; timeoutSeconds: number }> {
    return this.requestAndPersist(teacherId, studentId);
  }

  private async requestAndPersist(
    teacherId: string,
    studentId: string
  ): Promise<{ accepted: boolean; correlationId: string; timeoutSeconds: number }> {
    const rateLimitKey = `ratelimit:screenshot:${teacherId}`;
    const rateLimitCount = await this.redisService.getClient().incr(rateLimitKey);
    if (rateLimitCount === 1) {
      await this.redisService.getClient().expire(rateLimitKey, 10);
    }
    if (rateLimitCount > 5) {
      throw new Error("Rate limit exceeded for screenshot requests");
    }

    const requestId = randomUUID();
    const correlationId = randomUUID();

    await this.databaseService.query(
      `
        INSERT INTO screenshots (id, request_id, correlation_id, teacher_id, student_id, status)
        VALUES ($1, $2, $3, $4::uuid, $5::uuid, $6)
      `,
      [randomUUID(), requestId, correlationId, teacherId, studentId, "requested"]
    );

    await this.conversationCacheService.recordScreenshotRequest({
      teacherId,
      studentId,
      correlationId,
      requestedAt: new Date().toISOString()
    });

    return {
      accepted: true,
      correlationId,
      timeoutSeconds: 8
    };
  }

  async completeScreenshot(input: {
    correlationId: string;
    teacherId: string;
    studentId: string;
    imageBase64?: string;
    imageUrl?: string;
  }): Promise<{ updated: boolean }> {
    let storageUrl = input.imageUrl ?? null;
    if (!storageUrl && input.imageBase64) {
      storageUrl = await this.s3StorageService.uploadBase64Png(input.imageBase64);
    }

    await this.databaseService.query(
      `
        UPDATE screenshots
        SET
          status = 'completed',
          image_base64 = COALESCE($4, image_base64),
          storage_url = COALESCE($5, storage_url),
          captured_at = NOW()
        WHERE correlation_id = $1::uuid
          AND teacher_id = $2::uuid
          AND student_id = $3::uuid
      `,
      [input.correlationId, input.teacherId, input.studentId, input.imageBase64 ?? null, storageUrl]
    );

    await this.conversationCacheService.recordScreenshotResponse({
      teacherId: input.teacherId,
      studentId: input.studentId,
      correlationId: input.correlationId,
      contentType: input.contentType ?? "image/png",
      imageUrl: storageUrl ?? undefined,
      capturedAt: new Date().toISOString()
    });

    return { updated: true };
  }

  async listScreenshots(
    teacherId: string,
    limit = 50
  ): Promise<
    Array<{
      correlationId: string | null;
      teacherId: string;
      studentId: string;
      status: string;
      storageUrl: string | null;
      capturedAt: string | null;
      createdAt: string;
    }>
  > {
    const safeLimit = Math.min(Math.max(limit, 1), 200);
    const result = await this.databaseService.query<{
      correlation_id: string | null;
      teacher_id: string;
      student_id: string;
      status: string;
      storage_url: string | null;
      captured_at: string | null;
      created_at: string;
    }>(
      `
        SELECT correlation_id, teacher_id, student_id, status, storage_url, captured_at, created_at
        FROM screenshots
        WHERE teacher_id = $1::uuid
        ORDER BY created_at DESC
        LIMIT $2
      `,
      [teacherId, safeLimit]
    );

    return result.rows.map((row) => ({
      correlationId: row.correlation_id,
      teacherId: row.teacher_id,
      studentId: row.student_id,
      status: row.status,
      storageUrl: row.storage_url,
      capturedAt: row.captured_at,
      createdAt: row.created_at
    }));
  }

  async listPendingForStudent(
    studentId: string,
    limit = 20
  ): Promise<
    Array<{
      correlationId: string;
      teacherId: string;
      studentId: string;
      requestedAt: string;
    }>
  > {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const result = await this.databaseService.query<{
      correlation_id: string;
      teacher_id: string;
      student_id: string;
      created_at: string;
    }>(
      `
        SELECT correlation_id, teacher_id, student_id, created_at
        FROM screenshots
        WHERE student_id = $1::uuid
          AND status = 'requested'
        ORDER BY created_at DESC
        LIMIT $2
      `,
      [studentId, safeLimit]
    );

    return result.rows.map((row) => ({
      correlationId: row.correlation_id,
      teacherId: row.teacher_id,
      studentId: row.student_id,
      requestedAt: row.created_at
    }));
  }
}
