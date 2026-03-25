import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { MqttGatewayService } from "../mqtt/mqtt.service";
import { SendMessageDto } from "./dto/send-message.dto";
import { ChatService } from "./chat.service";

@Controller("chat")
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly mqttGatewayService: MqttGatewayService
  ) {}

  @Post("send")
  async sendMessage(@Body() input: SendMessageDto): Promise<{ accepted: boolean; eventId: string }> {
    const result = await this.chatService.sendMessage(input);
    this.mqttGatewayService.publish(
      `chat/session/${input.sessionId}/deliver`,
      {
        eventId: result.eventId,
        eventType: "CHAT_MESSAGE",
        sessionId: input.sessionId,
        senderId: input.senderId,
        receiverId: input.receiverId,
        payload: { message: input.content },
        timestamp: new Date().toISOString(),
        version: 1
      },
      1
    );
    return result;
  }

  @Get("history")
  async history(
    @Query("sessionId") sessionId: string,
    @Query("limit") limit?: string
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
    return this.chatService.listMessages(sessionId, limit ? Number(limit) : 50);
  }

  @Get("session-state")
  async sessionState(
    @Query("sessionId") sessionId: string
  ): Promise<{ session: Record<string, unknown> | null; events: Array<Record<string, unknown>> }> {
    const [session, events] = await Promise.all([
      this.chatService.getSessionState(sessionId),
      this.chatService.listSessionEvents(sessionId, 50)
    ]);

    return { session, events };
  }
}
