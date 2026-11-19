import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/decorators';
import { ApiErrors } from '../common/swagger';
import { QualityService } from './quality.service';

@ApiTags('Kiểm thử')
@Controller('quality')
export class QualityController {
  constructor(private readonly quality: QualityService) {}

  @Auth('admin')
  @Get('report')
  @ApiOperation({
    summary: 'Báo cáo kiểm thử tự động — chỉ Chủ quán',
    description: '15 hạng mục, kết quả từng bộ test (JUnit), coverage, load test. Sinh bằng `npm run test:report`; 404 nếu chưa có.',
  })
  @ApiOkResponse({ description: 'Nội dung reports/test-report.json', schema: { type: 'object' } })
  @ApiErrors(404)
  report() {
    return this.quality.report();
  }
}
