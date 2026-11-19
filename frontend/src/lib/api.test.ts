import { describe, expect, it, vi } from 'vitest';
import { api, ApiError } from './api';

function mockFetch(status: number, body: unknown) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  );
}

describe('api()', () => {
  it('gọi /api cùng origin, gửi cookie, JSON body', async () => {
    const f = mockFetch(201, { id: 1 });
    await expect(api('/orders', { method: 'POST', body: { items: [] } })).resolves.toEqual({ id: 1 });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe('/api/orders');
    expect(init).toMatchObject({ method: 'POST', credentials: 'same-origin', body: '{"items":[]}' });
  });

  it('lỗi server → ApiError có status, thông báo và details', async () => {
    mockFetch(400, { error: 'Dữ liệu không hợp lệ', details: { 'items.0.quantity': 'Số lượng tối thiểu là 1' } });
    const err = (await api('/orders').catch((e: unknown) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 400, message: 'Dữ liệu không hợp lệ' });
    expect(err.details).toHaveProperty('items.0.quantity');
  });

  it('204 → undefined', async () => {
    mockFetch(204, undefined);
    await expect(api('/auth/logout', { method: 'POST' })).resolves.toBeUndefined();
  });

  it('mất mạng → ApiError status 0, thông báo tiếng Việt', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(api('/products')).rejects.toMatchObject({ status: 0, message: expect.stringContaining('Không kết nối') });
  });

  it('phản hồi lỗi không phải JSON → thông báo mặc định', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('<html>502</html>', { status: 502 }));
    await expect(api('/products')).rejects.toMatchObject({ status: 502, message: 'Lỗi hệ thống, vui lòng thử lại' });
  });
});
