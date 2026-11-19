import { BadRequestException } from '@nestjs/common';
import { CreateOrderDto } from '../orders/dto/order.dto';
import { createValidationPipe } from './validation';

const pipe = createValidationPipe();
const validate = (body: unknown) => pipe.transform(body, { type: 'body', metatype: CreateOrderDto });

async function errorOf(body: unknown) {
  try {
    await validate(body);
  } catch (e) {
    return (e as BadRequestException).getResponse() as { error: string; details: Record<string, string> };
  }
  throw new Error('Mong đợi lỗi validate');
}

describe('ValidationPipe + CreateOrderDto', () => {
  it('L3: loại bỏ field giá do client gửi (whitelist)', async () => {
    const out = (await validate({
      total: 1,
      items: [{ productId: 1, size: 'M', quantity: 2, price: 1, unitPrice: 1 }],
    })) as Record<string, unknown> & { items: Record<string, unknown>[] };
    expect(out).not.toHaveProperty('total');
    expect(out.items[0]).not.toHaveProperty('price');
    expect(out.items[0]).not.toHaveProperty('unitPrice');
  });

  it('lỗi lồng nhau trả về theo đường dẫn trường, tiếng Việt', async () => {
    const err = await errorOf({ items: [{ productId: 1, size: 'XL', quantity: -1 }] });
    expect(err.error).toBe('Dữ liệu không hợp lệ');
    expect(err.details).toMatchObject({
      'items.0.quantity': 'Số lượng tối thiểu là 1',
      'items.0.size': 'Size chỉ nhận S, M hoặc L',
    });
  });

  it('UC04: nguồn app giao đồ ăn bắt buộc mã đơn đối tác; tại quầy thì không', async () => {
    const items = [{ productId: 1, size: 'M', quantity: 1 }];
    expect((await errorOf({ items, source: 'shopeefood' })).details).toHaveProperty('partnerCode');
    await expect(validate({ items, source: 'counter' })).resolves.toBeDefined();
  });
});
