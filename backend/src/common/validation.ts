import { BadRequestException, ValidationError, ValidationPipe } from '@nestjs/common';

/**
 * whitelist: bỏ mọi field không khai báo trong DTO — ví dụ `price`, `total` do trình duyệt gửi lên
 * bị loại trước khi vào service (chặn lỗi L3). transform: ép kiểu theo DTO.
 */
export function createValidationPipe() {
  return new ValidationPipe({
    whitelist: true,
    transform: true,
    exceptionFactory: (errors) =>
      new BadRequestException({ error: 'Dữ liệu không hợp lệ', details: flatten(errors) }),
  });
}

function flatten(errors: ValidationError[], prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const err of errors) {
    const key = prefix ? `${prefix}.${err.property}` : err.property;
    if (err.constraints) out[key] = Object.values(err.constraints)[0];
    if (err.children?.length) Object.assign(out, flatten(err.children, key));
  }
  return out;
}
