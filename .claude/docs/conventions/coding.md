# Quy ước code

## Đặt tên

| Đối tượng | Quy ước | Ví dụ |
|---|---|---|
| File backend | `kebab-case.<loại>.ts` | `orders.controller.ts`, `order-status.ts`, `dto/order.dto.ts` |
| Component React, file component | `PascalCase.tsx` | `AuthProvider.tsx` (riêng `ui.tsx` gom component nhỏ) |
| Thư mục route Next | kebab-case | `app/(app)/receipt/[code]/` |
| Biến, hàm | `camelCase` | `priceOrder`, `formatVnd` |
| Class, kiểu, DTO | `PascalCase` | `CreateOrderDto`, `AuthUser` |
| Hằng số | `UPPER_SNAKE_CASE` | `MAX_QTY`, `SIZE_SURCHARGE` |
| Model Prisma | `PascalCase` số ít → bảng `snake_case` số nhiều | `OrderItem` → `order_items` |
| Field JSON / Prisma | `camelCase` (cột DB `snake_case` qua `@map`) | `unitPrice` ↔ `unit_price` |
| Đường dẫn API | danh từ số nhiều, kebab-case | `/api/orders/:id/status` |

## REST

| Hành động | Method | Đường dẫn | Status |
|---|---|---|---|
| Danh sách | GET | `/products` | 200 |
| Chi tiết | GET | `/orders/:code` | 200 |
| Tạo | POST | `/orders` | 201 |
| Sửa | PATCH | `/products/:id` | 200 |
| Hành động nghiệp vụ | PATCH/POST | `/orders/:id/status` | 200 |
| Không nội dung | POST | `/auth/logout` | 204 |

## Mẫu module NestJS

```ts
// backend/src/tables/dto/table.dto.ts
import { Transform } from 'class-transformer';
import { IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateTableDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Tên bàn không được trống' })
  @MinLength(1, { message: 'Tên bàn không được trống' })
  @MaxLength(30)
  name: string;

  @IsInt({ message: 'Số ghế phải là số nguyên' })
  @Min(1, { message: 'Số ghế tối thiểu 1' })
  @Max(50)
  seats: number;
}
```

```ts
// backend/src/tables/tables.service.ts
@Injectable()
export class TablesService {
  constructor(private readonly prisma: PrismaService) {}

  async update(id: number, dto: UpdateTableDto) {
    const found = await this.prisma.table.findUnique({ where: { id }, select: { id: true } });
    if (!found) throw new NotFoundException({ error: 'Không tìm thấy bàn' });
    return this.prisma.table.update({ where: { id }, data: dto, select: { id: true, name: true, seats: true } });
  }
}
```

```ts
// backend/src/tables/tables.controller.ts
@Controller('tables')
export class TablesController {
  constructor(private readonly tables: TablesService) {}

  @Get()                                   // mọi nhân viên đã đăng nhập (guard toàn cục)
  list() { return this.tables.list(); }

  @Roles('admin')
  @Patch(':id')
  update(@Param('id', IdPipe) id: number, @Body() dto: UpdateTableDto) {
    return this.tables.update(id, dto);
  }
}
```

Đăng ký: `TablesModule` (`controllers`, `providers`) → thêm vào `imports` của `AppModule`.

## Mẫu gọi API ở frontend

```tsx
'use client';
const allowed = useRequireRole(['admin']);
const [items, setItems] = useState<Table[] | null>(null);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  if (!allowed) return;
  api<{ items: Table[] }>('/tables')
    .then((r) => setItems(r.items))
    .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Không tải được'));
}, [allowed]);
```

## Ghi nhớ
- Tiền: `number` nguyên; hiển thị `formatVnd()` → `85.000đ`. Tính tiền chỉ ở `backend/src/pricing/pricing.ts`.
- Backend import tương đối không đuôi; frontend import tuyệt đối `@/`.
- Lỗi ném dạng `new XxxException({ error: 'tiếng Việt' })`.
