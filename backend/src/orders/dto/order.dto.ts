import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { MAX_QTY, MIN_QTY } from '../../pricing/pricing';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const SIZES = ['S', 'M', 'L'] as const;
const SOURCES = ['counter', 'grabfood', 'shopeefood'] as const;
const STATUSES = ['preparing', 'ready', 'done'] as const;

/**
 * Một dòng món. KHÔNG có field giá: `price`, `unitPrice`, `total`… do trình duyệt gửi
 * bị ValidationPipe (whitelist) loại bỏ — server luôn lấy giá từ DB (BR01, chặn lỗi L3).
 */
export class OrderItemDto {
  /** @example 2 */
  @IsInt({ message: 'Mã món không hợp lệ' })
  @Min(1, { message: 'Mã món không hợp lệ' })
  productId: number;

  @ApiPropertyOptional({ enum: SIZES, example: 'L', description: 'Bắt buộc với món có size; món không size bỏ qua. L cộng 6.000đ (BR05)' })
  @IsOptional()
  @IsIn(SIZES, { message: 'Size chỉ nhận S, M hoặc L' })
  size?: (typeof SIZES)[number];

  // BR02 — chặn số âm, 0, số thập phân, > 50 (lỗi L2)
  /**
   * Số nguyên 1–50; cùng món ở nhiều dòng cộng lại tối đa 50 (BR02)
   * @example 2
   */
  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(MIN_QTY, { message: `Số lượng tối thiểu là ${MIN_QTY}` })
  @Max(MAX_QTY, { message: `Tối đa ${MAX_QTY} ly mỗi món` })
  quantity: number;

  /** @example "Ít đường" */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100, { message: 'Ghi chú món tối đa 100 ký tự' })
  note?: string;
}

export class CreateOrderDto {
  // BR03
  /** Danh sách món (1–50 dòng). Không gửi giá — server tự tính. */
  @IsArray({ message: 'Đơn phải có ít nhất một món' })
  @ArrayMinSize(1, { message: 'Đơn phải có ít nhất một món' })
  @ArrayMaxSize(50, { message: 'Một đơn tối đa 50 dòng món' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiPropertyOptional({ enum: SOURCES, default: 'counter', description: 'Nguồn đơn (UC04)' })
  @IsOptional()
  @IsIn(SOURCES, { message: 'Nguồn đơn không hợp lệ' })
  source?: (typeof SOURCES)[number];

  // UC04 — đơn GrabFood / ShopeeFood bắt buộc mã đơn đối tác
  /**
   * Mã đơn của ứng dụng giao đồ ăn — bắt buộc khi source khác counter
   * @example "GF-25111907421"
   */
  @ValidateIf((o: CreateOrderDto) => !!o.source && o.source !== 'counter')
  @Transform(trim)
  @IsString({ message: 'Nhập mã đơn của ứng dụng giao đồ ăn' })
  @MinLength(1, { message: 'Nhập mã đơn của ứng dụng giao đồ ăn' })
  @MaxLength(50)
  partnerCode?: string;

  /** @example "Ít đá" */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200, { message: 'Ghi chú đơn tối đa 200 ký tự' })
  note?: string;
}

export class ListOrdersQuery {
  @ApiPropertyOptional({
    type: String,
    example: 'pending,preparing,ready',
    description: 'Trạng thái, phân tách bằng dấu phẩy (pending, preparing, ready, done). Mặc định: pending,preparing,ready',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.split(',').map((s) => s.trim()).filter(Boolean) : value,
  )
  @IsIn(['pending', 'preparing', 'ready', 'done'], { each: true, message: 'Trạng thái không hợp lệ' })
  status?: ('pending' | 'preparing' | 'ready' | 'done')[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export class UpdateStatusDto {
  @ApiProperty({ enum: STATUSES, example: 'preparing', description: 'Bước kế tiếp: pending → preparing → ready → done' })
  @IsIn(STATUSES, { message: 'Trạng thái chỉ nhận preparing, ready hoặc done' })
  status: (typeof STATUSES)[number];
}
