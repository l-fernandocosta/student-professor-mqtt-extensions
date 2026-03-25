import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PresenceService } from "../presence/presence.service";
import { MqttGatewayService } from "./mqtt.service";

@Injectable()
export class PresenceRealtimeService implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly presenceService: PresenceService,
    private readonly mqttGatewayService: MqttGatewayService
  ) {}

  onModuleInit(): void {
    // Periodic publish keeps UI realtime even with Redis TTL expiry.
    this.timer = setInterval(() => {
      void this.publishOnline();
    }, 2000);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async publishOnline(): Promise<void> {
    try {
      const result = await this.presenceService.listOnlineStudents();
      this.mqttGatewayService.publish(
        "presence/online",
        {
          eventType: "PRESENCE_ONLINE_LIST",
          version: 1,
          timestamp: new Date().toISOString(),
          payload: { studentIds: result.studentIds }
        },
        0
      );
    } catch {
      // fail-fast is for request paths; background publisher should be resilient
    }
  }
}

