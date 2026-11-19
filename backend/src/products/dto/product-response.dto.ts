export class CategoryDto {
  /** @example 1 */
  id: number;
  /** @example "Cà phê" */
  name: string;
}

export class UserRefDto {
  /** @example 1 */
  id: number;
  /** @example "Chủ quán" */
  fullName: string;
}

export class ProductDto {
  /** @example 2 */
  id: number;
  /** @example "Cà phê sữa đá" */
  name: string;
  category: CategoryDto;
  /**
   * Giá gốc (size S/M hoặc món không có size), VNĐ
   * @example 29000
   */
  price: number;
  /**
   * Giá size L do server tính = price + 6.000đ (BR05); null nếu món không có size
   * @example 35000
   */
  priceL: number | null;
  /** @example true */
  hasSize: boolean;
  /** Đang bán (false = ngừng bán, không hiện ở màn bán hàng) */
  isActive: boolean;
  imageUrl: string | null;
  /** Lần sửa cuối */
  updatedAt: Date;
  /** Người sửa cuối (để tra cứu khi giá sai) */
  updatedBy: UserRefDto | null;
}

/** Phụ thu theo size (VNĐ) */
export class SizeSurchargeDto {
  /** @example 0 */
  S: number;
  /** @example 0 */
  M: number;
  /** @example 6000 */
  L: number;
}

export class ProductListDto {
  items: ProductDto[];
  sizeSurcharge: SizeSurchargeDto;
}
