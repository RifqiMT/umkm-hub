import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocationSource, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import {
  extractClientIp,
  lookupIpLocation,
} from './ip-location.util';
import {
  hasStoredLocationPart,
  isHashedIpValue,
  isLegacyLocationHash,
  isSealedLocationValue,
  openLocationValue,
  toStoredIpHash,
  toStoredLocationSeal,
} from './location-privacy.util';
import {
  EmailAvailability,
  emailTakenMessage,
  normalizeEmail,
  validateEmailFormat,
} from '../auth/email-conflict.util';
import { profileNameTakenMessage } from '../auth/profile-name-conflict.util';

const PROFILE_DB_SELECT = {
  id: true,
  profileName: true,
  firstName: true,
  lastName: true,
  email: true,
  emailVerifiedAt: true,
  accountVerifiedAt: true,
  locationCity: true,
  locationCountry: true,
  locationIpHash: true,
  locationSource: true,
  businessName: true,
  businessPhone: true,
  businessAddress: true,
  npwp: true,
  isPkp: true,
  defaultPpnPercent: true,
  taxInclusive: true,
  invoicePrefix: true,
  createdAt: true,
  updatedAt: true,
} as const;

type ProfileRow = {
  id: string;
  profileName: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  emailVerifiedAt: Date | null;
  accountVerifiedAt: Date | null;
  locationCity: string | null;
  locationCountry: string | null;
  locationIpHash: string | null;
  locationSource: LocationSource | null;
  businessName: string;
  businessPhone: string;
  businessAddress: string;
  npwp: string;
  isPkp: boolean;
  defaultPpnPercent: { toString(): string };
  taxInclusive: boolean;
  invoicePrefix: string;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class ProfilesService {
  private readonly logger = new Logger(ProfilesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private locationSecret(): string {
    return (
      this.config.get<string>('PROFILE_LOCATION_SECRET') ||
      this.config.get<string>('JWT_ACCESS_SECRET') ||
      'umkm-profile-location-dev-only'
    );
  }

  /**
   * Public profile: city/country decrypted for the owner; IP digest never exposed.
   * DB always stores sealed city/country + hashed IP.
   */
  private toPublicProfile(row: ProfileRow, secret = this.locationSecret()) {
    const city = openLocationValue(row.locationCity, secret);
    const country = openLocationValue(row.locationCountry, secret);
    const locationSet =
      hasStoredLocationPart(row.locationCity) ||
      hasStoredLocationPart(row.locationCountry);

    return {
      id: row.id,
      profileName: row.profileName,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      emailVerifiedAt: row.emailVerifiedAt,
      accountVerifiedAt: row.accountVerifiedAt,
      emailVerified: Boolean(row.emailVerifiedAt),
      accountVerified: Boolean(row.accountVerifiedAt),
      locationCity: city,
      locationCountry: country,
      locationSet,
      locationNeedsReentry:
        locationSet &&
        city == null &&
        country == null &&
        (isLegacyLocationHash(row.locationCity) ||
          isLegacyLocationHash(row.locationCountry)),
      locationSource: row.locationSource,
      businessName: row.businessName,
      businessPhone: row.businessPhone,
      businessAddress: row.businessAddress,
      npwp: row.npwp,
      isPkp: row.isPkp,
      defaultPpnPercent: Number(row.defaultPpnPercent.toString()),
      taxInclusive: row.taxInclusive,
      invoicePrefix: row.invoicePrefix,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  /** Upgrade legacy plaintext → sealed; leave HMAC digests for re-entry. */
  private async ensureLocationSecured(row: ProfileRow): Promise<ProfileRow> {
    const secret = this.locationSecret();
    const data: Prisma.ProfileUpdateInput = {};

    if (
      hasStoredLocationPart(row.locationCity) &&
      !isSealedLocationValue(row.locationCity) &&
      !isLegacyLocationHash(row.locationCity)
    ) {
      data.locationCity = toStoredLocationSeal(row.locationCity, secret);
    }
    if (
      hasStoredLocationPart(row.locationCountry) &&
      !isSealedLocationValue(row.locationCountry) &&
      !isLegacyLocationHash(row.locationCountry)
    ) {
      data.locationCountry = toStoredLocationSeal(row.locationCountry, secret);
    }
    if (
      hasStoredLocationPart(row.locationIpHash) &&
      !isHashedIpValue(row.locationIpHash)
    ) {
      data.locationIpHash = toStoredIpHash(row.locationIpHash, secret);
    }

    if (Object.keys(data).length === 0) return row;

    const updated = await this.prisma.profile.update({
      where: { id: row.id },
      data,
      select: PROFILE_DB_SELECT,
    });
    this.logger.log(`Profile location storage upgraded: ${row.id}`);
    return updated;
  }

  async getMe(profileId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
      select: PROFILE_DB_SELECT,
    });
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }
    const secured = await this.ensureLocationSecured(profile);
    return this.toPublicProfile(secured);
  }

  async checkEmailAvailability(
    profileId: string,
    rawEmail: string,
  ): Promise<EmailAvailability> {
    const format = validateEmailFormat(rawEmail ?? '');
    if (format) return format;

    const email = normalizeEmail(rawEmail);
    const me = await this.prisma.profile.findUnique({
      where: { id: profileId },
      select: { email: true },
    });
    if (me?.email && me.email.toLowerCase() === email) {
      return {
        email,
        available: true,
        valid: true,
        reason: 'unchanged',
        message: 'This is your current email address.',
      };
    }

    const clash = await this.prisma.profile.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
        NOT: { id: profileId },
      },
      select: { id: true },
    });
    if (clash) {
      return {
        email,
        available: false,
        valid: true,
        reason: 'taken',
        message: emailTakenMessage(email),
      };
    }

    return {
      email,
      available: true,
      valid: true,
      reason: 'available',
      message: `The email "${email}" is available.`,
    };
  }

  async updateMe(profileId: string, dto: UpdateProfileDto) {
    // Username and email are permanently bound at registration.
    if (dto.profileName !== undefined) {
      const current = await this.prisma.profile.findUnique({
        where: { id: profileId },
        select: { profileName: true },
      });
      const next = dto.profileName.trim();
      const previous = current?.profileName ?? '';
      if (!previous || next !== previous) {
        throw new BadRequestException(
          'Username cannot be changed. It was set at registration and must stay unique.',
        );
      }
    }

    if (dto.email !== undefined) {
      if (dto.email === null || dto.email === '') {
        throw new BadRequestException(
          'Email is required. Each username must stay linked to a unique email address.',
        );
      }
      const current = await this.prisma.profile.findUnique({
        where: { id: profileId },
        select: { email: true },
      });
      const next = normalizeEmail(dto.email);
      const previous = (current?.email ?? '').toLowerCase();
      if (!previous || next !== previous) {
        throw new BadRequestException(
          'This username is permanently linked to its email address. Email cannot be changed.',
        );
      }
    }

    const secret = this.locationSecret();
    const data: Prisma.ProfileUpdateInput = {};
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 12);
    }
    if (dto.firstName !== undefined) data.firstName = dto.firstName;
    if (dto.lastName !== undefined) data.lastName = dto.lastName;
    if (dto.businessName !== undefined) data.businessName = dto.businessName ?? '';
    if (dto.businessPhone !== undefined) data.businessPhone = dto.businessPhone ?? '';
    if (dto.businessAddress !== undefined) {
      data.businessAddress = dto.businessAddress ?? '';
    }
    if (dto.npwp !== undefined) data.npwp = dto.npwp ?? '';
    if (dto.isPkp !== undefined) data.isPkp = dto.isPkp;
    if (dto.defaultPpnPercent !== undefined) {
      data.defaultPpnPercent = dto.defaultPpnPercent;
    }
    if (dto.taxInclusive !== undefined) data.taxInclusive = dto.taxInclusive;
    if (dto.invoicePrefix !== undefined) {
      data.invoicePrefix = dto.invoicePrefix ?? '';
    }

    const locationTouched =
      dto.locationCity !== undefined ||
      dto.locationCountry !== undefined ||
      dto.locationSource !== undefined;

    if (dto.locationCity !== undefined) {
      data.locationCity = toStoredLocationSeal(dto.locationCity, secret);
    }
    if (dto.locationCountry !== undefined) {
      data.locationCountry = toStoredLocationSeal(dto.locationCountry, secret);
    }

    if (locationTouched) {
      const clearing =
        (dto.locationCity === null || dto.locationCity === '') &&
        (dto.locationCountry === null || dto.locationCountry === '') &&
        dto.locationCity !== undefined &&
        dto.locationCountry !== undefined;

      if (clearing) {
        data.locationSource = null;
        data.locationIpHash = null;
      } else if (dto.locationSource === LocationSource.IP) {
        data.locationSource = LocationSource.IP;
      } else if (dto.locationSource === LocationSource.MANUAL) {
        data.locationSource = LocationSource.MANUAL;
        data.locationIpHash = null;
      } else if (
        dto.locationCity !== undefined ||
        dto.locationCountry !== undefined
      ) {
        data.locationSource = LocationSource.MANUAL;
        data.locationIpHash = null;
      }
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No changes to save');
    }

    try {
      const updated = await this.prisma.profile.update({
        where: { id: profileId },
        data,
        select: PROFILE_DB_SELECT,
      });
      this.logger.log(`Profile updated: ${profileId}`);
      return this.toPublicProfile(updated, secret);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        const target = err.meta?.target;
        const fields = Array.isArray(target)
          ? target.map(String)
          : typeof target === 'string'
            ? [target]
            : [];
        if (fields.some((f) => f.includes('profileName'))) {
          throw new ConflictException(
            profileNameTakenMessage(dto.profileName ?? '', {
              suggestSignIn: false,
            }),
          );
        }
        throw new ConflictException(emailTakenMessage(''));
      }
      throw new NotFoundException('Profile not found');
    }
  }

  async detectLocation(
    profileId: string,
    headers: {
      forwardedFor?: string | string[];
      realIp?: string | string[];
      remoteAddress?: string;
    },
    save = false,
  ) {
    const ip = extractClientIp(headers);
    if (!ip) {
      throw new BadRequestException(
        'Could not determine your network address. Enter city and country manually, or try Detect again.',
      );
    }

    const result = await lookupIpLocation(ip);
    if (!result.found) {
      throw new BadRequestException(
        result.message ||
          'Location could not be detected. Enter city and country manually.',
      );
    }

    if (!save) {
      return {
        city: result.city,
        country: result.country,
        source: 'IP' as const,
        saved: false,
        profile: null,
      };
    }

    const secret = this.locationSecret();
    try {
      const profile = await this.prisma.profile.update({
        where: { id: profileId },
        data: {
          locationCity: toStoredLocationSeal(result.city || null, secret),
          locationCountry: toStoredLocationSeal(result.country || null, secret),
          locationIpHash: toStoredIpHash(ip, secret),
          locationSource: LocationSource.IP,
        },
        select: PROFILE_DB_SELECT,
      });
      this.logger.log(`Profile location sealed from network: ${profileId}`);
      return {
        city: result.city,
        country: result.country,
        source: 'IP' as const,
        saved: true,
        profile: this.toPublicProfile(profile, secret),
      };
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
