import { defineConfig, devices } from '@playwright/test';

/**
 * E2E + a11y chạy trên stack tạm docker-compose.e2e.yml (DB trên RAM) — không bao giờ trỏ vào DB thật.
 * Local: PW_CHANNEL=chrome dùng Chrome có sẵn trên máy; CI: `npx playwright install --with-deps chromium`.
 */
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3200';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1, // các kịch bản dùng chung một DB → chạy tuần tự cho ổn định
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/html', open: 'never' }],
    ['junit', { outputFile: 'reports/junit-e2e.xml' }],
  ],
  use: {
    baseURL,
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: process.env.CI ? 'retain-on-failure' : 'off', // quay video cần ffmpeg — CI cài kèm chromium
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 }, channel: process.env.PW_CHANNEL } },
    {
      name: 'mobile',
      grep: /@mobile/,
      use: { ...devices['Pixel 7'], channel: process.env.PW_CHANNEL },
    },
  ],
});
