import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from '@upstash/redis';

/**
 * Upstash Redis client (HTTP, serverless-friendly).
 * Falls back to no-op when REDIS_URL / UPSTASH credentials are absent (local dev).
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis | null;

  constructor(private readonly config: ConfigService) {
    const url =
      this.config.get<string>('UPSTASH_REDIS_REST_URL') ??
      this.config.get<string>('REDIS_URL');
    const token =
      this.config.get<string>('UPSTASH_REDIS_REST_TOKEN') ??
      this.config.get<string>('REDIS_TOKEN');

    if (url && token) {
      this.client = new Redis({ url, token });
      this.logger.log('Redis connected (Upstash REST)');
    } else {
      this.client = null;
      this.logger.warn(
        'Redis not configured — throttling and cache use in-process fallback',
      );
    }
  }

  get enabled(): boolean {
    return this.client != null;
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) return null;
    const value = await this.client.get<string>(key);
    return value ?? null;
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (!this.client) return;
    await this.client.set(key, value, { ex: ttlSeconds });
  }

  async del(key: string): Promise<void> {
    if (!this.client) return;
    await this.client.del(key);
  }

  /** Atomic increment with TTL — used for distributed rate limiting. */
  async incr(key: string, ttlSeconds: number): Promise<number> {
    if (!this.client) return 0;
    const count = await this.client.incr(key);
    if (count === 1) {
      await this.client.expire(key, ttlSeconds);
    }
    return count;
  }

  onModuleDestroy() {
    /* Upstash REST is stateless — nothing to close. */
  }
}
