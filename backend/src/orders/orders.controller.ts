import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types';
import { Auth, CurrentUser } from '../auth/decorators';
import { IdPipe } from '../common/id.pipe';
import { ApiErrors } from '../common/swagger';
import { CreateOrderDto, ListOrdersQuery, UpdateStatusDto } from './dto/order.dto';
import { OrderDto, OrderListDto } from './dto/order-response.dto';
import { OrdersService } from './orders.service';

@ApiTags('Đơn hàng')
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  /** BR04: cần đăng nhập (guard toàn cục) và đúng vai trò — chặn lỗi L1. */
  @Auth('cashier', 'admin')
  @Post()
  @ApiOperation({
    summary: 'Tạo đơn = bấm Thanh toán (UC02, UC04) — Thu ngân, Chủ quán',
    description: [
      'Chỉ gửi `productId`, `size`, `quantity`. Server lấy giá từ DB và tự tính `unitPrice`, `lineTotal`, `total` (BR01, chặn lỗi L3).',
      'Số lượng nguyên 1–50, cùng món nhiều dòng cộng lại ≤ 50 (BR02, chặn lỗi L2); đơn phải có ít nhất một món (BR03); size L +6.000đ (BR05).',
      'Đơn GrabFood / ShopeeFood bắt buộc `partnerCode`.',
    ].join('\n\n'),
  })
  @ApiCreatedResponse({ type: OrderDto })
  @ApiErrors(400)
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: AuthUser): Promise<OrderDto> {
    return this.orders.create(dto, user);
  }

  @Auth()
  @Get()
  @ApiOperation({ summary: 'Danh sách đơn cho màn quầy pha (UC05)', description: 'Sắp xếp đơn cũ nhất trước.' })
  @ApiOkResponse({ type: OrderListDto })
  @ApiErrors(400)
  list(@Query() q: ListOrdersQuery): Promise<OrderListDto> {
    return this.orders.list(q.status, q.limit);
  }

  @Auth()
  @Get(':code')
  @ApiOperation({ summary: 'Chi tiết đơn theo mã — in hóa đơn (UC03)' })
  @ApiParam({ name: 'code', example: 'CP-000001' })
  @ApiOkResponse({ type: OrderDto })
  @ApiErrors(404)
  findByCode(@Param('code') code: string): Promise<OrderDto> {
    return this.orders.findByCode(code);
  }

  @Auth('barista', 'admin')
  @Patch(':id/status')
  @ApiOperation({
    summary: 'Chuyển trạng thái pha chế (UC05) — Pha chế, Chủ quán',
    description: 'Chỉ đi tới bước kế tiếp: pending → preparing → ready → done. Sai thứ tự hoặc người khác vừa cập nhật → 409.',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiOkResponse({ type: OrderDto })
  @ApiErrors(400, 404, 409)
  updateStatus(@Param('id', IdPipe) id: number, @Body() dto: UpdateStatusDto): Promise<OrderDto> {
    return this.orders.updateStatus(id, dto.status);
  }
}
