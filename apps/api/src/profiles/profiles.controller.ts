import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { EmailVerificationService } from '../auth/email-verification.service';
import { ProfilesService } from './profiles.service';
import {
  CheckEmailAvailabilityDto,
  DetectLocationDto,
  UpdateProfileDto,
} from './dto/update-profile.dto';

@Controller('profiles')
@UseGuards(JwtAuthGuard)
export class ProfilesController {
  constructor(
    private readonly profilesService: ProfilesService,
    private readonly emailVerification: EmailVerificationService,
  ) {}

  @Get('me')
  getMe(@CurrentUser() user: AuthUser) {
    return this.profilesService.getMe(user.profileId);
  }

  @Get('me/email-availability')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  checkEmailAvailability(
    @CurrentUser() user: AuthUser,
    @Query() query: CheckEmailAvailabilityDto,
  ) {
    return this.profilesService.checkEmailAvailability(
      user.profileId,
      query.email ?? '',
    );
  }

  @Patch('me')
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.profilesService.updateMe(user.profileId, dto);
  }

  @Post('me/detect-location')
  detectLocation(
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Body() dto: DetectLocationDto,
  ) {
    return this.profilesService.detectLocation(
      user.profileId,
      {
        forwardedFor: req.headers['x-forwarded-for'],
        realIp: req.headers['x-real-ip'],
        remoteAddress: req.ip || req.socket?.remoteAddress,
      },
      Boolean(dto?.save),
    );
  }

  @Post('me/email/send-verification')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  sendEmailVerification(@CurrentUser() user: AuthUser) {
    return this.emailVerification.sendVerification(user.profileId);
  }

  @Delete('me')
  deleteMe(@CurrentUser() user: AuthUser) {
    return this.profilesService.deleteMe(user.profileId);
  }
}
