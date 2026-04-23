import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IsString, IsNotEmpty } from 'class-validator';
import type { LoginResponse, UserProfile } from '@pulserank/shared';

class LoginDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

interface AuthenticatedRequest extends Request {
  user: { userId: string; username: string };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto): Promise<LoginResponse> {
    return this.authService.login(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(): void {
    // JWT is stateless; logout is handled client-side by removing the token.
    // In a production system with refresh tokens, you'd blacklist the token here.
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Request() req: AuthenticatedRequest): Promise<UserProfile> {
    return this.authService.getProfile(req.user.userId);
  }
}
