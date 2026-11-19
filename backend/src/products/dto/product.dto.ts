import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, IsUrl, Max, MaxLength, Min, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateProductDto {
  /** @example "Cà phê muối" */
  @Transform(trim)
  @IsString({ message: 'Tên món không được trống' })
  @MinLength(1, { message: 'Tên món không được trống' })
  @MaxLength(100, { message: 'Tên món tối đa 100 ký tự' })
  name: string;

  /** @example 1 */
  @IsInt({ message: 'Vui lòng chọn danh mục' })
  @Min(1, { message: 'Vui lòng chọn danh mục' })
  categoryId: number;

  /**
   * Giá gốc (size S/M), số nguyên VNĐ. Trần 1.000.000đ để chặn gõ thừa số 0. Giá size L = giá này + 6.000đ.
   * @example 39000
   */
  @IsInt({ message: 'Giá phải là số nguyên (đơn vị đồng)' })
  @Min(1000, { message: 'Giá tối thiểu 1.000đ' })
  @Max(1_000_000, { message: 'Giá tối đa 1.000.000đ' })
  price: number;

  /** Có chọn size S/M/L (mặc định true; bánh = false) */
  @IsOptional()
  @IsBoolean()
  hasSize?: boolean;

  /** Đang bán (mặc định true) */
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsUrl({}, { message: 'Đường dẫn ảnh không hợp lệ' })
  @MaxLength(500)
  imageUrl?: string;
}

/** Chỉ gửi các field cần đổi. */
export class UpdateProductDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1, { message: 'Tên món không được trống' })
  @MaxLength(100, { message: 'Tên món tối đa 100 ký tự' })
  name?: string;

  @IsOptional()
  @IsInt({ message: 'Vui lòng chọn danh mục' })
  @Min(1)
  categoryId?: number;

  /** @example 32000 */
  @IsOptional()
  @IsInt({ message: 'Giá phải là số nguyên (đơn vị đồng)' })
  @Min(1000, { message: 'Giá tối thiểu 1.000đ' })
  @Max(1_000_000, { message: 'Giá tối đa 1.000.000đ' })
  price?: number;

  @IsOptional()
  @IsBoolean()
  hasSize?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsUrl({}, { message: 'Đường dẫn ảnh không hợp lệ' })
  @MaxLength(500)
  imageUrl?: string;
}

export class ListProductsQuery {
  /** `all=true`: gồm cả món ngừng bán (chỉ Chủ quán). */
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  all?: boolean;
}
