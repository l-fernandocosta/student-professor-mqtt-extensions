import { Global, Module } from "@nestjs/common";
import { ConversationCacheService } from "./conversation-cache.service";
import { DatabaseService } from "./database.service";
import { RedisService } from "./redis.service";
import { S3StorageService } from "./s3-storage.service";

@Global()
@Module({
  providers: [DatabaseService, RedisService, S3StorageService, ConversationCacheService],
  exports: [DatabaseService, RedisService, S3StorageService, ConversationCacheService]
})
export class InfraModule {}
