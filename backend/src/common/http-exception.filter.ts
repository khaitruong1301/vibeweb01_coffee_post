import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { TooManyAttemptsException } from '../auth/login-limiter';
import { Prisma } from '../generated/prisma/client';

/** Đổi mọi lỗi thành `{ error: "<tiếng Việt>", details? }`, không lộ stack trace / câu SQL. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Lỗi');

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const { status, body } = this.toResponse(exception);
    if (exception instanceof TooManyAttemptsException) res.setHeader('Retry-After', String(exception.retryAfterSec));
    if (status >= 500) this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    res.status(status).json(body);
  }

  private toResponse(e: unknown): { status: number; body: { error: string; details?: unknown } } {
    if (e instanceof HttpException) {
      const status = e.getStatus();
      const r = e.getResponse();
      // Lỗi do code mình ném: `{ error: '...' }`. Lỗi mặc định của Nest có thêm statusCode + message tiếng Anh → dùng thông báo chuẩn.
      if (typeof r === 'object' && r !== null && 'error' in r && !('statusCode' in r)) {
        return { status, body: r as { error: string; details?: unknown } };
      }
      return { status, body: { error: DEFAULT_MESSAGES[status] ?? (typeof r === 'string' ? r : e.message) } };
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2002') return { status: 409, body: { error: 'Dữ liệu đã tồn tại' } };
      if (e.code === 'P2025') return { status: 404, body: { error: 'Không tìm thấy dữ liệu' } };
      if (e.code === 'P2003') return { status: 409, body: { error: 'Dữ liệu đang được sử dụng, không thể thực hiện' } };
    }
    // Lỗi 4xx của tầng HTTP (body-parser: body quá lớn 413, sai charset 415…) — không phải lỗi hệ thống.
    if (isClientHttpError(e)) {
      return { status: e.status, body: { error: DEFAULT_MESSAGES[e.status] ?? 'Yêu cầu không hợp lệ' } };
    }
    // Vi phạm CHECK constraint trong DB (lớp chặn cuối) → 400
    if (e instanceof Error && /violates check constraint/i.test(e.message)) {
      return { status: 400, body: { error: 'Dữ liệu vi phạm ràng buộc nghiệp vụ' } };
    }
    return { status: HttpStatus.INTERNAL_SERVER_ERROR, body: { error: 'Lỗi hệ thống, vui lòng thử lại' } };
  }
}

/** Lỗi dạng http-errors (body-parser) có `status` 4xx và `expose: true`. */
function isClientHttpError(e: unknown): e is { status: number } {
  if (typeof e !== 'object' || e === null) return false;
  const { status, expose } = e as { status?: unknown; expose?: unknown };
  return typeof status === 'number' && status >= 400 && status < 500 && expose === true;
}

const DEFAULT_MESSAGES: Record<number, string> = {
  400: 'Yêu cầu không hợp lệ',
  401: 'Chưa đăng nhập hoặc phiên đã hết hạn',
  403: 'Bạn không có quyền thực hiện thao tác này',
  404: 'Không tìm thấy',
  409: 'Xung đột dữ liệu',
  413: 'Dữ liệu gửi lên quá lớn',
  429: 'Thao tác quá nhiều lần, vui lòng đợi rồi thử lại',
  415: 'Định dạng dữ liệu không được hỗ trợ',
};
