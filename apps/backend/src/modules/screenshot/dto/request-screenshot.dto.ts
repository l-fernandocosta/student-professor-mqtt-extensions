import { IsUUID } from "class-validator";

export class RequestScreenshotDto {
  @IsUUID()
  teacherId!: string;

  @IsUUID()
  studentId!: string;
}
