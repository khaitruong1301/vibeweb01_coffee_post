import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { Prisma } from '../generated/prisma/client';
import type { OrderStatus } from '../generated/prisma/enums';
import { priceOrder, PricingError } from '../pricing/pricing';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/order.dto';
import type { OrderDto, OrderListDto } from './dto/order-response.dto';
import { orderCode, parseOrderCode } from './order-code';
import { canTransition, STATUS_LABEL } from './order-status';

const orderInclude = {
  cashier: { select: { id: true, fullName: true } },
  items: { orderBy: { id: 'asc' } },
} satisfies Prisma.OrderInclude;

type OrderRow = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

export function toOrderDto(o: OrderRow): OrderDto {
  return {
    id: o.id,
    code: orderCode(o.id),
    source: o.source,
    partnerCode: o.partnerCode,
    note: o.note,
    status: o.status,
    statusLabel: STATUS_LABEL[o.status],
    total: o.total,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    cashier: o.cashier,
    items: o.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      productName: i.productName,
      size: i.size,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      lineTotal: i.lineTotal,
      note: i.note,
    })),
  };
}

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  /** UC02/UC04 — tạo đơn: giá lấy từ DB, tổng do server tính, lưu orders + order_items trong một lần ghi. */
  async create(dto: CreateOrderDto, user: AuthUser) {
    const ids = [...new Set(dto.items.map((i) => i.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: ids }, isActive: true },
      select: { id: true, name: true, price: true, hasSize: true },
    });

    let priced: ReturnType<typeof priceOrder>;
    try {
      priced = priceOrder(dto.items, products);
    } catch (e) {
      if (e instanceof PricingError) throw new BadRequestException({ error: e.message });
      throw e;
    }

    const source = dto.source ?? 'counter';
    // Nested create của Prisma chạy trong một transaction: hoặc lưu cả đơn + món, hoặc không lưu gì.
    const order = await this.prisma.order.create({
      data: {
        cashierId: user.id,
        source,
        partnerCode: source === 'counter' ? null : dto.partnerCode,
        note: dto.note || null,
        total: priced.total,
        items: { create: priced.lines.map((l, i) => ({ ...l, note: dto.items[i].note || null })) },
      },
      include: orderInclude,
    });
    return toOrderDto(order);
  }

  async list(statuses: OrderStatus[] | undefined, limit = 100): Promise<OrderListDto> {
    const rows = await this.prisma.order.findMany({
      where: { status: { in: statuses?.length ? statuses : ['pending', 'preparing', 'ready'] } },
      orderBy: { createdAt: 'asc' }, // đơn cũ nhất lên trước — cao điểm 7h–9h
      take: limit,
      include: orderInclude,
    });
    return { items: rows.map(toOrderDto) };
  }

  /** UC03 — đọc lại đơn đã lưu theo mã CP-… để in hóa đơn. */
  async findByCode(code: string) {
    const id = parseOrderCode(code);
    const order = id ? await this.prisma.order.findUnique({ where: { id }, include: orderInclude }) : null;
    if (!order) throw new NotFoundException({ error: 'Không tìm thấy đơn hàng' });
    return toOrderDto(order);
  }

  /** UC05 — chuyển trạng thái pha chế, chỉ đi tới bước kế tiếp. */
  async updateStatus(id: number, to: OrderStatus) {
    const current = await this.prisma.order.findUnique({ where: { id }, select: { status: true } });
    if (!current) throw new NotFoundException({ error: 'Không tìm thấy đơn hàng' });
    if (!canTransition(current.status, to)) {
      throw new ConflictException({
        error: `Không thể chuyển đơn từ "${STATUS_LABEL[current.status]}" sang "${STATUS_LABEL[to]}"`,
      });
    }
    // Cập nhật có điều kiện: hai pha chế bấm cùng lúc thì chỉ một người thành công.
    const { count } = await this.prisma.order.updateMany({ where: { id, status: current.status }, data: { status: to } });
    if (count === 0) throw new ConflictException({ error: 'Đơn vừa được người khác cập nhật, vui lòng tải lại' });
    const order = await this.prisma.order.findUniqueOrThrow({ where: { id }, include: orderInclude });
    return toOrderDto(order);
  }
}
