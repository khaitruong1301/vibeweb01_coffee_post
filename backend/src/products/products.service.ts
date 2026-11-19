import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SIZE_SURCHARGE, unitPrice } from '../pricing/pricing';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import type { ProductDto, ProductListDto } from './dto/product-response.dto';

const productSelect = {
  id: true,
  name: true,
  price: true,
  hasSize: true,
  isActive: true,
  imageUrl: true,
  updatedAt: true,
  category: { select: { id: true, name: true } },
  updatedBy: { select: { id: true, fullName: true } },
} satisfies Prisma.ProductSelect;

type ProductRow = Prisma.ProductGetPayload<{ select: typeof productSelect }>;

/** DTO trả về client: kèm giá size L do server tính (BR05) để giao diện không tự cộng. */
export function toProductDto(p: ProductRow): ProductDto {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    price: p.price,
    priceL: p.hasSize ? unitPrice(p, 'L') : null,
    hasSize: p.hasSize,
    isActive: p.isActive,
    imageUrl: p.imageUrl,
    updatedAt: p.updatedAt,
    updatedBy: p.updatedBy,
  };
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  listCategories() {
    return this.prisma.category.findMany({ orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }], select: { id: true, name: true } });
  }

  async list(includeInactive: boolean): Promise<ProductListDto> {
    const rows = await this.prisma.product.findMany({
      where: includeInactive ? {} : { isActive: true }, // BR08: món ngừng bán không hiện ở màn bán hàng
      orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
      select: productSelect,
    });
    return { items: rows.map(toProductDto), sizeSurcharge: SIZE_SURCHARGE };
  }

  async create(dto: CreateProductDto, userId: number) {
    await this.ensureCategory(dto.categoryId);
    const row = await this.prisma.product.create({
      data: { ...dto, updatedById: userId },
      select: productSelect,
    });
    return toProductDto(row);
  }

  async update(id: number, dto: UpdateProductDto, userId: number) {
    const exists = await this.prisma.product.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException({ error: 'Không tìm thấy món' });
    if (dto.categoryId) await this.ensureCategory(dto.categoryId);
    const row = await this.prisma.product.update({
      where: { id },
      data: { ...dto, updatedById: userId }, // ghi người sửa giá để tra cứu khi tính sai
      select: productSelect,
    });
    return toProductDto(row);
  }

  private async ensureCategory(id: number) {
    const c = await this.prisma.category.findUnique({ where: { id }, select: { id: true } });
    if (!c) throw new BadRequestException({ error: 'Danh mục không tồn tại' });
  }
}
