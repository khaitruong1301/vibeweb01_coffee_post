import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button, Chip, Field, Input, Modal } from '@/components/ui';

describe('Button', () => {
  it('loading → khóa nút, không gọi onClick (chống bấm 2 lần)', async () => {
    const onClick = vi.fn();
    render(<Button loading onClick={onClick}>Thanh toán</Button>);
    const btn = screen.getByRole('button', { name: 'Thanh toán' });
    expect(btn).toBeDisabled();
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('Field + Input', () => {
  it('ô lỗi có aria-invalid và hiện thông báo', () => {
    render(
      <Field label="Giá bán" error="Giá tối thiểu 1.000đ">
        <Input invalid defaultValue="0" />
      </Field>,
    );
    const input = screen.getByLabelText('Giá bán'); // tên đọc chỉ là nhãn, không dính câu lỗi
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Giá tối thiểu 1.000đ');
  });
});

describe('Chip', () => {
  it('trạng thái chọn qua aria-pressed', () => {
    render(<Chip active>L+6k</Chip>);
    expect(screen.getByRole('button', { name: 'L+6k' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('Modal', () => {
  it('ẩn khi open=false', () => {
    render(<Modal open={false} title="X" onClose={() => undefined}>Nội dung</Modal>);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('là dialog có tên, đóng bằng Esc và nút ×', async () => {
    const onClose = vi.fn();
    render(<Modal open title="Sửa món" onClose={onClose}>Nội dung</Modal>);
    expect(screen.getByRole('dialog', { name: 'Sửa món' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await userEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
