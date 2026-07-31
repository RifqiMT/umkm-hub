import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { EmailVerificationService } from './email-verification.service';
import { PasswordResetService } from './password-reset.service';
import {
  ForgotPasswordDto,
  LoginDto,
  RefreshDto,
  RegisterAvailabilityDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly emailVerification: EmailVerificationService,
    private readonly passwordReset: PasswordResetService,
  ) {}

  @Post('register-availability')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  checkRegistrationAvailability(@Body() dto: RegisterAvailabilityDto) {
    return this.authService.checkRegistrationAvailability(dto);
  }

  @Post('register')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.emailVerification.verifyToken(dto.token);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.passwordReset.requestReset(dto.login);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.passwordReset.resetPassword(dto.token, dto.password);
  }
}
