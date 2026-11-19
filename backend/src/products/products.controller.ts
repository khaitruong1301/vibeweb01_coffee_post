import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types';
import { Auth, CurrentUser } from '../auth/decorators';
import { IdPipe } from '../common/id.pipe';
import { ApiErrors } from '../common/swagger';
import { CreateProductDto, ListProductsQuery, UpdateProductDto } from './dto/product.dto';
import { CategoryDto, ProductDto, ProductListDto } from './dto/product-response.dto';
import { ProductsService } from './products.service';

@ApiTags('Sản phẩm')
@Controller()
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Auth()
  @Get('categories')
  @ApiOperation({ summary: 'Danh mục món' })
  @ApiOkResponse({ type: [CategoryDto] })
  categories(): Promise<CategoryDto[]> {
    return this.products.listCategories();
  }

  @Auth()
  @Get('products')
  @ApiOperation({
    summary: 'Menu (UC02, UC06)',
    description: 'Mặc định chỉ món đang bán. `all=true` gồm cả món ngừng bán — chỉ Chủ quán (vai khác → 403). Kèm `priceL` và bảng phụ thu size do server tính.',
  })
  @ApiOkResponse({ type: ProductListDto })
  @ApiErrors(403)
  list(@Query() q: ListProductsQuery, @CurrentUser() user: AuthUser): Promise<ProductListDto> {
    if (q.all && user.role !== 'admin') throw new ForbiddenException({ error: 'Chỉ chủ quán xem được món ngừng bán' });
    return this.products.list(!!q.all);
  }

  @Auth('admin')
  @Post('products')
  @ApiOperation({ summary: 'Thêm món — chỉ Chủ quán (UC06, BR01)' })
  @ApiCreatedResponse({ type: ProductDto })
  @ApiErrors(400, 409)
  create(@Body() dto: CreateProductDto, @CurrentUser() user: AuthUser): Promise<ProductDto> {
    return this.products.create(dto, user.id);
  }

  @Auth('admin')
  @Patch('products/:id')
  @ApiOperation({
    summary: 'Sửa món / sửa giá — chỉ Chủ quán (UC06, BR01)',
    description: 'Chỉ gửi field cần đổi. Ghi lại người sửa. Giá mới áp dụng cho đơn tạo sau; đơn cũ giữ giá đã chụp.',
  })
  @ApiParam({ name: 'id', type: Number, example: 2 })
  @ApiOkResponse({ type: ProductDto })
  @ApiErrors(400, 404, 409)
  update(@Param('id', IdPipe) id: number, @Body() dto: UpdateProductDto, @CurrentUser() user: AuthUser): Promise<ProductDto> {
    return this.products.update(id, dto, user.id);
  }
}
