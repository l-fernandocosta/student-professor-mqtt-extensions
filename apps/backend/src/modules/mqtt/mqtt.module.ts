import { Global, Module } from "@nestjs/common";
import { ChatModule } from "../chat/chat.module";
import { PresenceModule } from "../presence/presence.module";
import { ScreenshotModule } from "../screenshot/screenshot.module";
import { MqttGatewayService } from "./mqtt.service";

@Global()
@Module({
  imports: [ChatModule, PresenceModule, ScreenshotModule],
  providers: [MqttGatewayService],
  exports: [MqttGatewayService]
})
export class MqttModule {}
