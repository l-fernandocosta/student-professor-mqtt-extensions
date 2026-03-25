import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { ChatModule } from "./chat/chat.module";
import { HealthModule } from "./health/health.module";
import { InfraModule } from "./infra/infra.module";
import { MqttModule } from "./mqtt/mqtt.module";
import { PresenceModule } from "./presence/presence.module";
import { ScreenshotModule } from "./screenshot/screenshot.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    InfraModule,
    HealthModule,
    AuthModule,
    PresenceModule,
    ChatModule,
    ScreenshotModule,
    MqttModule
  ]
})
export class AppModule {}
