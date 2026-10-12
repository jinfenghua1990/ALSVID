import { type CanActivate, type ExecutionContext, ForbiddenException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthContext } from '@alsvid/identity';
import { InvalidCredentialsError } from '@alsvid/identity';
import { identityService } from './runtime.js';
import { PUBLIC_ROUTE } from './public.decorator.js';
import { PASSWORD_SETUP_ALLOWED } from './password-setup.decorator.js';

export interface AuthenticatedRequest {
  headers: { authorization?: string };
  auth?: AuthContext;
}

export function bearerToken(request: AuthenticatedRequest): string | null {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
}

export function requireAuth(request: AuthenticatedRequest): AuthContext {
  if (!request.auth) throw new UnauthorizedException();
  return request.auth;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, [context.getHandler(), context.getClass()]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = bearerToken(request);
    if (!token) throw new UnauthorizedException('Bearer session token required');

    try {
      request.auth = await identityService.authenticate(token);
      const passwordSetupAllowed = this.reflector.getAllAndOverride<boolean>(PASSWORD_SETUP_ALLOWED, [context.getHandler(), context.getClass()]);
      if (request.auth.passwordSetupRequired && !passwordSetupAllowed) throw new ForbiddenException('Password setup required before accessing ALSVID business APIs');
      return true;
    } catch (error) {
      if (error instanceof InvalidCredentialsError) throw new UnauthorizedException('Session expired or invalid');
      throw error;
    }
  }
}
