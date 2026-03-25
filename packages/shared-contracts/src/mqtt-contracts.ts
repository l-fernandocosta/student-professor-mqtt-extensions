export type DomainEventType =
  | "CHAT_MESSAGE"
  | "SCREENSHOT_REQUEST"
  | "SCREENSHOT_RESPONSE"
  | "HEARTBEAT";

export interface DomainEnvelope<TPayload> {
  eventId: string;
  eventType: DomainEventType;
  version: 1;
  timestamp: string;
  senderId: string;
  receiverId?: string;
  sessionId?: string;
  correlationId?: string;
  payload: TPayload;
}

export interface ChatPayload {
  message: string;
}

export interface HeartbeatPayload {
  role: "student";
}

export interface ScreenshotRequestPayload {
  requestedAt: string;
}

export interface ScreenshotResponsePayload {
  capturedAt: string;
  contentType: "image/png";
  imageBase64?: string;
  imageUrl?: string;
}

export const MqttTopics = {
  chatSend: (sessionId: string) => `chat/session/${sessionId}/send`,
  chatDeliver: (sessionId: string) => `chat/session/${sessionId}/deliver`,
  screenshotRequest: (studentId: string) => `screenshot/request/${studentId}`,
  presenceHeartbeat: (studentId: string) => `presence/student/${studentId}/heartbeat`,
  screenshotResponse: (teacherId: string) => `screenshot/response/${teacherId}`
} as const;
