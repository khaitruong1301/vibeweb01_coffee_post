import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { config } from '../config';

/** 429 kèm số giây phải đợi — filter lỗi gắn header Retry-After. */
export class TooManyAttemptsException extends HttpException {
  constructor(public readonly retryAfterSec: number) {
    super(
      { error: `Đăng nhập sai quá nhiều lần, vui lòng thử lại sau ${Math.ceil(retryAfterSec / 60)} phút` },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Chống dò mật khẩu: chỉ đếm lần nhập SAI, trong cửa sổ cố định.
 * - Theo tên đăng nhập (không giả mạo được) — lớp chặn chính, áp dụng cả với tên không tồn tại (không lộ tài khoản có thật).
 * - Theo IP — chặn thử nhiều tài khoản từ một nơi. IP lấy qua X-Forwarded-For từ proxy Next; client tự gửi header này thì
 *   giả được, nên production nên đặt reverse proxy (nginx) ghi đè X-Forwarded-For.
 * Lưu trong bộ nhớ: đủ cho một instance backend; chạy nhiều instance thì chuyển sang Redis.
 */
@Injectable()
export class LoginLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly limits = config.login,
    private readonly now: () => number = Date.now,
  ) {}

  private keys(username: string, ip: string) {
    return [
      { key: `u:${username.trim().toLowerCase()}`, max: this.limits.maxFailsPerUser },
      { key: `ip:${ip}`, max: this.limits.maxFailsPerIp },
    ];
  }

  private active(key: string): Bucket | undefined {
    const b = this.buckets.get(key);
    if (b && b.resetAt <= this.now()) {
      this.buckets.delete(key);
      return undefined;
    }
    return b;
  }

  /** Ném 429 nếu tên đăng nhập hoặc IP đã vượt số lần sai cho phép. */
  assertAllowed(username: string, ip: string): void {
    for (const { key, max } of this.keys(username, ip)) {
      const b = this.active(key);
      if (b && b.count >= max) throw new TooManyAttemptsException(Math.ceil((b.resetAt - this.now()) / 1000));
    }
  }

  recordFailure(username: string, ip: string): void {
    for (const { key } of this.keys(username, ip)) {
      const b = this.active(key);
      if (b) b.count += 1;
      else this.buckets.set(key, { count: 1, resetAt: this.now() + this.limits.windowSec * 1000 });
    }
    if (this.buckets.size > 10_000) this.sweep();
  }

  /** Đăng nhập đúng → xoá bộ đếm của tên đăng nhập (giữ bộ đếm IP). */
  recordSuccess(username: string): void {
    this.buckets.delete(`u:${username.trim().toLowerCase()}`);
  }

  private sweep() {
    const t = this.now();
    for (const [k, b] of this.buckets) if (b.resetAt <= t) this.buckets.delete(k);
  }
}
