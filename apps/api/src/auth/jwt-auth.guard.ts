import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { FirebaseAdminService } from './firebase-admin.service';
import { FirebaseAuthService } from './firebase-auth.service';

function extractBearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
}

type JwtPayload = {
  sub: string;
  profileName: string;
};

/**
 * Accepts Firebase ID tokens (production / Vercel) or legacy JWT access tokens.
 * Firebase is tried first when Admin SDK is configured.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly firebaseAdmin: FirebaseAdminService,
    private readonly firebaseAuth: FirebaseAuthService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const token = extractBearer(req);
    if (!token) {
      throw new UnauthorizedException();
    }

    if (this.firebaseAdmin.enabled && token.split('.').length === 3) {
      try {
        const firebaseUser = await this.firebaseAdmin.verifyIdToken(token);
        const profile = await this.firebaseAuth.resolveProfile(firebaseUser);
        if (profile) {
          req.user = profile;
          return true;
        }
      } catch {
        /* Not a Firebase token — fall through to JWT. */
      }
    }

    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
      req.user = {
        profileId: payload.sub,
        profileName: payload.profileName,
      };
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
