import { Global, Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { InfraModule } from "../infra/infra.module";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { SessionCacheService } from "./session-cache.service";

@Global()
@Module({
  imports: [InfraModule],
  controllers: [AuthController],
  providers: [AuthService, SessionCacheService, JwtAuthGuard],
  exports: [AuthService, SessionCacheService, JwtAuthGuard]
})
export class AuthModule {}
