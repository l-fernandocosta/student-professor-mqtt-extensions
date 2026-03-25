import { IsIn, IsOptional, IsString, IsUUID } from "class-validator";

export class ScreenshotResponseDto {
  @IsUUID()
  correlationId!: string;

  @IsUUID()
  teacherId!: string;

  @IsUUID()
  studentId!: string;

  @IsString()
  @IsIn(["image/png"])
  contentType!: "image/png";

  @IsOptional()
  @IsString() 
  imageBase64?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}
