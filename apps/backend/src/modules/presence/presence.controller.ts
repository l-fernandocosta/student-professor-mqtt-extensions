import { Controller, Get, Param, Post } from "@nestjs/common";
import { PresenceService } from "./presence.service";

@Controller("presence")
export class PresenceController {
  constructor(private readonly presenceService: PresenceService) {}

  @Post("heartbeat/:studentId")
  async heartbeat(
    @Param("studentId") studentId: string
  ): Promise<{ online: boolean; expiresInSeconds: number }> {
    return this.presenceService.heartbeat(studentId);
  }

  @Get("online/:studentId")
  async online(@Param("studentId") studentId: string): Promise<{ online: boolean }> {
    return this.presenceService.isOnline(studentId);
  }

  @Get("online")
  async listOnline(): Promise<{ studentIds: string[] }> {
    return this.presenceService.listOnlineStudents();
  }
}
