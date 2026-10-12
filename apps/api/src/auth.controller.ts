import { Body, Controller, Get, Param, Post, Put, Req, UnauthorizedException } from '@nestjs/common';
import { InvalidCredentialsError } from '@alsvid/identity';
import { bearerToken, requireAuth, type AuthenticatedRequest } from './auth.guard.js';
import { throwHttpDomainError } from './domain-errors.js';
import { Public } from './public.decorator.js';
import { identityService } from './runtime.js';

@Controller('v1/auth')
export class AuthController {
  @Public()
  @Get('registration-status')
  async registrationStatus() {
    return { data: await identityService.registrationStatus() };
  }

  @Public()
  @Post('email/start')
  async startEmail(@Body() body: { email?: string }) {
    if (!body?.email) throw new UnauthorizedException('Email is required');
    try {
      return { data: await identityService.startEmailVerification(body.email) };
    } catch (error) {
      return throwHttpDomainError(error);
    }
  }

  @Public()
  @Post('email/complete')
  async completeEmail(@Body() body: { email?: string; code?: string; displayName?: string }) {
    if (!body?.email || !body.code) throw new UnauthorizedException('Email and verification code are required');
    try {
      return { data: await identityService.completeEmailVerification(body.email, body.code, body.displayName) };
    } catch (error) {
      return throwHttpDomainError(error);
    }
  }

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

  @Post('password')
  async setPassword(@Req() request: AuthenticatedRequest, @Body() body: { password?: string }) {
    if (!body?.password) throw new UnauthorizedException('Password is required');
    try {
      await identityService.setPassword(requireAuth(request), body.password);
      return { data: { ok: true } };
    } catch (error) {
      return throwHttpDomainError(error);
    }
  }

  @Post('invites')
  async createInvite(@Req() request: AuthenticatedRequest, @Body() body: { email?: string; expiresInDays?: number }) {
    if (!body?.email) throw new UnauthorizedException('Email is required');
    try {
      return { data: await identityService.createRegistrationInvite(requireAuth(request), body.email, body.expiresInDays ?? 7) };
    } catch (error) {
      return throwHttpDomainError(error);
    }
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
