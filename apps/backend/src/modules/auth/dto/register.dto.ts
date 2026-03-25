import { IsEmail, IsIn, IsString, MinLength } from "class-validator";

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @IsIn(["teacher", "student"])
  role!: "teacher" | "student";
}
