import { BadRequestException, ParseIntPipe } from '@nestjs/common';

/** Tham số `:id` dạng số nguyên, báo lỗi tiếng Việt. */
export const IdPipe = new ParseIntPipe({ exceptionFactory: () => new BadRequestException({ error: 'Mã không hợp lệ' }) });
