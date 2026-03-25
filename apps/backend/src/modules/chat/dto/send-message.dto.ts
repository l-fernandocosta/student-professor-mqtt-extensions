import { IsOptional, IsUUID } from "class-validator";
import { IsString, MaxLength, MinLength } from "class-validator";

export class SendMessageDto {
  @IsOptional()
  @IsUUID()
  eventId?: string;

  @IsString()
  @MinLength(1)
  @IsUUID()
  sessionId!: string;

  @IsString()
  @MinLength(1)
  @IsUUID()
  senderId!: string;

  @IsString()
  @MinLength(1)
  @IsUUID()
  receiverId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(3000)
  content!: string;
}
