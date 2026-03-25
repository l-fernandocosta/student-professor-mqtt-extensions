import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { verify } from "jsonwebtoken";
import { SessionCacheService } from "./session-cache.service";

type JwtPayload = {
  sub: string;
  role: "teacher" | "student";
  iat?: number;
  exp?: number;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly sessionCacheService: SessionCacheService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ headers?: Record<string, unknown>; user?: JwtPayload }>();
    const header = String(request.headers?.authorization ?? "");
    if (!header.toLowerCase().startsWith("bearer ")) {
      throw new UnauthorizedException("Missing bearer token");
    }

    const token = header.slice("bearer ".length).trim();
    if (!token) throw new UnauthorizedException("Missing bearer token");

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) throw new Error("JWT_SECRET is required");

    let payload: JwtPayload;
    try {
      payload = verify(token, jwtSecret) as JwtPayload;
    } catch {
      throw new UnauthorizedException("Invalid token");
    }

    const session = await this.sessionCacheService.getSession(token);
    if (!session) throw new UnauthorizedException("Expired session");
    if (session.userId !== payload.sub) throw new UnauthorizedException("Invalid session");

    request.user = payload;
    return true;
  }
}

