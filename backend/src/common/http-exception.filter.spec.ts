import { ArgumentsHost, BadRequestException, ForbiddenException, Logger, NotFoundException } from '@nestjs/common';
import { TooManyAttemptsException } from '../auth/login-limiter';
import { Prisma } from '../generated/prisma/client';
import { AllExceptionsFilter } from './http-exception.filter';

function run(exception: unknown) {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn(), setHeader: jest.fn() };
  const host = { switchToHttp: () => ({ getResponse: () => res }) } as unknown as ArgumentsHost;
  new AllExceptionsFilter().catch(exception, host);
  return { status: res.status.mock.calls[0][0] as number, body: res.json.mock.calls[0][0] as Record<string, unknown>, headers: res.setHeader.mock.calls };
}

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('x', { code, clientVersion: 'test' });

describe('AllExceptionsFilter — mọi lỗi thành { error } tiếng Việt', () => {
  // Lỗi 500 được ghi log có chủ đích — tắt trong test cho báo cáo gọn.
  beforeAll(() => jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined));

  it('giữ nguyên lỗi do code ném dạng { error, details }', () => {
    expect(run(new BadRequestException({ error: "Dữ liệu không hợp lệ", details: { a: "b" } }))).toMatchObject({
      status: 400,
      body: { error: 'Dữ liệu không hợp lệ', details: { a: 'b' } },
    });
  });

  it('lỗi mặc định tiếng Anh của Nest đổi sang thông báo tiếng Việt', () => {
    expect(run(new NotFoundException())).toMatchObject({ status: 404, body: { error: 'Không tìm thấy' } });
    expect(run(new ForbiddenException())).toMatchObject({
      status: 403,
      body: { error: 'Bạn không có quyền thực hiện thao tác này' },
    });
  });

  it.each([
    ['P2002', 409],
    ['P2025', 404],
    ['P2003', 409],
  ])('lỗi Prisma %s → %i', (code, status) => {
    expect(run(prismaError(code)).status).toBe(status);
  });

  it('lỗi 4xx của body-parser (body quá lớn) → 413, không phải 500', () => {
    const tooLarge = Object.assign(new Error('request entity too large'), { status: 413, expose: true, type: 'entity.too.large' });
    expect(run(tooLarge)).toMatchObject({ status: 413, body: { error: 'Dữ liệu gửi lên quá lớn' } });
  });

  it('lỗi có status 5xx hoặc expose=false vẫn là 500', () => {
    expect(run(Object.assign(new Error('x'), { status: 503, expose: false })).status).toBe(500);
  });

  it('đăng nhập sai quá nhiều → 429 + header Retry-After', () => {
    const r = run(new TooManyAttemptsException(125));
    expect(r.status).toBe(429);
    expect(r.body.error).toContain('3 phút');
    expect(r.headers).toEqual([['Retry-After', '125']]);
  });

  it('vi phạm CHECK constraint → 400', () => {
    expect(run(new Error('new row violates check constraint "order_items_quantity_range"')).status).toBe(400);
  });

  it('lỗi lạ → 500, không lộ thông điệp / stack / SQL', () => {
    const { status, body } = run(new Error('SELECT * FROM users WHERE password_hash = ...'));
    expect(status).toBe(500);
    expect(body).toEqual({ error: 'Lỗi hệ thống, vui lòng thử lại' });
  });
});
