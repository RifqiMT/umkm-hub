import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfilesService {
  private readonly logger = new Logger(ProfilesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getMe(profileId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
      select: { id: true, profileName: true, createdAt: true, updatedAt: true },
    });
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }
    return profile;
  }

  async updateMe(profileId: string, dto: UpdateProfileDto) {
    if (dto.profileName) {
      const clash = await this.prisma.profile.findFirst({
        where: {
          profileName: dto.profileName,
          NOT: { id: profileId },
        },
      });
      if (clash) {
        throw new ConflictException('Profile name is already taken');
      }
    }

    const data: { profileName?: string; passwordHash?: string } = {};
    if (dto.profileName) data.profileName = dto.profileName;
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 12);
    }

    try {
      const updated = await this.prisma.profile.update({
        where: { id: profileId },
        data,
        select: { id: true, profileName: true, createdAt: true, updatedAt: true },
      });
      this.logger.log(`Profile updated: ${profileId}`);
      return updated;
    } catch {
      throw new NotFoundException('Profile not found');
    }
  }

  async deleteMe(profileId: string) {
    try {
      await this.prisma.profile.delete({ where: { id: profileId } });
      this.logger.log(`Profile deleted: ${profileId}`);
      return { deleted: true };
    } catch {
      throw new NotFoundException('Profile not found');
    }
  }
}
