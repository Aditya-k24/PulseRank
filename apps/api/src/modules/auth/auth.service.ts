import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../db/prisma';
import type { LoginRequest, LoginResponse, UserProfile } from '@pulserank/shared';

export interface JwtPayload {
  sub: string;
  username: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginRequest): Promise<LoginResponse> {
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = { sub: user.id, username: user.username };
    const access_token = this.jwtService.sign(payload);

    return { access_token };
  }

  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, username: true, email: true },
    });

    return user;
  }
}
