import { Body, Controller, Get, Post, Put, Req, UnauthorizedException, Param } from '@nestjs/common';
import { InvalidCredentialsError } from '@alsvid/identity';
import { bearerToken, requireAuth, type AuthenticatedRequest } from './auth.guard.js';
import { throwHttpDomainError } from './domain-errors.js';
import { Public } from './public.decorator.js';
import { identityService } from './runtime.js';

@Controller('v1/auth')
export class AuthController {
  @Public()
  @Post('login')
  async login(@Body() body: { email?: string; password?: string }) {
    if (!body?.email || !body.password) throw new UnauthorizedException('Email and password are required');
    try {
      return { data: await identityService.login(body.email, body.password) };
    } catch (error) {
      if (error instanceof InvalidCredentialsError) throw new UnauthorizedException(error.message);
      throw error;
    }
  }

  @Get('me')
  me(@Req() request: AuthenticatedRequest) {
    return { data: requireAuth(request) };
  }

  @Post('logout')
  async logout(@Req() request: AuthenticatedRequest) {
    const token = bearerToken(request);
    if (token) await identityService.logout(token);
    return { data: { ok: true } };
  }

  @Get('users')
  async users(@Req() request: AuthenticatedRequest) {
    try {
      return { data: await identityService.listUsers(requireAuth(request)) };
    } catch (error) {
      return throwHttpDomainError(error);
    }
  }

  @Put('users/:id/roles')
  async setRoles(@Req() request: AuthenticatedRequest, @Param('id') userId: string, @Body() body: { roles?: string[] }) {
    try {
      await identityService.setUserRoles(requireAuth(request), userId, Array.isArray(body?.roles) ? body.roles : []);
      return { data: { ok: true } };
    } catch (error) {
      return throwHttpDomainError(error);
    }
  }
}
