import { Body, Controller, ForbiddenException, Get, Param, Post, Put, Req, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { IdentityValidationError, InvalidCredentialsError, InvalidPasswordResetTokenError } from '@alsvid/identity';
import { bearerToken, requireAuth, type AuthenticatedRequest } from './auth.guard.js';
import { throwHttpDomainError } from './domain-errors.js';
import { PasswordSetupAllowed } from './password-setup.decorator.js';
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
  async login(@Body() body: { identifier?: string; email?: string; password?: string }) {
    if (process.env.ALSVID_PASSWORD_LOGIN_ENABLED !== 'true') throw new ForbiddenException('Password login is currently disabled. Use email verification.');
    const identifier = body?.identifier ?? body?.email;
    if (!identifier || !body.password) throw new UnauthorizedException('Account identifier and password are required');
    try {
      return { data: await identityService.login(identifier, body.password) };
    } catch (error) {
      if (error instanceof InvalidCredentialsError) throw new UnauthorizedException(error.message);
      return throwHttpDomainError(error);
    }
  }

  @Public()
  @Post('password-reset/request')
  async requestPasswordReset(@Body() body: { email?: string }) {
    if (!body?.email?.trim()) throw new UnauthorizedException('Email is required');
    try {
      await identityService.requestPasswordReset(body.email, process.env.AUTH_BASE_URL ?? 'http://localhost:3000');
    } catch (error) {
      if (error instanceof IdentityValidationError) throw error;
      throw new ServiceUnavailableException('Password reset email is temporarily unavailable');
    }
    return { data: { ok: true } };
  }

  @Public()
  @Post('password-reset/confirm')
  async confirmPasswordReset(@Body() body: { token?: string; password?: string }) {
    if (!body?.token || !body.password) throw new UnauthorizedException('Reset token and new password are required');
    try {
      await identityService.resetPassword(body.token, body.password);
      return { data: { ok: true } };
    } catch (error) {
      if (error instanceof InvalidPasswordResetTokenError || error instanceof IdentityValidationError) throw error;
      throwHttpDomainError(error);
    }
  }

  @PasswordSetupAllowed()
  @Get('me')
  me(@Req() request: AuthenticatedRequest) {
    return { data: requireAuth(request) };
  }

  @PasswordSetupAllowed()
  @Post('logout')
  async logout(@Req() request: AuthenticatedRequest) {
    const token = bearerToken(request);
    if (token) await identityService.logout(token);
    return { data: { ok: true } };
  }

  @PasswordSetupAllowed()
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

  @Get('supplier-memberships/:userId/:partnerId')
  async supplierMembershipStatus(@Req() request:AuthenticatedRequest,
   @Param('userId') userId:string,@Param('partnerId') partnerId:string){
   return {data:await identityService.supplierMembershipStatus(requireAuth(request),userId,partnerId)};
  }

  @Post('supplier-memberships')
  async manageSupplierMembership(@Req() request:AuthenticatedRequest,@Body() input:{
   userId:string;partnerId:string;status:'ACTIVE'|'DISABLED';evidenceRef:string;
  }){
   return {data:await identityService.manageSupplierMembership(requireAuth(request),input)};
  }

  @Get('security-policy')
  async securityPolicy(@Req() request: AuthenticatedRequest) {
    try {
      return { data: await identityService.securityPolicy(requireAuth(request)) };
    } catch (error) {
      return throwHttpDomainError(error);
    }
  }

  @Put('security-policy')
  async updateSecurityPolicy(
    @Req() request: AuthenticatedRequest,
    @Body() body: { sessionTtlDays?: number; forcePasswordSetup?: boolean; riskStepUpEnabled?: boolean },
  ) {
    try {
      return { data: await identityService.updateSecurityPolicy(requireAuth(request), body ?? {}) };
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
