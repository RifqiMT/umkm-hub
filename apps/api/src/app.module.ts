import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { RedisThrottlerStorage } from './redis/redis-throttler.storage';
import { AuthModule } from './auth/auth.module';
import { ProfilesModule } from './profiles/profiles.module';
import { ProductsModule } from './products/products.module';
import { CustomersModule } from './customers/customers.module';
import { OrdersModule } from './orders/orders.module';
import { WarehouseModule } from './warehouse/warehouse.module';
import { RevenueTargetsModule } from './revenue-targets/revenue-targets.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { GeoModule } from './geo/geo.module';
import { EmailModule } from './email/email.module';
import { ExportModule } from './export/export.module';
import { TranslateModule } from './translate/translate.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRootAsync({
      imports: [RedisModule],
      inject: [RedisThrottlerStorage],
      useFactory: (storage: RedisThrottlerStorage) => ({
        throttlers: [{ ttl: 60_000, limit: 100 }],
        storage,
      }),
    }),
    RedisModule,
    PrismaModule,
    EmailModule,
    AuthModule,
    ProfilesModule,
    ProductsModule,
    CustomersModule,
    OrdersModule,
    WarehouseModule,
    RevenueTargetsModule,
    AnalyticsModule,
    GeoModule,
    ExportModule,
    TranslateModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
