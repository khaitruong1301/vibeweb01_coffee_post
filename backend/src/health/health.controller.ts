import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { PrismaService } from '../prisma/prisma.service';
import { HealthResponseDto } from './health-response.dto';

@ApiTags('Hệ thống')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Kiểm tra API và kết nối DB', description: 'Dùng cho healthcheck của Docker.' })
  @ApiOkResponse({ type: HealthResponseDto })
  @ApiServiceUnavailableResponse({ description: 'Không kết nối được DB', type: ErrorResponseDto })
  async check(): Promise<HealthResponseDto> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', db: 'ok', time: new Date().toISOString() };
    } catch {
      throw new ServiceUnavailableException({ error: 'Không kết nối được cơ sở dữ liệu' });
    }
  }
}
