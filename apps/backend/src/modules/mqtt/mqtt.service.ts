import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { connect, MqttClient } from "mqtt";
import { ChatService } from "../chat/chat.service";
import { PresenceService } from "../presence/presence.service";
import { ScreenshotService } from "../screenshot/screenshot.service";

@Injectable()
export class MqttGatewayService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttGatewayService.name);
  private client: MqttClient | null = null;
  constructor(
    private readonly chatService: ChatService,
    private readonly presenceService: PresenceService,
    private readonly screenshotService: ScreenshotService
  ) {}

  onModuleInit(): void {
    const url = process.env.EMQX_URL ?? "mqtt://emqx:1883";
    this.client = connect(url, {
      reconnectPeriod: 1000
    });

    this.client.on("connect", () => {
      this.logger.log(`MQTT connected: ${url}`);
      this.subscribeTopics();
    });

    this.client.on("error", (error) => {
      this.logger.error(`MQTT error: ${error.message}`);
    });

    this.client.on("message", (topic, payload) => {
      void this.handleMessage(topic, payload.toString());
    });
  }

  onModuleDestroy(): void {
    if (this.client) {
      this.client.end(true);
      this.client = null;
    }
  }

  publish(topic: string, payload: unknown, qos: 0 | 1 | 2 = 1): void {
    if (!this.client) return;
    this.client.publish(topic, JSON.stringify(payload), { qos }, (error) => {
      if (error) this.logger.error(`MQTT publish error on ${topic}: ${error.message}`);
    });
  }

  private subscribeTopics(): void {
    if (!this.client) return;
    const topics: Array<{ topic: string; qos: 0 | 1 }> = [
      { topic: "presence/student/+/heartbeat", qos: 0 },
      { topic: "chat/session/+/send", qos: 1 },
      { topic: "screenshot/response/+", qos: 1 }
    ];

    for (const item of topics) {
      this.client.subscribe(item.topic, { qos: item.qos }, (error) => {
        if (error) {
          this.logger.error(`Failed subscribing to ${item.topic}: ${error.message}`);
          return;
        }
        this.logger.log(`Subscribed: ${item.topic}`);
      });
    }
  }

  private async handleMessage(topic: string, rawPayload: string): Promise<void> {
    try {
      const payload = JSON.parse(rawPayload) as Record<string, unknown>;

      if (topic.startsWith("presence/student/") && topic.endsWith("/heartbeat")) {
        const studentId = topic.split("/")[2];
        await this.presenceService.heartbeat(studentId);
        return;
      }

      if (topic.startsWith("chat/session/") && topic.endsWith("/send")) {
        const sessionId = topic.split("/")[2];
        const senderId = String(payload.senderId ?? "");
        const receiverId = String(payload.receiverId ?? "");
        const eventId = payload.eventId ? String(payload.eventId) : undefined;
        const content = String((payload.payload as { message?: string } | undefined)?.message ?? "");

        const chatResult = await this.chatService.sendMessage({
          eventId,
          sessionId,
          senderId,
          receiverId,
          content
        });

        this.publish(`chat/session/${sessionId}/deliver`, {
          eventId: chatResult.eventId,
          eventType: "CHAT_MESSAGE",
          sessionId,
          senderId,
          receiverId,
          payload: { message: content },
          timestamp: new Date().toISOString(),
          version: 1
        });
        return;
      }

      if (topic.startsWith("screenshot/response/")) {
        const teacherId = topic.split("/")[2];
        const correlationId = String(payload.correlationId ?? "");
        const studentId = String(payload.senderId ?? "");
        const imageBase64 = (payload.payload as { imageBase64?: string } | undefined)?.imageBase64;
        const imageUrl = (payload.payload as { imageUrl?: string } | undefined)?.imageUrl;

        if (!correlationId || !studentId) {
          this.logger.warn("Invalid screenshot response payload");
          return;
        }

        await this.screenshotService.completeScreenshot({
          correlationId,
          teacherId,
          studentId,
          imageBase64,
          imageUrl
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      this.logger.error(`MQTT handle message failed for ${topic}: ${message}`);
    }
  }
}
