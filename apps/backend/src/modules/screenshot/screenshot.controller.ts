import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { randomUUID } from "crypto";
import { MqttGatewayService } from "../mqtt/mqtt.service";
import { RequestScreenshotDto } from "./dto/request-screenshot.dto";
import { ScreenshotResponseDto } from "./dto/screenshot-response.dto";
import { ScreenshotService } from "./screenshot.service";

@Controller("screenshot")
export class ScreenshotController {
  constructor(
    private readonly screenshotService: ScreenshotService,
    private readonly mqttGatewayService: MqttGatewayService
  ) {}

  @Post("request")
  async request(
    @Body() input: RequestScreenshotDto
  ): Promise<{ accepted: boolean; correlationId: string; timeoutSeconds: number }> {
    const result = await this.screenshotService.requestScreenshot(input.teacherId, input.studentId);
    this.mqttGatewayService.publish(
      `screenshot/request/${input.studentId}`,
      {
        eventId: randomUUID(),
        eventType: "SCREENSHOT_REQUEST",
        version: 1,
        timestamp: new Date().toISOString(),
        senderId: input.teacherId,
        receiverId: input.studentId,
        correlationId: result.correlationId,
        payload: { requestedAt: new Date().toISOString() }
      },
      1
    );
    return result;
  }

  @Post("response")
  async response(@Body() input: ScreenshotResponseDto): Promise<{ updated: boolean }> {
    const result = await this.screenshotService.completeScreenshot(input);
    this.mqttGatewayService.publish(
      `screenshot/response/${input.teacherId}`,
      {
        eventId: randomUUID(),
        eventType: "SCREENSHOT_RESPONSE",
        version: 1,
        timestamp: new Date().toISOString(),
        senderId: input.studentId,
        receiverId: input.teacherId,
        correlationId: input.correlationId,
        payload: {
          capturedAt: new Date().toISOString(),
          contentType: input.contentType ?? "image/png",
          imageBase64: input.imageBase64,
          imageUrl: input.imageUrl
        }
      },
      1
    );
    return result;
  }

  @Get("history")
  async history(
    @Query("teacherId") teacherId: string,
    @Query("limit") limit?: string
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
    return this.screenshotService.listScreenshots(teacherId, limit ? Number(limit) : 50);
  }

  @Get("pending")
  async pending(
    @Query("studentId") studentId: string,
    @Query("limit") limit?: string
  ): Promise<
    Array<{
      correlationId: string;
      teacherId: string;
      studentId: string;
      requestedAt: string;
    }>
  > {
    return this.screenshotService.listPendingForStudent(studentId, limit ? Number(limit) : 20);
  }
}
