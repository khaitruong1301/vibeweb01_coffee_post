import { ApiProperty } from '@nestjs/swagger';
import { OrderSource, OrderStatus, Size } from '../../generated/prisma/enums';
import { UserRefDto } from '../../products/dto/product-response.dto';

export class OrderItemResponseDto {
  /** @example 1 */
  id: number;
  /** @example 2 */
  productId: number;
  /**
   * Tên món lúc bán (chụp lại, đổi tên sau không ảnh hưởng)
   * @example "Cà phê sữa đá"
   */
  productName: string;
  @ApiProperty({ enum: Size, nullable: true, example: 'L', description: 'null với món không có size' })
  size: Size | null;
  /**
   * Đơn giá lúc bán, đã gồm phụ thu size (VNĐ)
   * @example 35000
   */
  unitPrice: number;
  /** @example 2 */
  quantity: number;
  /** @example 70000 */
  lineTotal: number;
  /** @example "Ít đường" */
  note: string | null;
}

export class OrderDto {
  /** @example 1 */
  id: number;
  /**
   * Mã in trên hóa đơn
   * @example "CP-000001"
   */
  code: string;
  @ApiProperty({ enum: OrderSource, example: 'counter' })
  source: OrderSource;
  /** Mã đơn GrabFood / ShopeeFood */
  partnerCode: string | null;
  /** @example "Ít đá" */
  note: string | null;
  @ApiProperty({ enum: OrderStatus, example: 'pending' })
  status: OrderStatus;
  /** @example "Chờ pha" */
  statusLabel: string;
  /**
   * Tổng tiền do server tính từ giá trong DB (BR01)
   * @example 98000
   */
  total: number;
  createdAt: Date;
  updatedAt: Date;
  cashier: UserRefDto;
  items: OrderItemResponseDto[];
}

export class OrderListDto {
  items: OrderDto[];
}
