import { Body, Controller, Post } from "@nestjs/common";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  async register(@Body() input: RegisterDto): Promise<{ userId: string }> {
    return this.authService.register(input.email, input.password, input.role);
  }

  @Post("login")
  async login(@Body() input: LoginDto): Promise<{ accessToken: string; userId: string }> {
    return this.authService.login(input.email, input.password);
  }
}
