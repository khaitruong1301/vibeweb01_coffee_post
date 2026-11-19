// Mọi lời gọi API phía trình duyệt đi qua đây: cùng origin (/api → backend), gửi kèm cookie,
// đọc `{ error, details }` và ném ApiError tiếng Việt.

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: Record<string, string>,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: init.method ?? 'GET',
      credentials: 'same-origin',
      headers: init.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: 'no-store',
    });
  } catch {
    throw new ApiError(0, 'Không kết nối được máy chủ, kiểm tra mạng rồi thử lại');
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, data?.error ?? 'Lỗi hệ thống, vui lòng thử lại', data?.details);
  }
  return data as T;
}
