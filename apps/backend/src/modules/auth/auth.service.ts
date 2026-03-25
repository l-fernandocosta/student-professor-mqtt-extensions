import { Injectable, UnauthorizedException } from "@nestjs/common";
import { compare, hash } from "bcryptjs";
import { randomUUID } from "crypto";
import { sign } from "jsonwebtoken";
import { DatabaseService } from "../infra/database.service";
import { SessionCacheService } from "./session-cache.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly sessionCacheService: SessionCacheService
  ) {}

  async register(
    email: string,
    password: string,
    role: "teacher" | "student"
  ): Promise<{ userId: string }> {
    const userId = randomUUID();
    const passwordHash = await hash(password, 10);

    await this.databaseService.query(
      `
        INSERT INTO users (id, role, email, password_hash)
        VALUES ($1, $2, $3, $4)
      `,
      [userId, role, email, passwordHash]
    );

    return { userId };
  }

  async login(email: string, password: string): Promise<{ accessToken: string; userId: string }> {
    const result = await this.databaseService.query<{
      id: string;
      role: "teacher" | "student";
      password_hash: string;
    }>(
      `
        SELECT id, role, password_hash
        FROM users
        WHERE email = $1
        LIMIT 1
      `,
      [email]
    );

    const user = result.rows[0];
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isValidPassword = await compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error("JWT_SECRET is required");
    }

    const accessToken = sign({ sub: user.id, role: user.role }, jwtSecret, {
      expiresIn: "1h"
    });

    await this.sessionCacheService.storeToken(accessToken, { userId: user.id, role: user.role });

    return {
      accessToken,
      userId: user.id
    };
  }
}
