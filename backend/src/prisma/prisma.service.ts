import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from '../config';
import { PrismaClient } from '../generated/prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    // Phiên DB luôn UTC; hiển thị giờ Việt Nam do frontend (lib/format.ts) đảm nhận.
    super({ adapter: new PrismaPg({ connectionString: config.databaseUrl, options: '-c timezone=UTC' }) });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
