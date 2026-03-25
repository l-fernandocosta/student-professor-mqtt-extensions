import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Pool, QueryResult, QueryResultRow } from "pg";

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: Pool | null = null;

  async onModuleInit(): Promise<void> {
    this.pool = new Pool({
      host: process.env.POSTGRES_HOST ?? "postgres",
      port: Number(process.env.POSTGRES_PORT ?? 5432),
      user: process.env.POSTGRES_USER ?? "postgres",
      password: process.env.POSTGRES_PASSWORD ?? "postgres",
      database: process.env.POSTGRES_DB ?? "inicie"
    });

    await this.ensureSchema();
    this.logger.log("PostgreSQL connected and schema ensured");
  }

  async onModuleDestroy(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  async query<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    values: unknown[] = []
  ): Promise<QueryResult<T>> {
    if (!this.pool) {
      throw new Error("Database is not initialized");
    }
    return this.pool.query<T>(sql, values);
  }

  private async ensureSchema(): Promise<void> {
    await this.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        role VARCHAR(20) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await this.query(`
      CREATE TABLE IF NOT EXISTS idempotency_events (
        event_id UUID PRIMARY KEY,
        event_type VARCHAR(50) NOT NULL,
        processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await this.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY,
        event_id UUID UNIQUE NOT NULL,
        session_id UUID NOT NULL,
        sender_id UUID NOT NULL,
        receiver_id UUID NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await this.query(`
      CREATE TABLE IF NOT EXISTS screenshots (
        id UUID PRIMARY KEY,
        request_id UUID UNIQUE NOT NULL,
        correlation_id UUID UNIQUE,
        teacher_id UUID NOT NULL,
        student_id UUID NOT NULL,
        status VARCHAR(20) NOT NULL,
        storage_url TEXT,
        image_base64 TEXT,
        captured_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await this.query(`
      ALTER TABLE screenshots
      ADD COLUMN IF NOT EXISTS correlation_id UUID UNIQUE;
    `);

    await this.query(`
      ALTER TABLE screenshots
      ADD COLUMN IF NOT EXISTS image_base64 TEXT;
    `);
  }
}
