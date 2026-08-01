import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis as UpstashRedis } from '@upstash/redis';
import Redis from 'ioredis';

type RedisBackend =
  | { kind: 'upstash'; client: UpstashRedis }
  | { kind: 'tcp'; client: Redis };

function isTcpRedisUrl(url: string): boolean {
  return url.startsWith('redis://') || url.startsWith('rediss://');
}

/**
 * Redis for throttling + analytics cache.
 * Supports Upstash REST (serverless) or standard redis:// / rediss:// URLs.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly backend: RedisBackend | null;

  constructor(private readonly config: ConfigService) {
    const upstashUrl = this.config.get<string>('UPSTASH_REDIS_REST_URL')?.trim();
    const upstashToken = this.config
      .get<string>('UPSTASH_REDIS_REST_TOKEN')
      ?.trim();
    const redisUrl = this.config.get<string>('REDIS_URL')?.trim();

    if (upstashUrl && upstashToken && !isTcpRedisUrl(upstashUrl)) {
      this.backend = {
        kind: 'upstash',
        client: new UpstashRedis({ url: upstashUrl, token: upstashToken }),
      };
      this.logger.log('Redis connected (Upstash REST)');
      return;
    }

    const tcpUrl =
      redisUrl && isTcpRedisUrl(redisUrl)
        ? redisUrl
        : upstashUrl && isTcpRedisUrl(upstashUrl)
          ? upstashUrl
          : null;

    if (tcpUrl) {
      this.backend = {
        kind: 'tcp',
        client: new Redis(tcpUrl, {
          maxRetriesPerRequest: 2,
          lazyConnect: true,
          ...(tcpUrl.startsWith('rediss://') ? { tls: {} } : {}),
        }),
      };
      void this.backend.client.connect().then(
        () => this.logger.log('Redis connected (TCP)'),
        (err: unknown) =>
          this.logger.error(
            'Redis TCP connect failed',
            err instanceof Error ? err.message : String(err),
          ),
      );
      return;
    }

    const legacyToken = this.config.get<string>('REDIS_TOKEN')?.trim();
    if (redisUrl && legacyToken && !isTcpRedisUrl(redisUrl)) {
      this.backend = {
        kind: 'upstash',
        client: new UpstashRedis({ url: redisUrl, token: legacyToken }),
      };
      this.logger.log('Redis connected (Upstash REST via REDIS_URL)');
      return;
    }

    this.backend = null;
    this.logger.warn(
      'Redis not configured — throttling and cache use in-process fallback',
    );
  }

  get enabled(): boolean {
    return this.backend != null;
  }

  async get(key: string): Promise<string | null> {
    if (!this.backend) return null;
    if (this.backend.kind === 'upstash') {
      const value = await this.backend.client.get<string>(key);
      return value ?? null;
    }
    const value = await this.backend.client.get(key);
    return value ?? null;
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (!this.backend) return;
    if (this.backend.kind === 'upstash') {
      await this.backend.client.set(key, value, { ex: ttlSeconds });
      return;
    }
    await this.backend.client.set(key, value, 'EX', ttlSeconds);
  }

  async del(key: string): Promise<void> {
    if (!this.backend) return;
    await this.backend.client.del(key);
  }

  /** Atomic increment with TTL — used for distributed rate limiting. */
  async incr(key: string, ttlSeconds: number): Promise<number> {
    if (!this.backend) return 0;
    if (this.backend.kind === 'upstash') {
      const count = await this.backend.client.incr(key);
      if (count === 1) {
        await this.backend.client.expire(key, ttlSeconds);
      }
      return count;
    }
    const count = await this.backend.client.incr(key);
    if (count === 1) {
      await this.backend.client.expire(key, ttlSeconds);
    }
    return count;
  }

  async onModuleDestroy() {
    if (this.backend?.kind === 'tcp') {
      await this.backend.client.quit().catch(() => undefined);
    }
  }
}
