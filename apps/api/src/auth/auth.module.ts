import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { EmailModule } from '../email/email.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { FirebaseAdminService } from './firebase-admin.service';
import { FirebaseAuthService } from './firebase-auth.service';
import { EmailVerificationService } from './email-verification.service';
import { PasswordResetService } from './password-reset.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Global()
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
    EmailModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    FirebaseAdminService,
    FirebaseAuthService,
    EmailVerificationService,
    PasswordResetService,
    JwtAuthGuard,
  ],
  exports: [
    AuthService,
    FirebaseAdminService,
    FirebaseAuthService,
    JwtModule,
    JwtAuthGuard,
    EmailVerificationService,
    PasswordResetService,
  ],
})
export class AuthModule {}
