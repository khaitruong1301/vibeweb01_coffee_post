import { applyDecorators, type INestApplication } from '@nestjs/common';
import { ApiResponse, DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { config } from '../config';
import { ErrorResponseDto } from './dto/error-response.dto';

export const BEARER = 'bearer';
export const COOKIE = 'cookie';

const ERROR_TEXT: Record<number, string> = {
  400: 'Dữ liệu không hợp lệ hoặc vi phạm luật bán hàng',
  401: 'Chưa đăng nhập hoặc phiên đã hết hạn',
  403: 'Vai trò không có quyền',
  404: 'Không tìm thấy',
  409: 'Xung đột dữ liệu / trạng thái',
};

/** Khai báo các mã lỗi có thể trả về, cùng schema `{ error, details? }`. */
export function ApiErrors(...codes: (keyof typeof ERROR_TEXT)[]) {
  return applyDecorators(
    ...codes.map((status) => ApiResponse({ status, description: ERROR_TEXT[status], type: ErrorResponseDto })),
  );
}

/** Swagger UI: /api/docs · OpenAPI JSON: /api/docs-json. Không đi qua guard (route Express riêng). */
export function setupSwagger(app: INestApplication) {
  const doc = new DocumentBuilder()
    .setTitle('CoffeePOS API')
    .setDescription(
      [
        'API bán hàng quán cà phê (NestJS 11 + Prisma 7).',
        '',
        '**Đăng nhập**: gọi `POST /api/auth/login` (tài khoản demo `thungan1` / `phache1` / `chuquan`, mật khẩu `Coffee@123`).',
        'Trình duyệt tự lưu cookie `coffeepos_token` nên các API sau dùng được ngay; hoặc chép `token` vào nút **Authorize → bearer**.',
        '',
        '**Lỗi** luôn có dạng `{ "error": "...", "details"?: {...} }`. Field không khai báo trong request (vd. `price`) bị bỏ qua.',
        '',
        'Mã UC / BR khớp `.claude/docs/requirements/use-case.md`.',
      ].join('\n'),
    )
    .setVersion('1.0.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Token từ POST /api/auth/login' }, BEARER)
    .addCookieAuth(config.cookieName, { type: 'apiKey', in: 'cookie', name: config.cookieName }, COOKIE)
    .addTag('Hệ thống')
    .addTag('Xác thực', 'UC01 — đăng nhập, đăng xuất')
    .addTag('Sản phẩm', 'UC06 — menu, danh mục, thêm món, sửa giá')
    .addTag('Đơn hàng', 'UC02–UC05 — tạo đơn, hóa đơn, quầy pha')
    .addTag('Kiểm thử', 'Báo cáo kiểm thử tự động — chỉ Chủ quán')
    .build();

  const document = SwaggerModule.createDocument(app, doc);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'CoffeePOS API',
    jsonDocumentUrl: 'api/docs-json',
    swaggerOptions: { persistAuthorization: true, tagsSorter: 'alpha', docExpansion: 'list', displayRequestDuration: true },
  });
}
