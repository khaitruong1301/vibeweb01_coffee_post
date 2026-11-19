/** Định dạng lỗi chung của mọi API. */
export class ErrorResponseDto {
  /**
   * Thông báo lỗi tiếng Việt
   * @example "Dữ liệu không hợp lệ"
   */
  error: string;

  /**
   * Lỗi theo từng trường (chỉ có khi dữ liệu gửi lên sai)
   * @example { "items.0.quantity": "Số lượng tối thiểu là 1" }
   */
  details?: Record<string, string>;
}
