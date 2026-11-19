import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { readFile, stat } from 'node:fs/promises';
import { config } from '../config';

/** Đọc báo cáo kiểm thử đã tổng hợp (reports/test-report.json). Không chạy test từ API. */
@Injectable()
export class QualityService {
  async report(): Promise<Record<string, unknown>> {
    let raw: string;
    try {
      raw = await readFile(config.testReportPath, 'utf8');
    } catch {
      throw new NotFoundException({ error: 'Chưa có báo cáo kiểm thử — chạy "npm run test:report" ở thư mục gốc dự án' });
    }
    try {
      const report = JSON.parse(raw) as Record<string, unknown>;
      const { mtime } = await stat(config.testReportPath);
      return { ...report, fileUpdatedAt: mtime.toISOString() };
    } catch {
      throw new InternalServerErrorException({ error: 'File báo cáo kiểm thử bị hỏng, hãy tạo lại' });
    }
  }
}
