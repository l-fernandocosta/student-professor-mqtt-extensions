import { Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { PresenceService } from "./presence.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@Controller("presence")
export class PresenceController {
  constructor(private readonly presenceService: PresenceService) {}

  @Post("heartbeat/:studentId")
  @UseGuards(JwtAuthGuard)
  async heartbeat(
    @Param("studentId") studentId: string
  ): Promise<{ online: boolean; expiresInSeconds: number }> {
    return this.presenceService.heartbeat(studentId);
  }

  @Get("online/:studentId")
  @UseGuards(JwtAuthGuard)
  async online(@Param("studentId") studentId: string): Promise<{ online: boolean }> {
    return this.presenceService.isOnline(studentId);
  }

  @Get("online")
  @UseGuards(JwtAuthGuard)
  async listOnline(): Promise<{ studentIds: string[] }> {
    return this.presenceService.listOnlineStudents();
  }
}
