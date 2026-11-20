import { LoginLimiter, TooManyAttemptsException } from './login-limiter';

describe('LoginLimiter — chống dò mật khẩu', () => {
  let t = 0;
  const limiter = () => new LoginLimiter({ maxFailsPerUser: 3, maxFailsPerIp: 5, windowSec: 60 }, () => t);
  beforeEach(() => (t = 1_000_000));

  it('cho phép tới khi đủ số lần sai, lần sau bị chặn 429 kèm số giây chờ', () => {
    const l = limiter();
    for (let i = 0; i < 3; i++) {
      l.assertAllowed('thungan1', '1.1.1.1');
      l.recordFailure('thungan1', '1.1.1.1');
    }
    t += 10_000;
    try {
      l.assertAllowed('thungan1', '1.1.1.1');
      throw new Error('phải bị chặn');
    } catch (e) {
      expect(e).toBeInstanceOf(TooManyAttemptsException);
      expect((e as TooManyAttemptsException).retryAfterSec).toBe(50);
      expect((e as TooManyAttemptsException).getStatus()).toBe(429);
    }
  });

  it('chặn theo tên đăng nhập kể cả khi đổi IP (không né được bằng IP giả)', () => {
    const l = limiter();
    ['1.1.1.1', '2.2.2.2', '3.3.3.3'].forEach((ip) => l.recordFailure('ThuNgan1 ', ip));
    expect(() => l.assertAllowed('thungan1', '9.9.9.9')).toThrow(TooManyAttemptsException);
  });

  it('chặn theo IP khi thử nhiều tài khoản', () => {
    const l = limiter();
    ['a', 'b', 'c', 'd', 'e'].forEach((u) => l.recordFailure(u, '6.6.6.6'));
    expect(() => l.assertAllowed('f', '6.6.6.6')).toThrow(TooManyAttemptsException);
    expect(() => l.assertAllowed('f', '7.7.7.7')).not.toThrow();
  });

  it('hết cửa sổ thời gian thì mở lại', () => {
    const l = limiter();
    for (let i = 0; i < 3; i++) l.recordFailure('u', 'ip');
    t += 61_000;
    expect(() => l.assertAllowed('u', 'ip')).not.toThrow();
  });

  it('tự dọn bộ đếm đã hết hạn khi số khoá quá lớn (không rò rỉ bộ nhớ)', () => {
    const l = limiter();
    for (let i = 0; i < 5001; i++) l.recordFailure(`old${i}`, `10.0.${i >> 8}.${i & 255}`);
    t += 61_000;
    l.recordFailure('moi', 'ip-moi');
    expect((l as unknown as { buckets: Map<string, unknown> }).buckets.size).toBe(2);
  });

  it('đăng nhập đúng xoá bộ đếm của tài khoản', () => {
    const l = limiter();
    l.recordFailure('u', 'ip');
    l.recordFailure('u', 'ip');
    l.recordSuccess('u');
    l.recordFailure('u', 'ip');
    expect(() => l.assertAllowed('u', 'ip2')).not.toThrow();
  });
});
