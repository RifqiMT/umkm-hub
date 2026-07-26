import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { EmailModule } from '../email/email.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { EmailVerificationService } from './email-verification.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
    EmailModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, EmailVerificationService],
  exports: [AuthService, JwtModule, EmailVerificationService],
})
export class AuthModule {}
