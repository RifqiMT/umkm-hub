import { Injectable } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import { RedisService } from './redis.service';

/**
 * Distributed rate-limit storage backed by Upstash Redis.
 * Falls back to in-memory counters when Redis is not configured.
 */
@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly memory = new Map<
    string,
    { totalHits: number; expiresAt: number; blockExpiresAt: number }
  >();

  constructor(private readonly redis: RedisService) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const ttlSeconds = Math.ceil(ttl / 1000);
    const blockSeconds = Math.ceil(blockDuration / 1000);
    const redisKey = `throttle:${throttlerName}:${key}`;

    if (this.redis.enabled) {
      const totalHits = await this.redis.incr(redisKey, ttlSeconds);
      const isBlocked = totalHits > limit;
      const timeToExpire = ttl;
      const timeToBlockExpire = isBlocked ? blockDuration : 0;
      return {
        totalHits,
        timeToExpire,
        isBlocked,
        timeToBlockExpire,
      };
    }

    const now = Date.now();
    const existing = this.memory.get(redisKey);
    if (!existing || existing.expiresAt <= now) {
      const record = {
        totalHits: 1,
        expiresAt: now + ttl,
        blockExpiresAt: 0,
      };
      this.memory.set(redisKey, record);
      return {
        totalHits: 1,
        timeToExpire: ttl,
        isBlocked: false,
        timeToBlockExpire: 0,
      };
    }

    existing.totalHits += 1;
    const isBlocked = existing.totalHits > limit;
    if (isBlocked && existing.blockExpiresAt === 0) {
      existing.blockExpiresAt = now + blockDuration;
    }
    return {
      totalHits: existing.totalHits,
      timeToExpire: Math.max(0, existing.expiresAt - now),
      isBlocked,
      timeToBlockExpire: isBlocked
        ? Math.max(0, existing.blockExpiresAt - now)
        : 0,
    };
  }
}
